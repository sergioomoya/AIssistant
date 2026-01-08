"""
AIssistant - Configuración Central
==================================
Gestión de variables de entorno y configuración de la aplicación.
"""

from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Configuración de la aplicación cargada desde variables de entorno."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )
    
    # ----- Aplicación -----
    APP_NAME: str = "AIssistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # ----- Modo de Despliegue -----
    DEPLOYMENT_MODE: Literal["local", "hybrid", "cloud"] = "hybrid"
    
    # ----- Seguridad -----
    SECRET_KEY: str = "development-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    
    # ----- Base de Datos -----
    DATABASE_URL: str = "postgresql://aissistant:aissistant_secret@postgres:5432/aissistant_db"
    
    # ----- Redis -----
    REDIS_URL: str = "redis://redis:6379/0"
    
    # ----- CORS -----
    # Definido como string separado por comas para facilitar configuración desde .env
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Obtener lista de orígenes CORS."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # ----- Whisper (Transcripción Next-Gen 2026) -----
    WHISPER_MODEL_SIZE: Literal["tiny", "base", "small", "medium", "large", "large-v3", "large-v3-turbo"] = "large-v3-turbo"
    WHISPER_DEVICE: str = "auto"  # auto, cpu, cuda
    WHISPER_COMPUTE_TYPE: str = "int8"  # int8, float16, float32 (int8 para CPU, float16 para GPU)
    WHISPER_VAD_FILTER: bool = True  # Voice Activity Detection
    
    # ----- API Keys (Modo Híbrido/Nube) -----
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_AI_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""  # Para DeepSeek R1 API (alternativa a local)
    
    # ----- OAuth Providers -----
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # ----- Ollama (Modo Local) -----
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3.2"
    
    # ----- LLM Provider (Next-Gen 2026) -----
    LLM_PROVIDER: str = "litellm"  # litellm para abstracción unificada
    LLM_MODEL_NAME: str = "ollama/deepseek-r1"  # Modelo por defecto (local)
    # Opciones: ollama/deepseek-r1, gpt-5.2, azure/gpt-5.2, anthropic/claude-3.5-sonnet, etc.
    LLM_FALLBACK_MODELS: list[str] = []  # Modelos de respaldo si el principal falla
    
    # ----- HuggingFace (Diarización) -----
    HF_TOKEN: str = ""
    
    # ----- Configuración de Audio -----
    AUDIO_SAMPLE_RATE: int = 16000
    AUDIO_CHANNELS: int = 1
    AUDIO_CHUNK_DURATION_MS: int = 3000  # Duración de chunk para streaming
    
    # ----- Configuración de Transcripción -----
    TRANSCRIPTION_LANGUAGE: str = "auto"  # auto-detect o código ISO
    TRANSCRIPTION_MIN_CONFIDENCE: float = 0.7
    
    # ----- Configuración de Resúmenes -----
    SUMMARY_MAX_TOKENS: int = 1000
    SUMMARY_TEMPERATURE: float = 0.3
    
    # ----- Almacenamiento -----
    AUDIO_TEMP_PATH: str = "/app/audio_temp"
    EXPORTS_PATH: str = "/app/exports"
    MODELS_PATH: str = "/app/models"
    
    # ----- Límites -----
    MAX_MEETING_DURATION_HOURS: int = 4
    MAX_UPLOAD_SIZE_MB: int = 500
    MAX_CONTEXT_DOCUMENTS: int = 10
    
    # ----- Privacidad -----
    AUTO_DELETE_AUDIO_HOURS: int = 24  # Borrar audio tras X horas (0 = nunca)
    PII_REDACTION_ENABLED: bool = True


@lru_cache()
def get_settings() -> Settings:
    """Obtener instancia cacheada de configuración."""
    return Settings()


# Instancia global de configuración
settings = get_settings()

