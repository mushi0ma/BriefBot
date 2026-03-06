"""
Tests for BriefCache — key building, get, and set operations.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.brief import BriefData
from app.services.cache import BriefCache


class TestBriefCacheKeyBuilding:
    """Test the static _build_key method."""

    def test_build_key_format(self):
        key = BriefCache._build_key("abc123", "default")
        assert key == "brief_cache:abc123:default"

    def test_build_key_with_file_id(self):
        key = BriefCache._build_key("AgACAgIAAxkBAAN", "commercial")
        assert key == "brief_cache:AgACAgIAAxkBAAN:commercial"


class TestBriefCacheGet:
    """Test cache get operations."""

    @pytest.mark.asyncio
    async def test_get_returns_none_on_miss(self):
        with patch("app.services.cache.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(redis_url="redis://localhost", cache_ttl_sec=3600)
            with patch("app.services.cache.redis") as mock_redis_mod:
                mock_client = AsyncMock()
                mock_redis_mod.from_url.return_value = mock_client
                mock_client.get.return_value = None

                cache = BriefCache()
                result = await cache.get("miss_key", "default")

                assert result is None
                mock_client.get.assert_called_once_with("brief_cache:miss_key:default")

    @pytest.mark.asyncio
    async def test_get_returns_brief_data_on_hit(self):
        sample = BriefData(
            service_type="Сайт",
            summary="Summary",
            original_text="Text",
        )

        with patch("app.services.cache.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(redis_url="redis://localhost", cache_ttl_sec=3600)
            with patch("app.services.cache.redis") as mock_redis_mod:
                mock_client = AsyncMock()
                mock_redis_mod.from_url.return_value = mock_client
                mock_client.get.return_value = sample.model_dump_json()

                cache = BriefCache()
                result = await cache.get("hit_key", "default")

                assert result is not None
                assert result.service_type == "Сайт"
                assert result.summary == "Summary"

    @pytest.mark.asyncio
    async def test_get_returns_none_on_redis_error(self):
        with patch("app.services.cache.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(redis_url="redis://localhost", cache_ttl_sec=3600)
            with patch("app.services.cache.redis") as mock_redis_mod:
                mock_client = AsyncMock()
                mock_redis_mod.from_url.return_value = mock_client
                mock_client.get.side_effect = ConnectionError("Redis down")

                cache = BriefCache()
                result = await cache.get("err_key", "default")

                assert result is None


class TestBriefCacheSet:
    """Test cache set operations."""

    @pytest.mark.asyncio
    async def test_set_stores_with_correct_key_and_ttl(self):
        sample = BriefData(
            service_type="Бот",
            summary="Bot summary",
            original_text="Original",
        )

        with patch("app.services.cache.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(redis_url="redis://localhost", cache_ttl_sec=7200)
            with patch("app.services.cache.redis") as mock_redis_mod:
                mock_client = AsyncMock()
                mock_redis_mod.from_url.return_value = mock_client

                cache = BriefCache()
                await cache.set("set_key", "commercial", sample)

                mock_client.set.assert_called_once_with(
                    "brief_cache:set_key:commercial",
                    sample.model_dump_json(),
                    ex=7200,
                )

    @pytest.mark.asyncio
    async def test_set_swallows_redis_error(self):
        sample = BriefData(
            service_type="Тест",
            summary="Test",
            original_text="Text",
        )

        with patch("app.services.cache.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(redis_url="redis://localhost", cache_ttl_sec=3600)
            with patch("app.services.cache.redis") as mock_redis_mod:
                mock_client = AsyncMock()
                mock_redis_mod.from_url.return_value = mock_client
                mock_client.set.side_effect = ConnectionError("Redis down")

                cache = BriefCache()
                # Should not raise
                await cache.set("err_key", "default", sample)
