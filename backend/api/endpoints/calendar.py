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


class ProviderInfo(BaseModel):
    """Información de un proveedor de calendario."""
    id: str
    name: str
    icon: str
    enabled: bool
    supports_multiple_accounts: bool = True
    requires_manual_setup: bool = False

class AvailableProvidersResponse(BaseModel):
    """Proveedores de calendario disponibles."""
    providers: list[ProviderInfo]


# ========== Endpoints ==========

@router.get("/debug/oauth-config")
async def get_oauth_debug_info(
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint de depuración para verificar la configuración de OAuth.
    
    Muestra información útil para diagnosticar problemas de redirect_uri_mismatch.
    """
    from backend.core.config import settings
    
    google_service = get_google_calendar_service()
    redirect_uri = "http://localhost:3000/settings/calendar/callback"
    
    debug_info = {
        "google": {
            "configured": google_service.is_configured,
            "client_id": google_service.client_id[:20] + "..." if google_service.client_id else None,
            "client_id_full": google_service.client_id if google_service.client_id else None,
            "client_secret_set": bool(google_service.client_secret),
            "expected_redirect_uri": redirect_uri,
            "auth_url_example": google_service.get_authorization_url(redirect_uri, state="test") if google_service.is_configured else None,
        },
        "instructions": {
            "step_1": "Verifica que el Client ID en Google Cloud Console coincida con el mostrado arriba",
            "step_2": f"Añade este redirect_uri exacto en Google Cloud Console: {redirect_uri}",
            "step_3": "Asegúrate de que NO tenga trailing slash ni espacios",
            "step_4": "Espera 2-5 minutos después de guardar en Google Cloud Console",
            "step_5": "Reinicia los servicios: docker-compose restart backend frontend",
        }
    }
    
    return debug_info


@router.get("/providers", response_model=AvailableProvidersResponse)
async def get_available_providers():
    """
    Obtener proveedores de calendario disponibles.
    
    Solo devuelve los proveedores que están configurados correctamente.
    Soporta múltiples cuentas del mismo proveedor.
    """
    providers = []
    
    # Google Calendar - siempre disponible si está configurado
    google_service = get_google_calendar_service()
    if google_service.is_configured:
        providers.append(ProviderInfo(
            id="google",
            name="Google Calendar",
            icon="google",
            enabled=True,
            supports_multiple_accounts=True,  # Permite múltiples cuentas
            requires_manual_setup=False
        ))
    
    # Microsoft Outlook - Personal y Empresarial
    microsoft_service = get_microsoft_calendar_service()
    if microsoft_service.is_configured:
        # Outlook Personal (cuentas Microsoft personales)
        providers.append(ProviderInfo(
            id="outlook_personal",
            name="Outlook Personal",
            icon="microsoft",
            enabled=True,
            supports_multiple_accounts=True,  # Permite múltiples cuentas personales
            requires_manual_setup=False
        ))
        
        # Outlook Empresarial (Office 365 / Azure AD)
        providers.append(ProviderInfo(
            id="outlook_business",
            name="Outlook Empresarial",
            icon="microsoft",
            enabled=True,
            supports_multiple_accounts=True,  # Permite múltiples cuentas empresariales
            requires_manual_setup=False
        ))
    
    # Apple Calendar - disponible sin configuración adicional (usando CalDAV)
    # Nota: Requiere configuración manual del usuario
    providers.append(ProviderInfo(
        id="apple",
        name="Apple Calendar",
        icon="apple",
        enabled=True,
        supports_multiple_accounts=True,
        requires_manual_setup=True  # Requiere configuración manual
    ))
    
    # CalDAV genérico - para otros proveedores (Nextcloud, ownCloud, etc.)
    providers.append(ProviderInfo(
        id="caldav",
        name="CalDAV (Genérico)",
        icon="calendar",
        enabled=True,
        supports_multiple_accounts=True,
        requires_manual_setup=True  # Requiere configuración manual
    ))
    
    return {"providers": providers}


@router.get("/auth-url/{provider}", response_model=CalendarAuthUrlResponse)
async def get_calendar_auth_url(
    provider: str,
    redirect_uri: str = Query(..., description="URI de redirección después de autorización"),
    current_user: dict = Depends(get_current_user)
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
        auth_url = service.get_authorization_url(redirect_uri, state=str(current_user["user_id"]))
        
    elif provider == "microsoft":
        # Mantener compatibilidad con el proveedor antiguo
        service = get_microsoft_calendar_service()
        if not service.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Microsoft Calendar no está configurado en el servidor"
            )
        auth_url = service.get_authorization_url(redirect_uri, state=str(current_user["user_id"]))
        
    elif provider == "outlook_personal":
        # Outlook Personal - usa tenant "consumers" para solo cuentas personales
        service = get_microsoft_calendar_service()
        if not service.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Microsoft Calendar no está configurado en el servidor"
            )
        auth_url = service.get_authorization_url(
            redirect_uri, 
            state=str(current_user["user_id"]),
            tenant="consumers"  # Solo cuentas personales de Microsoft
        )
        
    elif provider == "outlook_business":
        # Outlook Empresarial - usa tenant "organizations" para solo cuentas empresariales
        service = get_microsoft_calendar_service()
        if not service.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Microsoft Calendar no está configurado en el servidor"
            )
        auth_url = service.get_authorization_url(
            redirect_uri, 
            state=str(current_user["user_id"]),
            tenant="organizations"  # Solo cuentas empresariales (Office 365 / Azure AD)
        )
        
    elif provider == "apple":
        # Apple Calendar usa CalDAV - requiere configuración manual
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Apple Calendar requiere configuración manual mediante CalDAV. Usa el proveedor 'caldav'."
        )
    elif provider == "caldav":
        # CalDAV requiere configuración manual
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="CalDAV requiere configuración manual. Esta funcionalidad estará disponible próximamente."
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Proveedor no soportado: {provider}. Usa 'google', 'microsoft', 'outlook_personal' o 'outlook_business'"
        )
    
    logger.info(
        "URL de autorización de calendario generada",
        provider=provider,
        user_id=current_user["user_id"]
    )
    
    return {"auth_url": auth_url, "provider": provider}


@router.post("/callback", response_model=CalendarConnectionResponse)
async def calendar_oauth_callback(
    data: CalendarCallbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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
            # Mantener compatibilidad con el proveedor antiguo
            service = get_microsoft_calendar_service()
            tokens = await service.exchange_code_for_tokens(data.code, data.redirect_uri)
            
        elif data.provider == "outlook_personal":
            # Outlook Personal - usa tenant "consumers"
            service = get_microsoft_calendar_service()
            tokens = await service.exchange_code_for_tokens(
                data.code, 
                data.redirect_uri,
                tenant="consumers"
            )
            
        elif data.provider == "outlook_business":
            # Outlook Empresarial - usa tenant "organizations"
            service = get_microsoft_calendar_service()
            tokens = await service.exchange_code_for_tokens(
                data.code, 
                data.redirect_uri,
                tenant="organizations"
            )
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Proveedor no soportado: {data.provider}. Usa 'google', 'microsoft', 'outlook_personal' o 'outlook_business'"
            )
        
        # Guardar conexión
        connection = await sync_service.save_calendar_connection(
            db=db,
            user_id=int(current_user["user_id"]),
            provider=data.provider,
            tokens=tokens
        )
        
        logger.info(
            "Calendario conectado exitosamente",
            provider=data.provider,
            user_id=current_user["user_id"],
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
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener todas las conexiones de calendario del usuario.
    """
    sync_service = get_calendar_sync_service()
    connections = await sync_service.get_user_connections(db, int(current_user["user_id"]))
    
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
    current_user: dict = Depends(get_current_user)
):
    """
    Desconectar un calendario.
    
    Args:
        connection_id: ID de la conexión a eliminar
    """
    sync_service = get_calendar_sync_service()
    success = await sync_service.disconnect_calendar(db, int(current_user["user_id"]), connection_id)
    
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
    current_user: dict = Depends(get_current_user)
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
            user_id=int(current_user["user_id"]),
            connection_id=connection_id
        )
        
        return CalendarSyncResponse(**stats)
        
    except Exception as e:
        logger.error(
            "Error sincronizando calendarios",
            user_id=current_user["user_id"],
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
    current_user: dict = Depends(get_current_user)
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
                CalendarConnection.user_id == int(current_user["user_id"]),
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
    current_user: dict = Depends(get_current_user)
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
                CalendarConnection.user_id == int(current_user["user_id"]),
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

