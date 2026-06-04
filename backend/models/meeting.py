"""
AIssistant - Modelo de Reunión
==============================
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, Text, JSON, ForeignKey, Integer, Float, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from core.database import Base


class MeetingStatus(str, enum.Enum):
    """Estados posibles de una reunión."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SentimentType(str, enum.Enum):
    """Tipos de sentimiento detectado."""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


class Meeting(Base):
    """Modelo principal de reunión."""
    
    __tablename__ = "meetings"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # Información básica
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Tiempos
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    scheduled_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    actual_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Estado
    status: Mapped[str] = mapped_column(
        String(20),
        default=MeetingStatus.SCHEDULED.value
    )
    
    # Plataforma
    platform: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # zoom, teams, meet, presencial
    meeting_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Contexto pre-reunión
    context_documents: Mapped[Optional[List[dict]]] = mapped_column(JSON, nullable=True)
    context_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Resúmenes generados por IA
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_points: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    decisions: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    
    # Análisis de sentimiento
    sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Metadatos de calendario
    calendar_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    calendar_source: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # google, outlook
    
    # Configuración de privacidad de esta reunión
    is_confidential: Mapped[bool] = mapped_column(default=False)
    
    # Archivos y procesamiento
    audio_file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    transcript_id: Mapped[Optional[int]] = mapped_column(ForeignKey("transcripts.id"), nullable=True)
    task_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # ID de tarea Celery
    meta_data: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relaciones
    user = relationship("User", back_populates="meetings")
    participants = relationship(
        "MeetingParticipant",
        back_populates="meeting",
        cascade="all, delete-orphan"
    )
    transcript = relationship(
        "Transcript",
        back_populates="meeting",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="[Meeting.transcript_id]",
        single_parent=True
    )
    action_items = relationship(
        "ActionItem",
        back_populates="meeting",
        cascade="all, delete-orphan"
    )
    
    @property
    def has_audio(self) -> bool:
        """Indica si la reunión tiene un archivo de audio grabado asociado."""
        return self.audio_file_path is not None
    
    def __repr__(self) -> str:
        return f"<Meeting(id={self.id}, title={self.title[:30]}...)>"


class MeetingParticipant(Base):
    """Participantes de una reunión."""
    
    __tablename__ = "meeting_participants"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    
    # Identificación
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Rol en la reunión
    role: Mapped[str] = mapped_column(String(50), default="participant")  # host, participant
    is_user: Mapped[bool] = mapped_column(default=False)  # True si es el usuario de AIssistant
    
    # Identificador de voz para diarización
    speaker_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Estadísticas de participación
    speaking_time_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Relación
    meeting = relationship("Meeting", back_populates="participants")
    
    def __repr__(self) -> str:
        return f"<MeetingParticipant(id={self.id}, name={self.name})>"


class MeetingSegment(Base):
    """Segmentos o momentos destacados de una reunión."""
    
    __tablename__ = "meeting_segments"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    
    # Tiempos del segmento
    start_time: Mapped[float] = mapped_column(Float, nullable=False)  # segundos desde inicio
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Contenido
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Tipo de segmento
    segment_type: Mapped[str] = mapped_column(
        String(50),
        default="highlight"
    )  # highlight, decision, action, topic
    
    # Marcado por usuario o IA
    created_by: Mapped[str] = mapped_column(String(20), default="ai")  # ai, user
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    def __repr__(self) -> str:
        return f"<MeetingSegment(id={self.id}, title={self.title[:30]}...)>"

