"""
AIssistant - Endpoints de Autenticación
=======================================
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from core.database import get_db
from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from core.config import settings
from models.user import User

router = APIRouter()


# ========== Schemas ==========

class UserCreate(BaseModel):
    """Schema para registro de usuario."""
    email: EmailStr
    password: str
    full_name: str


class UserResponse(BaseModel):
    """Schema de respuesta de usuario."""
    id: int
    email: str
    full_name: str
    deployment_mode: str
    is_active: bool
    is_verified: bool
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema de token de acceso."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ========== Endpoints ==========

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registrar un nuevo usuario.
    
    - **email**: Email único del usuario
    - **password**: Contraseña (mínimo 8 caracteres)
    - **full_name**: Nombre completo
    """
    # Verificar si el email ya existe
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Crear usuario
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        deployment_mode="hybrid",  # Por defecto
        preferences={
            "theme": "dark",
            "language": "es",
            "notifications_enabled": True
        }
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Iniciar sesión y obtener token de acceso.
    
    - **username**: Email del usuario
    - **password**: Contraseña
    """
    # Buscar usuario
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )
    
    # Crear token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener información del usuario autenticado."""
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    return user


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Cerrar sesión.
    
    Nota: En una implementación con tokens JWT, el logout es principalmente
    del lado del cliente. Aquí se puede implementar una blacklist de tokens
    si se requiere invalidación del lado del servidor.
    """
    return {"message": "Sesión cerrada correctamente"}

