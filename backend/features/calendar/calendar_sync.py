"""
AIssistant - Servicio de Sincronización de Calendarios
======================================================
Orquesta la sincronización de eventos de múltiples proveedores de calendario.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from core.config import settings
from models.calendar_connection import CalendarConnection
from models.meeting import Meeting, MeetingStatus, MeetingParticipant
from features.calendar.google_calendar import get_google_calendar_service
from features.calendar.microsoft_calendar import get_microsoft_calendar_service
from features.privacy.api_keys import encrypt_api_key, decrypt_api_key

logger = structlog.get_logger()


class CalendarSyncService:
    """
    Servicio para sincronizar calendarios de múltiples proveedores.
    
    Responsabilidades:
    - Gestionar conexiones de calendario (tokens)
    - Sincronizar eventos de todos los calendarios conectados
    - Crear/actualizar reuniones en AIssistant
    """
    
    def __init__(self):
        self.google_service = get_google_calendar_service()
        self.microsoft_service = get_microsoft_calendar_service()
    
    async def save_calendar_connection(
        self,
        db: AsyncSession,
        user_id: int,
        provider: str,
        tokens: Dict[str, Any]
    ) -> CalendarConnection:
        """
        Guardar o actualizar conexión de calendario.
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            provider: Proveedor (google, microsoft)
            tokens: Dict con access_token, refresh_token, expires_at, email
            
        Returns:
            Objeto CalendarConnection creado/actualizado
        """
        email = tokens.get("email", "")
        
        # Buscar conexión existente
        result = await db.execute(
            select(CalendarConnection).where(
                and_(
                    CalendarConnection.user_id == user_id,
                    CalendarConnection.provider == provider,
                    CalendarConnection.account_email == email
                )
            )
        )
        connection = result.scalar_one_or_none()
        
        # Encriptar tokens
        access_token_encrypted = encrypt_api_key(tokens.get("access_token", ""))
        refresh_token_encrypted = None
        if tokens.get("refresh_token"):
            refresh_token_encrypted = encrypt_api_key(tokens.get("refresh_token"))
        
        if connection:
            # Actualizar conexión existente
            connection.access_token_encrypted = access_token_encrypted
            if refresh_token_encrypted:
                connection.refresh_token_encrypted = refresh_token_encrypted
            connection.token_expires_at = tokens.get("expires_at")
            connection.is_active = True
            connection.sync_error = None
            connection.updated_at = datetime.utcnow()
            
            logger.info("Conexión de calendario actualizada", provider=provider, email=email)
        else:
            # Crear nueva conexión
            connection = CalendarConnection(
                user_id=user_id,
                provider=provider,
                account_email=email,
                access_token_encrypted=access_token_encrypted,
                refresh_token_encrypted=refresh_token_encrypted,
                token_expires_at=tokens.get("expires_at"),
                is_active=True,
            )
            db.add(connection)
            
            logger.info("Nueva conexión de calendario creada", provider=provider, email=email)
        
        await db.commit()
        await db.refresh(connection)
        
        return connection
    
    async def get_user_connections(
        self,
        db: AsyncSession,
        user_id: int
    ) -> List[CalendarConnection]:
        """
        Obtener todas las conexiones de calendario de un usuario.
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            
        Returns:
            Lista de conexiones de calendario
        """
        result = await db.execute(
            select(CalendarConnection).where(
                and_(
                    CalendarConnection.user_id == user_id,
                    CalendarConnection.is_active == True
                )
            )
        )
        return list(result.scalars().all())
    
    async def disconnect_calendar(
        self,
        db: AsyncSession,
        user_id: int,
        connection_id: int
    ) -> bool:
        """
        Desconectar un calendario.
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            connection_id: ID de la conexión a eliminar
            
        Returns:
            True si se desconectó, False si no se encontró
        """
        result = await db.execute(
            select(CalendarConnection).where(
                and_(
                    CalendarConnection.id == connection_id,
                    CalendarConnection.user_id == user_id
                )
            )
        )
        connection = result.scalar_one_or_none()
        
        if not connection:
            return False
        
        # Marcar como inactivo en lugar de eliminar (soft delete)
        connection.is_active = False
        connection.updated_at = datetime.utcnow()
        await db.commit()
        
        logger.info(
            "Calendario desconectado",
            provider=connection.provider,
            email=connection.account_email
        )
        
        return True
    
    async def _get_valid_access_token(
        self,
        db: AsyncSession,
        connection: CalendarConnection
    ) -> str:
        """
        Obtener token de acceso válido, refrescando si es necesario.
        
        Args:
            db: Sesión de base de datos
            connection: Conexión de calendario
            
        Returns:
            Token de acceso válido
        """
        # Verificar si el token ha expirado
        now = datetime.utcnow()
        needs_refresh = (
            connection.token_expires_at is None or
            connection.token_expires_at <= now
        )
        
        if not needs_refresh:
            return decrypt_api_key(connection.access_token_encrypted)
        
        # Necesita refresh
        if not connection.refresh_token_encrypted:
            raise ValueError("No hay refresh token. Reconecta el calendario.")
        
        refresh_token = decrypt_api_key(connection.refresh_token_encrypted)
        
        try:
            if connection.provider == "google":
                new_tokens = await self.google_service.refresh_access_token(refresh_token)
            elif connection.provider == "microsoft":
                new_tokens = await self.microsoft_service.refresh_access_token(refresh_token)
            else:
                raise ValueError(f"Proveedor no soportado: {connection.provider}")
            
            # Actualizar tokens en BD
            connection.access_token_encrypted = encrypt_api_key(new_tokens["access_token"])
            connection.token_expires_at = new_tokens["expires_at"]
            
            # Microsoft puede devolver nuevo refresh token
            if new_tokens.get("refresh_token"):
                connection.refresh_token_encrypted = encrypt_api_key(new_tokens["refresh_token"])
            
            connection.updated_at = datetime.utcnow()
            await db.commit()
            
            logger.info("Token refrescado", provider=connection.provider)
            
            return new_tokens["access_token"]
            
        except Exception as e:
            logger.error(
                "Error refrescando token",
                provider=connection.provider,
                error=str(e)
            )
            connection.sync_error = f"Error de autenticación: {str(e)}"
            connection.is_active = False
            await db.commit()
            raise
    
    async def sync_calendar_events(
        self,
        db: AsyncSession,
        user_id: int,
        connection_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Sincronizar eventos de calendario(s) y crear/actualizar reuniones.
        
        Args:
            db: Sesión de base de datos
            user_id: ID del usuario
            connection_id: ID de conexión específica (None = todas)
            
        Returns:
            Dict con estadísticas de sincronización
        """
        stats = {
            "calendars_synced": 0,
            "events_found": 0,
            "meetings_created": 0,
            "meetings_updated": 0,
            "errors": [],
        }
        
        # Obtener conexiones a sincronizar
        if connection_id:
            result = await db.execute(
                select(CalendarConnection).where(
                    and_(
                        CalendarConnection.id == connection_id,
                        CalendarConnection.user_id == user_id,
                        CalendarConnection.is_active == True
                    )
                )
            )
            connections = [result.scalar_one_or_none()]
            connections = [c for c in connections if c]
        else:
            connections = await self.get_user_connections(db, user_id)
        
        for connection in connections:
            try:
                # Obtener token válido
                access_token = await self._get_valid_access_token(db, connection)
                
                # Obtener eventos según proveedor
                if connection.provider == "google":
                    events = await self.google_service.get_upcoming_events(
                        access_token=access_token,
                        calendar_id=connection.calendar_id,
                        days_ahead=settings.CALENDAR_SYNC_DAYS_AHEAD,
                    )
                elif connection.provider in ["microsoft", "outlook_personal", "outlook_business"]:
                    events = await self.microsoft_service.get_upcoming_events(
                        access_token=access_token,
                        calendar_id=connection.calendar_id if connection.calendar_id != "primary" else None,
                        days_ahead=settings.CALENDAR_SYNC_DAYS_AHEAD,
                    )
                else:
                    continue
                
                stats["calendars_synced"] += 1
                stats["events_found"] += len(events)
                
                # Procesar eventos
                for event in events:
                    # Saltar eventos cancelados
                    if event.get("status") == "cancelled":
                        continue
                    
                    # Buscar reunión existente
                    result = await db.execute(
                        select(Meeting).where(
                            and_(
                                Meeting.user_id == user_id,
                                Meeting.calendar_event_id == event["calendar_event_id"],
                                Meeting.calendar_source == event["calendar_source"]
                            )
                        )
                    )
                    existing_meeting = result.scalar_one_or_none()
                    
                    if existing_meeting:
                        # Actualizar reunión existente
                        existing_meeting.title = event["title"]
                        existing_meeting.description = event.get("description")
                        existing_meeting.scheduled_start = event.get("scheduled_start")
                        existing_meeting.scheduled_end = event.get("scheduled_end")
                        existing_meeting.meeting_url = event.get("meeting_url")
                        existing_meeting.platform = event.get("platform")
                        existing_meeting.updated_at = datetime.utcnow()
                        
                        stats["meetings_updated"] += 1
                    else:
                        # Crear nueva reunión
                        new_meeting = Meeting(
                            user_id=user_id,
                            title=event["title"],
                            description=event.get("description"),
                            scheduled_start=event.get("scheduled_start"),
                            scheduled_end=event.get("scheduled_end"),
                            meeting_url=event.get("meeting_url"),
                            platform=event.get("platform"),
                            calendar_event_id=event["calendar_event_id"],
                            calendar_source=event["calendar_source"],
                            status=MeetingStatus.SCHEDULED.value,
                        )
                        db.add(new_meeting)
                        await db.flush()  # Para obtener el ID
                        
                        # Añadir participantes
                        for participant in event.get("participants", []):
                            mp = MeetingParticipant(
                                meeting_id=new_meeting.id,
                                name=participant.get("name", participant.get("email", "").split("@")[0]),
                                email=participant.get("email"),
                                role="participant",
                            )
                            db.add(mp)
                        
                        stats["meetings_created"] += 1
                
                # Actualizar timestamp de última sincronización
                connection.last_sync_at = datetime.utcnow()
                connection.sync_error = None
                
            except Exception as e:
                logger.error(
                    "Error sincronizando calendario",
                    connection_id=connection.id,
                    provider=connection.provider,
                    error=str(e)
                )
                connection.sync_error = str(e)
                stats["errors"].append({
                    "connection_id": connection.id,
                    "provider": connection.provider,
                    "error": str(e),
                })
        
        await db.commit()
        
        logger.info(
            "Sincronización de calendarios completada",
            user_id=user_id,
            stats=stats
        )
        
        return stats


# Singleton para acceso global
_calendar_sync_service: Optional[CalendarSyncService] = None


def get_calendar_sync_service() -> CalendarSyncService:
    """Obtener instancia singleton del servicio de sincronización."""
    global _calendar_sync_service
    if _calendar_sync_service is None:
        _calendar_sync_service = CalendarSyncService()
    return _calendar_sync_service

