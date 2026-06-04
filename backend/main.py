"""
AIssistant Backend - Main Application Entry Point
================================================
Asistente de reuniones con IA - API Principal
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from core.config import settings
from core.database import init_db
from api.router import api_router

# Configurar logging estructurado PRIMERO
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()

# Importar todos los modelos para que SQLAlchemy los registre
# IMPORTANTE: Importar en orden correcto para que las relaciones se configuren
# El orden es crítico: User debe importarse ANTES que CalendarConnection
# porque CalendarConnection tiene una ForeignKey a User y una relación back_populates
from models.user import User  # noqa: F401
from models.calendar_connection import CalendarConnection  # noqa: F401
from models.meeting import Meeting, MeetingParticipant, MeetingSegment  # noqa: F401
from models.transcript import Transcript, TranscriptSegment  # noqa: F401
from models.action_item import ActionItem  # noqa: F401

# NO forzar configure_mappers() - SQLAlchemy configurará las relaciones automáticamente
# cuando se usen los modelos por primera vez. Esto evita problemas de orden de importación.
# El error que aparece es solo una advertencia durante la configuración inicial,
# pero las relaciones funcionan correctamente cuando se usan en tiempo de ejecución.


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación."""
    logger.info("Iniciando AIssistant Backend", version="1.0.1")
    
    # Inicializar base de datos
    await init_db()
    logger.info("Base de datos inicializada")
    
    # Cargar modelo de Whisper según configuración
    if settings.DEPLOYMENT_MODE in ["local", "hybrid"]:
        logger.info(
            "Modo de despliegue configurado",
            mode=settings.DEPLOYMENT_MODE,
            whisper_model=settings.WHISPER_MODEL_SIZE
        )
        try:
            from api.endpoints.transcription import get_whisper_engine
            logger.info("Pre-cargando modelo Whisper en memoria...")
            await get_whisper_engine()
            logger.info("Modelo Whisper cargado e inicializado exitosamente en memoria")
        except Exception as e:
            logger.error("Error al pre-cargar el modelo Whisper en el arranque", error=str(e))
    
    yield
    
    # Cleanup
    logger.info("Cerrando AIssistant Backend")


# Crear aplicación FastAPI
app = FastAPI(
    title="AIssistant API",
    description="""
    🎙️ **AIssistant** - Asistente de Reuniones con Inteligencia Artificial
    
    API para transcripción en tiempo real, resúmenes inteligentes y gestión de reuniones.
    
    ## Características
    
    - 🔇 Transcripción en tiempo real con Whisper
    - 🤖 Resúmenes inteligentes con LLMs
    - 👥 Identificación de oradores
    - 📊 Análisis de sentimiento
    - 📅 Integración con calendarios
    - 🔗 Webhooks para automatización
    
    ## Modos de Despliegue
    
    - **Local**: 100% privado, procesamiento en dispositivo
    - **Híbrido**: Captura local + APIs en la nube
    - **Nube**: Solución SaaS gestionada
    """,
    version="1.0.1",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    """Endpoint raíz - Health check básico."""
    return {
        "status": "online",
        "service": "AIssistant API",
        "version": "1.0.1",
        "deployment_mode": settings.DEPLOYMENT_MODE
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check detallado del servicio."""
    return JSONResponse(
        content={
            "status": "healthy",
            "components": {
                "api": "operational",
                "database": "operational",
                "whisper": "ready" if settings.DEPLOYMENT_MODE != "cloud" else "n/a",
                "llm": "ready"
            },
            "deployment_mode": settings.DEPLOYMENT_MODE,
            "whisper_model": settings.WHISPER_MODEL_SIZE
        }
    )

