"""
AIssistant - Tareas Celery de Calendario
========================================
Tareas asíncronas para sincronización de calendarios.
"""

import asyncio
from celery import shared_task
import structlog

from core.celery_app import celery_app
from core.config import settings

logger = structlog.get_logger()


def run_async(coro):
    """Ejecutar coroutine en contexto síncrono de Celery."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


@celery_app.task(name='calendar.sync_all_users')
def sync_all_users_calendars():
    """
    Sincronizar calendarios de todos los usuarios.
    
    Esta tarea se ejecuta periódicamente (cada 15 minutos por defecto)
    y sincroniza los eventos de calendario de todos los usuarios con
    conexiones activas.
    """
    logger.info("Iniciando sincronización de calendarios para todos los usuarios")
    
    async def _sync_all():
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import select
        
        from core.config import settings
        from models.calendar_connection import CalendarConnection
        from features.calendar.calendar_sync import get_calendar_sync_service
        
        # Crear engine async
        engine = create_async_engine(settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'))
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        sync_service = get_calendar_sync_service()
        total_stats = {
            "users_processed": 0,
            "calendars_synced": 0,
            "meetings_created": 0,
            "meetings_updated": 0,
            "errors": 0,
        }
        
        async with async_session() as db:
            # Obtener todos los user_ids únicos con conexiones activas
            result = await db.execute(
                select(CalendarConnection.user_id).where(
                    CalendarConnection.is_active == True
                ).distinct()
            )
            user_ids = [row[0] for row in result.fetchall()]
            
            logger.info(f"Sincronizando calendarios de {len(user_ids)} usuarios")
            
            for user_id in user_ids:
                try:
                    stats = await sync_service.sync_calendar_events(
                        db=db,
                        user_id=user_id
                    )
                    
                    total_stats["users_processed"] += 1
                    total_stats["calendars_synced"] += stats["calendars_synced"]
                    total_stats["meetings_created"] += stats["meetings_created"]
                    total_stats["meetings_updated"] += stats["meetings_updated"]
                    total_stats["errors"] += len(stats.get("errors", []))
                    
                except Exception as e:
                    logger.error(
                        "Error sincronizando calendario de usuario",
                        user_id=user_id,
                        error=str(e)
                    )
                    total_stats["errors"] += 1
        
        await engine.dispose()
        return total_stats
    
    stats = run_async(_sync_all())
    
    logger.info(
        "Sincronización de calendarios completada",
        **stats
    )
    
    return stats


@celery_app.task(name='calendar.sync_user')
def sync_user_calendar(user_id: int, connection_id: int = None):
    """
    Sincronizar calendario de un usuario específico.
    
    Args:
        user_id: ID del usuario
        connection_id: ID de conexión específica (opcional)
    """
    logger.info(
        "Sincronizando calendario de usuario",
        user_id=user_id,
        connection_id=connection_id
    )
    
    async def _sync_user():
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.orm import sessionmaker
        
        from core.config import settings
        from features.calendar.calendar_sync import get_calendar_sync_service
        
        engine = create_async_engine(settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'))
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        sync_service = get_calendar_sync_service()
        
        async with async_session() as db:
            stats = await sync_service.sync_calendar_events(
                db=db,
                user_id=user_id,
                connection_id=connection_id
            )
        
        await engine.dispose()
        return stats
    
    stats = run_async(_sync_user())
    
    logger.info(
        "Sincronización de usuario completada",
        user_id=user_id,
        **stats
    )
    
    return stats


@celery_app.task(name='calendar.refresh_tokens')
def refresh_expiring_tokens():
    """
    Refrescar tokens que están próximos a expirar.
    
    Esta tarea se ejecuta periódicamente para mantener los tokens
    de OAuth actualizados y evitar errores de autenticación.
    """
    logger.info("Iniciando refresco de tokens próximos a expirar")
    
    async def _refresh_tokens():
        from datetime import datetime, timedelta
        from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import select, and_
        
        from core.config import settings
        from models.calendar_connection import CalendarConnection
        from features.calendar.calendar_sync import get_calendar_sync_service
        
        engine = create_async_engine(settings.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://'))
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        sync_service = get_calendar_sync_service()
        
        # Tokens que expiran en la próxima hora
        threshold = datetime.utcnow() + timedelta(hours=1)
        refreshed = 0
        errors = 0
        
        async with async_session() as db:
            result = await db.execute(
                select(CalendarConnection).where(
                    and_(
                        CalendarConnection.is_active == True,
                        CalendarConnection.token_expires_at < threshold,
                        CalendarConnection.refresh_token_encrypted.isnot(None)
                    )
                )
            )
            connections = result.scalars().all()
            
            logger.info(f"Encontrados {len(connections)} tokens próximos a expirar")
            
            for connection in connections:
                try:
                    # El método _get_valid_access_token refresca automáticamente
                    await sync_service._get_valid_access_token(db, connection)
                    refreshed += 1
                except Exception as e:
                    logger.error(
                        "Error refrescando token",
                        connection_id=connection.id,
                        error=str(e)
                    )
                    errors += 1
        
        await engine.dispose()
        return {"refreshed": refreshed, "errors": errors}
    
    stats = run_async(_refresh_tokens())
    
    logger.info(
        "Refresco de tokens completado",
        **stats
    )
    
    return stats

