"""
Async Supabase client singleton.
Provides a shared client for all repository modules.
"""

from __future__ import annotations

from supabase import create_client, Client

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("supabase_client")

_client: Client | None = None


def get_supabase() -> Client:
    """Return a Supabase client singleton (sync client used in async context through repos)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("supabase_client_initialized", url=settings.supabase_url)
    return _client
