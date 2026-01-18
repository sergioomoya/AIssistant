"""
AIssistant - Modelo de Usuario
==============================
"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

if TYPE_CHECKING:
    from models.calendar_connection import CalendarConnection


class User(Base):
    """Modelo de usuario del sistema."""
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Estado
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Configuración de despliegue
    deployment_mode: Mapped[str] = mapped_column(
        String(20),
        default="hybrid"
    )  # local, hybrid, cloud
    
    # API Keys encriptadas (modo híbrido)
    api_keys: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Preferencias
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Idioma preferido para transcripción
    preferred_language: Mapped[str] = mapped_column(String(10), default="auto")
    
    # Configuración de privacidad
    auto_delete_audio_hours: Mapped[int] = mapped_column(default=24)
    pii_redaction_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Estado de onboarding
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relaciones
    # Usar lazy="select" en lugar de "dynamic" para evitar problemas de configuración
    meetings = relationship("Meeting", back_populates="user", lazy="select")
    # NO definir calendar_connections aquí - se crea automáticamente con backref en CalendarConnection
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"

