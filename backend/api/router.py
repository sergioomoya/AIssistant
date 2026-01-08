"""
AIssistant - Router Principal de la API
=======================================
Agrupa todos los endpoints de la aplicación.
"""

from fastapi import APIRouter

from api.endpoints import auth, meetings, transcription, summarization, settings, export

api_router = APIRouter()

# Autenticación
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Autenticación"]
)

# Reuniones
api_router.include_router(
    meetings.router,
    prefix="/meetings",
    tags=["Reuniones"]
)

# Transcripción
api_router.include_router(
    transcription.router,
    prefix="/transcription",
    tags=["Transcripción"]
)

# Resúmenes e IA
api_router.include_router(
    summarization.router,
    prefix="/summarization",
    tags=["Resúmenes IA"]
)

# Configuración
api_router.include_router(
    settings.router,
    prefix="/settings",
    tags=["Configuración"]
)

# Exportación
api_router.include_router(
    export.router,
    prefix="/export",
    tags=["Exportación"]
)

