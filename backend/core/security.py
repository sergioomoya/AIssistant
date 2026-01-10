"""
AIssistant - Seguridad y Autenticación
======================================
JWT, hashing de contraseñas y utilidades de seguridad.
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.config import settings

# Configuración de hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# Algoritmo JWT
ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña contra hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generar hash de contraseña."""
    return pwd_context.hash(password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Crear token JWT de acceso."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decodificar y validar token JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency para obtener el usuario actual desde el token.
    
    Returns:
        dict con información del usuario decodificada del token
        
    Raises:
        HTTPException 401 si el token es inválido
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    return {"user_id": user_id, "email": payload.get("email")}


def get_current_user_ws(token: str) -> dict:
    """
    Obtener usuario actual desde token JWT para WebSocket.
    
    Similar a get_current_user pero síncrono y sin Depends.
    Usado para validar tokens en conexiones WebSocket.
    
    Args:
        token: Token JWT como string
        
    Returns:
        dict con información del usuario
        
    Raises:
        ValueError si el token es inválido
    """
    payload = decode_access_token(token)
    if payload is None:
        raise ValueError("Token inválido o expirado")
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise ValueError("Token no contiene user_id")
    
    return {"user_id": user_id, "email": payload.get("email")}

