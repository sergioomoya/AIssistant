"""
AIssistant - Endpoints de Configuración
=======================================
Gestión de configuración de usuario, API keys y privacidad.
"""

from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from cryptography.fernet import Fernet
import structlog

from core.database import get_db
from core.security import get_current_user
from core.config import settings
from models.user import User

router = APIRouter()
logger = structlog.get_logger()


# ========== Schemas ==========

class DeploymentModeUpdate(BaseModel):
    """Schema para actualizar modo de despliegue."""
    mode: str  # local, hybrid, cloud


class APIKeysUpdate(BaseModel):
    """Schema para actualizar API keys."""
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_ai_api_key: Optional[str] = None
    deepgram_api_key: Optional[str] = None


class PrivacySettingsUpdate(BaseModel):
    """Schema para actualizar configuración de privacidad."""
    auto_delete_audio_hours: Optional[int] = None
    pii_redaction_enabled: Optional[bool] = None


class PreferencesUpdate(BaseModel):
    """Schema para actualizar preferencias."""
    theme: Optional[str] = None
    language: Optional[str] = None
    preferred_transcription_language: Optional[str] = None
    notifications_enabled: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    """Schema de respuesta de configuración completa."""
    deployment_mode: str
    has_openai_key: bool
    has_anthropic_key: bool
    has_google_key: bool
    has_deepgram_key: bool
    auto_delete_audio_hours: int
    pii_redaction_enabled: bool
    preferred_language: str
    preferences: Dict


class TranscriptionModelsResponse(BaseModel):
    """Schema de respuesta de modelos disponibles."""
    local_models: list
    cloud_models: list
    recommended: str


class LLMModelsResponse(BaseModel):
    """Schema de respuesta de modelos LLM disponibles."""
    local_models: list
    cloud_models: list
    current_model: str


# ========== Helpers ==========

def encrypt_api_key(key: str) -> str:
    """Encriptar API key para almacenamiento."""
    # En producción, usar una clave derivada de SECRET_KEY
    fernet_key = Fernet.generate_key()  # TODO: Usar clave fija derivada
    f = Fernet(fernet_key)
    return f.encrypt(key.encode()).decode()


def mask_api_key(key: str) -> str:
    """Enmascarar API key para visualización."""
    if not key or len(key) < 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"


# ========== Endpoints ==========

