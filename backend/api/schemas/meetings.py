"""
AIssistant - Schemas de Reuniones
=================================
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


# ========== Request Schemas ==========

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


# ========== Response Schemas ==========

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

