"""
AIssistant - Validador de Modelos de IA
=======================================
Verifica disponibilidad de modelos antes de usarlos.
"""

import httpx
import structlog
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from core.config import settings
from features.privacy.api_keys import get_decrypted_api_key

logger = structlog.get_logger()


class ModelStatus(str, Enum):
    """Estado de disponibilidad de un modelo."""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    NO_API_KEY = "no_api_key"
    NOT_DOWNLOADED = "not_downloaded"
    UNKNOWN = "unknown"


@dataclass
class ModelValidationResult:
    """Resultado de validación de un modelo."""
    model_id: str
    status: ModelStatus
    message: str
    provider: str
    is_local: bool
    requires_api_key: bool = False
    estimated_download_size: Optional[str] = None


# Mapeo de modelos a proveedores y sus requerimientos
# Actualizado: Enero 2026
MODEL_REGISTRY = {
    # ==========================================
    # Modelos locales (Ollama)
    # ==========================================
    "deepseek-r1": {"provider": "ollama", "is_local": True, "size": "~8GB", "released": "2025-01"},
    "llama4": {"provider": "ollama", "is_local": True, "size": "~26GB", "released": "2025-04"},
    "llama3.2": {"provider": "ollama", "is_local": True, "size": "~4GB", "released": "2024-09"},
    "qwen2.5": {"provider": "ollama", "is_local": True, "size": "~40GB", "released": "2024-09"},
    "mistral-large": {"provider": "ollama", "is_local": True, "size": "~12GB", "released": "2024-07"},
    "phi4": {"provider": "ollama", "is_local": True, "size": "~8GB", "released": "2024-12"},
    
    # ==========================================
    # OpenAI
    # ==========================================
    "gpt-5": {"provider": "openai", "is_local": False, "api_key": "openai", "released": "2025-08"},
    "o3": {"provider": "openai", "is_local": False, "api_key": "openai", "released": "2025-12"},
    "o1": {"provider": "openai", "is_local": False, "api_key": "openai", "released": "2024-12"},
    "gpt-4o": {"provider": "openai", "is_local": False, "api_key": "openai", "released": "2024-05"},
    "gpt-4o-mini": {"provider": "openai", "is_local": False, "api_key": "openai", "released": "2024-07"},
    
    # ==========================================
    # Anthropic
    # ==========================================
    "claude-3.7-sonnet": {"provider": "anthropic", "is_local": False, "api_key": "anthropic", "released": "2025-11"},
    "claude-3.5-sonnet": {"provider": "anthropic", "is_local": False, "api_key": "anthropic", "released": "2024-10"},
    "claude-3-opus": {"provider": "anthropic", "is_local": False, "api_key": "anthropic", "released": "2024-03"},
    
    # ==========================================
    # Google
    # ==========================================
    "gemini-3-pro": {"provider": "google", "is_local": False, "api_key": "google", "released": "2025-11"},
    "gemini-2.5-pro": {"provider": "google", "is_local": False, "api_key": "google", "released": "2025-05"},
    "gemini-2.5-flash": {"provider": "google", "is_local": False, "api_key": "google", "released": "2025-05"},
    "gemini-2.0-flash": {"provider": "google", "is_local": False, "api_key": "google", "released": "2024-12"},
    
    # ==========================================
    # DeepSeek API
    # ==========================================
    "deepseek-r1-api": {"provider": "deepseek", "is_local": False, "api_key": "deepseek", "released": "2025-01"},
    "deepseek-v3": {"provider": "deepseek", "is_local": False, "api_key": "deepseek", "released": "2024-12"},
    
    # ==========================================
    # xAI
    # ==========================================
    "grok-4": {"provider": "xai", "is_local": False, "api_key": "xai", "released": "2025-07"},
    
    # ==========================================
    # Modelos de transcripción (Whisper Local)
    # ==========================================
    "tiny": {"provider": "whisper", "is_local": True, "size": "~75MB"},
    "base": {"provider": "whisper", "is_local": True, "size": "~140MB"},
    "small": {"provider": "whisper", "is_local": True, "size": "~460MB"},
    "medium": {"provider": "whisper", "is_local": True, "size": "~1.5GB"},
    "large-v3": {"provider": "whisper", "is_local": True, "size": "~3GB"},
    "large-v3-turbo": {"provider": "whisper", "is_local": True, "size": "~3GB"},
    
    # ==========================================
    # Modelos de transcripción en nube
    # ==========================================
    "deepgram-nova-3": {"provider": "deepgram", "is_local": False, "api_key": "deepgram", "released": "2025-01"},
    "deepgram-nova-2": {"provider": "deepgram", "is_local": False, "api_key": "deepgram", "released": "2024-06"},
    "openai-whisper-1": {"provider": "openai", "is_local": False, "api_key": "openai"},
}


