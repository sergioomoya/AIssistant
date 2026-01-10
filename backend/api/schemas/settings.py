"""
AIssistant - Schemas de Configuración
=====================================
"""

from typing import Optional, Dict, List
from pydantic import BaseModel


# ========== Request Schemas ==========

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


# ========== Response Schemas ==========

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


class TranscriptionModelInfo(BaseModel):
    """Información de un modelo de transcripción."""
    id: str
    name: str
    size: Optional[str] = None
    speed: Optional[str] = None
    accuracy: Optional[str] = None
    latency: Optional[str] = None
    recommended: bool = False


class TranscriptionModelsResponse(BaseModel):
    """Schema de respuesta de modelos de transcripción."""
    local_models: List[TranscriptionModelInfo]
    cloud_models: List[TranscriptionModelInfo]
    recommended: str


class LLMModelInfo(BaseModel):
    """Información de un modelo LLM."""
    id: str
    name: str
    provider: str
    released: str
    recommended: bool = False
    status: Optional[str] = None
    status_message: Optional[str] = None


class LLMModelsResponse(BaseModel):
    """Schema de respuesta de modelos LLM."""
    local_models: List[LLMModelInfo]
    cloud_models: List[LLMModelInfo]
    current_model: str


class StorageStatusResponse(BaseModel):
    """Schema de respuesta de estado de almacenamiento."""
    temp_storage: Dict
    auto_cleanup_enabled: bool
    cleanup_schedule: str


class CleanupResponse(BaseModel):
    """Schema de respuesta de limpieza."""
    message: str
    files_deleted: int
    bytes_freed_mb: Optional[float] = None

