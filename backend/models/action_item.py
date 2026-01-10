"""
AIssistant - Modelo de Elementos de Acción
==========================================
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, DateTime, Text, ForeignKey, Date, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from core.database import Base


class ActionItemStatus(str, enum.Enum):
    """Estados de un elemento de acción."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ActionItemPriority(str, enum.Enum):
    """Prioridades de elementos de acción."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ActionItem(Base):
    """Elemento de acción extraído de una reunión."""
    
    __tablename__ = "action_items"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    
    # Contenido
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Asignación
    assignee_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assignee_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Fecha límite
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Estado y prioridad
    status: Mapped[str] = mapped_column(
        String(20),
        default=ActionItemStatus.PENDING.value
    )
    priority: Mapped[str] = mapped_column(
        String(20),
        default=ActionItemPriority.MEDIUM.value
    )
    
    # Contexto de la reunión donde se mencionó
    transcript_reference: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp_seconds: Mapped[Optional[float]] = mapped_column(nullable=True)
    
    # Creación
    created_by: Mapped[str] = mapped_column(String(20), default="ai")  # ai, user
    
    # Sincronización externa
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    external_system: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # jira, asana, notion
    sync_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relación
    meeting = relationship("Meeting", back_populates="action_items")
    
    def __repr__(self) -> str:
        return f"<ActionItem(id={self.id}, title={self.title[:30]}...)>"

