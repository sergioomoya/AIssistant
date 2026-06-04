"""
AIssistant - Endpoints de Gestión de Reuniones
==============================================
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.security import get_current_user
from models.meeting import Meeting, MeetingStatus, MeetingParticipant
from api.schemas.meetings import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingListResponse,
    DashboardStatsResponse,
)
from features.meetings.stats_service import MeetingStatsService

router = APIRouter()


# ========== Dashboard Stats ==========

@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener estadísticas del dashboard para el usuario.
    
    Incluye:
    - Reuniones este mes y tendencia
    - Horas transcritas y tendencia
    - Action items pendientes/completados
    - Documentos generados
    """
    stats_service = MeetingStatsService(db, int(current_user["user_id"]))
    stats = await stats_service.get_dashboard_stats()
    return DashboardStatsResponse(**stats)


# ========== CRUD de Reuniones ==========

@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    meeting_data: MeetingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva reunión.
    
    Permite programar una reunión con participantes y contexto pre-reunión.
    """
    # Determinar status: usar 'in_progress' si no hay scheduled_start, sino 'scheduled'
    meeting_status = MeetingStatus.IN_PROGRESS.value if not meeting_data.scheduled_start else MeetingStatus.SCHEDULED.value
    
    new_meeting = Meeting(
        user_id=int(current_user["user_id"]),
        title=meeting_data.title,
        description=meeting_data.description,
        scheduled_start=meeting_data.scheduled_start,
        scheduled_end=meeting_data.scheduled_end,
        platform=meeting_data.platform,
        meeting_url=meeting_data.meeting_url,
        context_notes=meeting_data.context_notes,
        is_confidential=meeting_data.is_confidential,
        status=meeting_status
    )
    
    db.add(new_meeting)
    await db.flush()
    
    # Agregar participantes si se proporcionaron
    if meeting_data.participants:
        for p in meeting_data.participants:
            participant = MeetingParticipant(
                meeting_id=new_meeting.id,
                name=p.name,
                email=p.email,
                role=p.role
            )
            db.add(participant)
    
    # Agregar al usuario como participante host
    user_participant = MeetingParticipant(
        meeting_id=new_meeting.id,
        name="Tú",
        email=current_user["email"],
        role="host",
        is_user=True
    )
    db.add(user_participant)
    
    await db.commit()
    return await _get_user_meeting(db, new_meeting.id, int(current_user["user_id"]))


@router.get("/", response_model=MeetingListResponse)
async def list_meetings(
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    start_date: Optional[datetime] = Query(None, description="Filtrar por fecha de inicio mínima (programada o real)"),
    end_date: Optional[datetime] = Query(None, description="Filtrar por fecha de inicio máxima (programada o real)"),
    limit: int = Query(20, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar reuniones del usuario.
    
    Soporta filtrado por estado, rango de fechas y paginación.
    """
    user_id = int(current_user["user_id"])
    
    # Convertir datetimes aware a naive (sin tzinfo) para compatibilidad con la base de datos (PostgreSQL/asyncpg)
    if start_date:
        start_date = start_date.replace(tzinfo=None)
    if end_date:
        end_date = end_date.replace(tzinfo=None)
    
    # Query base
    query = select(Meeting).where(Meeting.user_id == user_id).options(
        selectinload(Meeting.participants),
        selectinload(Meeting.action_items)
    )
    count_query = select(Meeting).where(Meeting.user_id == user_id)
    
    if status:
        query = query.where(Meeting.status == status)
        count_query = count_query.where(Meeting.status == status)
        
    if start_date:
        query = query.where(
            (Meeting.scheduled_start >= start_date) | 
            (Meeting.actual_start >= start_date) |
            ((Meeting.scheduled_start.is_(None)) & (Meeting.actual_start.is_(None)) & (Meeting.created_at >= start_date))
        )
        count_query = count_query.where(
            (Meeting.scheduled_start >= start_date) | 
            (Meeting.actual_start >= start_date) |
            ((Meeting.scheduled_start.is_(None)) & (Meeting.actual_start.is_(None)) & (Meeting.created_at >= start_date))
        )
        
    if end_date:
        query = query.where(
            (Meeting.scheduled_start <= end_date) | 
            (Meeting.actual_start <= end_date) |
            ((Meeting.scheduled_start.is_(None)) & (Meeting.actual_start.is_(None)) & (Meeting.created_at <= end_date))
        )
        count_query = count_query.where(
            (Meeting.scheduled_start <= end_date) | 
            (Meeting.actual_start <= end_date) |
            ((Meeting.scheduled_start.is_(None)) & (Meeting.actual_start.is_(None)) & (Meeting.created_at <= end_date))
        )
    
    # Total
    result = await db.execute(count_query)
    total = len(result.all())
    
    # Reuniones paginadas. Si es búsqueda por fechas (calendario), ordenamos ascendente
    if start_date or end_date:
        query = query.order_by(Meeting.scheduled_start.asc(), Meeting.actual_start.asc()).limit(limit).offset(offset)
    else:
        query = query.order_by(desc(Meeting.created_at)).limit(limit).offset(offset)
        
    result = await db.execute(query)
    meetings = result.scalars().all()
    
    return {"total": total, "meetings": meetings}


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener detalles de una reunión específica."""
    meeting = await _get_user_meeting(db, meeting_id, int(current_user["user_id"]))
    return meeting


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar una reunión existente."""
    meeting = await _get_user_meeting(db, meeting_id, int(current_user["user_id"]))
    
    update_data = meeting_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting, field, value)
    
    await db.commit()
    return await _get_user_meeting(db, meeting.id, int(current_user["user_id"]))


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Eliminar una reunión y todos sus datos asociados."""
    meeting = await _get_user_meeting(db, meeting_id, int(current_user["user_id"]))
    
    await db.delete(meeting)
    await db.commit()


# ========== Control de Grabación ==========

@router.post("/{meeting_id}/start", response_model=MeetingResponse)
async def start_meeting(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Iniciar la grabación/transcripción de una reunión."""
    meeting = await _get_user_meeting(db, meeting_id, int(current_user["user_id"]))
    
    if meeting.status == MeetingStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La reunión ya está en progreso"
        )
    
    meeting.status = MeetingStatus.IN_PROGRESS.value
    meeting.actual_start = datetime.utcnow()
    
    await db.commit()
    return await _get_user_meeting(db, meeting.id, int(current_user["user_id"]))





