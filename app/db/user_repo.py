"""
User repository — CRUD operations for the `users` table in Supabase.
"""

from __future__ import annotations

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
    @_retry
    def get_or_create(telegram_id: int, username: str = "", first_name: str = "", last_name: str = "") -> dict[str, Any]:
        """Fetch a user by telegram_id, or create a new record."""
        sb = get_supabase()

        # Use select + limit instead of maybe_single to avoid 406 errors
        result = sb.table(UserRepo.TABLE).select("*").eq("telegram_id", telegram_id).limit(1).execute()

        if result and result.data and len(result.data) > 0:
            logger.debug("user_found", telegram_id=telegram_id)
            return result.data[0]

        # Create new user
        new_user = {
            "telegram_id": telegram_id,
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
        }
        insert_result = sb.table(UserRepo.TABLE).insert(new_user).execute()
        logger.info("user_created", telegram_id=telegram_id, username=username)
        return insert_result.data[0]

    @staticmethod
    @_retry
    def increment_briefs(telegram_id: int) -> None:
        """Increment the brief counter for a user."""
        sb = get_supabase()
        result = sb.table(UserRepo.TABLE).select("briefs_count").eq("telegram_id", telegram_id).limit(1).execute()
        current = 0
        if result and result.data and len(result.data) > 0:
            current = result.data[0].get("briefs_count", 0)
        sb.table(UserRepo.TABLE).update({"briefs_count": current + 1}).eq("telegram_id", telegram_id).execute()

    @staticmethod
    @_retry
    def get_all_users() -> list[dict[str, Any]]:
        """Return all users ordered by briefs_count descending."""
        sb = get_supabase()
        result = sb.table(UserRepo.TABLE).select("*").order("briefs_count", desc=True).execute()
        return result.data or []

    @staticmethod
    @_retry
    def get_stats() -> dict[str, int]:
        """Return aggregated user statistics."""
        sb = get_supabase()
        result = sb.table(UserRepo.TABLE).select("*", count="exact").execute()
        total = result.count or 0
        return {"total_users": total}

    @staticmethod
    @_retry
    def update_branding(
        telegram_id: int,
        brand_color: str | None = None,
        logo_url: str | None = None,
    ) -> None:
        """Update user branding settings (accent color, logo)."""
        sb = get_supabase()
        update_data: dict[str, Any] = {}
        if brand_color is not None:
            update_data["brand_color"] = brand_color
        if logo_url is not None:
            update_data["logo_url"] = logo_url
        if update_data:
            sb.table(UserRepo.TABLE).update(update_data).eq("telegram_id", telegram_id).execute()
            logger.info("user_branding_updated", telegram_id=telegram_id, fields=list(update_data.keys()))
