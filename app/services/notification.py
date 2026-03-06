"""
Notification service — sends alerts and messages to the admin bot.
Used for error reporting, health alerts, and system notifications.
"""

from __future__ import annotations

import traceback
from datetime import datetime, timezone
from enum import StrEnum

import httpx

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("notification")


class Severity(StrEnum):
    INFO = "ℹ️ INFO"
    WARNING = "⚠️ WARNING"
    CRITICAL = "🚨 CRITICAL"


async def notify_admin(
    message: str,
    severity: Severity = Severity.INFO,
    error: Exception | None = None,
    context: dict | None = None,
) -> None:
    """
    Send an alert message to the admin chat via Telegram Bot API.

    This bypasses the aiogram bot instance and uses direct HTTP to work
    from both the bot process and Celery workers.

    Args:
        message: Alert message text.
        severity: Alert severity level.
        error: Optional exception to include traceback.
        context: Optional dict of extra context (user_id, task_id, etc.)
    """
    settings = get_settings()

    now = datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M:%S UTC")
    parts = [
        f"{severity.value}",
        f"🕐 {now}",
        "",
        message,
    ]

    if context:
        ctx_lines = "\n".join(f"  • {k}: {v}" for k, v in context.items())
        parts.extend(["", "📎 Контекст:", ctx_lines])

    if error:
        tb = traceback.format_exception(type(error), error, error.__traceback__)
        tb_text = "".join(tb[-3:])  # Last 3 frames
        if len(tb_text) > 800:
            tb_text = tb_text[:800] + "..."
        parts.extend(["", f"🐛 Ошибка: {type(error).__name__}: {error}", "", f"```\n{tb_text}\n```"])

    text = "\n".join(parts)

    try:
        url = f"https://api.telegram.org/bot{settings.telegram_admin_bot_token.get_secret_value()}/sendMessage"
        payload = {
            "chat_id": settings.admin_chat_id,
            "text": text,
            "parse_mode": "Markdown",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                logger.error("admin_notify_http_error", status=response.status_code, body=response.text)
            else:
                logger.debug("admin_notified", severity=severity.value)

    except Exception as e:
        # Never crash because of notification failure
        logger.error("admin_notify_failed", error=str(e), original_message=message[:200])
