"""
AIssistant - Configuración de Celery
=====================================
Configuración de Celery para procesamiento asíncrono de tareas.
"""

from celery import Celery
from core.config import settings

# Crear instancia de Celery
celery_app = Celery(
    "aissistant",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "features.transcription.tasks",
        "features.summarization.tasks",
        "features.meetings.tasks",
        "features.cleanup.temp_file_cleaner",
    ]
)

# Configuración de Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hora máximo por tarea
    task_soft_time_limit=3300,  # 55 minutos soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,  # Reiniciar worker después de 50 tareas
    broker_connection_retry_on_startup=True,  # Retry de conexión en startup
    task_routes={
        "features.transcription.tasks.*": {"queue": "transcription"},
        "features.summarization.tasks.*": {"queue": "summarization"},
        "features.meetings.tasks.*": {"queue": "meetings"},
    },
    task_default_queue="default",
    task_default_exchange="default",
    task_default_exchange_type="direct",
    task_default_routing_key="default",
)

# Configuración de resultados
celery_app.conf.result_backend_transport_options = {
    "master_name": "mymaster",
    "visibility_timeout": 3600,
}

# Configuración de retry
celery_app.conf.task_acks_late = True
celery_app.conf.task_reject_on_worker_lost = True

# Configuración de Celery Beat (tareas programadas)
celery_app.conf.beat_schedule = {
    # Limpieza de archivos de audio expirados - cada hora
    'cleanup-expired-audio-hourly': {
        'task': 'cleanup.expired_audio_files',
        'schedule': 3600.0,  # 1 hora
        'options': {'queue': 'default'}
    },
    # Limpieza de archivos huérfanos - cada 24 horas
    'cleanup-orphaned-daily': {
        'task': 'cleanup.orphaned_files',
        'schedule': 86400.0,  # 24 horas
        'options': {'queue': 'default'}
    },
}

if __name__ == "__main__":
    celery_app.start()

