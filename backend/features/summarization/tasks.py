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
    
    Genera:
    - Resumen ejecutivo
    - Puntos clave
    - Decisiones tomadas
    - Action items con responsables
    - Análisis de sentimiento
    
    Args:
        transcript_id: ID de la transcripción
        user_id: ID del usuario (para obtener configuración)
        meeting_type: Tipo de reunión (SALES, TECHNICAL, GENERAL, MANAGEMENT)
        
    Returns:
        Dict con summary_id y status
    """
    import asyncio
    from models.action_item import ActionItem
    
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
                
                # Obtener reunión primero para context
                result = await db.execute(
                    select(Meeting).where(Meeting.id == transcript.meeting_id)
                )
                meeting = result.scalar_one_or_none()
                
                logger.info(
                    "Generando resumen",
                    transcript_id=transcript_id,
                    meeting_id=meeting.id if meeting else None,
                    meeting_type=meeting_type
                )
                
                # Obtener servicio LLM con configuración del usuario (LiteLLM)
                from features.summarization.llm_service_litellm import get_llm_service_for_user
                
                llm_service = await get_llm_service_for_user(user_id, db)
                
                # Obtener tipo de reunión desde metadata o usar GENERAL
                final_meeting_type = meeting_type.upper() if meeting_type else "GENERAL"
                
                # Obtener contexto de la reunión si existe
                context = None
                if meeting and meeting.context_notes:
                    context = meeting.context_notes
                
                # Obtener texto de transcripción
                transcript_text = transcript.full_text or ""
                if not transcript_text and hasattr(transcript, 'segments'):
                    # Construir desde segmentos si no hay full_text
                    segments = transcript.segments or []
                    transcript_text = " ".join([seg.text for seg in segments if seg.text])
                
                if not transcript_text:
                    logger.warning("Transcripción vacía", transcript_id=transcript_id)
                    return {"transcript_id": transcript_id, "status": "skipped", "reason": "empty_transcript"}
                
                # Generar resumen usando LiteLLM
                summary_result = await llm_service.generate_meeting_summary(
                    transcript_text=transcript_text,
                    context=context,
                    meeting_type=final_meeting_type,
                )
                
                # Extraer action items estructurados
                action_items_data = await llm_service.extract_action_items(transcript_text)
                
                # Analizar sentimiento
                sentiment = await llm_service.analyze_sentiment(transcript_text)
                
                # Actualizar reunión con resultados
                if meeting:
                    meeting.summary = summary_result.get("summary", "")
                    meeting.key_points = summary_result.get("key_points", [])
                    meeting.decisions = summary_result.get("decisions", [])
                    
                    # Actualizar sentimiento
                    if sentiment:
                        meeting.sentiment = sentiment.get("overall", "neutral")
                        meeting.sentiment_score = sentiment.get("score", 0.5)
                        meeting.sentiment_details = sentiment
                    
                    # Actualizar metadata
                    if not meeting.metadata:
                        meeting.metadata = {}
                    meeting.metadata.update({
                        "summary_generated": True,
                        "summary_generated_at": str(asyncio.get_event_loop().time()),
                        "meeting_type": final_meeting_type,
                    })
                    
                    # Guardar action items como entidades separadas
                    if action_items_data:
                        for item_data in action_items_data:
                            # Obtener responsable (puede venir con diferentes nombres de campo)
                            assignee = item_data.get("assignee") or item_data.get("responsible") or item_data.get("owner", "")
                            
                            action_item = ActionItem(
                                meeting_id=meeting.id,
                                title=item_data.get("title", item_data.get("task", item_data.get("description", "Sin título")[:500])),
                                description=item_data.get("description", ""),
                                assignee_name=assignee if isinstance(assignee, str) else None,
                                due_date=None,  # TODO: Parsear fecha si viene en formato string
                                priority=item_data.get("priority", "medium"),
                                status="pending",
                                created_by="ai",
                            )
                            db.add(action_item)
                    
                    await db.commit()
                
                logger.info(
                    "Resumen generado exitosamente",
                    transcript_id=transcript_id,
                    summary_length=len(summary_result.get("summary", "")),
                    key_points_count=len(summary_result.get("key_points", [])),
                    action_items_count=len(action_items_data or []),
                )
                
                return {
                    "transcript_id": transcript_id,
                    "meeting_id": meeting.id if meeting else None,
                    "status": "completed",
                    "summary_length": len(summary_result.get("summary", "")),
                    "key_points_count": len(summary_result.get("key_points", [])),
                    "decisions_count": len(summary_result.get("decisions", [])),
                    "action_items_count": len(action_items_data or []),
                    "sentiment": sentiment.get("overall") if sentiment else None,
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

