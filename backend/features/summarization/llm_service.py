"""
DEPRECADO: Este módulo ha sido reemplazado por llm_service_litellm.py

Mantener este archivo solo por compatibilidad hacia atrás.
Usa LiteLLMService de llm_service_litellm.py para nuevos desarrollos.
"""

import warnings
from features.summarization.llm_service_litellm import LiteLLMService, get_llm_service_for_user

# Alias para compatibilidad
LLMService = LiteLLMService

warnings.warn(
    "LLMService de llm_service.py está deprecado. "
    "Usa LiteLLMService de llm_service_litellm.py",
    DeprecationWarning,
    stacklevel=2
)

__all__ = ["LLMService", "get_llm_service_for_user"]
