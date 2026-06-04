"""
AIssistant - Tareas Asíncronas de Reuniones
============================================
Tareas Celery para procesamiento asíncrono de reuniones.
"""

from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from core.celery_app import celery_app
from core.database import async_session_maker
from models.meeting import Meeting
from models.transcript import Transcript
from features.transcription.tasks import transcribe_audio_task
from features.summarization.tasks import generate_summary_task
from api.endpoints.tasks import publish_task_update_sync

logger = structlog.get_logger()


class DatabaseTask(Task):
    """Task base que proporciona sesión de base de datos."""
    
    _db: AsyncSession = None
    
    @property
    def db(self):
        if self._db is None:
            self._db = async_session_maker()
        return self._db
    
    def after_return(self, *args, **kwargs):
        """Cerrar sesión después de la tarea."""
        if self._db:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._db.close())
                else:
                    loop.run_until_complete(self._db.close())
            except RuntimeError:
                try:
                    asyncio.run(self._db.close())
                except:
                    pass
            self._db = None


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="features.meetings.tasks.process_meeting",
    max_retries=3,
    default_retry_delay=60,
)
def process_meeting_task(self, meeting_id: int):
    """
    Procesar una reunión completa de forma asíncrona.
    
    Flujo:
    1. Transcribir audio
    2. Diarizar (identificar hablantes)
    3. Generar resumen
    4. Extraer action items
    5. Actualizar estado de la reunión
    
    Args:
        meeting_id: ID de la reunión a procesar
    """
    import asyncio
    
    async def _process():
        db = self.db
        
        try:
            # Obtener reunión
            result = await db.execute(
                select(Meeting).where(Meeting.id == meeting_id)
            )
            meeting = result.scalar_one_or_none()
            
            if not meeting:
                logger.error("Reunión no encontrada", meeting_id=meeting_id)
                return {"error": "Meeting not found"}
            
            # Obtener task_id y actualizar en BD
            task_id = self.request.id
            meeting.task_id = task_id
            meeting.status = "processing"
            await db.commit()
            
            # Publicar actualización inicial
            publish_task_update_sync(task_id, "processing", 0.1, "Iniciando procesamiento...")
            
            logger.info("Iniciando procesamiento de reunión", meeting_id=meeting_id, task_id=task_id)
            
            # Obtener configuración del usuario
            from models.user import User
            user_result = await db.execute(select(User).where(User.id == meeting.user_id))
            user = user_result.scalar_one_or_none()
            
            user_config = {
                'api_keys': user.api_keys or {} if user else {},
            } if user else {}
            
            # 1. Transcribir audio
            if meeting.audio_file_path:
                publish_task_update_sync(task_id, "transcribing", 0.2, "Transcribiendo audio...")
                logger.info("Transcribiendo audio", meeting_id=meeting_id)
                
                # Llamar a tarea de transcripción directamente para evitar deadlock en ejecución monohilo
                transcribe_result = transcribe_audio_task(
                    self,
                    meeting.audio_file_path,
                    meeting_id,
                    meeting.user_id,
                    user_config
                )
                
                if transcribe_result.get("error"):
                    raise Exception(f"Error en transcripción: {transcribe_result['error']}")
                
                transcript_id = transcribe_result.get("transcript_id")
                
                # 2. Generar resumen
                if transcript_id:
                    publish_task_update_sync(task_id, "summarizing", 0.8, "Generando resumen con IA...")
                    logger.info("Generando resumen", meeting_id=meeting_id, transcript_id=transcript_id)
                    
                    # Llamar a tarea de resumen directamente para evitar deadlock
                    summary_result = generate_summary_task(
                        self,
                        transcript_id,
                        meeting.user_id
                    )
                    
                    if summary_result.get("error"):
                        logger.warning("Error generando resumen", error=summary_result.get("error"))
            
            # Actualizar estado final
            meeting.status = "completed"
            await db.commit()
            
            publish_task_update_sync(task_id, "completed", 1.0, "¡Procesamiento completado!")
            logger.info("Reunión procesada exitosamente", meeting_id=meeting_id)
            
            return {
                "meeting_id": meeting_id,
                "status": "completed",
                "transcript_id": transcript_id if 'transcript_id' in locals() else None,
            }
            
        except Exception as e:
            logger.error("Error procesando reunión", meeting_id=meeting_id, error=str(e))
            
            # Publicar error
            task_id = self.request.id
            publish_task_update_sync(task_id, "failed", 0, error=str(e))
            
            # Actualizar estado a error
            try:
                result = await db.execute(
                    select(Meeting).where(Meeting.id == meeting_id)
                )
                meeting = result.scalar_one_or_none()
                if meeting:
                    meeting.status = "failed"
                    await db.commit()
            except:
                pass
            
            # Re-lanzar excepción para retry
            raise self.retry(exc=e)
    
    # Ejecutar función asíncrona
    # Crear nuevo event loop para la tarea
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(_process())


@celery_app.task(
    name="features.meetings.tasks.update_meeting_status",
)
def update_meeting_status_task(meeting_id: int, status: str, progress: float = None):
    """
    Actualizar estado de una reunión.
    
    Args:
        meeting_id: ID de la reunión
        status: Nuevo estado (uploading, processing, transcribing, summarizing, completed, failed)
        progress: Progreso (0.0 a 1.0)
    """
    import asyncio
    
    async def _update():
        async with async_session_maker() as db:
            result = await db.execute(
                select(Meeting).where(Meeting.id == meeting_id)
            )
            meeting = result.scalar_one_or_none()
            
            if meeting:
                meeting.status = status
                if progress is not None:
                    # Guardar progreso en metadata si existe
                    if not meeting.meta_data:
                        meeting.meta_data = {}
                    meeting.meta_data["progress"] = progress
                
                await db.commit()
                logger.info("Estado actualizado", meeting_id=meeting_id, status=status, progress=progress)
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    loop.run_until_complete(_update())

