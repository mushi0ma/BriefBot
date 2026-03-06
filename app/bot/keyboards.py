"""
Inline keyboards for the main bot.
v2: Adds history pagination, main menu, cancel task, missing info, and settings keyboards.
"""

from __future__ import annotations

import math

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.config import get_settings
from app.db.template_repo import get_all_templates


def template_selection_keyboard() -> InlineKeyboardMarkup:
    """Build an inline keyboard for template selection."""
    templates = get_all_templates()
    buttons = []
    for slug, tpl in templates.items():
        buttons.append([InlineKeyboardButton(text=tpl.name, callback_data=f"template:{slug}")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


def generate_brief_keyboard() -> InlineKeyboardMarkup:
    """Build an inline keyboard with the 'Generate brief' button."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📋 Сгенерировать бриф", callback_data="generate_brief")],
        ]
    )


def draft_review_keyboard() -> InlineKeyboardMarkup:
    """Build a keyboard for draft review: generate PDF or edit."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="📄 Сгенерировать PDF", callback_data="draft:generate_pdf"),
                InlineKeyboardButton(text="✏️ Исправить", callback_data="draft:edit"),
            ],
            [
                InlineKeyboardButton(text="❌ Отмена", callback_data="draft:cancel"),
            ],
        ]
    )


def feedback_keyboard() -> InlineKeyboardMarkup:
    """Build a feedback keyboard after brief generation."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="👍 Отлично!", callback_data="feedback:good"),
                InlineKeyboardButton(text="👎 Не то", callback_data="feedback:bad"),
            ],
            [
                InlineKeyboardButton(text="🔄 Другой шаблон", callback_data="feedback:change_template"),
            ],
        ]
    )


def broadcast_confirm_keyboard() -> InlineKeyboardMarkup:
    """Build confirmation keyboard for broadcast."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Да, отправить", callback_data="broadcast:confirm"),
                InlineKeyboardButton(text="❌ Отмена", callback_data="broadcast:cancel"),
            ],
        ]
    )


# -- Feature 1: History Pagination -------------------------------------------

def history_page_keyboard(page: int, total_pages: int) -> InlineKeyboardMarkup:
    """Build pagination keyboard for history: [< Пред] [N/M] [След >]."""
    builder = InlineKeyboardBuilder()

    if page > 1:
        builder.button(text="◀️ Пред", callback_data=f"history:page:{page - 1}")

    builder.button(text=f"{page}/{total_pages}", callback_data="history:noop")

    if page < total_pages:
        builder.button(text="След ▶️", callback_data=f"history:page:{page + 1}")

    builder.adjust(3)  # Up to 3 buttons in one row
    return builder.as_markup()


def history_item_keyboard(history_id: str) -> InlineKeyboardMarkup:
    """Build a keyboard with PDF download button for a history item."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📄 Скачать PDF", callback_data=f"history:pdf:{history_id}")],
        ]
    )


# -- Feature 3: Main Menu ---------------------------------------------------

def main_menu_keyboard() -> InlineKeyboardMarkup:
    """Build the SPA-style main menu with action buttons + TMA link."""
    settings = get_settings()
    buttons = [
        [
            InlineKeyboardButton(text="🎙 Записать аудио", callback_data="menu:audio"),
            InlineKeyboardButton(text="📝 Текст", callback_data="menu:text"),
        ],
        [
            InlineKeyboardButton(text="⚙️ Шаблоны", callback_data="menu:templates"),
            InlineKeyboardButton(text="📁 История", callback_data="menu:history"),
        ],
        [
            InlineKeyboardButton(
                text="💼 Личный кабинет",
                web_app=WebAppInfo(url=settings.tma_user_url),
            ),
        ],
    ]
    return InlineKeyboardMarkup(inline_keyboard=buttons)


# -- Feature 6: Cancel Task -------------------------------------------------

def cancel_task_keyboard(task_id: str) -> InlineKeyboardMarkup:
    """Build a keyboard with cancel button for a running Celery task."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отменить", callback_data=f"cancel:{task_id}")],
        ]
    )


# -- Feature 7: Missing Info Dialog -----------------------------------------

def missing_info_keyboard() -> InlineKeyboardMarkup:
    """Build a keyboard for missing info prompt."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✍ Написать текстом", callback_data="missing:fill"),
                InlineKeyboardButton(text="⏭ Пропустить", callback_data="missing:skip"),
            ],
        ]
    )


# -- Feature 9: Settings / Branding -----------------------------------------

def settings_keyboard() -> InlineKeyboardMarkup:
    """Build the /settings menu."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🎨 Цвет акцента", callback_data="settings:color")],
            [InlineKeyboardButton(text="🖼 Загрузить логотип", callback_data="settings:logo")],
            [InlineKeyboardButton(text="◀️ Назад", callback_data="menu:back")],
        ]
    )


def color_picker_keyboard() -> InlineKeyboardMarkup:
    """Build color picker with preset colors."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🔴", callback_data="color:#E74C3C"),
                InlineKeyboardButton(text="🔵", callback_data="color:#2980B9"),
                InlineKeyboardButton(text="🟢", callback_data="color:#27AE60"),
                InlineKeyboardButton(text="🟡", callback_data="color:#F39C12"),
                InlineKeyboardButton(text="🟣", callback_data="color:#8E44AD"),
            ],
            [
                InlineKeyboardButton(text="⬛", callback_data="color:#2C3E50"),
                InlineKeyboardButton(text="🔸", callback_data="color:#E67E22"),
                InlineKeyboardButton(text="🩵", callback_data="color:#1ABC9C"),
            ],
            [InlineKeyboardButton(text="◀️ Назад", callback_data="settings:back")],
        ]
    )
