"""
AIssistant - Limpieza Automática de Archivos Temporales
=======================================================
Servicio para eliminar archivos de audio temporales basado en TTL.
"""

import os
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from core.config import settings
from core.celery_app import celery_app
from core.database import async_session_maker
from models.meeting import Meeting
from models.user import User

logger = structlog.get_logger()


class TempFileCleaner:
    """
    Servicio para limpiar archivos temporales basado en configuración de usuario.
    
    Cada usuario puede configurar su propio TTL (auto_delete_audio_hours).
    Un valor de 0 significa "nunca eliminar automáticamente".
    """
    
    def __init__(self, base_path: Optional[str] = None):
        """
        Inicializar servicio de limpieza.
        
        Args:
            base_path: Ruta base donde se almacenan los archivos temporales
        """
        self.base_path = Path(base_path or getattr(settings, 'AUDIO_TEMP_PATH', '/app/audio_temp'))
    
    async def cleanup_expired_files(self) -> dict:
        """
        Ejecutar limpieza de archivos expirados para todos los usuarios.
        
        Returns:
            Dict con estadísticas de limpieza
        """
        stats = {
            "files_deleted": 0,
            "bytes_freed": 0,
            "errors": 0,
            "users_processed": 0,
        }
        
        async with async_session_maker() as db:
            # Obtener usuarios con auto_delete configurado (> 0 horas)
            result = await db.execute(
                select(User).where(User.auto_delete_audio_hours > 0)
            )
            users = result.scalars().all()
            
            for user in users:
                try:
                    user_stats = await self._cleanup_user_files(db, user)
                    stats["files_deleted"] += user_stats["files_deleted"]
                    stats["bytes_freed"] += user_stats["bytes_freed"]
                    stats["users_processed"] += 1
                except Exception as e:
                    logger.error(
                        "Error limpiando archivos de usuario",
                        user_id=user.id,
                        error=str(e)
                    )
                    stats["errors"] += 1
        
        logger.info(
            "Limpieza de archivos completada",
            files_deleted=stats["files_deleted"],
            bytes_freed_mb=round(stats["bytes_freed"] / (1024 * 1024), 2),
            users_processed=stats["users_processed"],
            errors=stats["errors"]
        )
        
        return stats
    
    async def _cleanup_user_files(self, db: AsyncSession, user: User) -> dict:
        """
        Limpiar archivos expirados de un usuario específico.
        
        Args:
            db: Sesión de base de datos
            user: Usuario a procesar
            
        Returns:
            Dict con estadísticas de limpieza del usuario
        """
        stats = {"files_deleted": 0, "bytes_freed": 0}
        
        ttl_hours = user.auto_delete_audio_hours
        cutoff_time = datetime.utcnow() - timedelta(hours=ttl_hours)
        
        # Buscar reuniones con archivos de audio expirados
        result = await db.execute(
            select(Meeting).where(
                and_(
                    Meeting.user_id == user.id,
                    Meeting.audio_file_path.isnot(None),
                    Meeting.created_at < cutoff_time
                )
            )
        )
        meetings = result.scalars().all()
        
        for meeting in meetings:
            try:
                file_path = Path(meeting.audio_file_path)
                
                if file_path.exists():
                    file_size = file_path.stat().st_size
                    file_path.unlink()
                    stats["files_deleted"] += 1
                    stats["bytes_freed"] += file_size
                    
                    logger.debug(
                        "Archivo de audio eliminado",
                        meeting_id=meeting.id,
                        file_path=str(file_path),
                        size_mb=round(file_size / (1024 * 1024), 2)
                    )
                
                # Actualizar reunión para indicar que el audio fue eliminado
                meeting.audio_file_path = None
                
            except Exception as e:
                logger.warning(
                    "Error eliminando archivo",
                    meeting_id=meeting.id,
                    file_path=meeting.audio_file_path,
                    error=str(e)
                )
        
        await db.commit()
        
        return stats
    
    async def cleanup_orphaned_files(self) -> dict:
        """
        Limpiar archivos huérfanos (sin referencia en BD).
        
        Estos pueden existir por errores de procesamiento o interrupciones.
        
        Returns:
            Dict con estadísticas de limpieza
        """
        stats = {"files_deleted": 0, "bytes_freed": 0}
        
        if not self.base_path.exists():
            return stats
        
        # Obtener lista de archivos en el directorio temporal
        temp_files = list(self.base_path.glob("*"))
        
        async with async_session_maker() as db:
            # Obtener rutas de archivos referenciados en BD
            result = await db.execute(
                select(Meeting.audio_file_path).where(
                    Meeting.audio_file_path.isnot(None)
                )
            )
            referenced_paths = {Path(p) for p in result.scalars().all() if p}
        
        # Eliminar archivos no referenciados que tengan más de 24 horas
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        
        for file_path in temp_files:
            if file_path.is_file() and file_path not in referenced_paths:
                # Verificar antigüedad
                file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                
                if file_mtime < cutoff_time:
                    try:
                        file_size = file_path.stat().st_size
                        file_path.unlink()
                        stats["files_deleted"] += 1
                        stats["bytes_freed"] += file_size
                        
                        logger.info(
                            "Archivo huérfano eliminado",
                            file_path=str(file_path),
                            size_mb=round(file_size / (1024 * 1024), 2)
                        )
                    except Exception as e:
                        logger.warning(
                            "Error eliminando archivo huérfano",
                            file_path=str(file_path),
                            error=str(e)
                        )
        
        return stats
    
    def get_disk_usage(self) -> dict:
        """
        Obtener uso de disco del directorio temporal.
        
        Returns:
            Dict con información de uso de disco
        """
        if not self.base_path.exists():
            return {
                "total_files": 0,
                "total_size_mb": 0,
                "oldest_file_age_hours": 0
            }
        
        files = list(self.base_path.glob("*"))
        total_size = sum(f.stat().st_size for f in files if f.is_file())
        
        oldest_age = 0
        if files:
            oldest_mtime = min(f.stat().st_mtime for f in files if f.is_file())
            oldest_age = (datetime.utcnow() - datetime.fromtimestamp(oldest_mtime)).total_seconds() / 3600
        
        return {
            "total_files": len([f for f in files if f.is_file()]),
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "oldest_file_age_hours": round(oldest_age, 1)
        }


# ============================================
# Tareas Celery para limpieza programada
# ============================================

@celery_app.task(name="cleanup.expired_audio_files")
def cleanup_expired_audio_files_task():
    """
    Tarea Celery para limpiar archivos de audio expirados.
    
    Se ejecuta periódicamente (configurado en celery beat).
    """
    async def _cleanup():
        cleaner = TempFileCleaner()
        return await cleaner.cleanup_expired_files()
    
    return asyncio.run(_cleanup())


@celery_app.task(name="cleanup.orphaned_files")
def cleanup_orphaned_files_task():
    """
    Tarea Celery para limpiar archivos huérfanos.
    """
    async def _cleanup():
        cleaner = TempFileCleaner()
        return await cleaner.cleanup_orphaned_files()
    
    return asyncio.run(_cleanup())


# ============================================
# Configuración de Celery Beat (programación)
# ============================================

# Agregar a celery_app.conf.beat_schedule si se usa celery beat
CLEANUP_SCHEDULE = {
    'cleanup-expired-audio-hourly': {
        'task': 'cleanup.expired_audio_files',
        'schedule': 3600.0,  # Cada hora
    },
    'cleanup-orphaned-daily': {
        'task': 'cleanup.orphaned_files',
        'schedule': 86400.0,  # Cada 24 horas
    },
}

