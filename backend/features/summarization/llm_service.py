"""
AIssistant - Servicio de LLM para Resúmenes e Inteligencia
==========================================================
Integración con OpenAI, Anthropic, Google y Ollama.
"""

from typing import Optional, Dict, List, Any
import structlog

from core.config import settings

logger = structlog.get_logger()


class LLMService:
    """
    Servicio unificado para interactuar con diferentes LLMs.
    
    Soporta:
    - OpenAI (GPT-4, GPT-3.5)
    - Anthropic (Claude)
    - Google (Gemini)
    - Ollama (modelos locales)
    """
    
    # Prompts del sistema
    SYSTEM_PROMPT_SUMMARY = """Eres un asistente especializado en analizar transcripciones de reuniones de trabajo.
Tu tarea es generar resúmenes ejecutivos claros, concisos y orientados a la acción.

Directrices:
- Sé conciso pero completo
- Usa lenguaje profesional
- Destaca los puntos más importantes
- Identifica decisiones tomadas
- Responde en el mismo idioma que la transcripción"""

    SYSTEM_PROMPT_CHAT = """Eres un asistente de reuniones que ayuda a los usuarios a encontrar información en transcripciones.
Tienes acceso a la transcripción de una reunión y debes responder preguntas sobre ella.

Directrices:
- Basa tus respuestas únicamente en la transcripción proporcionada
- Si no encuentras la información, indícalo claramente
- Sé conciso y directo
- Cita partes relevantes cuando sea útil
- Responde en el mismo idioma de la pregunta"""

    def __init__(self):
        self.deployment_mode = settings.DEPLOYMENT_MODE
        self._clients = {}
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Inicializar clientes según el modo de despliegue."""
        if self.deployment_mode == "local":
            # Solo Ollama para modo local
            self._init_ollama()
        else:
            # Inicializar clientes disponibles según API keys
            if settings.OPENAI_API_KEY:
                self._init_openai()
            if settings.ANTHROPIC_API_KEY:
                self._init_anthropic()
            if settings.GOOGLE_AI_API_KEY:
                self._init_google()
            # Ollama como fallback
            self._init_ollama()
    
    def _init_openai(self):
        """Inicializar cliente de OpenAI."""
        try:
            from openai import AsyncOpenAI
            self._clients["openai"] = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("Cliente OpenAI inicializado")
        except Exception as e:
            logger.warning("No se pudo inicializar OpenAI", error=str(e))
    
    def _init_anthropic(self):
        """Inicializar cliente de Anthropic."""
        try:
            import anthropic
            self._clients["anthropic"] = anthropic.AsyncAnthropic(
                api_key=settings.ANTHROPIC_API_KEY
            )
            logger.info("Cliente Anthropic inicializado")
        except Exception as e:
            logger.warning("No se pudo inicializar Anthropic", error=str(e))
    
    def _init_google(self):
        """Inicializar cliente de Google AI."""
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
            self._clients["google"] = genai
            logger.info("Cliente Google AI inicializado")
        except Exception as e:
            logger.warning("No se pudo inicializar Google AI", error=str(e))
    
    def _init_ollama(self):
        """Inicializar cliente de Ollama."""
        try:
            import ollama
            self._clients["ollama"] = ollama
            logger.info("Cliente Ollama inicializado")
        except Exception as e:
            logger.warning("No se pudo inicializar Ollama", error=str(e))
    
    def _get_preferred_client(self) -> tuple:
        """Obtener cliente preferido según configuración."""
        if self.deployment_mode == "local":
            if "ollama" in self._clients:
                return ("ollama", self._clients["ollama"])
        else:
            # Preferencia: OpenAI > Anthropic > Google > Ollama
            for provider in ["openai", "anthropic", "google", "ollama"]:
                if provider in self._clients:
                    return (provider, self._clients[provider])
        
        raise RuntimeError("No hay ningún cliente LLM disponible")
    
    async def generate_meeting_summary(
        self,
        transcript_text: str,
        context: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        max_length: int = 1000
    ) -> Dict[str, Any]:
        """
        Generar resumen de reunión.
        
        Args:
            transcript_text: Texto de la transcripción
            context: Contexto adicional (notas pre-reunión)
            custom_prompt: Prompt personalizado
            max_length: Longitud máxima del resumen
            
        Returns:
            Dict con summary, key_points, decisions
        """
        prompt = custom_prompt or f"""Analiza la siguiente transcripción de reunión y genera:

