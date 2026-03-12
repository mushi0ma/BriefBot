"""
Main Telegram Bot — handles user interactions.
v2: Adds SPA-style menu (Feature 3), interactive history pagination (Feature 1),
    progress bar + cancel (Feature 6), missing_info dialog (Feature 7),
    settings/branding (Feature 9), client_assessment display (Feature 11),
    RedisStorage (Feature 4).
"""

from __future__ import annotations

import math
from pathlib import Path

from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import (
    CallbackQuery,
    FSInputFile,
    Message,
)

from app.bot.keyboards import (
    cancel_task_keyboard,
    color_picker_keyboard,
    draft_review_keyboard,
    feedback_keyboard,
    generate_brief_keyboard,
    main_menu_keyboard,
    missing_info_keyboard,
    settings_keyboard,
    template_selection_keyboard,
)
from app.bot.middlewares import ErrorHandlerMiddleware, LoggingMiddleware, ThrottlingMiddleware
from app.bot.states import BriefState
from app.config import get_settings
from app.bot.stickers import StickerRegistry, send_temporary_sticker, delete_sticker_safe
from app.db.history_repo import HistoryRepo
from app.db.user_repo import UserRepo
from app.logger import get_logger
from app.models.brief import ProcessingState
from app.services.orchestrator import OrchestratorAgent
from app.worker.tasks import task_analyze_request

logger = get_logger("main_bot")

router = Router()

# In-memory user template preference (per session)
_user_templates: dict[int, str] = {}



    try:
        if isinstance(target, Bot):
            return await target.send_sticker(chat_id, sticker_id)
        else:
            return await target.answer_sticker(sticker_id)
    except Exception as e:
        logger.warning("sticker_send_failed", sticker_id=sticker_id, error=str(e))
        return None


