"""
Celery application instance.
Uses Redis as broker and result backend.
"""

from __future__ import annotations

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "briefbot",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=120,  # 2 min soft limit
    task_time_limit=180,       # 3 min hard limit
    task_default_queue="briefbot",
    beat_schedule={
        "cleanup-old-files": {
            "task": "cleanup_old_files",
            "schedule": 3600.0,  # Every hour
        },
    },
)

celery_app.autodiscover_tasks(["app.worker"])
