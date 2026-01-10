"""
AIssistant - Modelo de Transcripción
====================================
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, JSON, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Transcript(Base):
    """Transcripción completa de una reunión."""
    
    __tablename__ = "transcripts"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id"),
        unique=True,
        nullable=False
    )
    
    # Texto completo de la transcripción
    full_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Texto editado por el usuario (si aplica)
    edited_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_edited: Mapped[bool] = mapped_column(default=False)
    
    # Idioma detectado
    detected_language: Mapped[str] = mapped_column(String(10), default="es")
    language_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Estadísticas
    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Modelo usado para transcripción
    transcription_model: Mapped[str] = mapped_column(String(50), default="whisper")
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Calidad de transcripción
    average_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relaciones
    meeting = relationship("Meeting", back_populates="transcript")
    segments = relationship(
        "TranscriptSegment",
        back_populates="transcript",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.start_time"
    )
    
    def __repr__(self) -> str:
        return f"<Transcript(id={self.id}, meeting_id={self.meeting_id})>"


class TranscriptSegment(Base):
    """Segmento individual de transcripción con marca de tiempo y orador."""
    
    __tablename__ = "transcript_segments"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    transcript_id: Mapped[int] = mapped_column(
        ForeignKey("transcripts.id"),
        nullable=False
    )
    
    # Contenido
    text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Tiempos (en segundos desde inicio)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Identificación del orador
    speaker_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    speaker_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_user: Mapped[bool] = mapped_column(default=False)  # True = "Tú", False = "Otros"
    
    # Calidad
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Edición
    original_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_edited: Mapped[bool] = mapped_column(default=False)
    
    # PII redactado
    had_pii_redacted: Mapped[bool] = mapped_column(default=False)
    
    # Orden secuencial
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Relación
    transcript = relationship("Transcript", back_populates="segments")
    
    def __repr__(self) -> str:
        return f"<TranscriptSegment(id={self.id}, speaker={self.speaker_name}, time={self.start_time}s)>"

