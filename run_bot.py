"""
BriefBot entry point.
Starts both the main and admin Telegram bots concurrently.
"""

from __future__ import annotations

import asyncio
import signal
import sys

from app.admin_bot.admin_bot import create_admin_bot
from app.bot.main_bot import create_main_bot
from app.config import get_settings
from app.db.template_repo import get_all_templates, TemplateDBRepo
from app.logger import get_logger, setup_logging
from scripts.migrate import run_migration

logger = get_logger("main")


async def start_bots() -> None:
    """Start both bots using long-polling."""
    setup_logging()
    settings = get_settings()

    logger.info("briefbot_starting", log_level=settings.log_level, log_format=settings.log_format)

    # Pre-load templates
    templates = get_all_templates()
    logger.info("templates_loaded", count=len(templates))

    # Sync templates to Supabase (best-effort)
    try:
        TemplateDBRepo.sync_to_db()
    except Exception as e:
        logger.warning("template_sync_skipped", error=str(e))

    # Create bot instances
    main_bot, main_dp = create_main_bot()
    admin_bot, admin_dp = create_admin_bot()

    # Ensure temp directories exist
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    (settings.temp_dir / "audio").mkdir(parents=True, exist_ok=True)
    (settings.temp_dir / "briefs").mkdir(parents=True, exist_ok=True)

    logger.info("briefbot_started", main_bot="ready", admin_bot="ready")

    # Start admin web app in background thread (Feature 2)
    import threading
    from app.admin_bot.web_app import run_web_app
    web_thread = threading.Thread(target=run_web_app, daemon=True)
    web_thread.start()
    logger.info("admin_web_app_started", port=settings.admin_web_port)

    try:
        # Run both bots concurrently
        await asyncio.gather(
            main_dp.start_polling(main_bot, allowed_updates=["message", "callback_query"]),
            admin_dp.start_polling(admin_bot, allowed_updates=["message", "callback_query"]),
        )
    finally:
        await main_bot.session.close()
        await admin_bot.session.close()
        logger.info("briefbot_stopped")


def main() -> None:
    """Synchronous entry point."""
    # Run DB migration before starting the async event loop
    run_migration()
    try:
        asyncio.run(start_bots())
    except KeyboardInterrupt:
        logger.info("briefbot_interrupted")
        sys.exit(0)


if __name__ == "__main__":
    main()
