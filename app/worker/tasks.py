"""
Celery tasks for BriefBot.
Handles async processing and sending results back to users.
"""

from __future__ import annotations

import asyncio

from aiogram import Bot
from aiogram.types import FSInputFile
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.fsm.storage.base import StorageKey

from app.bot.states import BriefState

from app.config import get_settings
from app.logger import get_logger
from app.worker.celery_app import celery_app as celery
from app.services.orchestrator import OrchestratorAgent
from app.services.gc import GarbageCollector
from app.models.brief import ProcessingState, ProcessingResult, BriefData
from app.bot.keyboards import feedback_keyboard, draft_review_keyboard, missing_info_keyboard

logger = get_logger("worker")


async def _send_result_to_user(chat_id: int, result: ProcessingResult):
    """Sends the processing result (PDF + Summary) back to the user."""
    settings = get_settings()
    bot = Bot(token=settings.telegram_bot_token.get_secret_value())

    try:
        if result.state == ProcessingState.DONE and result.pdf_path:
            # Send Success Sticker
            if settings.sticker_success_id:
                try:
                    await bot.send_sticker(chat_id, settings.sticker_success_id)
                except Exception as e:
                    logger.warning("sticker_send_failed", sticker_id=settings.sticker_success_id, error=str(e))

            # Send Summary
            summary_text = (
                "*Бриф готов!*\n\n"
                f"{result.brief_data.summary}\n\n"
                "Полный бриф прикреплен ниже."
            )
            await bot.send_message(chat_id, summary_text, parse_mode="Markdown")

            # Client assessment removed per user request

            # Send PDF
            pdf_file = FSInputFile(result.pdf_path)
            await bot.send_document(
                chat_id,
                pdf_file,
                caption="Ваш проектный бриф",
                reply_markup=feedback_keyboard()
            )
        else:
            # Send Error Sticker
            if settings.sticker_error_id:
                try:
                    await bot.send_sticker(chat_id, settings.sticker_error_id)
                except Exception as e:
                    logger.warning("sticker_send_failed", sticker_id=settings.sticker_error_id, error=str(e))

            error_text = result.error_message or "Произошла ошибка при обработке. Попробуйте ещё раз."
            await bot.send_message(chat_id, error_text)
    finally:
        await bot.session.close()


def _build_draft_text(brief_data: BriefData) -> str:
    """Build a formatted draft summary text for user review."""
    parts = ["*Черновик брифа:*\n"]

    if brief_data.summary:
        parts.append(f"*Резюме:* {brief_data.summary}\n")
    if brief_data.service_type:
        parts.append(f"*Тип услуги:* {brief_data.service_type}")
    if brief_data.deadline:
        parts.append(f"*Сроки:* {brief_data.deadline}")
    if brief_data.budget:
        parts.append(f"*Бюджет:* {brief_data.budget}")
    if brief_data.wishes:
        parts.append(f"*Пожелания:* {brief_data.wishes}")

    # Missing info is sent as a separated message

    parts.append("\nПроверьте данные и выберите действие:")

    return "\n".join(parts)


