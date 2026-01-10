"""
AIssistant - Endpoints de Calendario
====================================
API para conectar, desconectar y sincronizar calendarios externos.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import structlog

from core.database import get_db
from core.security import get_current_user
from core.config import settings
from models.user import User
from features.calendar.google_calendar import get_google_calendar_service
from features.calendar.microsoft_calendar import get_microsoft_calendar_service
from features.calendar.calendar_sync import get_calendar_sync_service

router = APIRouter()
logger = structlog.get_logger()


# ========== Schemas ==========

class CalendarAuthUrlResponse(BaseModel):
    """Respuesta con URL de autorización."""
    auth_url: str
    provider: str


class CalendarCallbackRequest(BaseModel):
    """Request para callback de OAuth."""
    code: str
    redirect_uri: str
    provider: str  # google, microsoft


class CalendarConnectionResponse(BaseModel):
    """Respuesta con información de conexión."""
    id: int
    provider: str
    account_email: str
    calendar_id: str
    is_active: bool
    last_sync_at: Optional[str]
    sync_error: Optional[str]


class CalendarSyncResponse(BaseModel):
    """Respuesta de sincronización."""
    calendars_synced: int
    events_found: int
    meetings_created: int
    meetings_updated: int
    errors: list


class AvailableProvidersResponse(BaseModel):
    """Proveedores de calendario disponibles."""
    providers: list


# ========== Endpoints ==========

@router.get("/providers", response_model=AvailableProvidersResponse)
async def get_available_providers():
    """
    Obtener proveedores de calendario disponibles.
    
    Solo devuelve los proveedores que están configurados correctamente.
    """
    providers = []
    
    google_service = get_google_calendar_service()
    if google_service.is_configured:
        providers.append({
            "id": "google",
            "name": "Google Calendar",
            "icon": "google",
            "enabled": True,
        })
    
    microsoft_service = get_microsoft_calendar_service()
    if microsoft_service.is_configured:
        providers.append({
            "id": "microsoft",
            "name": "Outlook Calendar",
            "icon": "microsoft",
            "enabled": True,
        })
    
    return {"providers": providers}


@router.get("/auth-url/{provider}", response_model=CalendarAuthUrlResponse)
async def get_calendar_auth_url(
    provider: str,
    redirect_uri: str = Query(..., description="URI de redirección después de autorización"),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener URL de autorización para conectar un calendario.
    
    El frontend debe redirigir al usuario a esta URL.
    
    Args:
        provider: Proveedor de calendario (google, microsoft)
        redirect_uri: URL a la que redirigir después de autorizar
    """
    if provider == "google":
        service = get_google_calendar_service()
        if not service.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Calendar no está configurado en el servidor"
            )
        auth_url = service.get_authorization_url(redirect_uri, state=str(current_user.id))
        
    elif provider == "microsoft":
        service = get_microsoft_calendar_service()
        if not service.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Microsoft Calendar no está configurado en el servidor"
            )
        auth_url = service.get_authorization_url(redirect_uri, state=str(current_user.id))
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proveedor no soportado: {provider}. Usa 'google' o 'microsoft'"
        )
    
    logger.info(
        "URL de autorización de calendario generada",
        provider=provider,
        user_id=current_user.id
    )
    
    return {"auth_url": auth_url, "provider": provider}


