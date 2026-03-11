"""
Middlewares for the main Telegram bot.
Provides structured logging, centralized error handling, and throttling (rate limiting).
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Dict

import redis.asyncio as aioredis
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
                    message="Bot handler error",
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


class ThrottlingMiddleware(BaseMiddleware):
    """
    Rate-limit incoming messages per user using Redis.

    Limits:
    - Text messages: 1 per ``text_cooldown`` seconds (default: 3)
    - Audio/voice messages: 1 per ``audio_cooldown`` seconds (default: 60)

    Throttled requests get a polite "please wait" reply and are **not** forwarded
    to the handler.
    """

    TEXT_THROTTLE_MSG = "⏳ Подождите немного перед отправкой следующего сообщения."
    AUDIO_THROTTLE_MSG = "⏳ Подождите минуту перед отправкой следующего аудио."

    def __init__(
        self,
        redis_url: str,
        text_cooldown: float = 3.0,
        audio_cooldown: float = 60.0,
    ) -> None:
        super().__init__()
        self._redis: aioredis.Redis = aioredis.from_url(redis_url, decode_responses=True)
        self.text_cooldown = text_cooldown
        self.audio_cooldown = audio_cooldown

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        if not isinstance(event, Update) or not event.message:
            # Only throttle messages (not callback_queries etc.)
            return await handler(event, data)

        message: Message = event.message
        user_id = message.from_user.id if message.from_user else None
        if not user_id:
            return await handler(event, data)

        # Determine cooldown and key based on message type
        is_audio = bool(message.voice or message.audio)
        if is_audio:
            key = f"throttle:audio:{user_id}"
            cooldown = self.audio_cooldown
            throttle_msg = self.AUDIO_THROTTLE_MSG
        elif message.text and not message.text.startswith("/"):
            key = f"throttle:text:{user_id}"
            cooldown = self.text_cooldown
            throttle_msg = self.TEXT_THROTTLE_MSG
        else:
            # Don't throttle commands or non-text/audio messages
            return await handler(event, data)

        # Check if user is still in cooldown
        already_set = await self._redis.set(key, "1", nx=True, ex=int(cooldown))
        if not already_set:
            # Key exists → user is rate-limited
            logger.info("throttled", user_id=user_id, type="audio" if is_audio else "text")
            try:
                await message.answer(throttle_msg)
            except Exception:
                pass
            return  # Skip handler

        return await handler(event, data)
