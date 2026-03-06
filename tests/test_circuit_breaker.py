"""
Tests for the Circuit Breaker pattern in ai_factory.py.
"""

from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.brief import BriefData, BriefTemplate, TemplateSection
from app.services.ai_factory import CircuitBreaker, ResilientAIAgent


@pytest.fixture
def sample_template() -> BriefTemplate:
    return BriefTemplate(
        name="Test", slug="test",
        sections=[TemplateSection(key="service_type", title="Test", hint="hint")],
    )


@pytest.fixture
def sample_brief() -> BriefData:
    return BriefData(
        service_type="Тест", summary="Test summary", original_text="Test",
    )


class TestCircuitBreaker:
    """Test CircuitBreaker state transitions."""

    def test_initial_state_is_closed(self):
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=60)
        assert cb.state == CircuitBreaker.CLOSED
        assert not cb.should_use_fallback

    def test_stays_closed_below_threshold(self):
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=60)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitBreaker.CLOSED
        assert not cb.should_use_fallback

    def test_opens_at_threshold(self):
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=60)
        cb.record_failure()
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitBreaker.OPEN
        assert cb.should_use_fallback

    def test_success_resets_to_closed(self):
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=60)
        cb.record_failure()
        cb.record_failure()
        cb.record_success()
        assert cb.state == CircuitBreaker.CLOSED
        assert cb._failure_count == 0

    def test_half_open_after_timeout(self):
        cb = CircuitBreaker(failure_threshold=1, reset_timeout=0.01)
        cb.record_failure()
        assert cb.state == CircuitBreaker.OPEN
        time.sleep(0.02)  # Wait past reset_timeout
        assert cb.state == CircuitBreaker.HALF_OPEN
        assert cb.should_use_fallback

    def test_success_in_half_open_closes(self):
        cb = CircuitBreaker(failure_threshold=1, reset_timeout=0.01)
        cb.record_failure()
        time.sleep(0.02)
        assert cb.state == CircuitBreaker.HALF_OPEN
        cb.record_success()
        assert cb.state == CircuitBreaker.CLOSED

    def test_failure_after_success_starts_fresh(self):
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=60)
        cb.record_failure()
        cb.record_failure()
        cb.record_success()
        cb.record_failure()
        assert cb._failure_count == 1
        assert cb.state == CircuitBreaker.CLOSED


class TestResilientAIAgent:
    """Test ResilientAIAgent failover behavior."""

    @pytest.mark.asyncio
    async def test_uses_primary_when_healthy(self, sample_template, sample_brief):
        primary = MagicMock()
        primary.process_text = AsyncMock(return_value=sample_brief)
        fallback = MagicMock()
        fallback.process_text = AsyncMock(return_value=sample_brief)

        agent = ResilientAIAgent(primary=primary, fallback=fallback)
        result = await agent.process_text("test", sample_template)

        assert result == sample_brief
        primary.process_text.assert_called_once()
        fallback.process_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_falls_back_on_primary_failure(self, sample_template, sample_brief):
        primary = MagicMock()
        primary.process_text = AsyncMock(side_effect=Exception("Gemini down"))
        fallback = MagicMock()
        fallback.process_text = AsyncMock(return_value=sample_brief)

        agent = ResilientAIAgent(primary=primary, fallback=fallback)
        result = await agent.process_text("test", sample_template)

        assert result == sample_brief
        primary.process_text.assert_called_once()
        fallback.process_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_circuit_opens_after_threshold(self, sample_template, sample_brief):
        primary = MagicMock()
        primary.process_text = AsyncMock(side_effect=Exception("Gemini error"))
        fallback = MagicMock()
        fallback.process_text = AsyncMock(return_value=sample_brief)

        cb = CircuitBreaker(failure_threshold=2, reset_timeout=300)
        agent = ResilientAIAgent(primary=primary, fallback=fallback, circuit_breaker=cb)

        # Two failures should trip the circuit
        await agent.process_text("test1", sample_template)
        await agent.process_text("test2", sample_template)

        assert cb.state == CircuitBreaker.OPEN

        # Third call should go directly to fallback (circuit open)
        fallback.process_text.reset_mock()
        primary.process_text.reset_mock()
        await agent.process_text("test3", sample_template)

        # Primary should NOT be called when circuit is open
        primary.process_text.assert_not_called()
        fallback.process_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_raises_if_both_fail(self, sample_template):
        primary = MagicMock()
        primary.process_text = AsyncMock(side_effect=Exception("Gemini down"))
        fallback = MagicMock()
        fallback.process_text = AsyncMock(side_effect=Exception("Groq down too"))

        agent = ResilientAIAgent(primary=primary, fallback=fallback)

        with pytest.raises(Exception, match="Gemini down"):
            await agent.process_text("test", sample_template)

    @pytest.mark.asyncio
    async def test_process_audio_failover(self, sample_template, sample_brief):
        primary = MagicMock()
        primary.process_audio = AsyncMock(side_effect=Exception("Audio fail"))
        fallback = MagicMock()
        fallback.process_audio = AsyncMock(return_value=sample_brief)

        agent = ResilientAIAgent(primary=primary, fallback=fallback)
        result = await agent.process_audio("/tmp/audio.ogg", sample_template)

        assert result == sample_brief
        fallback.process_audio.assert_called_once()
