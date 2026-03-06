"""
Redis-based caching for AI results.
"""

from __future__ import annotations

import json
from typing import Optional

import redis.asyncio as redis

from app.config import get_settings
from app.logger import get_logger
from app.models.brief import BriefData

logger = get_logger("cache")

class BriefCache:
    """Cache for BriefData results."""

    def __init__(self) -> None:
        settings = get_settings()
        self.redis = redis.from_url(settings.redis_url, decode_responses=True)
        self.ttl = settings.cache_ttl_sec

    async def get(self, cache_key: str, template_slug: str) -> Optional[BriefData]:
        """Gets cached BriefData by cache key and template."""
        key = self._build_key(cache_key, template_slug)
        try:
            data = await self.redis.get(key)
            if data:
                logger.debug("cache_hit", key=key)
                return BriefData(**json.loads(data))
        except Exception as e:
            logger.warning("cache_error_get", error=str(e))
        return None

    async def set(self, cache_key: str, template_slug: str, brief_data: BriefData) -> None:
        """Caches BriefData by cache key and template."""
        key = self._build_key(cache_key, template_slug)
        try:
            await self.redis.set(
                key, 
                brief_data.model_dump_json(), 
                ex=self.ttl
            )
            logger.debug("cache_set", key=key)
        except Exception as e:
            logger.warning("cache_error_set", error=str(e))

    @staticmethod
    def _build_key(cache_key: str, template_slug: str) -> str:
        """Build a Redis key from the cache identifier and template slug."""
        return f"brief_cache:{cache_key}:{template_slug}"

_cache: BriefCache | None = None

def get_cache() -> BriefCache:
    """Singleton getter for BriefCache."""
    global _cache
    if _cache is None:
        _cache = BriefCache()
    return _cache
