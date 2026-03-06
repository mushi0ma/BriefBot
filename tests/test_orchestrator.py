"""
Tests for the orchestrator agent — state machine transitions and error handling.
Updated for v4 with process_text support.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.brief import BriefData, ProcessingResult, ProcessingState
from app.services.orchestrator import OrchestratorAgent


@pytest.fixture
def mock_orchestrator():
    """Create an orchestrator with mocked AI agent, cache, and DB."""
    with patch("app.services.orchestrator.UserRepo") as mock_user_repo, \
         patch("app.services.orchestrator.HistoryRepo") as mock_history_repo, \
         patch("app.services.orchestrator.get_template") as mock_get_template, \
         patch("app.services.orchestrator.notify_admin", new_callable=AsyncMock) as mock_notify, \
         patch("app.services.orchestrator.get_ai_agent") as mock_get_ai, \
         patch("app.services.orchestrator.get_cache") as mock_get_cache:

        # Mock user repo
        mock_user_repo.get_or_create.return_value = {"id": "user-123", "telegram_id": 12345}
        mock_user_repo.increment_briefs.return_value = None

        # Mock history repo
        mock_history_repo.create.return_value = {"id": "history-456"}
        mock_history_repo.update.return_value = None

        # Mock template
        from app.models.brief import BriefTemplate, TemplateSection
        mock_get_template.return_value = BriefTemplate(
            name="Test", slug="test",
            sections=[TemplateSection(key="service_type", title="Test", hint="hint")],
        )

        # Mock AI agent
        mock_ai = MagicMock()
        mock_ai.process_audio = AsyncMock(return_value=BriefData(
            service_type="Сайт", budget="100 000 руб.",
            summary="Test summary", original_text="Test text",
        ))
        mock_ai.process_text = AsyncMock(return_value=BriefData(
            service_type="Бот", budget="50 000 руб.",
            summary="Text summary", original_text="Original text input",
        ))
        mock_get_ai.return_value = mock_ai

        # Mock cache
        mock_cache = MagicMock()
        mock_cache.get = AsyncMock(return_value=None)
        mock_cache.set = AsyncMock(return_value=None)
        mock_get_cache.return_value = mock_cache

        orch = OrchestratorAgent()
        yield orch, mock_user_repo, mock_history_repo, mock_notify, mock_ai


class TestOrchestratorAudioPipeline:
    """Test the audio processing pipeline."""

    @pytest.mark.asyncio
    async def test_successful_audio_pipeline(self, mock_orchestrator):
        """Full audio pipeline should return DONE state."""
        orch, mock_user, mock_history, mock_notify, mock_ai = mock_orchestrator

        with patch("app.services.orchestrator.generate_pdf", return_value="/tmp/test.pdf"):
            result = await orch.process(
                chat_id=123,
                telegram_id=12345,
                audio_path="/tmp/audio.ogg",
            )

        assert result.state == ProcessingState.DONE
        assert result.pdf_path == "/tmp/test.pdf"
        assert result.processing_time_ms >= 0
        assert result.brief_data is not None
        mock_ai.process_audio.assert_called_once()

    @pytest.mark.asyncio
    async def test_audio_pipeline_ai_failure(self, mock_orchestrator):
        """AI failure should result in FAILED state."""
        orch, _, _, mock_notify, mock_ai = mock_orchestrator

        from app.services.analysis import AnalysisError
        mock_ai.process_audio = AsyncMock(side_effect=AnalysisError("AI error"))

        result = await orch.process(
            chat_id=123,
            telegram_id=12345,
            audio_path="/tmp/audio.ogg",
        )

        assert result.state == ProcessingState.FAILED
        assert result.error_message is not None

    @pytest.mark.asyncio
    async def test_pdf_failure(self, mock_orchestrator):
        """PDF generation failure should result in FAILED state."""
        orch, _, _, mock_notify, mock_ai = mock_orchestrator

        from app.services.pdf_generator import PDFGenerationError
        with patch("app.services.orchestrator.generate_pdf", side_effect=PDFGenerationError("PDF error")):
            result = await orch.process(
                chat_id=123,
                telegram_id=12345,
                audio_path="/tmp/audio.ogg",
            )

        assert result.state == ProcessingState.FAILED


class TestOrchestratorTextPipeline:
    """Test the text processing pipeline (FSM flow)."""

    @pytest.mark.asyncio
    async def test_successful_text_pipeline(self, mock_orchestrator):
        """Text pipeline should return DONE state with brief data."""
        orch, mock_user, mock_history, mock_notify, mock_ai = mock_orchestrator

        with patch("app.services.orchestrator.generate_pdf", return_value="/tmp/text_brief.pdf"):
            result = await orch.process_text(
                chat_id=123,
                telegram_id=12345,
                text="Мне нужен Telegram бот для заказов, бюджет 50к, дедлайн 2 недели.",
            )

        assert result.state == ProcessingState.DONE
        assert result.pdf_path == "/tmp/text_brief.pdf"
        assert result.processing_time_ms >= 0
        assert result.brief_data is not None
        mock_ai.process_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_text_pipeline_ai_failure(self, mock_orchestrator):
        """AI failure in text pipeline should result in FAILED state."""
        orch, _, _, mock_notify, mock_ai = mock_orchestrator

        from app.services.analysis import AnalysisError
        mock_ai.process_text = AsyncMock(side_effect=AnalysisError("Text processing error"))

        result = await orch.process_text(
            chat_id=123,
            telegram_id=12345,
            text="Some text",
        )

        assert result.state == ProcessingState.FAILED
        assert result.error_message is not None

    @pytest.mark.asyncio
    async def test_text_pipeline_notifies_admin_on_failure(self, mock_orchestrator):
        """Admin should be notified on text pipeline failure."""
        orch, _, _, mock_notify, mock_ai = mock_orchestrator

        from app.services.analysis import AnalysisError
        mock_ai.process_text = AsyncMock(side_effect=AnalysisError("fail"))

        await orch.process_text(
            chat_id=123,
            telegram_id=12345,
            text="Some text",
        )

        mock_notify.assert_called_once()
