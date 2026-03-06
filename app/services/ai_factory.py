"""
AI Factory with Circuit Breaker — manages AI providers with automatic failover.
Primary: Gemini 2.0 Flash, Fallback: Groq Llama-3.
"""

from __future__ import annotations

import time
from typing import Protocol

from app.config import get_settings
from app.logger import get_logger
from app.models.brief import BriefData, BriefTemplate

logger = get_logger("ai_factory")


class AIAgent(Protocol):
    """Protocol for AI agents that process audio/text."""

    async def process_audio(self, audio_path: str, template: BriefTemplate) -> BriefData:
        ...

    async def process_text(self, text: str, template: BriefTemplate) -> BriefData:
        ...


class CircuitBreaker:
    """
    Circuit Breaker pattern for AI providers.

    States:
    - CLOSED: normal operation, requests go to primary
    - OPEN: primary is down, requests go to fallback
    - HALF_OPEN: after reset_timeout, try one request to primary

    Trips to OPEN after `failure_threshold` consecutive failures.
    Resets to CLOSED after `reset_timeout` seconds.
    """

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(self, failure_threshold: int = 3, reset_timeout: float = 300.0) -> None:
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self._state = self.CLOSED
        self._failure_count = 0
        self._last_failure_time: float = 0.0

    @property
    def state(self) -> str:
        if self._state == self.OPEN:
            # Check if enough time has passed to try again
            if time.monotonic() - self._last_failure_time >= self.reset_timeout:
                self._state = self.HALF_OPEN
                logger.info("circuit_breaker_half_open", after_seconds=self.reset_timeout)
        return self._state

    def record_success(self) -> None:
        """Record a successful request — reset to CLOSED."""
        if self._state != self.CLOSED:
            logger.info("circuit_breaker_closed", previous_state=self._state)
        self._failure_count = 0
        self._state = self.CLOSED

    def record_failure(self) -> None:
        """Record a failed request — possibly trip to OPEN."""
        self._failure_count += 1
        self._last_failure_time = time.monotonic()

        if self._failure_count >= self.failure_threshold:
            self._state = self.OPEN
            logger.warning(
                "circuit_breaker_opened",
                failures=self._failure_count,
                threshold=self.failure_threshold,
            )

    @property
    def should_use_fallback(self) -> bool:
        """Whether the circuit is open and we should use the fallback."""
        return self.state in (self.OPEN, self.HALF_OPEN)


class ResilientAIAgent:
    """
    AI Agent wrapper with Circuit Breaker failover.
    Tries primary agent first; if it fails repeatedly, switches to fallback.
    """

    def __init__(
        self,
        primary: AIAgent,
        fallback: AIAgent,
        circuit_breaker: CircuitBreaker | None = None,
    ) -> None:
        self.primary = primary
        self.fallback = fallback
        self.cb = circuit_breaker or CircuitBreaker()

    async def process_audio(self, audio_path: str, template: BriefTemplate) -> BriefData:
        return await self._execute("process_audio", audio_path=audio_path, template=template)

    async def process_text(self, text: str, template: BriefTemplate) -> BriefData:
        return await self._execute("process_text", text=text, template=template)

    async def _execute(self, method_name: str, **kwargs) -> BriefData:
        """Execute with failover logic."""
        if self.cb.should_use_fallback:
            # Circuit is open — try fallback directly
            logger.info("using_fallback_agent", reason="circuit_open", method=method_name)
            try:
                result = await getattr(self.fallback, method_name)(**kwargs)
                # If in HALF_OPEN, try primary on next call
                return result
            except Exception as fallback_err:
                logger.error("fallback_agent_failed", error=str(fallback_err))
                raise

        # Circuit is CLOSED or HALF_OPEN — try primary
        try:
            result = await getattr(self.primary, method_name)(**kwargs)
            self.cb.record_success()
            return result
        except Exception as primary_err:
            self.cb.record_failure()
            logger.warning(
                "primary_agent_failed",
                error=str(primary_err),
                failure_count=self.cb._failure_count,
                state=self.cb.state,
            )

            # Immediately try fallback if primary failed
            try:
                logger.info("trying_fallback_agent", method=method_name)
                result = await getattr(self.fallback, method_name)(**kwargs)
                return result
            except Exception as fallback_err:
                logger.error("fallback_agent_also_failed", error=str(fallback_err))
                # Re-raise the original primary error
                raise primary_err


def get_ai_agent() -> ResilientAIAgent:
    """Factory method to get the configured AI agent with Circuit Breaker failover."""
    settings = get_settings()

    provider = settings.ai_provider.lower()

    if provider == "kimi":
        # Kimi K2.5 via OpenRouter as primary, Gemini as fallback
        try:
            from app.services.openrouter_agent import OpenRouterAgent
            primary = OpenRouterAgent()
        except (ValueError, ImportError) as e:
            logger.warning("kimi_primary_unavailable", error=str(e))
            from app.services.gemini_agent import GeminiAgent
            primary = GeminiAgent()

        from app.services.gemini_agent import GeminiAgent
        fallback = GeminiAgent()
    else:
        # Default: Gemini primary, Groq fallback
        from app.services.gemini_agent import GeminiAgent
        primary = GeminiAgent()

        try:
            from app.services.groq_agent import GroqAgent
            fallback = GroqAgent()
        except (ValueError, ImportError) as e:
            logger.warning("groq_fallback_unavailable", error=str(e))
            fallback = GeminiAgent()

    return ResilientAIAgent(
        primary=primary,
        fallback=fallback,
        circuit_breaker=CircuitBreaker(failure_threshold=3, reset_timeout=300),
    )
