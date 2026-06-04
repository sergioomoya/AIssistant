"""
AIssistant - Endpoints de Configuración
=======================================
Gestión de configuración de usuario, API keys y privacidad.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from core.database import get_db
from core.security import get_current_user
from core.config import settings
from models.user import User
from api.schemas.settings import (
    DeploymentModeUpdate,
    APIKeysUpdate,
    PrivacySettingsUpdate,
    PreferencesUpdate,
    UserSettingsResponse,
    TranscriptionModelsResponse,
    LLMModelsResponse,
)

router = APIRouter()
logger = structlog.get_logger()


# ========== Helpers ==========

from features.privacy.api_keys import encrypt_api_key

async def _get_user(db: AsyncSession, user_id: int) -> User:
    """Obtener usuario por ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


# ========== Endpoints Principales ==========

@router.get("/", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener configuración completa del usuario."""
    user = await _get_user(db, int(current_user["user_id"]))
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
    """Actualizar modo de despliegue (local/hybrid/cloud)."""
    if data.mode not in ["local", "hybrid", "cloud"]:
        raise HTTPException(
            status_code=400,
            detail="Modo de despliegue inválido. Opciones: local, hybrid, cloud"
        )
    
    user = await _get_user(db, int(current_user["user_id"]))
    user.deployment_mode = data.mode
    await db.commit()
    
    logger.info("Modo de despliegue actualizado", user_id=user.id, mode=data.mode)
    return {"message": f"Modo de despliegue actualizado a: {data.mode}"}


@router.patch("/api-keys")
async def update_api_keys(
    data: APIKeysUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar API keys (se almacenan encriptadas)."""
    user = await _get_user(db, int(current_user["user_id"]))
    api_keys = user.api_keys or {}
    
    key_mapping = {
        "openai": data.openai_api_key,
        "anthropic": data.anthropic_api_key,
        "google": data.google_ai_api_key,
        "deepgram": data.deepgram_api_key,
        "huggingface": data.huggingface_token,
    }
    
    for key_name, key_value in key_mapping.items():
        if key_value:
            api_keys[key_name] = encrypt_api_key(key_value)
    
    user.api_keys = api_keys
    await db.commit()
    
    logger.info("API keys actualizadas y encriptadas", user_id=user.id)
    return {"message": "API keys actualizadas correctamente"}


@router.delete("/api-keys/{provider}")
async def delete_api_key(
    provider: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar API key de un proveedor."""
    valid_providers = ["openai", "anthropic", "google", "deepgram", "huggingface"]
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail="Proveedor inválido")
    
    user = await _get_user(db, int(current_user["user_id"]))
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
    """Actualizar configuración de privacidad."""
    user = await _get_user(db, int(current_user["user_id"]))
    
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
    user = await _get_user(db, int(current_user["user_id"]))
    preferences = user.preferences or {}
    
    preference_mapping = {
        "theme": data.theme,
        "language": data.language,
        "notifications_enabled": data.notifications_enabled,
        "whisper_model": data.whisper_model,
        "llm_model": data.llm_model,
    }
    
    for pref_name, pref_value in preference_mapping.items():
        if pref_value is not None:
            preferences[pref_name] = pref_value
    
    if data.preferred_transcription_language:
        user.preferred_language = data.preferred_transcription_language
    
    if data.onboarding_completed is not None:
        user.onboarding_completed = data.onboarding_completed
    
    user.preferences = preferences
    await db.commit()
    
    return {"message": "Preferencias actualizadas"}


# ========== Modelos Disponibles ==========

@router.get("/models/transcription", response_model=TranscriptionModelsResponse)
async def get_available_transcription_models(
    current_user: dict = Depends(get_current_user)
):
    """Obtener modelos de transcripción disponibles."""
    local_models = [
        {"id": "tiny", "name": "Whisper Tiny", "size": "~75MB", "speed": "Muy rápido", "accuracy": "Básica"},
        {"id": "base", "name": "Whisper Base", "size": "~140MB", "speed": "Rápido", "accuracy": "Buena"},
        {"id": "small", "name": "Whisper Small", "size": "~460MB", "speed": "Moderado", "accuracy": "Muy buena"},
        {"id": "medium", "name": "Whisper Medium", "size": "~1.5GB", "speed": "Lento", "accuracy": "Excelente"},
        {"id": "large-v3", "name": "Whisper Large v3", "size": "~3GB", "speed": "Muy lento", "accuracy": "Máxima"},
        {"id": "large-v3-turbo", "name": "Whisper Large v3 Turbo", "size": "~3GB", "speed": "Optimizado", "accuracy": "Máxima", "recommended": True}
    ]
    
    cloud_models = [
        {"id": "deepgram-nova-3", "name": "Deepgram Nova 3", "latency": "<200ms", "accuracy": "Máxima", "recommended": True},
        {"id": "deepgram-nova-2", "name": "Deepgram Nova 2", "latency": "<300ms", "accuracy": "Excelente"},
        {"id": "openai-whisper-1", "name": "OpenAI Whisper", "latency": "~1s", "accuracy": "Máxima"}
    ]
    
    recommended = "large-v3-turbo" if settings.DEPLOYMENT_MODE == "local" else "deepgram-nova-3"
    
    return {
        "local_models": local_models,
        "cloud_models": cloud_models,
        "recommended": recommended
    }


@router.get("/models/llm", response_model=LLMModelsResponse)
async def get_available_llm_models(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener modelos LLM disponibles."""
    from features.summarization.model_validator import ModelValidator
    
    user = await _get_user(db, int(current_user["user_id"]))
    preferences = user.preferences or {}
    api_keys = user.api_keys or {}
    
    current_model = preferences.get("llm_model") or (
        settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME 
        else (settings.OLLAMA_MODEL if settings.DEPLOYMENT_MODE == "local" else "gpt-5.2")
    )
    
    validator = ModelValidator(api_keys)
    
    local_models = await _get_validated_models(validator, _get_local_llm_models())
    cloud_models = await _get_validated_models(validator, _get_cloud_llm_models())
    
    return {
        "local_models": local_models,
        "cloud_models": cloud_models,
        "current_model": current_model
    }


@router.get("/models/validate/{model_id}")
async def validate_model(
    model_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validar disponibilidad de un modelo específico."""
    from features.summarization.model_validator import ModelValidator
    
    user = await _get_user(db, int(current_user["user_id"]))
    api_keys = user.api_keys or {}
    
    validator = ModelValidator(api_keys)
    validation = await validator.validate_model(model_id)
    
    return {
        "model_id": validation.model_id,
        "status": validation.status.value,
        "message": validation.message,
        "provider": validation.provider,
        "is_local": validation.is_local,
        "requires_api_key": validation.requires_api_key,
        "estimated_download_size": validation.estimated_download_size
    }


# ========== Almacenamiento ==========

@router.get("/storage/status")
async def get_storage_status(current_user: dict = Depends(get_current_user)):
    """Obtener estado del almacenamiento de archivos temporales."""
    from features.cleanup import TempFileCleaner
    
    cleaner = TempFileCleaner()
    disk_usage = cleaner.get_disk_usage()
    
    return {
        "temp_storage": disk_usage,
        "auto_cleanup_enabled": True,
        "cleanup_schedule": "Cada hora para expirados, cada 24h para huérfanos"
    }


@router.post("/storage/cleanup")
async def trigger_manual_cleanup(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ejecutar limpieza manual de archivos temporales del usuario."""
    from features.cleanup import TempFileCleaner
    
    user = await _get_user(db, int(current_user["user_id"]))
    
    if user.auto_delete_audio_hours == 0:
        return {
            "message": "Auto-eliminación desactivada. Configure auto_delete_audio_hours > 0.",
            "files_deleted": 0,
            "bytes_freed_mb": 0
        }
    
    cleaner = TempFileCleaner()
    stats = await cleaner._cleanup_user_files(db, user)
    
    logger.info(
        "Limpieza manual ejecutada",
        user_id=user.id,
        files_deleted=stats["files_deleted"],
        bytes_freed=stats["bytes_freed"]
    )
    
    return {
        "message": "Limpieza completada",
        "files_deleted": stats["files_deleted"],
        "bytes_freed_mb": round(stats["bytes_freed"] / (1024 * 1024), 2)
    }


# ========== Helpers de Modelos ==========

def _get_local_llm_models() -> list:
    """Obtener lista de modelos LLM locales."""
    return [
        {"id": "gemma4", "name": "Gemma 4", "provider": "Ollama", "recommended": True, "released": "2026-02"},
        {"id": "deepseek-r1", "name": "DeepSeek R1", "provider": "Ollama", "recommended": True, "released": "2025-01"},
        {"id": "llama4", "name": "LLaMA 4", "provider": "Ollama", "released": "2025-04"},
        {"id": "llama3.2", "name": "LLaMA 3.2", "provider": "Ollama", "released": "2024-09"},
        {"id": "qwen2.5", "name": "Qwen 2.5 72B", "provider": "Ollama", "released": "2024-09"},
        {"id": "mistral-large", "name": "Mistral Large 2", "provider": "Ollama", "released": "2024-07"},
        {"id": "phi4", "name": "Phi-4", "provider": "Ollama", "released": "2024-12"}
    ]


def _get_cloud_llm_models() -> list:
    """Obtener lista de modelos LLM en la nube."""
    return [
        {"id": "gpt-5", "name": "GPT-5", "provider": "OpenAI", "recommended": True, "released": "2025-08"},
        {"id": "o3", "name": "o3 (Reasoning)", "provider": "OpenAI", "released": "2025-12"},
        {"id": "o1", "name": "o1 (Reasoning)", "provider": "OpenAI", "released": "2024-12"},
        {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI", "released": "2024-05"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI", "released": "2024-07"},
        {"id": "claude-3.7-sonnet", "name": "Claude 3.7 Sonnet", "provider": "Anthropic", "recommended": True, "released": "2025-11"},
        {"id": "claude-3.5-sonnet", "name": "Claude 3.5 Sonnet", "provider": "Anthropic", "released": "2024-10"},
        {"id": "claude-3-opus", "name": "Claude 3 Opus", "provider": "Anthropic", "released": "2024-03"},
        {"id": "gemini-3-pro", "name": "Gemini 3 Pro", "provider": "Google", "recommended": True, "released": "2025-11"},
        {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "provider": "Google", "released": "2025-05"},
        {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "provider": "Google", "released": "2025-05"},
        {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash", "provider": "Google", "released": "2024-12"},
        {"id": "deepseek-r1-api", "name": "DeepSeek R1 API", "provider": "DeepSeek", "released": "2025-01"},
        {"id": "deepseek-v3", "name": "DeepSeek V3", "provider": "DeepSeek", "released": "2024-12"},
        {"id": "grok-4", "name": "Grok 4", "provider": "xAI", "released": "2025-07"}
    ]


async def _get_validated_models(validator, models: list) -> list:
    """Añadir estado de validación a lista de modelos."""
    for model in models:
        validation = await validator.validate_model(model["id"])
        model["status"] = validation.status.value
        model["status_message"] = validation.message
    return models
