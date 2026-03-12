import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from aiogram.exceptions import TelegramBadRequest

# These imports will fail initially because the module doesn't exist yet!
# from app.bot.stickers import StickerRegistry, send_temporary_sticker, delete_sticker_safe

from aiogram import Bot
from aiogram.types import Message

@pytest.fixture
def mock_bot():
    bot = Bot(token="123:test")
    bot.send_sticker = AsyncMock()
    bot.answer_sticker = AsyncMock()
    bot.delete_message = AsyncMock()
    
    # Setup standard responses
    sticker_message = AsyncMock(spec=Message)
    sticker_message.message_id = 999
    bot.send_sticker.return_value = sticker_message
    bot.answer_sticker.return_value = sticker_message
    return bot

@pytest.mark.asyncio
async def test_sticker_registry_loads_from_settings():
    """Ensure StickerRegistry maps correctly from app settings."""
    from app.config import Settings
    from app.bot.stickers import StickerRegistry
    
    # Mock settings
    mock_settings = Settings(
        telegram_bot_token="test",
        telegram_admin_bot_token="test",
        sticker_onboarding_id="onboard123",
        sticker_processing_id="proc123",
        sticker_success_id="succ123",
        sticker_error_id="err123",
        sticker_missing_fields_id="miss123"
    )
    
    registry = StickerRegistry.from_settings(mock_settings)
    assert registry.ONBOARDING == "onboard123"
    assert registry.PROCESSING == "proc123"
    assert registry.SUCCESS == "succ123"
    assert registry.ERROR == "err123"
    assert registry.MISSING_FIELDS == "miss123"

@pytest.mark.asyncio
async def test_send_temporary_sticker_success(mock_bot):
    """Test sending a sticker safely returns the message ID for tracking."""
    from app.bot.stickers import send_temporary_sticker
    
    # Target is a bot
    msg_id = await send_temporary_sticker(target=mock_bot, chat_id=123, sticker_id="test_sticker_id")
    
    mock_bot.send_sticker.assert_called_once_with(123, "test_sticker_id")
    assert msg_id == 999

@pytest.mark.asyncio
async def test_delete_sticker_safe_success(mock_bot):
    """Test safe deletion without exceptions."""
    from app.bot.stickers import delete_sticker_safe
    
    success = await delete_sticker_safe(bot=mock_bot, chat_id=123, message_id=999)
    mock_bot.delete_message.assert_called_once_with(123, 999)
    assert success is True

@pytest.mark.asyncio
async def test_delete_sticker_safe_handles_bad_request(mock_bot):
    """Test safe deletion catches standard TelegramBadRequest (e.g. message to delete not found)."""
    from app.bot.stickers import delete_sticker_safe
    
    # Simulate message perfectly gone or too old
    mock_bot.delete_message.side_effect = TelegramBadRequest(method="deleteMessage", message="message to delete not found")
    
    # Should not raise
    success = await delete_sticker_safe(bot=mock_bot, chat_id=123, message_id=999)
    assert success is False
