"""
Middlewares for the main Telegram bot.
Provides structured logging and centralized error handling.
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update, Message

from app.logger import get_logger, new_correlation_id
from app.services.notification import Severity, notify_admin

logger = get_logger("bot_middleware")


class LoggingMiddleware(BaseMiddleware):
    """Log every incoming update with structured context."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        # Generate correlation ID for tracing
        cid = new_correlation_id()

        if isinstance(event, Update):
            user_id = None
            update_type = "unknown"

            if event.message:
                user_id = event.message.from_user.id if event.message.from_user else None
                if event.message.voice:
                    update_type = "voice"
                elif event.message.audio:
                    update_type = "audio"
                elif event.message.text:
                    update_type = "text"
                else:
                    update_type = "message"
            elif event.callback_query:
                user_id = event.callback_query.from_user.id if event.callback_query.from_user else None
                update_type = "callback_query"

            logger.info(
                "incoming_update",
                update_id=event.update_id,
                user_id=user_id,
                update_type=update_type,
                correlation_id=cid,
            )

        return await handler(event, data)


class ErrorHandlerMiddleware(BaseMiddleware):
    """Catch all handler errors, log them, and notify admin."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        try:
            return await handler(event, data)
        except Exception as e:
            # Extract user info for context
            user_id = "unknown"
            chat_id = "unknown"
            if isinstance(event, Update) and event.message:
                user_id = str(event.message.from_user.id) if event.message.from_user else "unknown"
                chat_id = str(event.message.chat.id)

            logger.error(
                "handler_error",
                error_type=type(e).__name__,
                error=str(e),
                user_id=user_id,
                chat_id=chat_id,
                exc_info=True,
            )

            # Notify admin
            try:
                await notify_admin(
                    message=f"Bot handler error",
                    severity=Severity.WARNING,
                    error=e,
                    context={"user_id": user_id, "chat_id": chat_id},
                )
            except Exception:
                pass  # Don't crash if notification fails

            # Send generic error to user
            if isinstance(event, Update) and event.message:
                try:
                    await event.message.answer("❌ Произошла ошибка. Попробуйте позже.")
                except Exception:
                    pass
