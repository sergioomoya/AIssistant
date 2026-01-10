"""
AIssistant - Endpoints de Gestión de Reuniones
==============================================
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

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
        status=MeetingStatus.SCHEDULED.value
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
    await db.refresh(new_meeting)
    
    return new_meeting


@router.get("/", response_model=MeetingListResponse)
async def list_meetings(
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Listar reuniones del usuario.
    
    Soporta filtrado por estado y paginación.
    """
    user_id = int(current_user["user_id"])
    
    # Query base
    query = select(Meeting).where(Meeting.user_id == user_id)
    count_query = select(Meeting).where(Meeting.user_id == user_id)
    
    if status:
        query = query.where(Meeting.status == status)
        count_query = count_query.where(Meeting.status == status)
    
    # Total
    result = await db.execute(count_query)
    total = len(result.all())
    
    # Reuniones paginadas
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
    await db.refresh(meeting)
    
    return meeting


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
    await db.refresh(meeting)
    
    return meeting


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
    
    await db.commit()
    await db.refresh(meeting)
    
    # TODO: Disparar tarea async para procesar transcripción y resumen
    
    return meeting


# ========== Helpers ==========

async def _get_user_meeting(db: AsyncSession, meeting_id: int, user_id: int) -> Meeting:
    """Obtener reunión verificando propiedad del usuario."""
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == user_id
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reunión no encontrada"
        )
    
    return meeting
