"""
Tests for history pagination and keyboards.
"""

from __future__ import annotations

import math
from unittest.mock import patch, MagicMock

import pytest

from app.bot.keyboards import (
    history_page_keyboard,
    history_item_keyboard,
    main_menu_keyboard,
    cancel_task_keyboard,
    missing_info_keyboard,
    settings_keyboard,
    color_picker_keyboard,
)


class TestHistoryPaginationKeyboard:
    """Test history pagination keyboard generation."""

    def test_first_page_has_next_button(self):
        kb = history_page_keyboard(page=1, total_pages=5)
        buttons = kb.inline_keyboard
        # Should have "1/5" and "След >" (no "< Пред")
        flat = [btn.text for row in buttons for btn in row]
        assert "1/5" in flat
        assert "След ▶️" in flat
        assert "◀️ Пред" not in flat

    def test_last_page_has_prev_button(self):
        kb = history_page_keyboard(page=5, total_pages=5)
        flat = [btn.text for row in kb.inline_keyboard for btn in row]
        assert "5/5" in flat
        assert "◀️ Пред" in flat
        assert "След ▶️" not in flat

    def test_middle_page_has_both_buttons(self):
        kb = history_page_keyboard(page=3, total_pages=5)
        flat = [btn.text for row in kb.inline_keyboard for btn in row]
        assert "◀️ Пред" in flat
        assert "3/5" in flat
        assert "След ▶️" in flat

    def test_single_page(self):
        kb = history_page_keyboard(page=1, total_pages=1)
        flat = [btn.text for row in kb.inline_keyboard for btn in row]
        assert "1/1" in flat
        assert "◀️ Пред" not in flat
        assert "След ▶️" not in flat

    def test_callback_data_format(self):
        kb = history_page_keyboard(page=2, total_pages=5)
        callbacks = [btn.callback_data for row in kb.inline_keyboard for btn in row]
        assert "history:page:1" in callbacks  # Prev
        assert "history:noop" in callbacks  # Counter
        assert "history:page:3" in callbacks  # Next


class TestHistoryItemKeyboard:
    """Test per-history-item keyboard."""

    def test_pdf_button_has_correct_callback(self):
        kb = history_item_keyboard("abc-123")
        btn = kb.inline_keyboard[0][0]
        assert btn.text == "📄 Скачать PDF"
        assert btn.callback_data == "history:pdf:abc-123"


class TestMainMenuKeyboard:
    """Test main menu keyboard structure."""

    def test_has_five_buttons(self):
        kb = main_menu_keyboard()
        buttons = [btn for row in kb.inline_keyboard for btn in row]
        assert len(buttons) == 5

    def test_callback_data_values(self):
        kb = main_menu_keyboard()
        callbacks = [btn.callback_data for row in kb.inline_keyboard for btn in row if btn.callback_data]
        assert "menu:audio" in callbacks
        assert "menu:text" in callbacks
        assert "menu:templates" in callbacks
        assert "menu:history" in callbacks

    def test_tma_button_present(self):
        kb = main_menu_keyboard()
        buttons = [btn for row in kb.inline_keyboard for btn in row]
        tma = [b for b in buttons if b.web_app is not None]
        assert len(tma) == 1
        assert "Личный кабинет" in tma[0].text


class TestCancelTaskKeyboard:
    """Test cancel task keyboard."""

    def test_cancel_button(self):
        kb = cancel_task_keyboard("task-xyz-123")
        btn = kb.inline_keyboard[0][0]
        assert "Отменить" in btn.text
        assert btn.callback_data == "cancel:task-xyz-123"


class TestMissingInfoKeyboard:
    """Test missing info dialog keyboard."""

    def test_has_fill_and_skip(self):
        kb = missing_info_keyboard()
        callbacks = [btn.callback_data for row in kb.inline_keyboard for btn in row]
        assert "missing:fill" in callbacks
        assert "missing:skip" in callbacks


class TestSettingsKeyboard:
    """Test settings keyboard."""

    def test_has_color_and_logo(self):
        kb = settings_keyboard()
        callbacks = [btn.callback_data for row in kb.inline_keyboard for btn in row]
        assert "settings:color" in callbacks
        assert "settings:logo" in callbacks


class TestColorPickerKeyboard:
    """Test color picker keyboard."""

    def test_has_preset_colors(self):
        kb = color_picker_keyboard()
        callbacks = [btn.callback_data for row in kb.inline_keyboard for btn in row]
        # Should contain at least 5 color options
        color_callbacks = [c for c in callbacks if c.startswith("color:#")]
        assert len(color_callbacks) >= 5

    def test_color_format(self):
        kb = color_picker_keyboard()
        callbacks = [btn.callback_data for row in kb.inline_keyboard for btn in row]
        for cb in callbacks:
            if cb.startswith("color:"):
                color = cb.split(":", 1)[1]
                assert color.startswith("#")
                assert len(color) == 7
