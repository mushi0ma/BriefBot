"""
Admin Telegram Bot — management and monitoring interface.
Receives error alerts, provides stats, health checks, user management,
data export, broadcast messaging, and template management.
"""

from __future__ import annotations

import asyncio
import csv
import io
import json
import time
import tempfile
from pathlib import Path

import httpx
import redis
from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, CallbackQuery, FSInputFile

from app.config import get_settings
from app.db.history_repo import HistoryRepo
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
    """Check if the sender is the authorized admin."""
    settings = get_settings()
    return message.from_user and message.from_user.id == settings.admin_chat_id


# ── /start ───────────────────────────────────────────────────────────────────
@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    if not _is_admin(message):
        await message.answer("⛔ Доступ запрещён.")
        return

    await message.answer(
        "🛠 *BriefBot Admin Panel*\n\n"
        "Доступные команды:\n"
        "/stats — статистика\n"
        "/health — проверка сервисов\n"
        "/users — топ пользователей\n"
        "/templates — список шаблонов\n"
        "/reload — перезагрузить шаблоны\n"
        "/export — выгрузить данные в CSV\n"
        "/broadcast — рассылка всем пользователям\n"
        "/dashboard — веб-панель администратора\n\n"
        "📎 Отправьте JSON-файл шаблона для добавления.",
        parse_mode="Markdown",
    )


# ── /dashboard ───────────────────────────────────────────────────────────────
@router.message(Command("dashboard"))
async def cmd_dashboard(message: Message) -> None:
    """Open the admin dashboard Mini App."""
    if not _is_admin(message):
        return

    from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup

    settings = get_settings()
    dashboard_url = settings.tma_admin_url

    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📊 Открыть дашборд",
            web_app=WebAppInfo(url=dashboard_url),
        )],
    ])

    await message.answer(
        "📊 *Веб-панель администратора*\n\n"
        "Нажмите кнопку ниже для открытия дашборда:",
        reply_markup=keyboard,
        parse_mode="Markdown",
    )


# ── /stats ───────────────────────────────────────────────────────────────────
@router.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    """Show aggregated statistics."""
    if not _is_admin(message):
        return

    user_stats = UserRepo.get_stats()
    brief_stats = HistoryRepo.get_stats()

    text = (
        "📊 *Статистика BriefBot*\n\n"
        f"👥 Всего пользователей: *{user_stats['total_users']}*\n"
        f"📄 Всего брифов: *{brief_stats['total_briefs']}*\n"
        f"📅 Сегодня: *{brief_stats['today_briefs']}*\n"
        f"✅ Успешных: *{brief_stats['successful']}*\n"
        f"❌ Ошибок: *{brief_stats['failed']}*\n"
    )

    if brief_stats["total_briefs"] > 0:
        success_rate = (brief_stats["successful"] / brief_stats["total_briefs"]) * 100
        text += f"\n📈 Успешность: *{success_rate:.1f}%*"

    await message.answer(text, parse_mode="Markdown")


# ── /health ──────────────────────────────────────────────────────────────────
@router.message(Command("health"))
async def cmd_health(message: Message) -> None:
    """Check health of all external services."""
    if not _is_admin(message):
        return

    settings = get_settings()
    checks = []

    # Redis check
    try:
        start = time.monotonic()
        r = redis.from_url(settings.redis_url)
        r.ping()
        elapsed = int((time.monotonic() - start) * 1000)
        checks.append(f"✅ Redis: OK ({elapsed}ms)")
    except Exception as e:
        checks.append(f"❌ Redis: {e}")

    # Supabase check
    try:
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.supabase_url}/rest/v1/", headers={
                "apikey": settings.supabase_key,
                "Authorization": f"Bearer {settings.supabase_key}",
            })
        elapsed = int((time.monotonic() - start) * 1000)
        if resp.status_code < 400:
            checks.append(f"✅ Supabase: OK ({elapsed}ms)")
        else:
            checks.append(f"⚠️ Supabase: HTTP {resp.status_code} ({elapsed}ms)")
    except Exception as e:
        checks.append(f"❌ Supabase: {e}")

    # OpenAI check
    try:
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            )
        elapsed = int((time.monotonic() - start) * 1000)
        if resp.status_code == 200:
            checks.append(f"✅ OpenAI: OK ({elapsed}ms)")
        else:
            checks.append(f"⚠️ OpenAI: HTTP {resp.status_code} ({elapsed}ms)")
    except Exception as e:
        checks.append(f"❌ OpenAI: {e}")

    text = "🏥 *Health Check*\n\n" + "\n".join(checks)
    await message.answer(text, parse_mode="Markdown")


