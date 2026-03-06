"""
Orchestrator Agent — Coordinates the full voice->brief->PDF and text->brief->PDF pipelines.
v6: Adds audio cleanup, RateLimitError handling, file_id-based caching.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from app.db.history_repo import HistoryRepo
from app.db.template_repo import get_template
from app.db.user_repo import UserRepo
from app.logger import get_logger
from app.models.brief import BriefData, BriefTemplate, ProcessingResult, ProcessingState
from app.services.ai_factory import get_ai_agent
from app.services.analysis import RateLimitError
from app.services.cache import get_cache
from app.services.notification import notify_admin
from app.services.pdf_generator import generate_pdf

logger = get_logger("orchestrator")

RATE_LIMIT_MSG = (
    "Сервис сейчас перегружен. Подождите минуту и попробуйте снова."
)


class OrchestratorAgent:
    """
    Coordinates the BriefBot pipeline.
    v6: audio cleanup, rate-limit handling, file_id cache keys.
    """

    def __init__(self) -> None:
        self.ai = get_ai_agent()
        self.cache = get_cache()

    @staticmethod
    def _get_template(slug: str) -> BriefTemplate:
        """Get a template by slug (public helper for draft mode)."""
        return get_template(slug)

    async def process(
        self,
        chat_id: int,
        telegram_id: int,
        audio_path: str,
        template_slug: str = "default",
        username: str | None = None,
        file_id: str | None = None,
    ) -> ProcessingResult:
        """
        Runs the full audio processing pipeline.
        """
        start_time = time.monotonic()
        history_id: str | None = None

        try:
            # 0. User & Template prep
            user = UserRepo.get_or_create(telegram_id, username or "")
            template = get_template(template_slug)

            # Create initial history record
            history = HistoryRepo.create(
                user_id=user["id"],
                telegram_id=telegram_id,
                template_slug=template_slug,
                original_text="Processing..."
            )
            history_id = history["id"]

            # 1. Check Cache (use file_id if available, else audio_path)
            cache_key = file_id or audio_path
            cached_result = await self.cache.get(cache_key, template_slug)
            if cached_result:
                logger.info("pipeline_cache_hit", user_id=telegram_id)
                brief_data = cached_result
            else:
                # 2. AI Processing (Multimodal)
                logger.info("pipeline_ai_start", user_id=telegram_id, provider=type(self.ai).__name__)
                self._update_history(history_id, ProcessingState.ANALYZING)

                brief_data = await self.ai.process_audio(audio_path, template)

                # Update Cache
                await self.cache.set(cache_key, template_slug, brief_data)

            # 3. PDF Generation
            self._update_history(history_id, ProcessingState.GENERATING_PDF)
            pdf_path = generate_pdf(brief_data, template)

            # 4. Final Logs & Stats
            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            HistoryRepo.update(
                history_id,
                processing_state=ProcessingState.DONE.value,
                original_text=brief_data.original_text,
                brief_data=brief_data.model_dump(),
                pdf_url=pdf_path,
                processing_time_ms=elapsed_ms,
            )
            UserRepo.increment_briefs(telegram_id)

            logger.info("pipeline_completed", user_id=telegram_id, duration=elapsed_ms)

            return ProcessingResult(
                state=ProcessingState.DONE,
                brief_data=brief_data,
                pdf_path=pdf_path,
                processing_time_ms=elapsed_ms,
            )

        except RateLimitError:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            logger.warning("pipeline_rate_limited", user_id=telegram_id)
            if history_id:
                HistoryRepo.update(
                    history_id,
                    processing_state=ProcessingState.FAILED.value,
                    error_message="rate_limit",
                    processing_time_ms=elapsed_ms,
                )
            return ProcessingResult(
                state=ProcessingState.FAILED,
                error_message=RATE_LIMIT_MSG,
                processing_time_ms=elapsed_ms,
            )

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            logger.error("pipeline_failed", error=str(e), user_id=telegram_id)

            if history_id:
                HistoryRepo.update(
                    history_id,
                    processing_state=ProcessingState.FAILED.value,
                    error_message=str(e),
                    processing_time_ms=elapsed_ms,
                )

            # Notify admin
            await notify_admin(f"Pipeline failure for user {telegram_id}: {str(e)}")

            return ProcessingResult(
                state=ProcessingState.FAILED,
                error_message="Произошла ошибка при обработке. Попробуйте позже или обратитесь к администратору.",
                processing_time_ms=elapsed_ms,
            )

        finally:
            # Cleanup: delete the downloaded audio file
            self._cleanup_audio(audio_path)

    async def process_text(
        self,
        chat_id: int,
        telegram_id: int,
        text: str,
        template_slug: str = "default",
        username: str | None = None,
    ) -> ProcessingResult:
        """
        Runs the text-only processing pipeline (skips STT).
        Used for text messages collected via FSM.
        """
        start_time = time.monotonic()
        history_id: str | None = None

        try:
            # 0. User & Template prep
            user = UserRepo.get_or_create(telegram_id, username or "")
            template = get_template(template_slug)

            # Create initial history record
            history = HistoryRepo.create(
                user_id=user["id"],
                telegram_id=telegram_id,
                template_slug=template_slug,
                original_text=text[:200],
            )
            history_id = history["id"]

            # 1. AI Processing (Text-only, no STT)
            logger.info("pipeline_text_start", user_id=telegram_id, provider=type(self.ai).__name__)
            self._update_history(history_id, ProcessingState.ANALYZING)

            brief_data = await self.ai.process_text(text, template)

            # 2. PDF Generation
            self._update_history(history_id, ProcessingState.GENERATING_PDF)
            pdf_path = generate_pdf(brief_data, template)

            # 3. Final Logs & Stats
            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            HistoryRepo.update(
                history_id,
                processing_state=ProcessingState.DONE.value,
                original_text=text,
                brief_data=brief_data.model_dump(),
                pdf_url=pdf_path,
                processing_time_ms=elapsed_ms,
            )
            UserRepo.increment_briefs(telegram_id)

            logger.info("pipeline_text_completed", user_id=telegram_id, duration=elapsed_ms)

            return ProcessingResult(
                state=ProcessingState.DONE,
                brief_data=brief_data,
                pdf_path=pdf_path,
                processing_time_ms=elapsed_ms,
            )

        except RateLimitError:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            logger.warning("pipeline_text_rate_limited", user_id=telegram_id)
            if history_id:
                HistoryRepo.update(
                    history_id,
                    processing_state=ProcessingState.FAILED.value,
                    error_message="rate_limit",
                    processing_time_ms=elapsed_ms,
                )
            return ProcessingResult(
                state=ProcessingState.FAILED,
                error_message=RATE_LIMIT_MSG,
                processing_time_ms=elapsed_ms,
            )

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            logger.error("pipeline_text_failed", error=str(e), user_id=telegram_id)

            if history_id:
                HistoryRepo.update(
                    history_id,
                    processing_state=ProcessingState.FAILED.value,
                    error_message=str(e),
                    processing_time_ms=elapsed_ms,
                )

            await notify_admin(f"Text pipeline failure for user {telegram_id}: {str(e)}")

            return ProcessingResult(
                state=ProcessingState.FAILED,
                error_message="Произошла ошибка при обработке текста. Попробуйте позже.",
                processing_time_ms=elapsed_ms,
            )

    async def process_with_brief_data(
        self,
        chat_id: int,
        telegram_id: int,
        brief_data: BriefData,
        original_text: str,
        template_slug: str = "default",
        username: str | None = None,
        brand_color: str | None = None,
        logo_url: str | None = None,
    ) -> ProcessingResult:
        """
        Runs only the PDF generation step using pre-computed BriefData.
        Used for the draft mode flow where AI has already analyzed the text.
        """
        start_time = time.monotonic()
        history_id: str | None = None

        try:
            # 0. User & Template prep
            user = UserRepo.get_or_create(telegram_id, username or "")
            template = get_template(template_slug)

            # Create history record
            history = HistoryRepo.create(
                user_id=user["id"],
                telegram_id=telegram_id,
                template_slug=template_slug,
                original_text=original_text[:200],
            )
            history_id = history["id"]

            # 1. PDF Generation (AI already done)
            self._update_history(history_id, ProcessingState.GENERATING_PDF)
            pdf_path = generate_pdf(
                brief_data, template,
                brand_color=brand_color,
                logo_url=logo_url,
            )

            # 2. Final Logs & Stats
            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            HistoryRepo.update(
                history_id,
                processing_state=ProcessingState.DONE.value,
                original_text=original_text,
                brief_data=brief_data.model_dump(),
                pdf_url=pdf_path,
                processing_time_ms=elapsed_ms,
            )
            UserRepo.increment_briefs(telegram_id)

            logger.info("pipeline_draft_completed", user_id=telegram_id, duration=elapsed_ms)

            return ProcessingResult(
                state=ProcessingState.DONE,
                brief_data=brief_data,
                pdf_path=pdf_path,
                processing_time_ms=elapsed_ms,
            )

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start_time) * 1000)
            logger.error("pipeline_draft_failed", error=str(e), user_id=telegram_id)

            if history_id:
                HistoryRepo.update(
                    history_id,
                    processing_state=ProcessingState.FAILED.value,
                    error_message=str(e),
                    processing_time_ms=elapsed_ms,
                )

            await notify_admin(f"Draft pipeline failure for user {telegram_id}: {str(e)}")

            return ProcessingResult(
                state=ProcessingState.FAILED,
                error_message="Произошла ошибка при генерации PDF. Попробуйте позже.",
                processing_time_ms=elapsed_ms,
            )

    @staticmethod
    def _update_history(history_id: str | None, state: ProcessingState) -> None:
        """Update history record with new processing state."""
        if history_id:
            HistoryRepo.update(history_id, processing_state=state.value)

    @staticmethod
    def _cleanup_audio(audio_path: str) -> None:
        """Delete the temporary audio file after processing."""
        try:
            p = Path(audio_path)
            if p.exists():
                p.unlink()
                logger.debug("audio_file_cleaned", path=audio_path)
        except Exception as e:
            logger.warning("audio_cleanup_failed", path=audio_path, error=str(e))