@router.post("/callback", response_model=CalendarConnectionResponse)
async def calendar_oauth_callback(
    data: CalendarCallbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Callback de OAuth para calendario.
    
    Intercambia el código de autorización por tokens y guarda la conexión.
    """
    sync_service = get_calendar_sync_service()
    
    try:
        if data.provider == "google":
            service = get_google_calendar_service()
            tokens = await service.exchange_code_for_tokens(data.code, data.redirect_uri)
            
        elif data.provider == "microsoft":
            service = get_microsoft_calendar_service()
            tokens = await service.exchange_code_for_tokens(data.code, data.redirect_uri)
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Proveedor no soportado: {data.provider}"
            )
        
        # Guardar conexión
        connection = await sync_service.save_calendar_connection(
            db=db,
            user_id=current_user.id,
            provider=data.provider,
            tokens=tokens
        )
        
        logger.info(
            "Calendario conectado exitosamente",
            provider=data.provider,
            user_id=current_user.id,
            email=tokens.get("email")
        )
        
        return CalendarConnectionResponse(
            id=connection.id,
            provider=connection.provider,
            account_email=connection.account_email,
            calendar_id=connection.calendar_id,
            is_active=connection.is_active,
            last_sync_at=connection.last_sync_at.isoformat() if connection.last_sync_at else None,
            sync_error=connection.sync_error,
        )
        
    except ValueError as e:
        logger.error(
            "Error en callback de calendario",
            provider=data.provider,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/connections", response_model=list[CalendarConnectionResponse])
async def get_calendar_connections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener todas las conexiones de calendario del usuario.
    """
    sync_service = get_calendar_sync_service()
    connections = await sync_service.get_user_connections(db, current_user.id)
    
    return [
        CalendarConnectionResponse(
            id=conn.id,
            provider=conn.provider,
            account_email=conn.account_email,
            calendar_id=conn.calendar_id,
            is_active=conn.is_active,
            last_sync_at=conn.last_sync_at.isoformat() if conn.last_sync_at else None,
            sync_error=conn.sync_error,
        )
        for conn in connections
    ]


@router.delete("/connections/{connection_id}")
async def disconnect_calendar(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Desconectar un calendario.
    
    Args:
        connection_id: ID de la conexión a eliminar
    """
    sync_service = get_calendar_sync_service()
    success = await sync_service.disconnect_calendar(db, current_user.id, connection_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conexión de calendario no encontrada"
        )
    
    return {"message": "Calendario desconectado correctamente"}


@router.post("/sync", response_model=CalendarSyncResponse)
async def sync_calendars(
    connection_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sincronizar eventos de calendario(s).
    
    Args:
        connection_id: ID de conexión específica (opcional, None = sincronizar todos)
        
    Returns:
        Estadísticas de sincronización
    """
    sync_service = get_calendar_sync_service()
    
    try:
        stats = await sync_service.sync_calendar_events(
            db=db,
            user_id=current_user.id,
            connection_id=connection_id
        )
        
        return CalendarSyncResponse(**stats)
        
    except Exception as e:
        logger.error(
            "Error sincronizando calendarios",
            user_id=current_user.id,
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al sincronizar calendarios: {str(e)}"
        )


@router.get("/calendars/{provider}")
async def get_available_calendars(
    provider: str,
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtener lista de calendarios disponibles de un proveedor.
    
    Útil si el usuario tiene múltiples calendarios y quiere seleccionar uno específico.
    """
    from sqlalchemy import select, and_
    from models.calendar_connection import CalendarConnection
    from features.privacy.api_keys import decrypt_api_key
    
    # Obtener conexión
    result = await db.execute(
        select(CalendarConnection).where(
            and_(
                CalendarConnection.id == connection_id,
                CalendarConnection.user_id == current_user.id,
                CalendarConnection.provider == provider,
                CalendarConnection.is_active == True
            )
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conexión de calendario no encontrada"
        )
    
    # Obtener token válido
    sync_service = get_calendar_sync_service()
    access_token = await sync_service._get_valid_access_token(db, connection)
    
    # Obtener calendarios según proveedor
    if provider == "google":
        service = get_google_calendar_service()
        calendars = await service.get_calendar_list(access_token)
    elif provider == "microsoft":
        service = get_microsoft_calendar_service()
        calendars = await service.get_calendar_list(access_token)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proveedor no soportado: {provider}"
        )
    
    return {"calendars": calendars}


@router.patch("/connections/{connection_id}/calendar")
async def set_active_calendar(
    connection_id: int,
    calendar_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Establecer el calendario activo para una conexión.
    
    Args:
        connection_id: ID de la conexión
        calendar_id: ID del calendario a usar
    """
    from sqlalchemy import select, and_
    from models.calendar_connection import CalendarConnection
    
    result = await db.execute(
        select(CalendarConnection).where(
            and_(
                CalendarConnection.id == connection_id,
                CalendarConnection.user_id == current_user.id,
                CalendarConnection.is_active == True
            )
        )
    )
    connection = result.scalar_one_or_none()
    
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conexión de calendario no encontrada"
        )
    
    connection.calendar_id = calendar_id
    await db.commit()
    
    return {"message": f"Calendario activo actualizado a {calendar_id}"}