1. **Resumen Ejecutivo**: Un párrafo conciso (máximo {max_length // 3} palabras) con los puntos más importantes.

2. **Puntos Clave**: Lista de 3-7 puntos principales discutidos.

3. **Decisiones Tomadas**: Lista de decisiones acordadas durante la reunión.

{f'Contexto previo de la reunión: {context}' if context else ''}

Transcripción:
---
{transcript_text[:15000]}  
---

Responde en formato JSON con las claves: "summary", "key_points" (array), "decisions" (array)"""

        provider, client = self._get_preferred_client()
        
        try:
            if provider == "openai":
                response = await self._call_openai(
                    client,
                    self.SYSTEM_PROMPT_SUMMARY,
                    prompt,
                    json_mode=True
                )
            elif provider == "anthropic":
                response = await self._call_anthropic(
                    client,
                    self.SYSTEM_PROMPT_SUMMARY,
                    prompt
                )
            elif provider == "google":
                response = await self._call_google(client, prompt)
            else:  # ollama
                response = await self._call_ollama(
                    client,
                    self.SYSTEM_PROMPT_SUMMARY,
                    prompt
                )
            
            # Parsear respuesta JSON
            import json
            try:
                result = json.loads(response)
            except json.JSONDecodeError:
                # Si no es JSON válido, extraer manualmente
                result = {
                    "summary": response,
                    "key_points": [],
                    "decisions": []
                }
            
            return result
            
        except Exception as e:
            logger.error("Error generando resumen", error=str(e), provider=provider)
            raise
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analizar sentimiento de la conversación.
        
        Returns:
            Dict con sentiment (positive/neutral/negative/mixed) y score (0-1)
        """
        prompt = f"""Analiza el sentimiento general de la siguiente conversación.

Transcripción:
---
{text[:10000]}
---

Responde en formato JSON con:
- "sentiment": "positive", "neutral", "negative" o "mixed"
- "score": número entre 0 (muy negativo) y 1 (muy positivo)
- "explanation": breve explicación del análisis"""

        provider, client = self._get_preferred_client()
        
        try:
            if provider == "openai":
                response = await self._call_openai(client, "", prompt, json_mode=True)
            elif provider == "anthropic":
                response = await self._call_anthropic(client, "", prompt)
            elif provider == "google":
                response = await self._call_google(client, prompt)
            else:
                response = await self._call_ollama(client, "", prompt)
            
            import json
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                return {"sentiment": "neutral", "score": 0.5}
                
        except Exception as e:
            logger.error("Error analizando sentimiento", error=str(e))
            return {"sentiment": "neutral", "score": 0.5}
    
    async def extract_action_items(self, transcript_text: str) -> List[Dict]:
        """
        Extraer elementos de acción de la transcripción.
        
        Returns:
            Lista de dicts con title, description, assignee, due_date
        """
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

        provider, client = self._get_preferred_client()
        
        try:
            if provider == "openai":
                response = await self._call_openai(client, "", prompt, json_mode=True)
            elif provider == "anthropic":
                response = await self._call_anthropic(client, "", prompt)
            elif provider == "google":
                response = await self._call_google(client, prompt)
            else:
                response = await self._call_ollama(client, "", prompt)
            
            import json
            try:
                return json.loads(response)
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
        """
        Responder preguntas sobre la reunión.
        
        Returns:
            Dict con answer y sources (referencias en la transcripción)
        """
        context = f"""Transcripción de la reunión:
---
{transcript_text[:12000]}
---

{f'Resumen de la reunión: {meeting_summary}' if meeting_summary else ''}"""

        prompt = f"""{context}

Pregunta del usuario: {user_message}

Responde de forma clara y concisa. Si citas partes de la transcripción, indícalo."""

        provider, client = self._get_preferred_client()
        
        try:
            if provider == "openai":
                response = await self._call_openai(
                    client,
                    self.SYSTEM_PROMPT_CHAT,
                    prompt
                )
            elif provider == "anthropic":
                response = await self._call_anthropic(
                    client,
                    self.SYSTEM_PROMPT_CHAT,
                    prompt
                )
            elif provider == "google":
                response = await self._call_google(client, prompt)
            else:
                response = await self._call_ollama(
                    client,
                    self.SYSTEM_PROMPT_CHAT,
                    prompt
                )
            
            return {"answer": response, "sources": None}
            
        except Exception as e:
            logger.error("Error en chat", error=str(e))
            raise
    
    # ========== Métodos privados para cada proveedor ==========
    
    async def _call_openai(
        self,
        client,
        system_prompt: str,
        user_prompt: str,
        json_mode: bool = False
    ) -> str:
        """Llamar a OpenAI API."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})
        
        kwargs = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": settings.SUMMARY_TEMPERATURE,
            "max_tokens": settings.SUMMARY_MAX_TOKENS
        }
        
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        response = await client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    
    async def _call_anthropic(
        self,
        client,
        system_prompt: str,
        user_prompt: str
    ) -> str:
        """Llamar a Anthropic API."""
        message = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=settings.SUMMARY_MAX_TOKENS,
            system=system_prompt if system_prompt else "Eres un asistente útil.",
            messages=[{"role": "user", "content": user_prompt}]
        )
        return message.content[0].text
    
    async def _call_google(self, client, prompt: str) -> str:
        """Llamar a Google AI API."""
        model = client.GenerativeModel("gemini-1.5-flash")
        response = await model.generate_content_async(prompt)
        return response.text
    
    async def _call_ollama(
        self,
        client,
        system_prompt: str,
        user_prompt: str
    ) -> str:
        """Llamar a Ollama (local)."""
        import asyncio
        
        # Ollama client es sincrónico, ejecutar en thread pool
        loop = asyncio.get_event_loop()
        
        def _sync_call():
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_prompt})
            
            response = client.chat(
                model=settings.OLLAMA_MODEL,
                messages=messages
            )
            return response["message"]["content"]
        
        return await loop.run_in_executor(None, _sync_call)