class ModelValidator:
    """Validador de disponibilidad de modelos de IA."""
    
    def __init__(self, user_api_keys: Optional[Dict[str, str]] = None):
        """
        Inicializar validador.
        
        Args:
            user_api_keys: Dict de API keys encriptadas del usuario
        """
        self.user_api_keys = user_api_keys or {}
        self._ollama_models_cache: Optional[List[str]] = None
    
    async def validate_model(self, model_id: str) -> ModelValidationResult:
        """
        Validar si un modelo está disponible para uso.
        
        Args:
            model_id: ID del modelo a validar
            
        Returns:
            ModelValidationResult con estado y detalles
        """
        # Buscar modelo en registry
        model_info = MODEL_REGISTRY.get(model_id)
        
        if not model_info:
            return ModelValidationResult(
                model_id=model_id,
                status=ModelStatus.UNKNOWN,
                message=f"Modelo '{model_id}' no reconocido en el registro",
                provider="unknown",
                is_local=False
            )
        
        provider = model_info["provider"]
        is_local = model_info["is_local"]
        
        # Validar según tipo de modelo
        if is_local:
            if provider == "ollama":
                return await self._validate_ollama_model(model_id, model_info)
            elif provider == "whisper":
                return await self._validate_whisper_model(model_id, model_info)
        else:
            return await self._validate_cloud_model(model_id, model_info)
    
    async def _validate_ollama_model(
        self,
        model_id: str,
        model_info: Dict
    ) -> ModelValidationResult:
        """Validar modelo de Ollama."""
        try:
            # Obtener lista de modelos instalados
            if self._ollama_models_cache is None:
                self._ollama_models_cache = await self._get_ollama_models()
            
            if model_id in self._ollama_models_cache:
                return ModelValidationResult(
                    model_id=model_id,
                    status=ModelStatus.AVAILABLE,
                    message=f"Modelo {model_id} disponible en Ollama",
                    provider="ollama",
                    is_local=True
                )
            else:
                return ModelValidationResult(
                    model_id=model_id,
                    status=ModelStatus.NOT_DOWNLOADED,
                    message=f"Modelo {model_id} no está descargado. Ejecuta: ollama pull {model_id}",
                    provider="ollama",
                    is_local=True,
                    estimated_download_size=model_info.get("size")
                )
                
        except Exception as e:
            logger.warning("Error conectando con Ollama", error=str(e))
            return ModelValidationResult(
                model_id=model_id,
                status=ModelStatus.UNAVAILABLE,
                message=f"No se puede conectar con Ollama: {str(e)}",
                provider="ollama",
                is_local=True
            )
    
    async def _validate_whisper_model(
        self,
        model_id: str,
        model_info: Dict
    ) -> ModelValidationResult:
        """Validar modelo de Whisper (faster-whisper)."""
        import os
        from pathlib import Path
        
        # Verificar si el modelo está en cache
        models_path = Path(settings.MODELS_PATH) if hasattr(settings, 'MODELS_PATH') else Path("/app/models")
        model_path = models_path / f"faster-whisper-{model_id}"
        
        if model_path.exists():
            return ModelValidationResult(
                model_id=model_id,
                status=ModelStatus.AVAILABLE,
                message=f"Modelo Whisper {model_id} disponible localmente",
                provider="whisper",
                is_local=True
            )
        else:
            return ModelValidationResult(
                model_id=model_id,
                status=ModelStatus.NOT_DOWNLOADED,
                message=f"Modelo Whisper {model_id} se descargará automáticamente en el primer uso",
                provider="whisper",
                is_local=True,
                estimated_download_size=model_info.get("size")
            )
    
    async def _validate_cloud_model(
        self,
        model_id: str,
        model_info: Dict
    ) -> ModelValidationResult:
        """Validar modelo en la nube (requiere API key)."""
        required_key = model_info.get("api_key")
        provider = model_info["provider"]
        
        # Verificar si hay API key configurada
        has_key = self._has_api_key(required_key)
        
        if has_key:
            return ModelValidationResult(
                model_id=model_id,
                status=ModelStatus.AVAILABLE,
                message=f"Modelo {model_id} disponible ({provider})",
                provider=provider,
                is_local=False,
                requires_api_key=True
            )
        else:
            return ModelValidationResult(
                model_id=model_id,
                status=ModelStatus.NO_API_KEY,
                message=f"Se requiere API key de {provider} para usar {model_id}",
                provider=provider,
                is_local=False,
                requires_api_key=True
            )
    
    def _has_api_key(self, provider: str) -> bool:
        """Verificar si hay API key disponible para un proveedor."""
        # Primero verificar en keys del usuario
        if provider in self.user_api_keys:
            decrypted = get_decrypted_api_key(self.user_api_keys, provider)
            if decrypted:
                return True
        
        # Fallback a variables de entorno
        env_keys = {
            "openai": settings.OPENAI_API_KEY,
            "anthropic": settings.ANTHROPIC_API_KEY,
            "google": settings.GOOGLE_AI_API_KEY,
            "deepgram": getattr(settings, 'DEEPGRAM_API_KEY', ''),
            "deepseek": getattr(settings, 'DEEPSEEK_API_KEY', ''),
        }
        
        return bool(env_keys.get(provider))
    
    async def _get_ollama_models(self) -> List[str]:
        """Obtener lista de modelos instalados en Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                
                if response.status_code == 200:
                    data = response.json()
                    models = [m["name"].split(":")[0] for m in data.get("models", [])]
                    logger.debug("Modelos Ollama disponibles", models=models)
                    return models
                else:
                    logger.warning("Error obteniendo modelos Ollama", status=response.status_code)
                    return []
                    
        except Exception as e:
            logger.warning("No se puede conectar con Ollama", error=str(e))
            return []
    
    async def validate_all_models(self) -> Dict[str, ModelValidationResult]:
        """Validar todos los modelos del registro."""
        results = {}
        for model_id in MODEL_REGISTRY:
            results[model_id] = await self.validate_model(model_id)
        return results
    
    async def get_available_models(self, model_type: str = "llm") -> List[str]:
        """
        Obtener lista de modelos disponibles de un tipo específico.
        
        Args:
            model_type: "llm", "transcription", o "all"
            
        Returns:
            Lista de IDs de modelos disponibles
        """
        available = []
        
        for model_id, info in MODEL_REGISTRY.items():
            # Filtrar por tipo
            if model_type == "llm" and info["provider"] in ["whisper", "deepgram"]:
                continue
            if model_type == "transcription" and info["provider"] not in ["whisper", "deepgram", "openai"]:
                continue
            
            result = await self.validate_model(model_id)
            if result.status == ModelStatus.AVAILABLE:
                available.append(model_id)
        
        return available


async def get_best_available_model(
    preferred_model: str,
    user_api_keys: Optional[Dict[str, str]] = None,
    fallback_models: Optional[List[str]] = None
) -> Optional[str]:
    """
    Obtener el mejor modelo disponible, con fallbacks.
    
    Args:
        preferred_model: Modelo preferido por el usuario
        user_api_keys: API keys del usuario
        fallback_models: Lista de modelos de fallback en orden de preferencia
        
    Returns:
        ID del modelo disponible o None si ninguno está disponible
    """
    validator = ModelValidator(user_api_keys)
    
    # Intentar modelo preferido
    result = await validator.validate_model(preferred_model)
    if result.status == ModelStatus.AVAILABLE:
        return preferred_model
    
    logger.info(
        "Modelo preferido no disponible, buscando alternativa",
        preferred=preferred_model,
        reason=result.message
    )
    
    # Intentar fallbacks
    if fallback_models:
        for fallback in fallback_models:
            result = await validator.validate_model(fallback)
            if result.status == ModelStatus.AVAILABLE:
                logger.info("Usando modelo de fallback", model=fallback)
                return fallback
    
    # Último recurso: buscar cualquier modelo disponible
    available = await validator.get_available_models("llm")
    if available:
        logger.warning("Usando primer modelo disponible", model=available[0])
        return available[0]
    
    logger.error("No hay modelos LLM disponibles")
    return None

