"""
AIssistant - Servicio de LLM con LiteLLM
========================================
Abstracción unificada para todos los LLMs usando LiteLLM.
Permite cambiar entre modelos locales (DeepSeek) y nube (GPT-5.2) sin reescribir código.
"""

from typing import Optional, Dict, List, Any
import structlog
import os

from core.config import settings
from features.privacy.api_keys import get_decrypted_api_key
from features.summarization.response_parser import (
    parse_meeting_summary,
    parse_action_items,
    parse_sentiment,
    MeetingSummary,
    ActionItem,
    SentimentAnalysis,
    MEETING_SUMMARY_JSON_PROMPT,
    ACTION_ITEMS_JSON_PROMPT,
    SENTIMENT_JSON_PROMPT,
)
from features.summarization.model_validator import get_best_available_model, ModelValidator

logger = structlog.get_logger()


class LiteLLMService:
    """
    Servicio unificado de LLM usando LiteLLM.
    
    Soporta:
    - Modelos locales: DeepSeek, Llama, Mistral (vía Ollama)
    - Modelos en nube: GPT-4o, Claude 3.5, Gemini, DeepSeek
    - Cambio dinámico sin reescribir código
    """
    
    def __init__(
        self,
        user_config: Optional[Dict] = None,
        deployment_mode: Optional[str] = None
    ):
        """
        Inicializar servicio LiteLLM.
        
        Args:
            user_config: Configuración del usuario desde BD
            deployment_mode: Modo de despliegue (local/hybrid/cloud)
        """
        self.user_config = user_config or {}
        self.deployment_mode = deployment_mode or settings.DEPLOYMENT_MODE
        self._litellm_client = None
        self._initialize_litellm()
    
    def _get_api_key(self, provider: str) -> Optional[str]:
        """Obtener API key del usuario (desencriptada) o del .env."""
        user_api_keys = self.user_config.get('api_keys', {})
        
        # Mapeo de providers a variables de entorno
        env_fallbacks = {
            'openai': settings.OPENAI_API_KEY,
            'anthropic': settings.ANTHROPIC_API_KEY,
            'google': settings.GOOGLE_AI_API_KEY,
            'deepseek': os.getenv('DEEPSEEK_API_KEY', ''),
        }
        
        return get_decrypted_api_key(
            user_api_keys,
            provider,
            env_fallbacks.get(provider)
        )
    
    def _get_llm_model(self) -> str:
        """
        Obtener modelo LLM preferido del usuario (Next-Gen 2026).
        
        Prioridad:
        1. Preferencia del usuario
        2. Configuración global (LLM_MODEL_NAME)
        3. Modelo por defecto según modo de despliegue
        """
        preferences = self.user_config.get('preferences', {})
        user_model = preferences.get('llm_model')
        
        # Determinar modelo base
        if user_model:
            base_model = user_model
        elif settings.LLM_MODEL_NAME:
            base_model = settings.LLM_MODEL_NAME
        elif self.deployment_mode == "local":
            base_model = "deepseek-r1"
        elif self.deployment_mode == "cloud":
            base_model = "gpt-5.2"
        else:
            base_model = "gpt-4o-mini"
        
        # Mapear a formato LiteLLM
        return self._map_model_to_litellm(base_model)
    
    def _map_model_to_litellm(self, model_id: str) -> str:
        """
        Mapear ID de modelo a formato LiteLLM.
        Actualizado: Enero 2026
        """
        model_mapping = {
            # ==========================================
            # OpenAI (2024-2025)
            # ==========================================
            'gpt-5': 'gpt-5',
            'o3': 'o3',
            'o1': 'o1',
            'gpt-4o': 'gpt-4o',
            'gpt-4o-mini': 'gpt-4o-mini',
            
            # ==========================================
            # Anthropic (2024-2025)
            # ==========================================
            'claude-3.7-sonnet': 'claude-3-7-sonnet-20251120',
            'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
            'claude-3-opus': 'claude-3-opus-20240229',
            
            # ==========================================
            # Google Gemini (2024-2025)
            # ==========================================
            'gemini-3-pro': 'gemini/gemini-3-pro',
            'gemini-2.5-pro': 'gemini/gemini-2.5-pro',
            'gemini-2.5-flash': 'gemini/gemini-2.5-flash',
            'gemini-2.0-flash': 'gemini/gemini-2.0-flash',
            
            # ==========================================
            # DeepSeek (2024-2025)
            # ==========================================
            'deepseek-r1': 'ollama/deepseek-r1',
            'deepseek-r1-api': 'deepseek/deepseek-r1',
            'deepseek-v3': 'deepseek/deepseek-v3',
            
            # ==========================================
            # xAI (2025)
            # ==========================================
            'grok-4': 'xai/grok-4',
            
            # ==========================================
            # Modelos locales (Ollama)
            # ==========================================
            'llama4': 'ollama/llama4',
            'llama3.2': 'ollama/llama3.2',
            'qwen2.5': 'ollama/qwen2.5',
            'mistral-large': 'ollama/mistral-large',
            'phi4': 'ollama/phi4',
        }
        
        mapped = model_mapping.get(model_id, model_id)
        
        # Si el modelo ya tiene prefijo, devolverlo
        if '/' in mapped or mapped.startswith(('gpt-', 'claude-', 'o1', 'o3')):
            return mapped
        
        # Asumir Ollama para modelos locales sin prefijo
        if self.deployment_mode == "local":
            return f"ollama/{mapped}"
        
        return mapped
    
    async def _get_validated_model(self) -> str:
        """
        Obtener modelo validado con fallbacks automáticos.
        
        Verifica disponibilidad y usa fallbacks si el modelo preferido
        no está disponible.
        """
        preferred = self._get_llm_model()
        # Extraer ID base del modelo (sin prefijo ollama/)
        base_id = preferred.split('/')[-1] if '/' in preferred else preferred
        
        # Definir fallbacks según modo de despliegue
        if self.deployment_mode == "local":
            fallbacks = ["llama3.2", "mistral", "phi3"]
        elif self.deployment_mode == "cloud":
            fallbacks = ["gpt-4o-mini", "claude-3-5-sonnet", "gemini-1.5-flash"]
        else:
            fallbacks = ["gpt-4o-mini", "deepseek-r1", "llama3.2"]
        
        # Validar y obtener mejor modelo disponible
        best_model = await get_best_available_model(
            base_id,
            self.user_config.get('api_keys', {}),
            fallbacks
        )
        
        if best_model:
            return self._map_model_to_litellm(best_model)
        
        # Último recurso: usar el modelo preferido y dejar que LiteLLM maneje el error
        logger.warning("No se pudo validar ningún modelo, usando preferido", model=preferred)
        return preferred
    
    def _initialize_litellm(self):
        """Inicializar LiteLLM con configuración de API keys."""
        try:
            import litellm
            
            # Configurar API keys para LiteLLM
            api_keys = {}
            
            if openai_key := self._get_api_key('openai'):
                api_keys['openai'] = openai_key
                os.environ['OPENAI_API_KEY'] = openai_key
            
            if anthropic_key := self._get_api_key('anthropic'):
                api_keys['anthropic'] = anthropic_key
                os.environ['ANTHROPIC_API_KEY'] = anthropic_key
            
            if google_key := self._get_api_key('google'):
                api_keys['google'] = google_key
                os.environ['GOOGLE_API_KEY'] = google_key
            
            if deepseek_key := self._get_api_key('deepseek'):
                api_keys['deepseek'] = deepseek_key
                os.environ['DEEPSEEK_API_KEY'] = deepseek_key
            
            # Añadir DeepSeek desde config si está disponible
            if settings.DEEPSEEK_API_KEY:
                os.environ['DEEPSEEK_API_KEY'] = settings.DEEPSEEK_API_KEY
            
            # Configurar Ollama si está en modo local
            if self.deployment_mode == "local":
                os.environ['OLLAMA_API_BASE'] = settings.OLLAMA_BASE_URL
            
            self._litellm_client = litellm
            logger.info("LiteLLM inicializado", providers=list(api_keys.keys()))
            
        except ImportError:
            logger.warning("LiteLLM no instalado. Usando implementación fallback.")
            self._litellm_client = None
    
    def _supports_json_mode(self, model: str) -> bool:
        """Verificar si el modelo soporta response_format JSON."""
        json_mode_models = [
            'gpt-4', 'gpt-3.5', 'gpt-5',  # OpenAI
            'claude-3',  # Anthropic (parcial)
            'gemini',  # Google
        ]
        model_lower = model.lower()
        return any(m in model_lower for m in json_mode_models)
    
    async def generate_meeting_summary(
        self,
        transcript_text: str,
        context: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        meeting_type: str = "GENERAL",
        max_length: int = 1000
    ) -> MeetingSummary:
        """
        Generar resumen de reunión usando LiteLLM con parsing robusto.
        
        Args:
            transcript_text: Texto de la transcripción
            context: Contexto adicional
            custom_prompt: Prompt personalizado
            meeting_type: Tipo de reunión (SALES, TECHNICAL, GENERAL, MANAGEMENT)
            max_length: Longitud máxima del resumen
            
        Returns:
            MeetingSummary con summary, key_points, decisions, action_items, etc.
        """
        if not self._litellm_client:
            raise RuntimeError("LiteLLM no está disponible")
        
        from features.summarization.prompts import get_prompt_for_type
        
        # Usar prompt optimizado para JSON + prompt del tipo de reunión
        base_prompt = MEETING_SUMMARY_JSON_PROMPT
        type_prompt = get_prompt_for_type(meeting_type)
        
        if custom_prompt:
            prompt = f"{base_prompt}\n\n{custom_prompt}"
        else:
            prompt = f"{base_prompt}\n\nInstrucciones adicionales:\n{type_prompt}"
        
        # Añadir contexto si existe
        if context:
            prompt = f"{prompt}\n\nContexto previo: {context}"
        
        # Añadir transcripción (limitada para no exceder tokens)
        prompt = f"{prompt}\n\nTranscripción:\n---\n{transcript_text[:15000]}\n---"
        
        model = self._get_llm_model()
        
        try:
            import litellm
            
            # Configurar response_format si el modelo lo soporta
            extra_params = {}
            if self._supports_json_mode(model):
                extra_params["response_format"] = {"type": "json_object"}
            
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {
                        "role": "system", 
                        "content": "Eres un asistente experto en análisis de reuniones. "
                                   "SIEMPRE respondes con JSON válido, sin texto adicional."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=settings.SUMMARY_TEMPERATURE,
                max_tokens=settings.SUMMARY_MAX_TOKENS,
                **extra_params
            )
            
            content = response.choices[0].message.content
            
            # Usar parser robusto
            result = parse_meeting_summary(content)
            
            logger.info(
                "Resumen generado exitosamente",
                model=model,
                key_points_count=len(result.key_points),
                action_items_count=len(result.action_items)
            )
            
            return result
            
        except Exception as e:
            logger.error("Error generando resumen con LiteLLM", error=str(e), model=model)
            raise
    
    async def analyze_sentiment(self, text: str) -> SentimentAnalysis:
        """Analizar sentimiento de la conversación con parsing robusto."""
        if not self._litellm_client:
            return SentimentAnalysis(sentiment="neutral", score=0.5)
        
        prompt = f"""{SENTIMENT_JSON_PROMPT}

Transcripción:
---
{text[:10000]}
---"""

        model = self._get_llm_model()
        
        try:
            import litellm
            
            extra_params = {}
            if self._supports_json_mode(model):
                extra_params["response_format"] = {"type": "json_object"}
            
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": "Eres un analista de sentimientos. Responde SOLO con JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200,
                **extra_params
            )
            
            # Usar parser robusto
            return parse_sentiment(response.choices[0].message.content)
                
        except Exception as e:
            logger.error("Error analizando sentimiento", error=str(e))
            return SentimentAnalysis(sentiment="neutral", score=0.5)
    
    async def extract_action_items(self, transcript_text: str) -> List[ActionItem]:
        """Extraer elementos de acción de la transcripción con parsing robusto."""
        if not self._litellm_client:
            return []
        
        prompt = f"""{ACTION_ITEMS_JSON_PROMPT}

Transcripción:
---
{transcript_text[:12000]}
---"""

        model = self._get_llm_model()
        
        try:
            import litellm
            
            extra_params = {}
            if self._supports_json_mode(model):
                extra_params["response_format"] = {"type": "json_object"}
            
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": "Eres un asistente que extrae tareas. Responde SOLO con JSON array válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000,
                **extra_params
            )
            
            # Usar parser robusto
            items = parse_action_items(response.choices[0].message.content)
            
            logger.info("Action items extraídos", count=len(items), model=model)
            return items
                
        except Exception as e:
            logger.error("Error extrayendo action items", error=str(e))
            return []
    
    async def chat_about_meeting(
        self,
        transcript_text: str,
        user_message: str,
        meeting_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """Responder preguntas sobre la reunión."""
        if not self._litellm_client:
            raise RuntimeError("LiteLLM no está disponible")
        
        context = f"""Transcripción de la reunión:
---
{transcript_text[:12000]}
---

{f'Resumen de la reunión: {meeting_summary}' if meeting_summary else ''}"""

        prompt = f"""{context}

Pregunta del usuario: {user_message}

Responde de forma clara y concisa. Si citas partes de la transcripción, indícalo."""

        model = self._get_llm_model()
        
        try:
            import litellm
            
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": "Eres un asistente de reuniones. Responde basándote únicamente en la transcripción proporcionada."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
            )
            
            return {
                "answer": response.choices[0].message.content,
                "sources": None
            }
            
        except Exception as e:
            logger.error("Error en chat", error=str(e))
            raise


# Factory function para mantener compatibilidad
async def get_llm_service_for_user(user_id: int, db) -> LiteLLMService:
    """
    Factory function para crear LiteLLMService con la configuración del usuario.
    
    Args:
        user_id: ID del usuario
        db: Sesión de base de datos
        
    Returns:
        LiteLLMService configurado para el usuario
    """
    from sqlalchemy import select
    from models.user import User
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user:
        return LiteLLMService(
            user_config={
                'api_keys': user.api_keys or {},
                'preferences': user.preferences or {},
            },
            deployment_mode=user.deployment_mode
        )
    
    # Fallback a configuración por defecto
    return LiteLLMService()