def _escape_md2(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    special = r'_*[]()~`>#+-=|{}.!'
    return ''.join(f'\\{c}' if c in special else c for c in text)

# ─────────────────────────────────────────────────────────────────────────────
# Welcome text (used in /start and menu:back)
# ─────────────────────────────────────────────────────────────────────────────
WELCOME_TEXT = (
    "✨ *Привет! Я BriefBot* — ваш ИИ-менеджер по продажам.\n\n"
    "Отправьте мне *голосовое сообщение* или *текст* от клиента, "
    "и я создам из него PDF-бриф.\n\n"
    "Что я умею:\n"
    "- 🎙 Расшифровать голосовое любой длины\n"
    "- 📋 Выделить задачи, сроки, бюджет\n"
    "- 📄 Сгенерировать коммерческое предложение в PDF\n"
    "- 🔍 Оценить клиента и подсказать, что ещё спросить\n\n"
    "*Выберите действие:*"
)


# ── /start ───────────────────────────────────────────────────────────────────
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    """Welcome message with banner + SPA-style inline menu."""
    await state.clear()
    settings = get_settings()
    await message.answer(
        WELCOME_TEXT,
        reply_markup=main_menu_keyboard(),
        parse_mode="Markdown",
    )
    await send_temporary_sticker(message, message.chat.id, StickerRegistry.from_settings(get_settings()).ONBOARDING)


# ── Menu Callbacks (SPA Navigation) ──────────────────────────────────────────
@router.callback_query(F.data == "menu:audio")
async def on_menu_audio(callback: CallbackQuery) -> None:
    """Audio recording prompt."""
    await callback.answer()
    await callback.message.edit_text(
        "🎙 *Запись аудио*\n\n"
        "Запишите голосовое сообщение и отправьте его мне.\n"
        "Я расшифрую его и создам бриф.\n\n"
        "Максимальная длительность: 5 минут.",
        parse_mode="Markdown",
    )


@router.callback_query(F.data == "menu:text")
async def on_menu_text(callback: CallbackQuery) -> None:
    """Text input prompt."""
    await callback.answer()
    await callback.message.edit_text(
        "📝 *Текстовый ввод*\n\n"
        "Напишите описание проекта текстом.\n"
        "Можно отправлять несколько сообщений — я соберу всё в один бриф.\n\n"
        "Когда закончите, нажмите кнопку «Сгенерировать бриф».",
        parse_mode="Markdown",
    )


@router.callback_query(F.data == "menu:templates")
async def on_menu_templates(callback: CallbackQuery) -> None:
    """Template selection from menu."""
    user_id = callback.from_user.id if callback.from_user else 0
    current_slug = _user_templates.get(user_id, "default")
    await callback.answer()
    await callback.message.edit_text(
        f"⚙️ *Шаблоны*\n\nТекущий шаблон: *{current_slug}*\n\nВыберите шаблон:",
        reply_markup=template_selection_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(F.data == "menu:history")
async def on_menu_history(callback: CallbackQuery) -> None:
    """Show history from menu (delegates to pagination)."""
    await callback.answer()
    user_id = callback.from_user.id if callback.from_user else 0
    await _show_history_page(callback.message, user_id, page=1, edit=True)


@router.callback_query(F.data == "menu:back")
async def on_menu_back(callback: CallbackQuery) -> None:
    """Return to main menu."""
    await callback.answer()
    await callback.message.edit_text(
        WELCOME_TEXT,
        reply_markup=main_menu_keyboard(),
        parse_mode="Markdown",
    )


# ── /help ────────────────────────────────────────────────────────────────────
@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    """Detailed usage guide."""
    await message.answer(
        "*Как пользоваться BriefBot:*\n\n"
        "*1. Выберите шаблон* (необязательно)\n"
        "   /template — выбрать тип брифа\n\n"
        "*2. Отправьте голосовое или текст*\n"
        "   Можно несколько сообщений — бот соберёт всё в один бриф.\n\n"
        "*3. Получите бриф*\n"
        "   Нажмите «Сгенерировать бриф» и получите:\n"
        "   - Черновик-резюме для проверки\n"
        "   - 🔍 Оценку клиента\n"
        "   - PDF-документ с полным брифом\n\n"
        "*Команды:*\n"
        "/start — главное меню\n"
        "/template — шаблоны\n"
        "/history — история брифов\n"
        "/settings — настройки PDF\n"
        "/help — эта справка",
        parse_mode="Markdown",
    )


# ── /template ────────────────────────────────────────────────────────────────
@router.message(Command("template"))
async def cmd_template(message: Message) -> None:
    """Show template selection keyboard."""
    user_id = message.from_user.id if message.from_user else 0
    current_slug = _user_templates.get(user_id, "default")
    await message.answer(
        f"Текущий шаблон: *{current_slug}*\n\nВыберите шаблон для следующего брифа:",
        reply_markup=template_selection_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(F.data.startswith("template:"))
async def on_template_selected(callback: CallbackQuery) -> None:
    """Handle template selection callback."""
    slug = callback.data.split(":", 1)[1]
    user_id = callback.from_user.id if callback.from_user else 0
    _user_templates[user_id] = slug
    await callback.answer(f"Шаблон выбран: {slug}")
    await callback.message.edit_text(
        f"Активный шаблон: *{slug}*\n\nТеперь отправьте голосовое или текстовое сообщение!",
        parse_mode="Markdown",
    )


# ── /history (Interactive Pagination) ────────────────────────────────────────
HISTORY_PER_PAGE = 3


@router.message(Command("history"))
async def cmd_history(message: Message) -> None:
    """Show paginated history with inline navigation."""
    user_id = message.from_user.id if message.from_user else 0
    await _show_history_page(message, user_id, page=1, edit=False)


@router.callback_query(F.data.startswith("history:page:"))
async def on_history_page(callback: CallbackQuery) -> None:
    """Handle history page navigation."""
    page = int(callback.data.split(":")[-1])
    user_id = callback.from_user.id if callback.from_user else 0
    await callback.answer()
    await _show_history_page(callback.message, user_id, page=page, edit=True)


@router.callback_query(F.data.startswith("history:pdf:"))
async def on_history_pdf(callback: CallbackQuery, bot: Bot) -> None:
    """Download PDF for a specific history item."""
    history_id = callback.data.split(":", 2)[2]
    await callback.answer("Генерирую PDF...")

    record = await HistoryRepo.get_by_id(history_id)
    if not record:
        await bot.send_message(callback.message.chat.id, "Запись не найдена.")
        return

    brief_data_dict = record.get("brief_data", {})
    template_slug = record.get("template_slug", "default")

    if not brief_data_dict:
        await bot.send_message(callback.message.chat.id, "Нет данных для генерации PDF.")
        return

    # Regenerate PDF from saved brief data
    from app.models.brief import BriefData
    from app.services.pdf_generator import generate_pdf
    from app.db.template_repo import get_template

    try:
        brief_data = BriefData(**brief_data_dict)
        template = get_template(template_slug)
        pdf_path = generate_pdf(brief_data, template)

        pdf_file = FSInputFile(pdf_path)
        await bot.send_document(
            callback.message.chat.id,
            pdf_file,
            caption=f"📄 Бриф от {record.get('created_at', '')[:16].replace('T', ' ')}",
        )
    except Exception as e:
        logger.error("history_pdf_failed", error=str(e), history_id=history_id)
        await bot.send_message(
            callback.message.chat.id,
            "Не удалось сгенерировать PDF. Попробуйте ещё раз.",
        )


@router.callback_query(F.data == "history:noop")
async def on_history_noop(callback: CallbackQuery) -> None:
    """No-op for the page counter button."""
    await callback.answer()


async def _show_history_page(
    message: Message, user_id: int, page: int, edit: bool
) -> None:
    """Show a page of history items with navigation."""
    items, total = await HistoryRepo.get_user_history_paginated(user_id, page, HISTORY_PER_PAGE)
    total_pages = max(1, math.ceil(total / HISTORY_PER_PAGE))

    if not items and page == 1:
        text = "📭 У вас пока нет обработанных брифов.\nОтправьте голосовое или текстовое сообщение!"
        if edit:
            await message.edit_text(text)
        else:
            await message.answer(text)
        return

    lines = [f"📁 *История брифов* (стр. {page}/{total_pages})\n"]
    for item in items:
        state_icon = "✅" if item.get("processing_state") == "done" else "❌"
        created = item.get("created_at", "")[:16].replace("T", " ")
        template = item.get("template_slug", "default")
        time_ms = item.get("processing_time_ms", 0)
        summary = ""
        bd = item.get("brief_data", {})
        if bd and isinstance(bd, dict):
            summary = bd.get("summary", "")[:80]
        lines.append(f"{state_icon} `{created}` | {template} | {time_ms}ms")
        if summary:
            lines.append(f"   _{summary}_")
        lines.append("")

    text = "\n".join(lines)

    # Build combined keyboard: item PDF buttons + pagination
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
    buttons = []
    for item in items:
        if item.get("processing_state") == "done" and item.get("brief_data"):
            hid = item["id"]
            created_short = item.get("created_at", "")[:10]
            buttons.append([InlineKeyboardButton(
                text=f"📄 PDF ({created_short})",
                callback_data=f"history:pdf:{hid}",
            )])

    # Pagination row
    nav_row = []
    if page > 1:
        nav_row.append(InlineKeyboardButton(text="◀️ Пред", callback_data=f"history:page:{page - 1}"))
    nav_row.append(InlineKeyboardButton(text=f"{page}/{total_pages}", callback_data="history:noop"))
    if page < total_pages:
        nav_row.append(InlineKeyboardButton(text="След ▶️", callback_data=f"history:page:{page + 1}"))
    buttons.append(nav_row)

    keyboard = InlineKeyboardMarkup(inline_keyboard=buttons)

    if edit:
        await message.edit_text(text, reply_markup=keyboard, parse_mode="Markdown")
    else:
        await message.answer(text, reply_markup=keyboard, parse_mode="Markdown")


# ── Voice Message Handler ────────────────────────────────────────────────────
@router.message(F.voice | F.audio)
async def handle_voice(message: Message, bot: Bot, state: FSMContext) -> None:
    """Download voice/audio message and dispatch Celery task with cancel button."""
    # Clear any in-progress draft/text FSM flow
    await state.clear()

    user = message.from_user
    user_id = user.id if user else 0
    chat_id = message.chat.id
    template_slug = _user_templates.get(user_id, "default")

    logger.info("voice_received", user_id=user_id, chat_id=chat_id, template=template_slug)

    # Validate audio duration
    settings = get_settings()
    duration = 0
    if message.voice:
        file_id = message.voice.file_id
        duration = message.voice.duration or 0
    elif message.audio:
        file_id = message.audio.file_id
        duration = message.audio.duration or 0
    else:
        await message.answer("Не удалось определить аудио. Отправьте голосовое сообщение.")
        return

    if duration > settings.max_audio_duration_sec:
        await message.answer(
            f"Аудио слишком длинное ({duration} сек). "
            f"Максимум: {settings.max_audio_duration_sec} сек."
        )
        return

    # Download audio file
    try:
        file = await bot.get_file(file_id)
        download_dir = settings.temp_dir / "audio"
        download_dir.mkdir(parents=True, exist_ok=True)
        audio_path = str(download_dir / f"{user_id}_{message.message_id}.ogg")
        await bot.download_file(file.file_path, audio_path)
        logger.info("audio_downloaded", path=audio_path, duration=duration)
    except Exception as e:
        logger.error("audio_download_failed", error=str(e), exc_info=True)
        await message.answer("Не удалось скачать аудио. Попробуйте ещё раз.")
        return

    # Send "processing" sticker FIRST so we capture its ID
    registry = StickerRegistry.from_settings(settings)
    processing_msg_id = await send_temporary_sticker(message, chat_id, registry.PROCESSING)

    if processing_msg_id:
        await state.update_data(processing_sticker_msg_id=processing_msg_id)

    # Dispatch Celery task
    task = task_analyze_request.delay(
        chat_id=chat_id,
        telegram_id=user_id,
        audio_path=audio_path,
        template_slug=template_slug,
        username=user.username,
        file_id=file_id,
        processing_msg_id=processing_msg_id,
    )

    await message.answer(
        "🎙 *Аудио получено\.\.\.*\n\n"
        f"Шаблон: {_escape_md2(template_slug)}\n"
        "Передаю в обработку ИИ\.\n\n"
        "Ожидайте создания черновика\.",
        parse_mode="MarkdownV2",
        reply_markup=cancel_task_keyboard(task.id),
    )

    logger.info("celery_task_dispatched", user_id=user_id, chat_id=chat_id, task_id=task.id)


# ── Cancel Celery Task (Feature 6) ──────────────────────────────────────────
@router.callback_query(F.data.startswith("cancel:"))
async def on_cancel_task(callback: CallbackQuery, bot: Bot, state: FSMContext) -> None:
    """Cancel a running Celery task."""
    task_id = callback.data.split(":", 1)[1]

    try:
        from app.worker.celery_app import celery_app
        celery_app.control.revoke(task_id, terminate=True)
        
        # Cleanup the processing sticker if possible
        data = await state.get_data()
        processing_msg_id = data.get("processing_sticker_msg_id")
        if processing_msg_id:
            await delete_sticker_safe(bot, callback.message.chat.id, processing_msg_id)

        await callback.answer("Задача отменена.")
        await callback.message.edit_text(
            "❌ *Обработка отменена.*\n\n"
            "Отправьте новое голосовое или текстовое сообщение.",
            parse_mode="Markdown",
        )
        logger.info("task_cancelled", task_id=task_id)
    except Exception as e:
        logger.error("task_cancel_failed", task_id=task_id, error=str(e))
        await callback.answer("Не удалось отменить задачу.")


# ── Text: Draft Edit Handler ────────────────────────────────────────────────
@router.message(F.text, BriefState.editing_draft)
async def handle_draft_edit(message: Message, state: FSMContext, bot: Bot) -> None:
    """Handle user correction while in editing_draft state."""
    if message.text.startswith("/"):
        return

    user_id = message.from_user.id if message.from_user else 0
    template_slug = _user_templates.get(user_id, "default")

    data = await state.get_data()
    original_text = data.get("original_text", "")
    correction = message.text

    await message.answer(
        "*Применяю исправления...*",
        parse_mode="Markdown",
    )

    # Re-run AI with original text + correction
    combined = f"{original_text}\n\n--- ИСПРАВЛЕНИЯ ОТ КЛИЕНТА ---\n{correction}"

    orchestrator = OrchestratorAgent()
    brief_data = await orchestrator.ai.process_text(
        combined,
        orchestrator._get_template(template_slug),
    )

    # Build draft summary
    draft_text = _build_draft_text(brief_data)

    # Save updated brief data in FSM
    await state.update_data(
        brief_data=brief_data.model_dump(),
        original_text=combined,
    )
    await state.set_state(BriefState.reviewing_draft)

    await send_temporary_sticker(message, message.chat.id, StickerRegistry.from_settings(get_settings()).SUCCESS)
    await message.answer(
        draft_text,
        reply_markup=draft_review_keyboard(),
        parse_mode="MarkdownV2",
    )

    # Client assessment removed per user request


# ── Text: Missing Info Handler (Feature 7) ──────────────────────────────────
@router.message(F.text, BriefState.filling_missing_info)
async def handle_missing_info_text(message: Message, state: FSMContext, bot: Bot) -> None:
    """Handle user text input for filling missing info."""
    if message.text.startswith("/"):
        return

    data = await state.get_data()
    original_text = data.get("original_text", "")
    missing_field = data.get("missing_field", "")
    user_id = message.from_user.id if message.from_user else 0
    template_slug = data.get("template_slug", _user_templates.get(user_id, "default"))

    # Combine original text + user's answer
    combined = f"{original_text}\n\n--- ДОПОЛНЕНИЕ ---\n{missing_field}: {message.text}"

    await message.answer("*Обновляю бриф...*", parse_mode="Markdown")

    orchestrator = OrchestratorAgent()
    brief_data = await orchestrator.ai.process_text(
        combined,
        orchestrator._get_template(template_slug),
    )

    draft_text = _build_draft_text(brief_data)

    await state.update_data(
        brief_data=brief_data.model_dump(),
        original_text=combined,
    )
    await state.set_state(BriefState.reviewing_draft)

    await message.answer(
        draft_text,
        reply_markup=draft_review_keyboard(),
        parse_mode="MarkdownV2",
    )


# ── Text: Logo Upload (Feature 9) ──────────────────────────────────────────
@router.message(F.photo, BriefState.uploading_logo)
async def handle_logo_upload(message: Message, state: FSMContext, bot: Bot) -> None:
    """Handle logo image upload for branding — uploads to Supabase Storage."""
    user_id = message.from_user.id if message.from_user else 0

    # Get highest resolution photo
    photo = message.photo[-1]
    file = await bot.get_file(photo.file_id)

    try:
        # 1. Download from Telegram to local temp file
        settings = get_settings()
        download_dir = settings.temp_dir / "logos"
        download_dir.mkdir(parents=True, exist_ok=True)
        local_path = str(download_dir / f"logo_{user_id}.jpg")
        await bot.download_file(file.file_path, local_path)

        # 2. Upload to Supabase Storage
        from app.db.supabase_client import upload_file as sb_upload
        remote_path = f"{user_id}/logo.jpg"
        public_url = await sb_upload("brand_assets", remote_path, local_path)

        # 3. Cleanup local file
        Path(local_path).unlink(missing_ok=True)

        # 4. Save public URL in database
        await UserRepo.update_branding(user_id, logo_url=public_url)
        await message.answer(
            "✅ *Логотип загружен!*\n\n"
            "Он будет использоваться в ваших PDF-брифах.",
            parse_mode="Markdown",
            reply_markup=settings_keyboard(),
        )
    except Exception as e:
        logger.error("logo_upload_failed", error=str(e), user_id=user_id)
        await message.answer("Не удалось сохранить логотип. Попробуйте ещё раз.")

    await state.clear()


# ── Text Message Handler (FSM Collecting) ───────────────────────────────────
@router.message(F.text)
async def handle_text(message: Message, state: FSMContext) -> None:
    """Collect text messages via FSM and offer to generate a brief."""
    if message.text.startswith("/"):
        return

    user_id = message.from_user.id if message.from_user else 0

    # Get or initialize the text buffer
    data = await state.get_data()
    text_buffer: list[str] = data.get("text_buffer", [])

    # Check total text length (30K char limit)
    MAX_TEXT_CHARS = 30_000
    total_len = sum(len(t) for t in text_buffer) + len(message.text)
    if total_len > MAX_TEXT_CHARS:
        await message.answer(
            f"Текст слишком длинный ({total_len:,} символов). "
            f"Максимум: {MAX_TEXT_CHARS:,} символов.\n\n"
            "Пожалуйста, сократите описание или нажмите кнопку ниже.",
            reply_markup=generate_brief_keyboard(),
        )
        return

    text_buffer.append(message.text)

    await state.set_state(BriefState.collecting_info)
    await state.update_data(text_buffer=text_buffer)

    chunk_count = len(text_buffer)
    template_slug = _user_templates.get(user_id, "default")

    await message.answer(
        f"✅ Принято! (сообщений: {chunk_count})\n"
        "Напишите ещё детали или нажмите кнопку ниже.\n\n"
        f"Шаблон: *{template_slug}*",
        reply_markup=generate_brief_keyboard(),
        parse_mode="Markdown",
    )

# ── Generate Brief Callback (Text Flow) → Draft Mode ────────────────────────
@router.callback_query(F.data == "generate_brief")
async def on_generate_brief(callback: CallbackQuery, state: FSMContext, bot: Bot) -> None:
    """Generate draft from collected text chunks, show for review."""
    user = callback.from_user
    user_id = user.id if user else 0
    chat_id = callback.message.chat.id
    template_slug = _user_templates.get(user_id, "default")

    # Get collected text
    data = await state.get_data()
    text_buffer: list[str] = data.get("text_buffer", [])

    if not text_buffer:
        await callback.answer("Нет текста для обработки. Отправьте сообщение.")
        return

    combined_text = "\n\n".join(text_buffer)
    await callback.answer("Анализирую текст...")

    settings = get_settings()
    registry = StickerRegistry.from_settings(settings)
    processing_msg_id = await send_temporary_sticker(bot, chat_id, registry.PROCESSING)

    await callback.message.edit_text(
        "*Анализирую текст\.\.\.*\n\n"
        f"Шаблон: {_escape_md2(template_slug)}\n"
        f"Сообщений обработано: {len(text_buffer)}",
        parse_mode="MarkdownV2",
    )

    # Run AI analysis only (no PDF yet)
    orchestrator = OrchestratorAgent()
    try:
        brief_data = await orchestrator.ai.process_text(
            combined_text,
            orchestrator._get_template(template_slug),
        )
    except Exception as e:
        logger.error("draft_generation_failed", error=str(e), user_id=user_id)
        await bot.send_message(chat_id, "Произошла ошибка при анализе текста. Попробуйте ещё раз.")
        if sticker_msg:
            await delete_sticker_safe(bot, chat_id, sticker_msg.message_id)
        return

    # Delete processing sticker on success
    if sticker_msg:
        await delete_sticker_safe(bot, chat_id, sticker_msg.message_id)

    # Build draft summary
    draft_text = _build_draft_text(brief_data)

    # Save draft data in FSM state
    await state.set_state(BriefState.reviewing_draft)
    await state.update_data(
        brief_data=brief_data.model_dump(),
        original_text=combined_text,
        template_slug=template_slug,
        username=user.username if user else None,
    )

    # Feature 7: If missing_info, ask user first
    if brief_data.missing_info:
        await bot.send_message(
            chat_id,
            draft_text,
            parse_mode="MarkdownV2",
        )

        # Client assessment removed per user request

        # Ask about missing info
        await send_temporary_sticker(bot, chat_id, StickerRegistry.from_settings(get_settings()).MISSING_FIELDS)
        await bot.send_message(
            chat_id,
            f"💡 *Я заметил, что не хватает информации:*\n\n"
            f"_{_escape_md2(brief_data.missing_info)}_\n\n"
            f"Хотите указать недостающие данные сейчас?",
            reply_markup=missing_info_keyboard(),
            parse_mode="MarkdownV2",
        )
    else:
        await bot.send_message(
            chat_id,
            draft_text,
            reply_markup=draft_review_keyboard(),
            parse_mode="MarkdownV2",
        )

        # Client assessment removed per user request


# ── Missing Info Callbacks (Feature 7) ──────────────────────────────────────
@router.callback_query(F.data == "missing:fill")
async def on_fill_missing_info(callback: CallbackQuery, state: FSMContext) -> None:
    """Enter text input mode for filling missing info."""
    data = await state.get_data()
    brief_data_dict = data.get("brief_data", {})
    missing = brief_data_dict.get("missing_info", "")

    await state.set_state(BriefState.filling_missing_info)
    await state.update_data(missing_field=missing)

    await callback.answer()
    await send_temporary_sticker(callback.message, callback.message.chat.id, StickerRegistry.from_settings(get_settings()).MISSING_FIELDS)
    parts = [f"✍ *Введите недостающую информацию:*\n"]
    for line in missing.split('\n'):
        parts.append(f"_{_escape_md2(line)}_")
    parts.append(f"\nНапишите ваш ответ текстом:")

    await callback.message.edit_text(
        "\n".join(parts),
        parse_mode="MarkdownV2",
    )


@router.callback_query(F.data == "missing:skip")
async def on_skip_missing_info(callback: CallbackQuery, state: FSMContext) -> None:
    """Skip missing info and proceed to PDF generation options."""
    await callback.answer()
    await send_temporary_sticker(callback.message, callback.message.chat.id, StickerRegistry.from_settings(get_settings()).SUCCESS)
    await callback.message.edit_text(
        "⏭ Пропускаем недостающую информацию\.\n\n"
        "Выберите действие:",
        reply_markup=draft_review_keyboard(),
        parse_mode="MarkdownV2",
    )


# ── Draft: Generate PDF Callback ────────────────────────────────────────────
@router.callback_query(F.data == "draft:generate_pdf")
async def on_draft_generate_pdf(callback: CallbackQuery, state: FSMContext, bot: Bot) -> None:
    """Generate PDF from the approved draft."""
    user = callback.from_user
    user_id = user.id if user else 0
    chat_id = callback.message.chat.id

    data = await state.get_data()
    brief_data_dict = data.get("brief_data")
    if not brief_data_dict:
        await callback.answer("Нет данных для генерации PDF.")
        return

    template_slug = data.get("template_slug", _user_templates.get(user_id, "default"))
    original_text = data.get("original_text", "")
    username = data.get("username")

    await callback.answer("Генерирую PDF...")
    await callback.message.edit_text(
        "*Генерирую PDF-документ...*",
        parse_mode="Markdown",
    )

    # Clear FSM state
    await state.clear()

    # Run the full pipeline with pre-computed brief data
    from app.models.brief import BriefData
    brief_data = BriefData(**brief_data_dict)

    # Get user branding (Feature 9)
    brand_color = None
    logo_url = None
    try:
        user_data = await UserRepo.get_or_create(user_id, username or "")
        brand_color = user_data.get("brand_color")
        logo_url = user_data.get("logo_url")
    except Exception:
        pass

    orchestrator = OrchestratorAgent()
    result = await orchestrator.process_with_brief_data(
        chat_id=chat_id,
        telegram_id=user_id,
        brief_data=brief_data,
        original_text=original_text,
        template_slug=template_slug,
        username=username,
        brand_color=brand_color,
        logo_url=logo_url,
    )

    # Send result to user
    settings = get_settings()
    if result.state == ProcessingState.DONE and result.pdf_path:
        summary_text = (
            f"*Бриф готов\!*\n\n"
            f"{_escape_md2(result.brief_data.summary)}\n\n"
            "Полный бриф прикреплен ниже\."
        )
        await bot.send_message(chat_id, summary_text, parse_mode="MarkdownV2")

        # Client assessment removed per user request

        pdf_file = FSInputFile(result.pdf_path)
        await bot.send_document(
            chat_id,
            pdf_file,
            caption="Ваш проектный бриф",
            reply_markup=feedback_keyboard(),
        )
        await send_temporary_sticker(bot, chat_id, StickerRegistry.from_settings(get_settings()).SUCCESS)

        logger.info("draft_pdf_sent", user_id=user_id, time_ms=result.processing_time_ms)
    else:
        error_text = result.error_message or "Произошла ошибка при генерации PDF. Попробуйте ещё раз."
        await bot.send_message(chat_id, error_text)


# ── Draft: Edit Callback ────────────────────────────────────────────────────
@router.callback_query(F.data == "draft:edit")
async def on_draft_edit(callback: CallbackQuery, state: FSMContext) -> None:
    """Switch to editing mode — user sends correction text."""
    await callback.answer()
    await send_temporary_sticker(callback.message, callback.message.chat.id, StickerRegistry.from_settings(get_settings()).SUCCESS)
    await state.set_state(BriefState.editing_draft)
    await callback.message.edit_text(
        "*Режим исправления*\n\n"
        "Напишите, что нужно изменить\. Например:\n"
        "\\- «бюджет не 50к, а 100к»\n"
        "\\- «дедлайн — 3 недели, не 2»\n"
        "\\- «добавить требование: мобильная версия»\n\n"
        "Отправьте текст с исправлениями:",
        parse_mode="MarkdownV2",
    )


# ── Draft: Cancel Callback ──────────────────────────────────────────────────
@router.callback_query(F.data == "draft:cancel")
async def on_draft_cancel(callback: CallbackQuery, state: FSMContext) -> None:
    """Cancel the draft and reset FSM state."""
    await state.clear()
    await callback.answer("Черновик отменён.")
    await callback.message.edit_text(
        "Черновик отменён. Отправьте новое голосовое или текстовое сообщение."
    )


# ── /settings (Feature 9) ──────────────────────────────────────────────────
@router.message(Command("settings"))
async def cmd_settings(message: Message) -> None:
    """Show settings menu for PDF branding."""
    user_id = message.from_user.id if message.from_user else 0

    # Try to get current branding
    brand_info = ""
    try:
        user_data = await UserRepo.get_or_create(user_id, "")
        brand_color = user_data.get("brand_color", "")
        logo = user_data.get("logo_url", "")
        if brand_color:
            brand_info += f"\n🎨 Цвет акцента: `{brand_color}`"
        if logo:
            brand_info += "\n🖼 Логотип: загружен"
    except Exception:
        pass

    await message.answer(
        f"⚙️ *Настройки PDF-брендинга*{brand_info}\n\n"
        "Настройте внешний вид ваших PDF-брифов:",
        reply_markup=settings_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(F.data == "settings:color")
async def on_settings_color(callback: CallbackQuery) -> None:
    """Show color picker."""
    await callback.answer()
    await callback.message.edit_text(
        "🎨 *Выберите цвет акцента для PDF:*",
        reply_markup=color_picker_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(F.data.startswith("color:"))
async def on_color_selected(callback: CallbackQuery) -> None:
    """Handle color selection."""
    color = callback.data.split(":", 1)[1]
    user_id = callback.from_user.id if callback.from_user else 0

    try:
        await UserRepo.update_branding(user_id, brand_color=color)
        await callback.answer(f"Цвет выбран: {color}")
        await callback.message.edit_text(
            f"✅ Цвет акцента обновлён: `{color}`\n\n"
            "Он будет применён в следующем PDF-брифе.",
            reply_markup=settings_keyboard(),
            parse_mode="Markdown",
        )
    except Exception as e:
        logger.error("color_update_failed", error=str(e))
        await callback.answer("Ошибка сохранения. Попробуйте ещё раз.")


@router.callback_query(F.data == "settings:logo")
async def on_settings_logo(callback: CallbackQuery, state: FSMContext) -> None:
    """Prompt user to upload logo."""
    await callback.answer()
    await state.set_state(BriefState.uploading_logo)
    await callback.message.edit_text(
        "🖼 *Загрузка логотипа*\n\n"
        "Отправьте изображение с логотипом вашей компании/агентства.\n"
        "Оно будет отображаться в шапке ваших PDF-брифов.",
        parse_mode="Markdown",
    )


@router.callback_query(F.data == "settings:back")
async def on_settings_back(callback: CallbackQuery) -> None:
    """Return to settings menu."""
    await callback.answer()
    await callback.message.edit_text(
        "⚙️ *Настройки PDF-брендинга*\n\n"
        "Настройте внешний вид ваших PDF-брифов:",
        reply_markup=settings_keyboard(),
        parse_mode="Markdown",
    )


# ── Feedback Handler ────────────────────────────────────────────────────────
@router.callback_query(F.data.startswith("feedback:"))
async def on_feedback(callback: CallbackQuery) -> None:
    """Handle post-brief feedback."""
    action = callback.data.split(":", 1)[1]
    if action == "good":
        await callback.answer("Спасибо за отзыв! 🎉")
    elif action == "bad":
        await callback.answer("Мы постараемся улучшить результат.")
    elif action == "change_template":
        await callback.message.answer(
            "Выберите другой шаблон:",
            reply_markup=template_selection_keyboard(),
        )
        await callback.answer()


# ── Helpers ──────────────────────────────────────────────────────────────────
def _build_draft_text(brief_data) -> str:
    """Build a MarkdownV2 formatted draft summary with block quotes."""
    parts = ["📋 *Черновик брифа:*\n"]

    def _field(label: str, value: str) -> None:
        if value:
            parts.append(f"*{_escape_md2(label)}:*")
            for line in value.split('\n'):
                parts.append(f"> {_escape_md2(line)}")
            parts.append("")  # blank line after block quote

    _field("Резюме", brief_data.summary)
    _field("Тип услуги", brief_data.service_type)
    _field("Сроки", brief_data.deadline)
    _field("Бюджет", brief_data.budget)
    _field("Пожелания", brief_data.wishes)

    # Extra template sections
    for section in brief_data.extra_sections:
        _field(section.title, section.value)

    # Missing info is sent as a separated message

    parts.append("\nПроверьте данные и выберите действие:")

    return "\n".join(parts)


def create_main_bot() -> tuple[Bot, Dispatcher]:
    """Create and configure the main bot instance."""
    settings = get_settings()
    bot = Bot(token=settings.telegram_bot_token.get_secret_value())
    dp = Dispatcher(storage=RedisStorage.from_url(settings.redis_url))

    # Register middlewares
    dp.update.middleware(LoggingMiddleware())
    dp.update.middleware(ErrorHandlerMiddleware())
    dp.update.middleware(ThrottlingMiddleware(redis_url=settings.redis_url))

    # Include router
    dp.include_router(router)

    logger.info("main_bot_created")
    return bot, dp
