"""Tests for the Admin Bot handlers (post-cleanup)."""

import pytest
from unittest.mock import AsyncMock, patch
from aiogram.types import Message


@pytest.mark.asyncio
async def test_cmd_help_is_registered():
    """Ensure /start or /help command handler is registered on the router."""
    from app.admin_bot.admin_bot import cmd_start_help, router
    registered = any(handler.callback == cmd_start_help for handler in router.message.handlers)
    assert registered, "/help command handler should be registered"


@pytest.mark.asyncio
@patch("app.admin_bot.admin_bot._is_admin", return_value=True)
async def test_cmd_start_short_greeting(mock_is_admin):
    """After cleanup, /start should show a short greeting, NOT a long command list."""
    from app.admin_bot.admin_bot import cmd_start_help
    message = AsyncMock(spec=Message)
    message.answer = AsyncMock()
    await cmd_start_help(message)

    message.answer.assert_called_once()
    response_text = message.answer.call_args[0][0]
    assert "BriefBot Admin" in response_text
    # Old commands should NOT be listed anymore
    assert "/stats" not in response_text
    assert "/health" not in response_text
    assert "/users" not in response_text
    assert "/templates" not in response_text
    assert "/export" not in response_text


def test_admin_keyboard_has_three_buttons():
    """admin_main_keyboard should have exactly 3 rows with the correct labels."""
    from app.admin_bot.admin_bot import admin_main_keyboard
    kb = admin_main_keyboard()
    # Flatten to get all buttons
    all_buttons = [btn for row in kb.keyboard for btn in row]

    assert len(all_buttons) == 3, f"Expected 3 buttons, got {len(all_buttons)}"

    labels = [btn.text for btn in all_buttons]
    assert "📊 Открыть Дашборд" in labels
    assert "📢 Рассылка" in labels
    assert "👥 Управление" in labels


def test_dashboard_button_is_web_app():
    """The dashboard button must be a WebApp button, not a plain text button."""
    from app.admin_bot.admin_bot import admin_main_keyboard
    kb = admin_main_keyboard()
    dashboard_btn = kb.keyboard[0][0]  # First row, first button
    assert dashboard_btn.web_app is not None, "Dashboard button must have web_app"
    assert "http" in dashboard_btn.web_app.url


def test_stats_handler_removed():
    """cmd_stats should no longer exist in admin_bot module."""
    import app.admin_bot.admin_bot as mod
    assert not hasattr(mod, "cmd_stats"), "cmd_stats should be removed"


def test_health_handler_removed():
    """cmd_health should no longer exist in admin_bot module."""
    import app.admin_bot.admin_bot as mod
    assert not hasattr(mod, "cmd_health"), "cmd_health should be removed"


def test_users_handler_removed():
    """cmd_users should no longer exist in admin_bot module."""
    import app.admin_bot.admin_bot as mod
    assert not hasattr(mod, "cmd_users"), "cmd_users should be removed"
