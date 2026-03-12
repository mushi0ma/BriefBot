"""
Admin Telegram Bot — management and control interface.
Paradigm shift (v3.1): Bot is ONLY for management actions (broadcast,
template upload). All dashboards, stats, and history live in the TMA.
"""

from __future__ import annotations

import asyncio
import io
import json

import httpx
from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    ReplyKeyboardMarkup,
    KeyboardButton,
    WebAppInfo,
)

from app.config import get_settings
from app.db.template_repo import (
    TemplateDBRepo,
    get_all_templates,
    reload_templates,
)
from app.db.user_repo import UserRepo
from app.logger import get_logger
from app.models.brief import BriefTemplate

logger = get_logger("admin_bot")

router = Router()

# Pending broadcast storage (admin_id -> text)
_pending_broadcasts: dict[int, str] = {}


def _is_admin(message: Message) -> bool:
    """Check if the sender is an authorized admin."""
    settings = get_settings()
    return message.from_user and message.from_user.id in settings.admin_ids


def admin_main_keyboard() -> ReplyKeyboardMarkup:
    """Persistent reply keyboard: Dashboard (WebApp), Broadcast, Manage."""
    settings = get_settings()
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📊 Открыть Дашборд", web_app=WebAppInfo(url=settings.tma_admin_url))],
            [KeyboardButton(text="📢 Рассылка")],
            [KeyboardButton(text="👥 Управление")],
        ],
        resize_keyboard=True,
    )


# ── /start & /help ───────────────────────────────────────────────────────────
@router.message(CommandStart())
@router.message(Command("help"))
async def cmd_start_help(message: Message) -> None:
    if not _is_admin(message):
        await message.answer("⛔ Доступ запрещён.")
        return

    await message.answer(
        "🛠 *BriefBot Admin*\n\n"
        "Используйте клавиатуру ниже для управления.\n"
        "📎 Отправьте JSON-файл для загрузки шаблона.",
        parse_mode="Markdown",
        reply_markup=admin_main_keyboard(),
    )


# ── Broadcast (📢 Рассылка) ──────────────────────────────────────────────────
@router.message(Command("broadcast"))
@router.message(F.text == "📢 Рассылка")
async def cmd_broadcast(message: Message) -> None:
    """Send a broadcast message to all users. Usage: /broadcast <text>"""
    if not _is_admin(message):
        return

    # Parse text after /broadcast
    text = message.text or ""
    if text.startswith("/broadcast"):
        text = text.split(None, 1)[1] if len(text.split(None, 1)) > 1 else ""
    elif text == "📢 Рассылка":
        text = ""

    if not text:
        await message.answer(
            "📢 *Рассылка*\n\n"
            "Использование: `/broadcast <текст сообщения>`\n\n"
            "Пример: `/broadcast Обновление: добавлены новые шаблоны!`",
            parse_mode="Markdown",
        )
        return

    users = await UserRepo.get_all_users()
    active_users = [u for u in users if not u.get("is_blocked")]

    # Store pending broadcast
    admin_id = message.from_user.id
    _pending_broadcasts[admin_id] = text

    from app.bot.keyboards import broadcast_confirm_keyboard

    await message.answer(
        f"📢 *Подтвердите рассылку*\n\n"
        f"Текст: _{text[:200]}_\n\n"
        f"Получателей: *{len(active_users)}*\n\n"
        f"Отправить?",
        reply_markup=broadcast_confirm_keyboard(),
        parse_mode="Markdown",
    )