# ── /users ───────────────────────────────────────────────────────────────────
@router.message(Command("users"))
async def cmd_users(message: Message) -> None:
    """Show top 10 most active users."""
    if not _is_admin(message):
        return

    users = UserRepo.get_all_users()[:10]
    if not users:
        await message.answer("📭 Пока нет зарегистрированных пользователей.")
        return

    lines = ["👥 *Топ пользователей:*\n"]
    for i, u in enumerate(users, 1):
        username = u.get("username") or u.get("first_name") or "N/A"
        tg_id = u.get("telegram_id")
        briefs = u.get("briefs_count", 0)
        blocked = " 🚫" if u.get("is_blocked") else ""
        lines.append(f"{i}. @{username} (`{tg_id}`) — {briefs} брифов{blocked}")

    await message.answer("\n".join(lines), parse_mode="Markdown")


# ── /templates ───────────────────────────────────────────────────────────────
@router.message(Command("templates"))
async def cmd_templates(message: Message) -> None:
    """List available templates."""
    if not _is_admin(message):
        return

    templates = get_all_templates()
    lines = ["📋 *Доступные шаблоны:*\n"]
    for slug, tpl in templates.items():
        sections_count = len(tpl.sections)
        lines.append(f"• *{tpl.name}* (`{slug}`) — {sections_count} секций")
        if tpl.description:
            lines.append(f"  _{tpl.description[:80]}_")

    await message.answer("\n".join(lines), parse_mode="Markdown")


# ── /reload ──────────────────────────────────────────────────────────────────
@router.message(Command("reload"))
async def cmd_reload(message: Message) -> None:
    """Reload templates from files."""
    if not _is_admin(message):
        return

    reload_templates()
    templates = get_all_templates()
    await message.answer(f"🔄 Шаблоны перезагружены: {len(templates)} шт.")


# ── /export ──────────────────────────────────────────────────────────────────
@router.message(Command("export"))
async def cmd_export(message: Message) -> None:
    """Export users and brief_history to CSV files."""
    if not _is_admin(message):
        return

    await message.answer("📦 Подготавливаю экспорт данных...")

    try:
        users = UserRepo.get_all_users()
        history = HistoryRepo.get_all_history()

        # Users CSV
        users_file = _build_csv(
            users,
            fieldnames=["telegram_id", "username", "first_name", "last_name",
                        "briefs_count", "is_blocked", "first_seen", "updated_at"],
            filename="users_export.csv",
        )

        # History CSV
        history_file = _build_csv(
            history,
            fieldnames=["telegram_id", "template_slug", "processing_state",
                        "processing_time_ms", "error_message", "created_at"],
            filename="history_export.csv",
        )

        if users_file:
            doc = FSInputFile(users_file, filename="users_export.csv")
            await message.answer_document(doc, caption=f"👥 Пользователи: {len(users)} записей")

        if history_file:
            doc = FSInputFile(history_file, filename="history_export.csv")
            await message.answer_document(doc, caption=f"📄 История брифов: {len(history)} записей")

        if not users_file and not history_file:
            await message.answer("📭 Нет данных для экспорта.")

        # Cleanup temp files
        for f in [users_file, history_file]:
            if f:
                Path(f).unlink(missing_ok=True)

    except Exception as e:
        logger.error("export_error", error=str(e), exc_info=True)
        await message.answer(f"❌ Ошибка экспорта: {e}")


def _build_csv(data: list[dict], fieldnames: list[str], filename: str) -> str | None:
    """Build a CSV file from a list of dicts and return the temp file path."""
    if not data:
        return None

    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, encoding="utf-8-sig")
    writer = csv.DictWriter(tmp, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(data)
    tmp.close()
    return tmp.name


# ── /broadcast ────────────────────────────────────────────────────────────────
@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message) -> None:
    """Send a broadcast message to all users. Usage: /broadcast <text>"""
    if not _is_admin(message):
        return

    # Parse text after /broadcast
    text = message.text
    if text:
        text = text.split(None, 1)[1] if len(text.split(None, 1)) > 1 else ""

    if not text:
        await message.answer(
            "📢 *Рассылка*\n\n"
            "Использование: `/broadcast <текст сообщения>`\n\n"
            "Пример: `/broadcast Обновление: добавлены новые шаблоны!`",
            parse_mode="Markdown",
        )
        return

    users = UserRepo.get_all_users()
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
    users = UserRepo.get_all_users()
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
        TemplateDBRepo.save_template(template)

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
