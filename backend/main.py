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

# Configurar logging estructurado
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación."""
    logger.info("Iniciando AIssistant Backend", version="1.0.0")
    
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
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
        "version": "1.0.0",
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

