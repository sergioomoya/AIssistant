"""
AIssistant - Endpoints de Gestión de Reuniones
==============================================
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from pydantic import BaseModel

from core.database import get_db
from core.security import get_current_user
from models.meeting import Meeting, MeetingStatus, MeetingParticipant
from models.action_item import ActionItem, ActionItemStatus

router = APIRouter()


# ========== Schemas ==========

class ParticipantCreate(BaseModel):
    """Schema para crear participante."""
    name: str
    email: Optional[str] = None
    role: str = "participant"


class MeetingCreate(BaseModel):
    """Schema para crear reunión."""
    title: str
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    platform: Optional[str] = None
    meeting_url: Optional[str] = None
    participants: Optional[List[ParticipantCreate]] = None
    context_notes: Optional[str] = None
    is_confidential: bool = False


class MeetingUpdate(BaseModel):
    """Schema para actualizar reunión."""
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    status: Optional[str] = None
    context_notes: Optional[str] = None


class ParticipantResponse(BaseModel):
    """Schema de respuesta de participante."""
    id: int
    name: str
    email: Optional[str]
    role: str
    is_user: bool
    speaking_time_seconds: Optional[int]
    
    class Config:
        from_attributes = True


class ActionItemResponse(BaseModel):
    """Schema de respuesta de elemento de acción."""
    id: int
    title: str
    description: Optional[str]
    assignee_name: Optional[str]
    due_date: Optional[str]
    status: str
    priority: str
    
    class Config:
        from_attributes = True


class MeetingResponse(BaseModel):
    """Schema de respuesta de reunión."""
    id: int
    title: str
    description: Optional[str]
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    duration_seconds: Optional[int]
    status: str
    platform: Optional[str]
    summary: Optional[str]
    key_points: Optional[List[str]]
    decisions: Optional[List[str]]
    sentiment: Optional[str]
    created_at: datetime
    participants: Optional[List[ParticipantResponse]] = None
    action_items: Optional[List[ActionItemResponse]] = None
    
    class Config:
        from_attributes = True


class MeetingListResponse(BaseModel):
    """Schema de respuesta de lista de reuniones."""
    total: int
    meetings: List[MeetingResponse]


class DashboardStatsResponse(BaseModel):
    """Schema de respuesta de estadísticas del dashboard."""
    meetings_this_month: int
    meetings_trend: int
    total_duration_hours: float
    duration_trend: float
    action_items_pending: int
    action_items_completed: int
    documents_generated: int
    documents_trend: int


# ========== Endpoints ==========

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
    user_id = int(current_user["user_id"])
    now = datetime.utcnow()
    
    # Calcular inicio de mes actual y anterior
    first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    first_day_last_month = (first_day_this_month - timedelta(days=1)).replace(day=1)
    
    # Reuniones este mes
    result = await db.execute(
        select(func.count(Meeting.id)).where(
            and_(
                Meeting.user_id == user_id,
                Meeting.created_at >= first_day_this_month
            )
        )
    )
    meetings_this_month = result.scalar() or 0
    
    # Reuniones mes anterior (para calcular tendencia)
    result = await db.execute(
        select(func.count(Meeting.id)).where(
            and_(
                Meeting.user_id == user_id,
                Meeting.created_at >= first_day_last_month,
                Meeting.created_at < first_day_this_month
            )
        )
    )
    meetings_last_month = result.scalar() or 0
    meetings_trend = meetings_this_month - meetings_last_month
    
    # Duración total este mes (en segundos)
    result = await db.execute(
        select(func.coalesce(func.sum(Meeting.duration_seconds), 0)).where(
            and_(
                Meeting.user_id == user_id,
                Meeting.created_at >= first_day_this_month
            )
        )
    )
    total_duration_seconds = result.scalar() or 0
    total_duration_hours = total_duration_seconds / 3600
    
    # Duración mes anterior
    result = await db.execute(
        select(func.coalesce(func.sum(Meeting.duration_seconds), 0)).where(
            and_(
                Meeting.user_id == user_id,
                Meeting.created_at >= first_day_last_month,
                Meeting.created_at < first_day_this_month
            )
        )
    )
    last_month_duration_seconds = result.scalar() or 0
    duration_trend = (total_duration_seconds - last_month_duration_seconds) / 3600
    
    # Action items pendientes
    result = await db.execute(
        select(func.count(ActionItem.id)).where(
            and_(
                ActionItem.meeting_id.in_(
                    select(Meeting.id).where(Meeting.user_id == user_id)
                ),
                ActionItem.status == ActionItemStatus.PENDING.value
            )
        )
    )
    action_items_pending = result.scalar() or 0
    
    # Action items completados
    result = await db.execute(
        select(func.count(ActionItem.id)).where(
            and_(
                ActionItem.meeting_id.in_(
                    select(Meeting.id).where(Meeting.user_id == user_id)
                ),
                ActionItem.status == ActionItemStatus.COMPLETED.value
            )
        )
    )
    action_items_completed = result.scalar() or 0
    
    # Documentos generados (reuniones con resumen)
    result = await db.execute(
        select(func.count(Meeting.id)).where(
            and_(
                Meeting.user_id == user_id,
                Meeting.summary.isnot(None),
                Meeting.created_at >= first_day_this_month
            )
        )
    )
    documents_generated = result.scalar() or 0
    
    # Documentos mes anterior
    result = await db.execute(
        select(func.count(Meeting.id)).where(
            and_(
                Meeting.user_id == user_id,
                Meeting.summary.isnot(None),
                Meeting.created_at >= first_day_last_month,
                Meeting.created_at < first_day_this_month
            )
        )
    )
    documents_last_month = result.scalar() or 0
    documents_trend = documents_generated - documents_last_month
    
    return DashboardStatsResponse(
        meetings_this_month=meetings_this_month,
        meetings_trend=meetings_trend,
        total_duration_hours=round(total_duration_hours, 1),
        duration_trend=round(duration_trend, 1),
        action_items_pending=action_items_pending,
        action_items_completed=action_items_completed,
        documents_generated=documents_generated,
        documents_trend=documents_trend,
    )

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
    # Crear reunión
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
    query = select(Meeting).where(
        Meeting.user_id == int(current_user["user_id"])
    )
    
    if status:
        query = query.where(Meeting.status == status)
    
    # Contar total
    count_query = select(Meeting).where(
        Meeting.user_id == int(current_user["user_id"])
    )
    if status:
        count_query = count_query.where(Meeting.status == status)
    
    result = await db.execute(count_query)
    total = len(result.all())
    
    # Obtener reuniones con paginación
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
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reunión no encontrada"
        )
    
    return meeting


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar una reunión existente."""
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reunión no encontrada"
        )
    
    # Actualizar campos proporcionados
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
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reunión no encontrada"
        )
    
    await db.delete(meeting)
    await db.commit()


@router.post("/{meeting_id}/start", response_model=MeetingResponse)
async def start_meeting(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Iniciar la grabación/transcripción de una reunión."""
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reunión no encontrada"
        )
    
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
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reunión no encontrada"
        )
    
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

