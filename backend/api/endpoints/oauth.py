"""
AIssistant - Endpoints de OAuth
===============================
Autenticación con proveedores externos (Google, Microsoft, GitHub).
"""

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import httpx
import structlog

from core.database import get_db
from core.security import create_access_token
from core.config import settings
from models.user import User

router = APIRouter()
logger = structlog.get_logger()

# ========== Schemas ==========

class GoogleAuthRequest(BaseModel):
    """Request para autenticación con Google."""
    code: str
    redirect_uri: str


class OAuthTokenResponse(BaseModel):
    """Respuesta con token de acceso."""
    access_token: str
    token_type: str = "bearer"
    user: dict


# ========== Google OAuth Config ==========

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
]


# ========== Endpoints ==========

@router.get("/google/auth-url")
async def get_google_auth_url(redirect_uri: str):
    """
    Obtener URL de autorización de Google.
    
    El frontend debe redirigir al usuario a esta URL.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth no está configurado. Añade GOOGLE_CLIENT_ID en las variables de entorno."
        )
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    auth_url = f"{GOOGLE_AUTH_URL}?{query_string}"
    
    return {"auth_url": auth_url}


@router.post("/google/callback", response_model=OAuthTokenResponse)
async def google_callback(
    data: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Callback de Google OAuth.
    
    Intercambia el código de autorización por tokens y crea/actualiza el usuario.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth no está configurado"
        )
    
    # 1. Intercambiar código por tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": data.code,
                "grant_type": "authorization_code",
                "redirect_uri": data.redirect_uri,
            }
        )
        
        if token_response.status_code != 200:
            error_data = token_response.json() if token_response.headers.get("content-type", "").startswith("application/json") else {}
            error_type = error_data.get("error", "unknown")
            
            logger.error(
                "Error obteniendo token de Google",
                status=token_response.status_code,
                error=error_type,
                response=token_response.text
            )
            
            if error_type == "invalid_grant":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El código de autorización ha expirado o ya fue usado. Por favor, intenta iniciar sesión de nuevo."
                )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al autenticar con Google: {error_data.get('error_description', 'Error desconocido')}"
            )
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        # 2. Obtener información del usuario
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error al obtener información del usuario de Google"
            )
        
        google_user = userinfo_response.json()
    
    email = google_user.get("email")
    name = google_user.get("name", email.split("@")[0])
    google_id = google_user.get("id")
    picture = google_user.get("picture")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener el email de Google"
        )
    
    # 3. Buscar o crear usuario
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Crear nuevo usuario
        try:
            user = User(
                email=email,
                full_name=name,
                hashed_password="",  # Sin contraseña para OAuth
                is_verified=True,  # Google ya verificó el email
                deployment_mode="hybrid",
                onboarding_completed=False,
                preferences={
                    "theme": "dark",
                    "language": "es",
                    "notifications_enabled": True,
                    "oauth_provider": "google",
                    "oauth_id": google_id,
                    "avatar_url": picture,
                }
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            logger.info("Nuevo usuario creado via Google OAuth", user_id=user.id, email=email)
        except Exception as e:
            # Si falla por duplicado (race condition), buscar de nuevo
            await db.rollback()
            result = await db.execute(
                select(User).where(User.email == email)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                # Si aún no existe, re-lanzar el error
                logger.error("Error creando usuario", error=str(e), email=email)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al crear el usuario"
                )
            
            logger.info("Usuario encontrado tras race condition", user_id=user.id, email=email)
    else:
        # Actualizar información si es necesario
        if user.preferences:
            user.preferences["oauth_provider"] = "google"
            user.preferences["oauth_id"] = google_id
            if picture:
                user.preferences["avatar_url"] = picture
        else:
            user.preferences = {
                "oauth_provider": "google",
                "oauth_id": google_id,
                "avatar_url": picture,
            }
        
        await db.commit()
        logger.info("Usuario existente autenticado via Google", user_id=user.id)
    
    # 4. Crear token JWT de nuestra aplicación
    app_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": app_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "deployment_mode": user.deployment_mode,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "onboarding_completed": user.onboarding_completed,
            "avatar_url": user.preferences.get("avatar_url") if user.preferences else None,
        }
    }


@router.get("/providers")
async def get_available_providers():
    """
    Obtener proveedores de OAuth disponibles.
    
    Solo devuelve los proveedores que están configurados.
    """
    providers = []
    
    if settings.GOOGLE_CLIENT_ID:
        providers.append({
            "id": "google",
            "name": "Google",
            "enabled": True,
        })
    
    # Futuros proveedores
    # if settings.MICROSOFT_CLIENT_ID:
    #     providers.append({"id": "microsoft", "name": "Microsoft", "enabled": True})
    # if settings.GITHUB_CLIENT_ID:
    #     providers.append({"id": "github", "name": "GitHub", "enabled": True})
    
    return {"providers": providers}

