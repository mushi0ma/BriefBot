"""
Celery tasks for BriefBot.
Handles async processing and sending results back to users.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

from aiogram import Bot
from aiogram.types import FSInputFile

from app.config import get_settings
from app.logger import get_logger
from app.worker.celery_app import celery_app as celery
from app.services.orchestrator import OrchestratorAgent
from app.services.gc import GarbageCollector
from app.models.brief import ProcessingState, ProcessingResult
from app.bot.keyboards import feedback_keyboard

logger = get_logger("worker")


async def _send_result_to_user(chat_id: int, result: ProcessingResult):
    """Sends the processing result (PDF + Summary) back to the user."""
    settings = get_settings()
    bot = Bot(token=settings.telegram_bot_token.get_secret_value())

    try:
        if result.state == ProcessingState.DONE and result.pdf_path:
            # Send Summary
            summary_text = (
                "*Бриф готов!*\n\n"
                f"{result.brief_data.summary}\n\n"
                "Полный бриф прикреплен ниже."
            )
            await bot.send_message(chat_id, summary_text, parse_mode="Markdown")

            # Show client assessment (Telegram only, not in PDF)
            if result.brief_data.client_assessment:
                await bot.send_message(
                    chat_id,
                    f"🔍 *Оценка клиента (для вас):*\n\n{result.brief_data.client_assessment}",
                    parse_mode="Markdown",
                )

            # Send PDF
            pdf_file = FSInputFile(result.pdf_path)
            await bot.send_document(
                chat_id,
                pdf_file,
                caption="Ваш проектный бриф",
                reply_markup=feedback_keyboard()
            )
        else:
            error_text = result.error_message or "Произошла ошибка при обработке. Попробуйте ещё раз."
            await bot.send_message(chat_id, error_text)
    finally:
        await bot.session.close()


@celery.task(
    name="process_voice_message",
    bind=True,
    max_retries=3,
    queue="briefbot"
)
def process_voice_message(self, chat_id: int, telegram_id: int, audio_path: str, template_slug: str, username: str | None = None, file_id: str | None = None):
    """
    Celery task to run the BriefBot pipeline for voice messages.
    """
    logger.info("task_start", chat_id=chat_id, telegram_id=telegram_id, template=template_slug)

    try:
        # Create a fresh event loop for each task (Celery workers don't have one)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        orchestrator = OrchestratorAgent()

        # 1. Run the async pipeline
        result = loop.run_until_complete(orchestrator.process(
            chat_id=chat_id,
            telegram_id=telegram_id,
            audio_path=audio_path,
            template_slug=template_slug,
            username=username,
            file_id=file_id,
        ))

        # 2. Send result back to user
        loop.run_until_complete(_send_result_to_user(chat_id, result))

        loop.close()

        if result.state == ProcessingState.FAILED:
            logger.error("task_pipeline_failed", chat_id=chat_id, error=result.error_message)
        else:
            logger.info("task_pipeline_success", chat_id=chat_id)

        return result.model_dump()

    except Exception as exc:
        logger.error("task_execution_error", chat_id=chat_id, error=str(exc), exc_info=True)
        # Handle retry for transient errors
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=10)
        raise exc


@celery.task(name="cleanup_old_files")
def cleanup_old_files():
    """
    Periodic task to clean up old temporary files (Garbage Collection).
    """
    logger.info("gc_task_start")
    stats = GarbageCollector.cleanup(max_age_sec=3600)
    return stats
