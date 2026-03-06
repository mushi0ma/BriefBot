"""
Brief history repository — CRUD for the `brief_history` table.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log

from app.db.supabase_client import get_supabase
from app.logger import get_logger

logger = get_logger("history_repo")

_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
    before_sleep=before_sleep_log(logger, logging.WARNING),  # type: ignore[arg-type]
    reraise=True,
)


class HistoryRepo:
    """Repository for brief processing history."""

    TABLE = "brief_history"

    @staticmethod
    @_retry
    def create(
        user_id: str,
        telegram_id: int,
        template_slug: str = "default",
        original_text: str = "",
    ) -> dict[str, Any]:
        """Create a new history record when processing starts."""
        sb = get_supabase()
        record = {
            "user_id": user_id,
            "telegram_id": telegram_id,
            "template_slug": template_slug,
            "original_text": original_text,
            "processing_state": "received",
        }
        result = sb.table(HistoryRepo.TABLE).insert(record).execute()
        logger.info("history_created", telegram_id=telegram_id, template=template_slug)
        return result.data[0]

    @staticmethod
    @_retry
    def update(
        record_id: str,
        processing_state: str | None = None,
        original_text: str | None = None,
        brief_data: dict | None = None,
        pdf_url: str | None = None,
        processing_time_ms: int | None = None,
        error_message: str | None = None,
    ) -> None:
        """Update a history record with new data."""
        sb = get_supabase()
        update_data: dict[str, Any] = {}
        if processing_state is not None:
            update_data["processing_state"] = processing_state
        if original_text is not None:
            update_data["original_text"] = original_text
        if brief_data is not None:
            update_data["brief_data"] = brief_data
        if pdf_url is not None:
            update_data["pdf_url"] = pdf_url
        if processing_time_ms is not None:
            update_data["processing_time_ms"] = processing_time_ms
        if error_message is not None:
            update_data["error_message"] = error_message

        if update_data:
            sb.table(HistoryRepo.TABLE).update(update_data).eq("id", record_id).execute()
            logger.debug("history_updated", record_id=record_id, fields=list(update_data.keys()))

    @staticmethod
    @_retry
    def get_user_history(telegram_id: int, limit: int = 5) -> list[dict[str, Any]]:
        """Return last N briefs for a user."""
        sb = get_supabase()
        result = (
            sb.table(HistoryRepo.TABLE)
            .select("*")
            .eq("telegram_id", telegram_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    @staticmethod
    @_retry
    def get_user_history_paginated(
        telegram_id: int, page: int = 1, per_page: int = 3
    ) -> tuple[list[dict[str, Any]], int]:
        """
        Return paginated briefs for a user.
        Returns (items, total_count).
        """
        sb = get_supabase()
        offset = (page - 1) * per_page

        # Get total count
        count_result = (
            sb.table(HistoryRepo.TABLE)
            .select("*", count="exact")
            .eq("telegram_id", telegram_id)
            .execute()
        )
        total = count_result.count or 0

        # Get page items
        result = (
            sb.table(HistoryRepo.TABLE)
            .select("*")
            .eq("telegram_id", telegram_id)
            .order("created_at", desc=True)
            .range(offset, offset + per_page - 1)
            .execute()
        )
        return result.data or [], total

    @staticmethod
    @_retry
    def get_by_id(record_id: str) -> dict[str, Any] | None:
        """Get a single history record by ID."""
        sb = get_supabase()
        result = (
            sb.table(HistoryRepo.TABLE)
            .select("*")
            .eq("id", record_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    @staticmethod
    @_retry
    def get_all_history() -> list[dict[str, Any]]:
        """Return all brief history records (used for admin export)."""
        sb = get_supabase()
        result = (
            sb.table(HistoryRepo.TABLE)
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []

    @staticmethod
    @_retry
    def get_stats() -> dict[str, Any]:
        """Return aggregated brief processing stats."""
        sb = get_supabase()
        total = sb.table(HistoryRepo.TABLE).select("*", count="exact").execute()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_result = (
            sb.table(HistoryRepo.TABLE)
            .select("*", count="exact")
            .gte("created_at", f"{today}T00:00:00+00:00")
            .execute()
        )
        done = (
            sb.table(HistoryRepo.TABLE)
            .select("*", count="exact")
            .eq("processing_state", "done")
            .execute()
        )
        failed = (
            sb.table(HistoryRepo.TABLE)
            .select("*", count="exact")
            .eq("processing_state", "failed")
            .execute()
        )
        return {
            "total_briefs": total.count or 0,
            "today_briefs": today_result.count or 0,
            "successful": done.count or 0,
            "failed": failed.count or 0,
        }
