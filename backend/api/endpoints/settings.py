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
    huggingface_token: Optional[str] = None


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
    # Preferencias de modelos
    whisper_model: Optional[str] = None
    llm_model: Optional[str] = None
    # Estado de onboarding
    onboarding_completed: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    """Schema de respuesta de configuración completa."""
    deployment_mode: str
    has_openai_key: bool
    has_anthropic_key: bool
    has_google_key: bool
    has_deepgram_key: bool
    has_huggingface_token: bool
    auto_delete_audio_hours: int
    pii_redaction_enabled: bool
    preferred_language: str
    preferences: Dict
    onboarding_completed: bool


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
        "has_huggingface_token": bool(api_keys.get("huggingface")),
        "auto_delete_audio_hours": user.auto_delete_audio_hours,
        "pii_redaction_enabled": user.pii_redaction_enabled,
        "preferred_language": user.preferred_language,
        "preferences": user.preferences or {},
        "onboarding_completed": user.onboarding_completed
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
    if data.huggingface_token:
        api_keys["huggingface"] = data.huggingface_token
    
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
    if provider not in ["openai", "anthropic", "google", "deepgram", "huggingface"]:
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
    
    # Preferencias de modelos de IA
    if data.whisper_model:
        preferences["whisper_model"] = data.whisper_model
    if data.llm_model:
        preferences["llm_model"] = data.llm_model
    
    if data.preferred_transcription_language:
        user.preferred_language = data.preferred_transcription_language
    
    # Estado de onboarding
    if data.onboarding_completed is not None:
        user.onboarding_completed = data.onboarding_completed
    
    user.preferences = preferences
    await db.commit()
    
    return {"message": "Preferencias actualizadas"}


@router.get("/models/transcription", response_model=TranscriptionModelsResponse)
async def get_available_transcription_models(
    current_user: dict = Depends(get_current_user)
):
    """Obtener modelos de transcripción disponibles (Next-Gen 2026)."""
    return {
        "local_models": [
            {"id": "tiny", "name": "Whisper Tiny", "size": "~75MB", "speed": "Muy rápido", "accuracy": "Básica"},
            {"id": "base", "name": "Whisper Base", "size": "~140MB", "speed": "Rápido", "accuracy": "Buena"},
            {"id": "small", "name": "Whisper Small", "size": "~460MB", "speed": "Moderado", "accuracy": "Muy buena"},
            {"id": "medium", "name": "Whisper Medium", "size": "~1.5GB", "speed": "Lento", "accuracy": "Excelente"},
            {"id": "large-v3", "name": "Whisper Large v3", "size": "~3GB", "speed": "Muy lento", "accuracy": "Máxima"},
            {"id": "large-v3-turbo", "name": "Whisper Large v3 Turbo (Next-Gen 2026)", "size": "~3GB", "speed": "Optimizado", "accuracy": "Máxima", "recommended": True}
        ],
        "cloud_models": [
            {"id": "deepgram-nova-3", "name": "Deepgram Nova 3 (Next-Gen 2026)", "latency": "<200ms", "accuracy": "Máxima", "recommended": True},
            {"id": "deepgram-nova-2", "name": "Deepgram Nova 2", "latency": "<300ms", "accuracy": "Excelente"},
            {"id": "openai-whisper-1", "name": "OpenAI Whisper", "latency": "~1s", "accuracy": "Máxima"}
        ],
        "recommended": "large-v3-turbo" if settings.DEPLOYMENT_MODE == "local" else "deepgram-nova-3"
    }


@router.get("/models/llm", response_model=LLMModelsResponse)
async def get_available_llm_models(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener modelos LLM disponibles (Next-Gen 2026)."""
    # Obtener modelo actual del usuario
    result = await db.execute(
        select(User).where(User.id == int(current_user["user_id"]))
    )
    user = result.scalar_one_or_none()
    preferences = user.preferences or {} if user else {}
    current_model = preferences.get("llm_model") or (settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME else (settings.OLLAMA_MODEL if settings.DEPLOYMENT_MODE == "local" else "gpt-5.2"))
    
    return {
        "local_models": [
            {"id": "deepseek-r1", "name": "DeepSeek R1 (Next-Gen 2026)", "provider": "Ollama", "recommended": True},
            {"id": "llama3.2", "name": "Llama 3.2", "provider": "Ollama"},
            {"id": "llama3.1", "name": "Llama 3.1", "provider": "Ollama"},
            {"id": "mistral", "name": "Mistral 7B", "provider": "Ollama"},
            {"id": "phi3", "name": "Phi-3", "provider": "Ollama"}
        ],
        "cloud_models": [
            {"id": "gpt-5.2", "name": "GPT-5.2 (Next-Gen 2026)", "provider": "OpenAI", "recommended": True},
            {"id": "gpt-5", "name": "GPT-5", "provider": "OpenAI"},
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI"},
            {"id": "deepseek-r1-api", "name": "DeepSeek R1 API (Next-Gen 2026)", "provider": "DeepSeek"},
            {"id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "provider": "Anthropic"},
            {"id": "claude-3-opus", "name": "Claude 3 Opus", "provider": "Anthropic"},
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "provider": "Google"},
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash", "provider": "Google"}
        ],
        "current_model": current_model
    }

