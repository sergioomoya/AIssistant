"""
AIssistant - Tareas Asíncronas de Resumen
=========================================
Tareas Celery para generación de resúmenes asíncronos.
"""

from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from core.celery_app import celery_app
from core.database import async_session_maker
from models.transcript import Transcript
from models.meeting import Meeting

logger = structlog.get_logger()


@celery_app.task(
    name="features.summarization.tasks.generate_summary",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def generate_summary_task(self, transcript_id: int, user_id: int, meeting_type: str = "general"):
    """
    Generar resumen de transcripción de forma asíncrona.
    
    Args:
        transcript_id: ID de la transcripción
        user_id: ID del usuario (para obtener configuración)
        meeting_type: Tipo de reunión (SALES, TECHNICAL, GENERAL)
        
    Returns:
        Dict con summary_id y status
    """
    import asyncio
    
    async def _generate():
        async with async_session_maker() as db:
            try:
                # Obtener transcripción
                result = await db.execute(
                    select(Transcript).where(Transcript.id == transcript_id)
                )
                transcript = result.scalar_one_or_none()
                
                if not transcript:
                    raise ValueError(f"Transcript not found: {transcript_id}")
                
                logger.info("Generando resumen", transcript_id=transcript_id, meeting_type=meeting_type)
                
                # Obtener servicio LLM con configuración del usuario (LiteLLM)
                from features.summarization.llm_service_litellm import get_llm_service_for_user
                
                llm_service = await get_llm_service_for_user(user_id, db)
                
                # Obtener tipo de reunión desde metadata o usar GENERAL
                meeting_type = meeting_type or "GENERAL"
                
                # Generar resumen usando LiteLLM
                summary_result = await llm_service.generate_meeting_summary(
                    transcript_text=transcript.text,
                    context=meeting.context_notes if meeting else None,
                    meeting_type=meeting_type,
                )
                
                # Extraer action items
                action_items = await llm_service.extract_action_items(transcript.text)
                
                # Analizar sentimiento
                sentiment = await llm_service.analyze_sentiment(transcript.text)
                
                # Actualizar transcripción con resumen
                if not transcript.metadata:
                    transcript.metadata = {}
                
                transcript.metadata.update({
                    "summary": summary_result.get("summary", ""),
                    "key_points": summary_result.get("key_points", []),
                    "decisions": summary_result.get("decisions", []),
                    "action_items": action_items,
                    "sentiment": sentiment,
                    "meeting_type": meeting_type,
                })
                
                await db.commit()
                
                # Actualizar reunión
                result = await db.execute(
                    select(Meeting).where(Meeting.id == transcript.meeting_id)
                )
                meeting = result.scalar_one_or_none()
                if meeting:
                    if not meeting.metadata:
                        meeting.metadata = {}
                    meeting.metadata["summary_generated"] = True
                    await db.commit()
                
                logger.info("Resumen generado exitosamente", transcript_id=transcript_id)
                
                return {
                    "transcript_id": transcript_id,
                    "status": "completed",
                    "summary_length": len(summary_result.get("summary", "")),
                    "action_items_count": len(action_items),
                }
                
            except Exception as e:
                logger.error("Error generando resumen", error=str(e), transcript_id=transcript_id)
                raise self.retry(exc=e)
    
    # Crear nuevo event loop para la tarea
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(_generate())

