"""
User repository — CRUD operations for the `users` table in Supabase.
All public methods are async and offload blocking Supabase I/O
to a thread pool via asyncio.to_thread().
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log

from app.db.supabase_client import get_supabase
from app.logger import get_logger

logger = get_logger("user_repo")

_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
    before_sleep=before_sleep_log(logger, logging.WARNING),  # type: ignore[arg-type]
    reraise=True,
)


class UserRepo:
    """Repository for Telegram users."""

    TABLE = "users"

    @staticmethod
    async def get_or_create(telegram_id: int, username: str = "", first_name: str = "", last_name: str = "") -> dict[str, Any]:
        """Fetch a user by telegram_id, or create a new record using atomic upsert."""

        @_retry
        def _inner() -> dict[str, Any]:
            sb = get_supabase()
            
            user_data = {
                "telegram_id": telegram_id,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
            }
            
            # Use upsert to avoid race conditions. on_conflict="telegram_id" ensures 
            # we update if exists, insert if not. However, we only care about getting
            # the record back safely.
            result = sb.table(UserRepo.TABLE).upsert(
                user_data, 
                on_conflict="telegram_id"
            ).execute()
            
            if result and result.data and len(result.data) > 0:
                logger.debug("user_upserted", telegram_id=telegram_id, username=username)
                return result.data[0]
                
            raise Exception("Upsert returned no data")

        return await asyncio.to_thread(_inner)

    @staticmethod
    async def increment_briefs(telegram_id: int) -> None:
        """Increment the brief counter for a user."""

        @_retry
        def _inner() -> None:
            sb = get_supabase()
            result = sb.table(UserRepo.TABLE).select("briefs_count").eq("telegram_id", telegram_id).limit(1).execute()
            current = 0
            if result and result.data and len(result.data) > 0:
                current = result.data[0].get("briefs_count", 0)
            sb.table(UserRepo.TABLE).update({"briefs_count": current + 1}).eq("telegram_id", telegram_id).execute()

        await asyncio.to_thread(_inner)

    @staticmethod
    async def get_all_users() -> list[dict[str, Any]]:
        """Return all users ordered by briefs_count descending."""

        @_retry
        def _inner() -> list[dict[str, Any]]:
            sb = get_supabase()
            result = sb.table(UserRepo.TABLE).select("*").order("briefs_count", desc=True).execute()
            return result.data or []

        return await asyncio.to_thread(_inner)

    @staticmethod
    async def get_stats() -> dict[str, int]:
        """Return aggregated user statistics."""

        @_retry
        def _inner() -> dict[str, int]:
            sb = get_supabase()
            result = sb.table(UserRepo.TABLE).select("*", count="exact").execute()
            total = result.count or 0
            return {"total_users": total}

        return await asyncio.to_thread(_inner)

    @staticmethod
    async def update_settings(
        telegram_id: int,
        brand_color: str | None = None,
        logo_url: str | None = None,
        default_template: str | None = None,
        include_assessment: bool | None = None,
        include_keywords: bool | None = None,
        include_summary: bool | None = None,
        include_competitors: bool | None = None,
        include_tone: bool | None = None,
        watermark_on_pdf: bool | None = None,
        include_cover_page: bool | None = None,
        page_numbering: bool | None = None,
        base_font_size: int | None = None,
        paper_size: str | None = None,
        language: str | None = None,
    ) -> None:
        """Update user branding and customization settings."""

        @_retry
        def _inner() -> None:
            sb = get_supabase()
            update_data: dict[str, Any] = {}
            if brand_color is not None:
                update_data["brand_color"] = brand_color
            if logo_url is not None:
                update_data["logo_url"] = logo_url
            if default_template is not None:
                update_data["default_template"] = default_template
            if include_assessment is not None:
                update_data["include_assessment"] = include_assessment
            if include_keywords is not None:
                update_data["include_keywords"] = include_keywords
            if include_summary is not None:
                update_data["include_summary"] = include_summary
            if include_competitors is not None:
                update_data["include_competitors"] = include_competitors
            if include_tone is not None:
                update_data["include_tone"] = include_tone
            if watermark_on_pdf is not None:
                update_data["watermark_on_pdf"] = watermark_on_pdf
            if include_cover_page is not None:
                update_data["include_cover_page"] = include_cover_page
            if page_numbering is not None:
                update_data["page_numbering"] = page_numbering
            if base_font_size is not None:
                update_data["base_font_size"] = base_font_size
            if paper_size is not None:
                update_data["paper_size"] = paper_size
            if language is not None:
                update_data["language"] = language
            if update_data:
                sb.table(UserRepo.TABLE).update(update_data).eq("telegram_id", telegram_id).execute()
                logger.info("user_settings_updated", telegram_id=telegram_id, fields=list(update_data.keys()))

        await asyncio.to_thread(_inner)
