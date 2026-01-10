"""
AIssistant - Servicio de Google Calendar
========================================
Integración con Google Calendar API para sincronización de eventos.
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode
import httpx
import structlog

from core.config import settings
from features.privacy.api_keys import encrypt_api_key, decrypt_api_key

logger = structlog.get_logger()

# URLs de Google OAuth y Calendar API
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Scopes necesarios para calendario
GOOGLE_CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
]


class GoogleCalendarService:
    """
    Servicio para integración con Google Calendar.
    
    Maneja OAuth, sincronización de eventos y gestión de tokens.
    """
    
    def __init__(self):
        self.client_id = settings.GOOGLE_CLIENT_ID
        self.client_secret = settings.GOOGLE_CLIENT_SECRET
        
    @property
    def is_configured(self) -> bool:
        """Verificar si Google Calendar está configurado."""
        return bool(self.client_id and self.client_secret)
    
    def get_authorization_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """
        Generar URL de autorización para conectar Google Calendar.
        
        Args:
            redirect_uri: URL de callback después de autorización
            state: Token CSRF opcional
            
        Returns:
            URL completa para redirigir al usuario
        """
        if not self.is_configured:
            raise ValueError("Google Calendar no está configurado. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.")
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_CALENDAR_SCOPES),
            "access_type": "offline",  # Para obtener refresh_token
            "prompt": "consent",  # Forzar pantalla de consentimiento
        }
        
        if state:
            params["state"] = state
            
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(
        self,
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Intercambiar código de autorización por tokens.
        
        Args:
            code: Código de autorización de Google
            redirect_uri: URI de redirección usado en la autorización
            
        Returns:
            Dict con access_token, refresh_token, expires_in, email
        """
        async with httpx.AsyncClient() as client:
            # 1. Obtener tokens
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                }
            )
            
            if token_response.status_code != 200:
                error_data = token_response.json() if "application/json" in token_response.headers.get("content-type", "") else {}
                logger.error(
                    "Error obteniendo tokens de Google Calendar",
                    status=token_response.status_code,
                    error=error_data.get("error", "unknown"),
                    description=error_data.get("error_description", "")
                )
                raise ValueError(f"Error de autenticación: {error_data.get('error_description', 'Error desconocido')}")
            
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)
            
            # 2. Obtener email del usuario
            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            email = ""
            if userinfo_response.status_code == 200:
                user_data = userinfo_response.json()
                email = user_data.get("email", "")
            
            logger.info("Tokens de Google Calendar obtenidos", email=email)
            
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
            Dict con nuevo access_token y expires_at
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
            )
            
            if response.status_code != 200:
                logger.error("Error refrescando token de Google", status=response.status_code)
                raise ValueError("No se pudo refrescar el token. Reconecta tu calendario.")
            
            token_data = response.json()
            expires_in = token_data.get("expires_in", 3600)
            
            return {
                "access_token": token_data.get("access_token"),
                "expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
            }
    
    async def get_upcoming_events(
        self,
        access_token: str,
        calendar_id: str = "primary",
        days_ahead: int = 7,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Obtener eventos próximos del calendario.
        
        Args:
            access_token: Token de acceso válido
            calendar_id: ID del calendario (default: primary)
            days_ahead: Días hacia adelante para buscar
            max_results: Máximo número de eventos
            
        Returns:
            Lista de eventos con información relevante
        """
        now = datetime.utcnow()
        time_min = now.isoformat() + "Z"
        time_max = (now + timedelta(days=days_ahead)).isoformat() + "Z"
        
        params = {
            "timeMin": time_min,
            "timeMax": time_max,
            "maxResults": max_results,
            "singleEvents": "true",
            "orderBy": "startTime",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GOOGLE_CALENDAR_API_BASE}/calendars/{calendar_id}/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            
            if response.status_code == 401:
                raise ValueError("Token expirado. Se requiere refresco.")
            
            if response.status_code != 200:
                logger.error(
                    "Error obteniendo eventos de Google Calendar",
                    status=response.status_code,
                    response=response.text[:500]
                )
                raise ValueError("Error al obtener eventos del calendario")
            
            data = response.json()
            events = data.get("items", [])
            
            # Transformar a formato normalizado
            return [self._normalize_event(event) for event in events]
    
    def _normalize_event(self, google_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizar evento de Google Calendar a formato interno.
        
        Args:
            google_event: Evento en formato de Google API
            
        Returns:
            Evento en formato normalizado de AIssistant
        """
        # Extraer fechas (pueden ser date o dateTime)
        start_data = google_event.get("start", {})
        end_data = google_event.get("end", {})
        
        start_str = start_data.get("dateTime") or start_data.get("date")
        end_str = end_data.get("dateTime") or end_data.get("date")
        
        # Parsear fechas
        scheduled_start = None
        scheduled_end = None
        
        if start_str:
            try:
                # dateTime incluye timezone
                if "T" in start_str:
                    # Remover timezone info para simplificar
                    scheduled_start = datetime.fromisoformat(start_str.replace("Z", "+00:00").split("+")[0])
                else:
                    # Solo fecha (evento de día completo)
                    scheduled_start = datetime.strptime(start_str, "%Y-%m-%d")
            except ValueError:
                pass
        
        if end_str:
            try:
                if "T" in end_str:
                    scheduled_end = datetime.fromisoformat(end_str.replace("Z", "+00:00").split("+")[0])
                else:
                    scheduled_end = datetime.strptime(end_str, "%Y-%m-%d")
            except ValueError:
                pass
        
        # Extraer URL de la reunión (Zoom, Meet, Teams)
        meeting_url = None
        conference_data = google_event.get("conferenceData", {})
        entry_points = conference_data.get("entryPoints", [])
        for entry in entry_points:
            if entry.get("entryPointType") == "video":
                meeting_url = entry.get("uri")
                break
        
        # Si no hay conferenceData, buscar en la descripción o location
        if not meeting_url:
            description = google_event.get("description", "") or ""
            location = google_event.get("location", "") or ""
            for text in [description, location]:
                if "zoom.us" in text.lower() or "meet.google.com" in text.lower() or "teams.microsoft.com" in text.lower():
                    # Extraer URL simple
                    import re
                    urls = re.findall(r'https?://[^\s<>"]+', text)
                    for url in urls:
                        if any(domain in url.lower() for domain in ["zoom.us", "meet.google.com", "teams.microsoft.com"]):
                            meeting_url = url
                            break
                if meeting_url:
                    break
        
        # Detectar plataforma
        platform = None
        if meeting_url:
            if "zoom.us" in meeting_url.lower():
                platform = "zoom"
            elif "meet.google.com" in meeting_url.lower():
                platform = "meet"
            elif "teams.microsoft.com" in meeting_url.lower():
                platform = "teams"
        
        # Extraer participantes
        attendees = google_event.get("attendees", [])
        participants = [
            {
                "email": att.get("email", ""),
                "name": att.get("displayName", att.get("email", "").split("@")[0]),
                "response_status": att.get("responseStatus", "needsAction"),
            }
            for att in attendees
            if not att.get("self", False)  # Excluir al propio usuario
        ]
        
        return {
            "calendar_event_id": google_event.get("id"),
            "calendar_source": "google",
            "title": google_event.get("summary", "Sin título"),
            "description": google_event.get("description"),
            "scheduled_start": scheduled_start,
            "scheduled_end": scheduled_end,
            "meeting_url": meeting_url,
            "platform": platform,
            "participants": participants,
            "html_link": google_event.get("htmlLink"),
            "status": google_event.get("status"),  # confirmed, tentative, cancelled
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
                f"{GOOGLE_CALENDAR_API_BASE}/users/me/calendarList",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            
            if response.status_code != 200:
                logger.error("Error obteniendo lista de calendarios", status=response.status_code)
                raise ValueError("Error al obtener calendarios")
            
            data = response.json()
            calendars = data.get("items", [])
            
            return [
                {
                    "id": cal.get("id"),
                    "name": cal.get("summary"),
                    "primary": cal.get("primary", False),
                    "access_role": cal.get("accessRole"),
                }
                for cal in calendars
            ]


# Singleton para acceso global
_google_calendar_service: Optional[GoogleCalendarService] = None


def get_google_calendar_service() -> GoogleCalendarService:
    """Obtener instancia singleton del servicio de Google Calendar."""
    global _google_calendar_service
    if _google_calendar_service is None:
        _google_calendar_service = GoogleCalendarService()
    return _google_calendar_service

