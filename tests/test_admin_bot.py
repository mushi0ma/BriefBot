"""Tests for the Admin Bot handlers."""

import pytest
from unittest.mock import AsyncMock, patch
from aiogram.types import Message
from app.admin_bot.admin_bot import cmd_start_help, cmd_dashboard, cmd_stats, router


@pytest.mark.asyncio
async def test_cmd_help_is_registered():
    """Ensure /help or /start command is added to the router."""
    from app.admin_bot.admin_bot import cmd_start_help
    # Filter by the exact callback function reference
    registered = any(handler.callback == cmd_start_help for handler in router.message.handlers)
    assert registered, "/help command handler should be registered"

@pytest.mark.asyncio
@patch("app.admin_bot.admin_bot._is_admin", return_value=True)
async def test_cmd_help_shows_commands(mock_is_admin):
    """Ensure /help or /start outputs available commands."""
    from app.admin_bot.admin_bot import cmd_start_help
    message = AsyncMock(spec=Message)
    message.answer = AsyncMock() # force it to be awaitable
    await cmd_start_help(message)
    
    message.answer.assert_called_once()
    response_text = message.answer.call_args[0][0]
    assert "BriefBot Admin Panel" in response_text
    assert "/help" in response_text
