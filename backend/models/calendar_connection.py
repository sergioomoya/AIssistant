"""
AIssistant - Modelo de Conexión de Calendario
==============================================
Almacena tokens OAuth para integración con calendarios externos.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship, backref

from core.database import Base


class CalendarConnection(Base):
    """
    Conexión a un calendario externo (Google, Outlook).
    
    Los tokens se almacenan encriptados usando el servicio de encriptación.
    """
    
    __tablename__ = "calendar_connections"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # Proveedor de calendario
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # google, microsoft
    
    # Identificador de cuenta (email asociado al calendario)
    account_email: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Tokens OAuth (encriptados)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Expiración del token
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # ID del calendario específico (si el usuario tiene múltiples)
    calendar_id: Mapped[str] = mapped_column(String(255), default="primary")
    
    # Estado de la conexión
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sync_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relación con usuario
    # Relación unidireccional - NO usar backref ni back_populates para evitar problemas de configuración
    # Para obtener las conexiones de un usuario, usar queries directas en lugar de relaciones
    user = relationship("User", viewonly=True)
    
    def __repr__(self) -> str:
        return f"<CalendarConnection(id={self.id}, provider={self.provider}, email={self.account_email})>"