@router.post("/{meeting_id}/stop", response_model=MeetingResponse)
async def stop_meeting(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Detener la grabación y procesar la reunión."""
    meeting = await _get_user_meeting(db, meeting_id, int(current_user["user_id"]))
    
    if meeting.status != MeetingStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La reunión no está en progreso"
        )
    
    meeting.status = MeetingStatus.PROCESSING.value
    meeting.actual_end = datetime.utcnow()
    
    if meeting.actual_start:
        duration = (meeting.actual_end - meeting.actual_start).total_seconds()
        meeting.duration_seconds = int(duration)
    
    # Procesar archivo de audio si existe una grabación en vivo (.raw)
    import os
    import wave
    from core.config import settings
    
    temp_pcm_path = os.path.join(settings.AUDIO_TEMP_PATH, f"live_{meeting.id}.raw")
    wav_path = os.path.join(settings.AUDIO_TEMP_PATH, f"live_{meeting.id}.wav")
    
    if os.path.exists(temp_pcm_path):
        # Leer datos PCM crudos
        with open(temp_pcm_path, 'rb') as pcm_file:
            pcm_data = pcm_file.read()
            
        # Escribir archivo WAV estándar (16kHz, 16-bit mono)
        os.makedirs(settings.AUDIO_TEMP_PATH, exist_ok=True)
        with wave.open(wav_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)  # 2 bytes (16-bit)
            wav_file.setframerate(16000)  # 16kHz
            wav_file.writeframes(pcm_data)
            
        # Borrar archivo PCM crudo
        os.remove(temp_pcm_path)
        
        # Encriptar si es confidencial
        if meeting.is_confidential:
            from features.privacy.encryption import get_encryption_service
            encryption_service = get_encryption_service()
            encrypted_path = encryption_service.encrypt_file(wav_path)
            if os.path.exists(wav_path):
                os.remove(wav_path)
            meeting.audio_file_path = encrypted_path
        else:
            meeting.audio_file_path = wav_path
            
        # Disparar tarea asíncrona de Celery para procesar la reunión (transcripción + resumen)
        from features.meetings.tasks import process_meeting_task
        task = process_meeting_task.delay(meeting.id)
        meeting.task_id = task.id
        
    await db.commit()
    return await _get_user_meeting(db, meeting.id, int(current_user["user_id"]))


@router.get("/{meeting_id}/audio")
async def get_meeting_audio(
    meeting_id: int,
    background_tasks: BackgroundTasks,
    token: Optional[str] = Query(None, description="Token JWT para autenticación de audio"),
    db: AsyncSession = Depends(get_db)
):
    """
    Servir el archivo de audio grabado para su reproducción en el cliente.
    Desencripta al vuelo de forma segura y elimina la caché temporal después de la transferencia.
    """
    from fastapi.responses import FileResponse
    from starlette.background import BackgroundTasks as StarletteBackgroundTasks
    from core.security import get_current_user_ws
    import os
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido"
        )
        
    try:
        current_user = get_current_user_ws(token)
        user_id = int(current_user["user_id"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de autenticación inválido o expirado"
        )
        
    meeting = await _get_user_meeting(db, meeting_id, user_id)
    
    if not meeting.audio_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Esta reunión no tiene grabación de audio asociada"
        )
        
    file_path = meeting.audio_file_path
    
    # Si el archivo está encriptado, desencriptar al vuelo
    if file_path.endswith('.encrypted'):
        from features.privacy.encryption import get_encryption_service
        encryption_service = get_encryption_service()
        
        # Ruta temporal para la reproducción
        decrypted_path = file_path.replace('.encrypted', '_play.wav')
        
        # Desencriptar
        encryption_service.decrypt_file(file_path, decrypted_path)
        
        # Registrar borrado del archivo temporal
        background_tasks.add_task(os.remove, decrypted_path)
        
        return FileResponse(
            decrypted_path,
            media_type="audio/wav",
            filename=f"meeting_{meeting_id}.wav"
        )
        
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El archivo de audio de la grabación no existe en el servidor"
        )
        
    return FileResponse(
        file_path,
        media_type="audio/wav",
        filename=f"meeting_{meeting_id}.wav"
    )


# ========== Helpers ==========

async def _get_user_meeting(db: AsyncSession, meeting_id: int, user_id: int) -> Meeting:
    """Obtener reunión verificando propiedad del usuario."""
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == user_id
        ).options(
            selectinload(Meeting.participants),
            selectinload(Meeting.action_items)
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reunión no encontrada"
        )
    
    return meeting
