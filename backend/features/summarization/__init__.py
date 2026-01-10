"""
Summarization feature - Generación de resúmenes con LLM.

Usa LiteLLMService para abstracción unificada de todos los LLMs.
"""

from features.summarization.llm_service_litellm import LiteLLMService, get_llm_service_for_user
from features.summarization.response_parser import (
    parse_meeting_summary,
    parse_action_items,
    parse_sentiment,
)

__all__ = [
    "LiteLLMService",
    "get_llm_service_for_user",
    "parse_meeting_summary",
    "parse_action_items", 
    "parse_sentiment",
]
