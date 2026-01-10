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
        
        # Si el usuario tiene un modelo configurado, usarlo
        if user_model:
            # Mapear modelos a formato LiteLLM (Next-Gen 2026)
            model_mapping = {
                # Next-Gen 2026 Models
                'gpt-5.2': 'gpt-5.2',  # Cuando esté disponible
                'gpt-5': 'gpt-5',
                'deepseek-r1': 'ollama/deepseek-r1',  # Local vía Ollama
                'deepseek-r1-api': 'deepseek/deepseek-r1',  # API
                # Modelos actuales
                'gpt-4o-mini': 'gpt-4o-mini',
                'gpt-4o': 'gpt-4o',
                'gpt-4-turbo': 'gpt-4-turbo-preview',
                'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
                'claude-3-opus': 'claude-3-opus-20240229',
                'gemini-1.5-flash': 'gemini/gemini-1.5-flash',
                'gemini-1.5-pro': 'gemini/gemini-1.5-pro',
                'deepseek-chat': 'deepseek/deepseek-chat',
                'deepseek-coder': 'deepseek/deepseek-coder',
                # Modelos locales (Ollama)
                'llama3.2': 'ollama/llama3.2',
                'llama3.1': 'ollama/llama3.1',
                'mistral': 'ollama/mistral',
                'phi3': 'ollama/phi3',
            }
            
            mapped_model = model_mapping.get(user_model, user_model)
            # Si el modelo ya tiene el prefijo correcto, usarlo directamente
            if '/' in mapped_model or mapped_model.startswith('gpt-') or mapped_model.startswith('claude-'):
                return mapped_model
            # Si no, asumir que es un modelo de Ollama
            if self.deployment_mode == "local":
                return f"ollama/{mapped_model}"
            return mapped_model
        
        # Fallback a configuración global
        if settings.LLM_MODEL_NAME:
            return settings.LLM_MODEL_NAME
        
        # Fallback por modo de despliegue
        if self.deployment_mode == "local":
            return "ollama/deepseek-r1"  # Next-Gen 2026: DeepSeek R1 local
        elif self.deployment_mode == "cloud":
            return "gpt-5.2"  # Next-Gen 2026: GPT-5.2 en nube
        else:
            return "gpt-4o-mini"  # Híbrido: modelo balanceado
    
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
    
    async def generate_meeting_summary(
        self,
        transcript_text: str,
        context: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        meeting_type: str = "GENERAL",
        max_length: int = 1000
    ) -> Dict[str, Any]:
        """
        Generar resumen de reunión usando LiteLLM.
        
        Args:
            transcript_text: Texto de la transcripción
            context: Contexto adicional
            custom_prompt: Prompt personalizado
            meeting_type: Tipo de reunión (SALES, TECHNICAL, GENERAL, MANAGEMENT)
            max_length: Longitud máxima del resumen
            
        Returns:
            Dict con summary, key_points, decisions, etc.
        """
        if not self._litellm_client:
            raise RuntimeError("LiteLLM no está disponible")
        
        from features.summarization.prompts import get_prompt_for_type
        
        # Usar prompt personalizado o el del tipo de reunión
        if custom_prompt:
            prompt = custom_prompt
        else:
            prompt = get_prompt_for_type(meeting_type)
        
        # Añadir contexto si existe
        if context:
            prompt = f"{prompt}\n\nContexto previo: {context}"
        
        # Añadir transcripción
        prompt = f"{prompt}\n\nTranscripción:\n---\n{transcript_text[:15000]}\n---"
        
        model = self._get_llm_model()
        
        try:
            import litellm
            
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": "Eres un asistente experto en análisis de reuniones. Responde siempre en formato JSON válido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=settings.SUMMARY_TEMPERATURE,
                max_tokens=settings.SUMMARY_MAX_TOKENS,
                response_format={"type": "json_object"} if "gpt" in model.lower() or "claude" in model.lower() else None,
            )
            
            content = response.choices[0].message.content
            
            # Parsear JSON
            import json
            try:
                result = json.loads(content)
            except json.JSONDecodeError:
                # Si no es JSON válido, crear estructura básica
                result = {
                    "summary": content,
                    "key_points": [],
                    "decisions": [],
                }
            
            return result
            
        except Exception as e:
            logger.error("Error generando resumen con LiteLLM", error=str(e), model=model)
            raise
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analizar sentimiento de la conversación."""
        if not self._litellm_client:
            return {"sentiment": "neutral", "score": 0.5}
        
        prompt = f"""Analiza el sentimiento general de la siguiente conversación.

Transcripción:
---
{text[:10000]}
---

Responde en formato JSON con:
- "sentiment": "positive", "neutral", "negative" o "mixed"
- "score": número entre 0 (muy negativo) y 1 (muy positivo)
- "explanation": breve explicación del análisis"""

        model = self._get_llm_model()
        
        try:
            import litellm
            
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": "Eres un analista de sentimientos. Responde en JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=200,
            )
            
            import json
            try:
                return json.loads(response.choices[0].message.content)
            except json.JSONDecodeError:
                return {"sentiment": "neutral", "score": 0.5}
                
        except Exception as e:
            logger.error("Error analizando sentimiento", error=str(e))
            return {"sentiment": "neutral", "score": 0.5}
    
    async def extract_action_items(self, transcript_text: str) -> List[Dict]:
        """Extraer elementos de acción de la transcripción."""
        if not self._litellm_client:
            return []
        
        prompt = f"""Extrae los elementos de acción (tareas, compromisos, próximos pasos) de esta transcripción.

Transcripción:
---
{transcript_text[:12000]}
---

Para cada elemento de acción, identifica:
- "title": descripción corta de la tarea
- "description": detalles adicionales si los hay
- "assignee": persona responsable (si se menciona)
- "due_date": fecha límite (si se menciona, formato YYYY-MM-DD)

Responde en formato JSON como array de objetos."""

        model = self._get_llm_model()
        
        try:
            import litellm
            
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": "Eres un asistente que extrae tareas. Responde en JSON array."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000,
            )
            
            import json
            try:
                return json.loads(response.choices[0].message.content)
            except json.JSONDecodeError:
                return []
                
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