@router.callback_query(F.data == "broadcast:confirm")
async def on_broadcast_confirm(callback: CallbackQuery) -> None:
    """Execute the broadcast after admin confirmation."""
    admin_id = callback.from_user.id
    text = _pending_broadcasts.pop(admin_id, None)

    if not text:
        await callback.answer("Нет ожидающей рассылки.")
        return

    await callback.answer("Начинаю рассылку...")
    await callback.message.edit_text("📢 *Рассылка в процессе...*", parse_mode="Markdown")

    settings = get_settings()
    users = await UserRepo.get_all_users()
    active_users = [u for u in users if not u.get("is_blocked")]

    sent = 0
    failed = 0

    # Use main bot token to send to users
    async with httpx.AsyncClient(timeout=10.0) as client:
        for user in active_users:
            tg_id = user.get("telegram_id")
            if not tg_id:
                continue
            try:
                url = f"https://api.telegram.org/bot{settings.telegram_bot_token.get_secret_value()}/sendMessage"
                resp = await client.post(url, json={
                    "chat_id": tg_id,
                    "text": text,
                    "parse_mode": "Markdown",
                })
                if resp.status_code == 200:
                    sent += 1
                else:
                    failed += 1
                    logger.warning("broadcast_send_error", tg_id=tg_id, status=resp.status_code)
            except Exception as e:
                failed += 1
                logger.warning("broadcast_send_error", tg_id=tg_id, error=str(e))

            # Rate limiting: 30 messages/sec Telegram limit
            await asyncio.sleep(0.05)

    await callback.message.edit_text(
        f"📢 *Рассылка завершена*\n\n"
        f"✅ Отправлено: *{sent}*\n"
        f"❌ Ошибок: *{failed}*",
        parse_mode="Markdown",
    )
    logger.info("broadcast_completed", sent=sent, failed=failed)


@router.callback_query(F.data == "broadcast:cancel")
async def on_broadcast_cancel(callback: CallbackQuery) -> None:
    """Cancel pending broadcast."""
    admin_id = callback.from_user.id
    _pending_broadcasts.pop(admin_id, None)
    await callback.answer("Рассылка отменена.")
    await callback.message.edit_text("📢 Рассылка отменена.")


# ── 👥 Управление (placeholder) ──────────────────────────────────────────────
@router.message(F.text == "👥 Управление")
async def cmd_manage(message: Message) -> None:
    """Show management options."""
    if not _is_admin(message):
        return

    settings = get_settings()
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📊 Открыть дашборд",
            web_app=WebAppInfo(url=settings.tma_admin_url),
        )],
    ])

    await message.answer(
        "👥 *Управление*\n\n"
        "Для просмотра пользователей, статистики и health-check\n"
        "используйте *TMA Дашборд*.",
        reply_markup=keyboard,
        parse_mode="Markdown",
    )


# ── Template Upload (Document Handler) ────────────────────────────────────────
@router.message(F.document)
async def handle_template_upload(message: Message, bot: Bot) -> None:
    """Handle JSON template file upload from admin."""
    if not _is_admin(message):
        return

    doc = message.document
    if not doc.file_name or not doc.file_name.endswith(".json"):
        await message.answer("⚠️ Отправьте файл в формате `.json` с шаблоном брифа.")
        return

    await message.answer("📥 Загружаю шаблон...")

    try:
        # Download file
        file = await bot.get_file(doc.file_id)
        buf = io.BytesIO()
        await bot.download_file(file.file_path, buf)
        buf.seek(0)

        # Parse JSON
        data = json.loads(buf.read().decode("utf-8"))
        template = BriefTemplate(**data)

        # Save to Supabase and local file
        await TemplateDBRepo.save_template(template)

        # Reload in-memory cache
        reload_templates()
        templates = get_all_templates()

        await message.answer(
            f"✅ Шаблон *{template.name}* (`{template.slug}`) сохранён!\n\n"
            f"Всего шаблонов: {len(templates)}",
            parse_mode="Markdown",
        )
        logger.info("template_uploaded", slug=template.slug, admin_id=message.from_user.id)

    except json.JSONDecodeError as e:
        await message.answer(f"❌ Ошибка парсинга JSON: `{e}`", parse_mode="Markdown")
    except Exception as e:
        logger.error("template_upload_error", error=str(e), exc_info=True)
        await message.answer(f"❌ Ошибка загрузки шаблона: {e}")


def create_admin_bot() -> tuple[Bot, Dispatcher]:
    """Create and configure the admin bot instance."""
    from aiogram.fsm.storage.redis import RedisStorage

    settings = get_settings()
    bot = Bot(token=settings.telegram_admin_bot_token.get_secret_value())
    dp = Dispatcher(storage=RedisStorage.from_url(settings.redis_url))
    dp.include_router(router)
    logger.info("admin_bot_created")
    return bot, dp
