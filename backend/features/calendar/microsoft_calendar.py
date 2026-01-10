"""
AIssistant - Servicio de Microsoft Calendar (Outlook)
=====================================================
Integración con Microsoft Graph API para sincronización de eventos.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode
import httpx
import structlog

from core.config import settings

logger = structlog.get_logger()

# URLs de Microsoft OAuth y Graph API
MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
MICROSOFT_GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"

# Scopes necesarios para calendario
MICROSOFT_CALENDAR_SCOPES = [
    "offline_access",  # Para refresh token
    "Calendars.Read",
    "User.Read",
]


class MicrosoftCalendarService:
    """
    Servicio para integración con Microsoft Calendar (Outlook).
    
    Usa Microsoft Graph API para acceder a eventos de Outlook.
    """
    
    def __init__(self):
        self.client_id = settings.MICROSOFT_CLIENT_ID
        self.client_secret = settings.MICROSOFT_CLIENT_SECRET
        self.tenant_id = settings.MICROSOFT_TENANT_ID
        
    @property
    def is_configured(self) -> bool:
        """Verificar si Microsoft Calendar está configurado."""
        return bool(self.client_id and self.client_secret)
    
    def _get_auth_url(self) -> str:
        """Obtener URL de autorización con tenant."""
        return MICROSOFT_AUTH_URL.format(tenant=self.tenant_id)
    
    def _get_token_url(self) -> str:
        """Obtener URL de tokens con tenant."""
        return MICROSOFT_TOKEN_URL.format(tenant=self.tenant_id)
    
    def get_authorization_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """
        Generar URL de autorización para conectar Microsoft Calendar.
        
        Args:
            redirect_uri: URL de callback después de autorización
            state: Token CSRF opcional
            
        Returns:
            URL completa para redirigir al usuario
        """
        if not self.is_configured:
            raise ValueError("Microsoft Calendar no está configurado. Configura MICROSOFT_CLIENT_ID y MICROSOFT_CLIENT_SECRET.")
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(MICROSOFT_CALENDAR_SCOPES),
            "response_mode": "query",
        }
        
        if state:
            params["state"] = state
            
        return f"{self._get_auth_url()}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(
        self,
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Intercambiar código de autorización por tokens.
        
        Args:
            code: Código de autorización de Microsoft
            redirect_uri: URI de redirección usado en la autorización
            
        Returns:
            Dict con access_token, refresh_token, expires_in, email
        """
        async with httpx.AsyncClient() as client:
            # 1. Obtener tokens
            token_response = await client.post(
                self._get_token_url(),
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                    "scope": " ".join(MICROSOFT_CALENDAR_SCOPES),
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if token_response.status_code != 200:
                error_data = token_response.json() if "application/json" in token_response.headers.get("content-type", "") else {}
                logger.error(
                    "Error obteniendo tokens de Microsoft",
                    status=token_response.status_code,
                    error=error_data.get("error", "unknown"),
                    description=error_data.get("error_description", "")
                )
                raise ValueError(f"Error de autenticación: {error_data.get('error_description', 'Error desconocido')}")
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)
            
            # 2. Obtener información del usuario
            user_response = await client.get(
                f"{MICROSOFT_GRAPH_API_BASE}/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            email = ""
            if user_response.status_code == 200:
                user_data = user_response.json()
                email = user_data.get("mail") or user_data.get("userPrincipalName", "")
            
            logger.info("Tokens de Microsoft Calendar obtenidos", email=email)
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": expires_in,
                "expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
                "email": email,
            }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refrescar el access token usando el refresh token.
        
        Args:
            refresh_token: Token de refresco almacenado
            
        Returns:
            Dict con nuevo access_token, refresh_token y expires_at
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self._get_token_url(),
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                    "scope": " ".join(MICROSOFT_CALENDAR_SCOPES),
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code != 200:
                logger.error("Error refrescando token de Microsoft", status=response.status_code)
                raise ValueError("No se pudo refrescar el token. Reconecta tu calendario.")
            
            token_data = response.json()
            expires_in = token_data.get("expires_in", 3600)
            
            # Microsoft puede devolver un nuevo refresh_token
            new_refresh_token = token_data.get("refresh_token", refresh_token)
            
            return {
                "access_token": token_data.get("access_token"),
                "refresh_token": new_refresh_token,
                "expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
            }
    
    async def get_upcoming_events(
        self,
        access_token: str,
        calendar_id: Optional[str] = None,
        days_ahead: int = 7,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Obtener eventos próximos del calendario de Outlook.
        
        Args:
            access_token: Token de acceso válido
            calendar_id: ID del calendario (None = calendario por defecto)
            days_ahead: Días hacia adelante para buscar
            max_results: Máximo número de eventos
            
        Returns:
            Lista de eventos con información relevante
        """
        now = datetime.utcnow()
        start_datetime = now.isoformat() + "Z"
        end_datetime = (now + timedelta(days=days_ahead)).isoformat() + "Z"
        
        # Construir URL del endpoint
        if calendar_id:
            url = f"{MICROSOFT_GRAPH_API_BASE}/me/calendars/{calendar_id}/calendarView"
        else:
            url = f"{MICROSOFT_GRAPH_API_BASE}/me/calendarView"
        
        params = {
            "startDateTime": start_datetime,
            "endDateTime": end_datetime,
            "$top": max_results,
            "$orderby": "start/dateTime",
            "$select": "id,subject,body,start,end,location,attendees,onlineMeeting,webLink,isOnlineMeeting,onlineMeetingUrl",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            
            if response.status_code == 401:
                raise ValueError("Token expirado. Se requiere refresco.")
            
            if response.status_code != 200:
                logger.error(
                    "Error obteniendo eventos de Microsoft Calendar",
                    status=response.status_code,
                    response=response.text[:500]
                )
                raise ValueError("Error al obtener eventos del calendario")
            
            data = response.json()
            events = data.get("value", [])
            
            # Transformar a formato normalizado
            return [self._normalize_event(event) for event in events]
    
    def _normalize_event(self, ms_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizar evento de Microsoft Calendar a formato interno.
        
        Args:
            ms_event: Evento en formato de Microsoft Graph API
            
        Returns:
            Evento en formato normalizado de AIssistant
        """
        # Extraer fechas
        start_data = ms_event.get("start", {})
        end_data = ms_event.get("end", {})
        
        scheduled_start = None
        scheduled_end = None
        
        start_str = start_data.get("dateTime")
        if start_str:
            try:
                scheduled_start = datetime.fromisoformat(start_str.replace("Z", ""))
            except ValueError:
                pass
        
        end_str = end_data.get("dateTime")
        if end_str:
            try:
                scheduled_end = datetime.fromisoformat(end_str.replace("Z", ""))
            except ValueError:
                pass
        
        # Extraer URL de la reunión
        meeting_url = ms_event.get("onlineMeetingUrl")
        if not meeting_url:
            online_meeting = ms_event.get("onlineMeeting", {})
            if online_meeting:
                meeting_url = online_meeting.get("joinUrl")
        
        # Detectar plataforma
        platform = None
        if meeting_url:
            if "teams.microsoft.com" in meeting_url.lower():
                platform = "teams"
            elif "zoom.us" in meeting_url.lower():
                platform = "zoom"
            elif "meet.google.com" in meeting_url.lower():
                platform = "meet"
        
        # También buscar en location
        location = ms_event.get("location", {})
        location_name = location.get("displayName", "") if isinstance(location, dict) else ""
        
        if not meeting_url and location_name:
            import re
            urls = re.findall(r'https?://[^\s<>"]+', location_name)
            for url in urls:
                if any(domain in url.lower() for domain in ["teams.microsoft.com", "zoom.us", "meet.google.com"]):
                    meeting_url = url
                    break
        
        # Extraer participantes
        attendees = ms_event.get("attendees", [])
        participants = [
            {
                "email": att.get("emailAddress", {}).get("address", ""),
                "name": att.get("emailAddress", {}).get("name", ""),
                "response_status": att.get("status", {}).get("response", "none"),
            }
            for att in attendees
        ]
        
        # Extraer descripción del body
        body = ms_event.get("body", {})
        description = None
        if body.get("contentType") == "text":
            description = body.get("content")
        elif body.get("contentType") == "html":
            # Simplificar HTML a texto plano
            import re
            html_content = body.get("content", "")
            description = re.sub(r'<[^>]+>', '', html_content).strip()
        
        return {
            "calendar_event_id": ms_event.get("id"),
            "calendar_source": "microsoft",
            "title": ms_event.get("subject", "Sin título"),
            "description": description,
            "scheduled_start": scheduled_start,
            "scheduled_end": scheduled_end,
            "meeting_url": meeting_url,
            "platform": platform,
            "participants": participants,
            "html_link": ms_event.get("webLink"),
            "status": "confirmed",  # Microsoft no tiene el mismo concepto de status
        }
    
    async def get_calendar_list(self, access_token: str) -> List[Dict[str, Any]]:
        """
        Obtener lista de calendarios del usuario.
        
        Args:
            access_token: Token de acceso válido
            
        Returns:
            Lista de calendarios disponibles
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MICROSOFT_GRAPH_API_BASE}/me/calendars",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            
            if response.status_code != 200:
                logger.error("Error obteniendo lista de calendarios de Microsoft", status=response.status_code)
                raise ValueError("Error al obtener calendarios")
            
            data = response.json()
            calendars = data.get("value", [])
            
            return [
                {
                    "id": cal.get("id"),
                    "name": cal.get("name"),
                    "primary": cal.get("isDefaultCalendar", False),
                    "can_edit": cal.get("canEdit", False),
                }
                for cal in calendars
            ]


# Singleton para acceso global
_microsoft_calendar_service: Optional[MicrosoftCalendarService] = None


def get_microsoft_calendar_service() -> MicrosoftCalendarService:
    """Obtener instancia singleton del servicio de Microsoft Calendar."""
    global _microsoft_calendar_service
    if _microsoft_calendar_service is None:
        _microsoft_calendar_service = MicrosoftCalendarService()
    return _microsoft_calendar_service

