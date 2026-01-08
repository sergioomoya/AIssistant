"""
AIssistant - Endpoints de Estado de Tareas
==========================================
WebSocket para recibir actualizaciones de estado de tareas asíncronas.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
import json
import structlog
import asyncio

from core.config import settings
import redis.asyncio as redis

router = APIRouter()
logger = structlog.get_logger()

# Cliente Redis para suscripciones
_redis_client: redis.Redis = None


async def get_redis_client() -> redis.Redis:
    """Obtener cliente Redis async."""
    global _redis_client
    if _redis_client is None:
        _redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=False)
    return _redis_client


@router.websocket("/ws/tasks/{task_id}")
async def websocket_task_status(
    websocket: WebSocket,
    task_id: str,
):
    """
    WebSocket para recibir actualizaciones de estado de una tarea.
    
    El cliente se conecta y recibe actualizaciones en tiempo real del progreso
    de procesamiento de una reunión (transcripción, diarización, resumen).
    
    Formato de mensajes:
    {
        "status": "uploading" | "processing" | "transcribing" | "summarizing" | "completed" | "failed",
        "progress": 0.0-1.0,
        "message": "Descripción del estado actual",
        "error": "Mensaje de error si status=failed"
    }
    """
    await websocket.accept()
    
    logger.info("WebSocket de tarea conectado", task_id=task_id)
    
    redis_client = await get_redis_client()
    pubsub = redis_client.pubsub()
    
    try:
        # Suscribirse a canal de actualizaciones de la tarea
        channel = f"task:{task_id}:updates"
        await pubsub.subscribe(channel)
        
        # Enviar estado inicial
        await websocket.send_json({
            "status": "pending",
            "progress": 0,
            "message": "Esperando inicio de procesamiento..."
        })
        
        # Escuchar mensajes de Redis
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
                    
                    # Si la tarea está completada o falló, cerrar conexión
                    if data.get("status") in ["completed", "failed"]:
                        logger.info("Tarea finalizada, cerrando WebSocket", task_id=task_id, status=data.get("status"))
                        break
                        
                except json.JSONDecodeError:
                    logger.warning("Mensaje JSON inválido recibido", task_id=task_id)
                except Exception as e:
                    logger.error("Error enviando mensaje WebSocket", error=str(e), task_id=task_id)
        
    except WebSocketDisconnect:
        logger.info("WebSocket de tarea desconectado", task_id=task_id)
    except Exception as e:
        logger.error("Error en WebSocket de tarea", error=str(e), task_id=task_id)
        try:
            await websocket.send_json({
                "status": "failed",
                "progress": 0,
                "error": str(e)
            })
        except:
            pass
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
        try:
            await websocket.close()
        except:
            pass


# Función helper para publicar actualizaciones de estado (síncrona para Celery)
def publish_task_update_sync(task_id: str, status: str, progress: float, message: str = None, error: str = None):
    """
    Publicar actualización de estado de tarea a Redis (versión síncrona para Celery).
    
    Args:
        task_id: ID de la tarea
        status: Estado actual
        progress: Progreso (0.0 a 1.0)
        message: Mensaje descriptivo
        error: Mensaje de error si aplica
    """
    try:
        import redis
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=False)
        channel = f"task:{task_id}:updates"
        
        data = {
            "status": status,
            "progress": progress,
        }
        
        if message:
            data["message"] = message
        if error:
            data["error"] = error
        
        redis_client.publish(channel, json.dumps(data))
        redis_client.close()
        
    except Exception as e:
        logger.error("Error publicando actualización de tarea", error=str(e), task_id=task_id)


# Versión async para endpoints
async def publish_task_update(task_id: str, status: str, progress: float, message: str = None, error: str = None):
    """Versión async para endpoints FastAPI."""
    try:
        redis_client = await get_redis_client()
        channel = f"task:{task_id}:updates"
        
        data = {
            "status": status,
            "progress": progress,
        }
        
        if message:
            data["message"] = message
        if error:
            data["error"] = error
        
        await redis_client.publish(channel, json.dumps(data))
        
    except Exception as e:
        logger.error("Error publicando actualización de tarea", error=str(e), task_id=task_id)