async def _send_draft_to_user(chat_id: int, telegram_id: int, template_slug: str, username: str | None, result: ProcessingResult, processing_msg_id: int | None = None):
    """Sends the interactive draft back to the user and updates FSM."""
    settings = get_settings()
    bot = Bot(token=settings.telegram_bot_token.get_secret_value())
    storage = RedisStorage.from_url(settings.redis_url)

    try:
        if result.state == ProcessingState.DONE and result.brief_data:
            brief_data = result.brief_data
            draft_text = _build_draft_text(brief_data)

            # Update FSM State
            key = StorageKey(bot_id=bot.id, chat_id=chat_id, user_id=telegram_id)

            # Delete processing sticker if we had one
            if processing_msg_id:
                try:
                    await bot.delete_message(chat_id, processing_msg_id)
                except Exception as e:
                    logger.warning("failed_to_delete_processing_sticker", msg_id=processing_msg_id, error=str(e))

            await storage.set_state(key, BriefState.reviewing_draft)
            await storage.set_data(key, {
                "brief_data": brief_data.model_dump(),
                "original_text": brief_data.original_text,
                "template_slug": template_slug,
                "username": username,
            })

            # Feature 7: Missing Info Prompt
            if brief_data.missing_info:
                await bot.send_message(chat_id, draft_text, parse_mode="Markdown")
                # Client assessment removed per user request
                # Ask about missing info
                if settings.sticker_missing_fields_id:
                     try:
                         await bot.send_sticker(chat_id, settings.sticker_missing_fields_id)
                     except Exception as e:
                         logger.warning("sticker_send_failed", sticker_id=settings.sticker_missing_fields_id, error=str(e))
                await bot.send_message(
                    chat_id,
                    f"💡 *Я заметил, что не хватает информации:*\n\n"
                    f"_{brief_data.missing_info}_\n\n"
                    f"Хотите указать недостающие данные сейчас?",
                    reply_markup=missing_info_keyboard(),
                    parse_mode="Markdown",
                )
            else:
                await bot.send_message(
                    chat_id,
                    draft_text,
                    reply_markup=draft_review_keyboard(),
                    parse_mode="Markdown",
                )
                
                # Client assessment removed per user request

        else:
            # Also cleanup processing sticker on failure if state permits
            if processing_msg_id:
                try:
                    await bot.delete_message(chat_id, processing_msg_id)
                except Exception as e:
                    logger.warning("failed_to_delete_processing_sticker_on_error", error=str(e))

            if settings.sticker_error_id:
                try:
                    await bot.send_sticker(chat_id, settings.sticker_error_id)
                except Exception as e:
                    logger.warning("sticker_send_failed", sticker_id=settings.sticker_error_id, error=str(e))

            error_text = result.error_message or "Ошибка анализа аудио. Попробуйте ещё раз."
            await bot.send_message(chat_id, error_text)
    finally:
        await storage.close()
        await bot.session.close()


@celery.task(
    name="task_analyze_request",
    bind=True,
    max_retries=3,
    queue="briefbot"
)
def task_analyze_request(self, chat_id: int, telegram_id: int, audio_path: str, template_slug: str, username: str | None = None, file_id: str | None = None, processing_msg_id: int | None = None) -> dict:
    """
    Celery task to run the BriefBot pipeline for audio up to Draft generation.
    Returns serialized BriefData if successful.
    """
    logger.info("task_analyze_started", chat_id=chat_id, telegram_id=telegram_id, template=template_slug)

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        orchestrator = OrchestratorAgent()

        result = loop.run_until_complete(orchestrator.process_audio_to_draft(
            chat_id=chat_id,
            telegram_id=telegram_id,
            audio_path=audio_path,
            template_slug=template_slug,
            username=username,
            file_id=file_id,
        ))
        
        # Send interactive draft back to telegram
        loop.run_until_complete(_send_draft_to_user(chat_id, telegram_id, template_slug, username, result, processing_msg_id))

        loop.close()

        if result.state == ProcessingState.FAILED:
            logger.error("task_analyze_failed", chat_id=chat_id, error=result.error_message)
            raise Exception(result.error_message)
        else:
            logger.info("task_analyze_success", chat_id=chat_id)

        return result.brief_data.model_dump() if result.brief_data else {}

    except Exception as exc:
        logger.error("task_analyze_error", chat_id=chat_id, error=str(exc), exc_info=True)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=10)
        raise exc


@celery.task(
    name="task_generate_pdf",
    bind=True,
    max_retries=3,
    queue="briefbot"
)
def task_generate_pdf(self, draft_data: dict, chat_id: int, telegram_id: int, template_slug: str, history_id: str | None = None):
    """
    Celery task to generate a PDF from the approved Interactive Draft and send it.
    """
    logger.info("task_generate_pdf_started", chat_id=chat_id, telegram_id=telegram_id, template=template_slug)

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        orchestrator = OrchestratorAgent()
        
        from app.models.brief import BriefData
        brief_data = BriefData(**draft_data)
        
        # Let the orchestrator handle PDF generation, DB history, and upload
        result = loop.run_until_complete(
            orchestrator.process_with_brief_data(
                chat_id=chat_id,
                telegram_id=telegram_id,
                brief_data=brief_data,
                original_text=brief_data.original_text,
                template_slug=template_slug,
                username=None,
                cleanup_pdf=False,
            )
        )

        loop.run_until_complete(_send_result_to_user(chat_id, result))

        # Cleanup local PDF after sending
        if result.pdf_path:
             orchestrator._cleanup_file(result.pdf_path)

        loop.close()
        logger.info("task_generate_pdf_success", chat_id=chat_id)

    except Exception as exc:
        logger.error("task_generate_pdf_error", chat_id=chat_id, error=str(exc), exc_info=True)
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