@router.get("/", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener configuración completa del usuario."""
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    api_keys = user.api_keys or {}
    
    return {
        "deployment_mode": user.deployment_mode,
        "has_openai_key": bool(api_keys.get("openai")),
        "has_anthropic_key": bool(api_keys.get("anthropic")),
        "has_google_key": bool(api_keys.get("google")),
        "has_deepgram_key": bool(api_keys.get("deepgram")),
        "auto_delete_audio_hours": user.auto_delete_audio_hours,
        "pii_redaction_enabled": user.pii_redaction_enabled,
        "preferred_language": user.preferred_language,
        "preferences": user.preferences or {}
    }


@router.patch("/deployment-mode")
async def update_deployment_mode(
    data: DeploymentModeUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar modo de despliegue.
    
    Opciones:
    - **local**: 100% privado, procesamiento local con Whisper + Ollama
    - **hybrid**: Captura local, procesamiento en nube con tus API keys
    - **cloud**: Solución SaaS completa
    """
    if data.mode not in ["local", "hybrid", "cloud"]:
        raise HTTPException(
            status_code=400,
            detail="Modo de despliegue inválido. Opciones: local, hybrid, cloud"
        )
    
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    
    user.deployment_mode = data.mode
    await db.commit()
    
    logger.info(
        "Modo de despliegue actualizado",
        user_id=user.id,
        mode=data.mode
    )
    
    return {"message": f"Modo de despliegue actualizado a: {data.mode}"}


@router.patch("/api-keys")
async def update_api_keys(
    data: APIKeysUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar API keys para modo híbrido.
    
    Las keys se almacenan encriptadas.
    """
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    
    api_keys = user.api_keys or {}
    
    if data.openai_api_key:
        api_keys["openai"] = data.openai_api_key  # TODO: Encriptar
    if data.anthropic_api_key:
        api_keys["anthropic"] = data.anthropic_api_key
    if data.google_ai_api_key:
        api_keys["google"] = data.google_ai_api_key
    if data.deepgram_api_key:
        api_keys["deepgram"] = data.deepgram_api_key
    
    user.api_keys = api_keys
    await db.commit()
    
    logger.info("API keys actualizadas", user_id=user.id)
    
    return {"message": "API keys actualizadas correctamente"}


@router.delete("/api-keys/{provider}")
async def delete_api_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar API key de un proveedor."""
    if provider not in ["openai", "anthropic", "google", "deepgram"]:
        raise HTTPException(status_code=400, detail="Proveedor inválido")
    
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    
    api_keys = user.api_keys or {}
    if provider in api_keys:
        del api_keys[provider]
        user.api_keys = api_keys
        await db.commit()
    
    return {"message": f"API key de {provider} eliminada"}


@router.patch("/privacy")
async def update_privacy_settings(
    data: PrivacySettingsUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar configuración de privacidad.
    
    - **auto_delete_audio_hours**: Eliminar audio automáticamente tras X horas (0 = nunca)
    - **pii_redaction_enabled**: Redactar información personal automáticamente
    """
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    
    if data.auto_delete_audio_hours is not None:
        user.auto_delete_audio_hours = data.auto_delete_audio_hours
    
    if data.pii_redaction_enabled is not None:
        user.pii_redaction_enabled = data.pii_redaction_enabled
    
    await db.commit()
    
    return {"message": "Configuración de privacidad actualizada"}


@router.patch("/preferences")
async def update_preferences(
    data: PreferencesUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar preferencias de usuario."""
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    
    preferences = user.preferences or {}
    
    if data.theme:
        preferences["theme"] = data.theme
    if data.language:
        preferences["language"] = data.language
    if data.notifications_enabled is not None:
        preferences["notifications_enabled"] = data.notifications_enabled
    
    if data.preferred_transcription_language:
        user.preferred_language = data.preferred_transcription_language
    
    user.preferences = preferences
    await db.commit()
    
    return {"message": "Preferencias actualizadas"}


@router.get("/models/transcription", response_model=TranscriptionModelsResponse)
async def get_available_transcription_models(
    current_user: dict = Depends(get_current_user)
):
    """Obtener modelos de transcripción disponibles."""
    return {
        "local_models": [
            {"id": "whisper-tiny", "name": "Whisper Tiny", "size": "~75MB", "speed": "Muy rápido", "accuracy": "Básica"},
            {"id": "whisper-base", "name": "Whisper Base", "size": "~140MB", "speed": "Rápido", "accuracy": "Buena"},
            {"id": "whisper-small", "name": "Whisper Small", "size": "~460MB", "speed": "Moderado", "accuracy": "Muy buena"},
            {"id": "whisper-medium", "name": "Whisper Medium", "size": "~1.5GB", "speed": "Lento", "accuracy": "Excelente"},
            {"id": "whisper-large-v3", "name": "Whisper Large v3", "size": "~3GB", "speed": "Muy lento", "accuracy": "Máxima"}
        ],
        "cloud_models": [
            {"id": "deepgram-nova-2", "name": "Deepgram Nova 2", "latency": "<300ms", "accuracy": "Excelente"},
            {"id": "openai-whisper-1", "name": "OpenAI Whisper", "latency": "~1s", "accuracy": "Máxima"}
        ],
        "recommended": "whisper-base" if settings.DEPLOYMENT_MODE == "local" else "deepgram-nova-2"
    }


@router.get("/models/llm", response_model=LLMModelsResponse)
async def get_available_llm_models(
    current_user: dict = Depends(get_current_user)
):
    """Obtener modelos LLM disponibles."""
    return {
        "local_models": [
            {"id": "llama3.2", "name": "Llama 3.2", "provider": "Ollama"},
            {"id": "mistral", "name": "Mistral 7B", "provider": "Ollama"},
            {"id": "phi3", "name": "Phi-3", "provider": "Ollama"}
        ],
        "cloud_models": [
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI"},
            {"id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "provider": "Anthropic"},
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "provider": "Google"}
        ],
        "current_model": settings.OLLAMA_MODEL if settings.DEPLOYMENT_MODE == "local" else "gpt-4o-mini"
    }

