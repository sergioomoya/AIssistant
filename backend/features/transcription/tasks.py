"""
AIssistant - Tareas Asíncronas de Transcripción
===============================================
Tareas Celery para transcripción y diarización asíncrona.
"""

from celery import Task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog
import os

from core.celery_app import celery_app
from core.database import async_session_maker
from models.transcript import Transcript
from models.meeting import Meeting

logger = structlog.get_logger()


@celery_app.task(
    name="features.transcription.tasks.transcribe_audio",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def transcribe_audio_task(self, audio_file_path: str, meeting_id: int, user_id: int, user_config: Optional[Dict] = None):
    """
    Transcribir archivo de audio de forma asíncrona.
    
    Args:
        audio_file_path: Ruta al archivo de audio
        meeting_id: ID de la reunión
        user_id: ID del usuario propietario
        
    Returns:
        Dict con transcript_id y status
    """
    import asyncio
    
    async def _transcribe():
        async with async_session_maker() as db:
            try:
                # Verificar que el archivo existe
                if not os.path.exists(audio_file_path):
                    raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
                
                # Desencriptar archivo si está encriptado
                decrypted_path = audio_file_path
                if audio_file_path.endswith('.encrypted'):
                    from features.privacy.encryption import get_encryption_service
                    encryption_service = get_encryption_service()
                    decrypted_path = encryption_service.decrypt_file(audio_file_path)
                    logger.info("Archivo desencriptado para transcripción", meeting_id=meeting_id)
                
                logger.info("Iniciando transcripción", audio_file_path=decrypted_path, meeting_id=meeting_id)
                
                # Obtener configuración del usuario para diarización
                if not user_config:
                    from sqlalchemy import select
                    from models.user import User
                    user_result = await db.execute(select(User).where(User.id == user_id))
                    user = user_result.scalar_one_or_none()
                    
                    user_config = {
                        'api_keys': user.api_keys or {} if user else {},
                    }
                
                # Importar aquí para evitar problemas de importación circular
                from features.transcription.whisper_engine import TranscriptionEngine
                from features.transcription.diarization import DiarizationService
                
                # Inicializar motores
                transcription_engine = TranscriptionEngine()
                await transcription_engine.initialize()
                
                diarization_service = DiarizationService(user_config=user_config)
                
                # 1. Transcribir con Whisper
                logger.info("Transcribiendo con Whisper", meeting_id=meeting_id)
                transcription_result = await transcription_engine.transcribe_file(decrypted_path)
                
                # 2. Diarizar (identificar hablantes)
                logger.info("Diarizando audio", meeting_id=meeting_id)
                diarization_result = await diarization_service.run(decrypted_path)
                
                # Limpiar archivo desencriptado temporal si existe
                if decrypted_path != audio_file_path and os.path.exists(decrypted_path):
                    os.remove(decrypted_path)
                    logger.info("Archivo temporal desencriptado eliminado", meeting_id=meeting_id)
                
                # 3. Combinar transcripción con diarización
                combined_segments = []
                for segment in transcription_result.get("segments", []):
                    # Buscar speaker para este segmento
                    speaker = diarization_service.get_speaker_for_time(
                        segment["start"],
                        segment["end"],
                        diarization_result
                    )
                    
                    combined_segments.append({
                        "start": segment["start"],
                        "end": segment["end"],
                        "text": segment["text"],
                        "speaker": speaker or "unknown",
                        "confidence": segment.get("confidence", 0.0),
                    })
                
                # 4. Redactar PII si está habilitado
                transcript_text = " ".join([s["text"] for s in combined_segments])
                
                # Verificar si el usuario tiene PII redaction habilitado
                from sqlalchemy import select
                from models.user import User
                user_result = await db.execute(select(User).where(User.id == user_id))
                user = user_result.scalar_one_or_none()
                
                if user and user.pii_redaction_enabled:
                    from features.privacy.pii_scrubber import get_pii_scrubber
                    pii_scrubber = await get_pii_scrubber()
                    
                    # Redactar PII del texto
                    scrubbed_result = await pii_scrubber.scrub_transcript(
                        transcript_text,
                        language=transcription_result.get("language", "es")
                    )
                    
                    # Actualizar segmentos con texto redactado
                    # (Nota: Esto es una aproximación simple, idealmente se redactaría por segmento)
                    if scrubbed_result != transcript_text:
                        logger.info(
                            "PII redactado en transcripción",
                            meeting_id=meeting_id,
                            redactions=len(transcript_text) - len(scrubbed_result)
                        )
                        transcript_text = scrubbed_result
                
                # 5. Crear transcripción en BD
                
                new_transcript = Transcript(
                    meeting_id=meeting_id,
                    user_id=user_id,
                    text=transcript_text,
                    language=transcription_result.get("language", "es"),
                    segments=combined_segments,
                    metadata={
                        "duration": transcription_result.get("duration", 0),
                        "model": transcription_result.get("model", "unknown"),
                        "speakers": diarization_service.get_speaker_count(diarization_result),
                    }
                )
                
                db.add(new_transcript)
                await db.commit()
                await db.refresh(new_transcript)
                
                # Actualizar reunión con transcript_id
                result = await db.execute(
                    select(Meeting).where(Meeting.id == meeting_id)
                )
                meeting = result.scalar_one_or_none()
                if meeting:
                    meeting.transcript_id = new_transcript.id
                    await db.commit()
                
                logger.info(
                    "Transcripción completada",
                    meeting_id=meeting_id,
                    transcript_id=new_transcript.id,
                    segments=len(combined_segments)
                )
                
                return {
                    "transcript_id": new_transcript.id,
                    "status": "completed",
                    "segments_count": len(combined_segments),
                }
                
            except Exception as e:
                logger.error("Error en transcripción", error=str(e), meeting_id=meeting_id)
                raise self.retry(exc=e)
    
    # Crear nuevo event loop para la tarea
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(_transcribe())

