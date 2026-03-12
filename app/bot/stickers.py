from dataclasses import dataclass
from aiogram import Bot
from aiogram.types import Message
from aiogram.exceptions import TelegramBadRequest
from app.config import Settings
from app.logger import get_logger

logger = get_logger("stickers")

@dataclass
class StickerRegistry:
    ONBOARDING: str
    PROCESSING: str
    MISSING_FIELDS: str
    SUCCESS: str
    ERROR: str
    # Admin variants could also be moved here
    STATS: str = ""
    HEALTH_HEALTHY: str = ""
    HEALTH_ERRORS: str = ""

    @classmethod
    def from_settings(cls, settings: Settings) -> "StickerRegistry":
        return cls(
            ONBOARDING=settings.sticker_onboarding_id,
            PROCESSING=settings.sticker_processing_id,
            MISSING_FIELDS=settings.sticker_missing_fields_id,
            SUCCESS=settings.sticker_success_id,
            ERROR=settings.sticker_error_id,
            STATS=settings.sticker_stats_id,
            HEALTH_HEALTHY=settings.sticker_health_check_healthy_id,
            HEALTH_ERRORS=settings.sticker_health_check_errors_id,
        )

async def send_temporary_sticker(target: Message | Bot, chat_id: int | None = None, sticker_id: str = "") -> int | None:
    """
    Safely send a sticker. No-op if sticker_id is empty.
    Returns the message_id if sent successfully, else None.
    `target` can be an aiogram Message or Bot instance.
    """
    if not sticker_id:
        return None

    try:
        if isinstance(target, Bot) and chat_id is not None:
            msg = await target.send_sticker(chat_id, sticker_id)
        elif isinstance(target, Message):
            # Fallback wrapper for raw message objects
            if chat_id is not None:
                msg = await target.bot.send_sticker(chat_id, sticker_id)
            else:
                msg = await target.answer_sticker(sticker_id)
        else:
            return None
            
        return msg.message_id
    except Exception as e:
        logger.warning("sticker_send_failed", sticker_id=sticker_id, error=str(e))
        return None

async def delete_sticker_safe(bot: Bot, chat_id: int, message_id: int) -> bool:
    """
    Safely delete a sticker message. Catches standard exceptions.
    Returns True if deleted or already missing. Returns False if a structural exception occurred.
    """
    try:
        await bot.delete_message(chat_id, message_id)
        return True
    except TelegramBadRequest as e:
        # Expected if message was already deleted or doesn't exist
        logger.debug("safe_delete_sticker_skipped", chat_id=chat_id, message_id=message_id, reason=str(e))
        return False
    except Exception as e:
        logger.warning("failed_to_delete_sticker", msg_id=message_id, error=str(e))
        return False
