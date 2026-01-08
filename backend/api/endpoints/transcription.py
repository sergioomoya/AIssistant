"""
AIssistant - Endpoints de Transcripción
=======================================
Transcripción en tiempo real y procesamiento de audio.
"""

import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import structlog

from core.database import get_db
from core.security import get_current_user
from core.config import settings
from models.meeting import Meeting
from models.transcript import Transcript, TranscriptSegment
from features.transcription.whisper_engine import WhisperEngine
from features.transcription.realtime_transcriber import RealtimeTranscriber

router = APIRouter()
logger = structlog.get_logger()


# ========== Schemas ==========

class TranscriptSegmentResponse(BaseModel):
    """Schema de respuesta de segmento de transcripción."""
    id: int
    text: str
    start_time: float
    end_time: float
    speaker_name: Optional[str]
    is_user: bool
    confidence: Optional[float]
    
    class Config:
        from_attributes = True


class TranscriptResponse(BaseModel):
    """Schema de respuesta de transcripción completa."""
    id: int
    meeting_id: int
    full_text: Optional[str]
    detected_language: str
    word_count: Optional[int]
    duration_seconds: Optional[int]
    segments: list[TranscriptSegmentResponse]
    
    class Config:
        from_attributes = True


class TranscriptEditRequest(BaseModel):
    """Schema para editar transcripción."""
    segment_id: int
    new_text: str


# ========== Singleton de Engine ==========

_whisper_engine: Optional[WhisperEngine] = None


async def get_whisper_engine() -> WhisperEngine:
    """Obtener instancia singleton del motor de Whisper."""
    global _whisper_engine
    if _whisper_engine is None:
        _whisper_engine = WhisperEngine()
        await _whisper_engine.initialize()
    return _whisper_engine


# ========== Endpoints ==========

@router.get("/{meeting_id}", response_model=TranscriptResponse)
async def get_transcript(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener la transcripción completa de una reunión."""
    # Verificar que la reunión pertenece al usuario
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    
    # Obtener transcripción
    result = await db.execute(
        select(Transcript).where(Transcript.meeting_id == meeting_id)
    )
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcripción no disponible")
    
    return transcript


@router.post("/upload/{meeting_id}")
async def upload_audio_for_transcription(
    meeting_id: int,
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Subir archivo de audio para transcripción.
    
    Soporta formatos: WAV, MP3, M4A, OGG
    """
    # Verificar reunión
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    
    # Validar tipo de archivo
    allowed_types = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/x-wav"]
    if audio_file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no soportado: {audio_file.content_type}"
        )
    
    # Validar tamaño
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await audio_file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Archivo demasiado grande. Máximo: {settings.MAX_UPLOAD_SIZE_MB}MB"
        )
    
    # Guardar archivo temporalmente y procesar
    import aiofiles
    import os
    
    temp_path = os.path.join(settings.AUDIO_TEMP_PATH, f"{meeting_id}_{audio_file.filename}")
    async with aiofiles.open(temp_path, 'wb') as f:
        await f.write(content)
    
    logger.info(
        "Audio subido para transcripción",
        meeting_id=meeting_id,
        filename=audio_file.filename,
        size_mb=len(content) / (1024 * 1024)
    )
    
    # TODO: Disparar tarea async para procesar transcripción
    
    return {
        "message": "Audio recibido. Procesando transcripción...",
        "meeting_id": meeting_id,
        "filename": audio_file.filename
    }


@router.patch("/edit")
async def edit_transcript_segment(
    edit_request: TranscriptEditRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Editar un segmento de transcripción."""
    result = await db.execute(
        select(TranscriptSegment).where(TranscriptSegment.id == edit_request.segment_id)
    )
    segment = result.scalar_one_or_none()
    
    if not segment:
        raise HTTPException(status_code=404, detail="Segmento no encontrado")
    
    # Guardar texto original si es la primera edición
    if not segment.is_edited:
        segment.original_text = segment.text
    
    segment.text = edit_request.new_text
    segment.is_edited = True
    
    await db.commit()
    
    return {"message": "Segmento actualizado", "segment_id": segment.id}


@router.websocket("/ws/{meeting_id}")
async def websocket_realtime_transcription(
    websocket: WebSocket,
    meeting_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket para transcripción en tiempo real.
    
    El cliente envía chunks de audio y recibe transcripciones en tiempo real.
    
    Protocolo:
    - Cliente envía: bytes de audio (PCM 16-bit, 16kHz, mono)
    - Servidor responde: JSON con transcripción parcial/final
    
    Formato de respuesta:
    {
        "type": "partial" | "final",
        "text": "texto transcrito",
        "start_time": 0.0,
        "end_time": 1.5,
        "speaker": "Tú" | "Otro",
        "confidence": 0.95
    }
    """
    await websocket.accept()
    
    logger.info("WebSocket de transcripción conectado", meeting_id=meeting_id)
    
    try:
        # Inicializar transcriber en tiempo real
        whisper_engine = await get_whisper_engine()
        transcriber = RealtimeTranscriber(whisper_engine)
        
        sequence_number = 0
        
        while True:
            # Recibir chunk de audio
            data = await websocket.receive_bytes()
            
            # Procesar audio
            result = await transcriber.process_chunk(data)
            
            if result:
                sequence_number += 1
                
                # Enviar resultado
                await websocket.send_json({
                    "type": result["type"],
                    "text": result["text"],
                    "start_time": result.get("start_time", 0),
                    "end_time": result.get("end_time", 0),
                    "speaker": result.get("speaker", "Desconocido"),
                    "confidence": result.get("confidence", 0),
                    "sequence": sequence_number
                })
                
    except WebSocketDisconnect:
        logger.info("WebSocket de transcripción desconectado", meeting_id=meeting_id)
    except Exception as e:
        logger.error("Error en WebSocket de transcripción", error=str(e))
        await websocket.close(code=1011, reason=str(e))

