"""
Groq Agent — fallback AI provider using Groq (Llama-3) for text processing
and Groq Whisper for audio transcription.
Used as a Circuit Breaker fallback when Gemini is unavailable.

v2: Adds tenacity retries on transient errors and asyncio.to_thread for blocking SDK calls.
"""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from groq import Groq
from pydantic import ValidationError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
    retry_if_exception,
)

from app.config import get_settings
from app.logger import get_logger
from app.models.brief import BriefData, BriefTemplate
from app.services.analysis import AnalysisError, RateLimitError

logger = get_logger("groq_agent")


def _should_retry(exc: BaseException) -> bool:
    """Retry on transient errors but NOT on AnalysisError or RateLimitError."""
    if isinstance(exc, (AnalysisError, RateLimitError)):
        return False
    return True


_ai_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception(_should_retry),
    before_sleep=before_sleep_log(logger, logging.WARNING),  # type: ignore[arg-type]
    reraise=True,
)


def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if the exception is a rate-limit error."""
    err_str = str(exc).lower()
    return "429" in err_str or "rate limit" in err_str or "rate_limit" in err_str


class GroqAgent:
    """
    Fallback AI agent using Groq API.
    - Text processing: Llama-3 70B
    - Audio: Groq Whisper transcription → Llama-3 text processing
    """

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not set")

        self.client = Groq(api_key=settings.groq_api_key.get_secret_value())
        self.text_model = "llama-3.3-70b-versatile"
        self.whisper_model = "whisper-large-v3"

    @_ai_retry
    async def process_audio(self, audio_path: str, template: BriefTemplate) -> BriefData:
        """
        Processes audio: transcribe via Groq Whisper, then analyze text via Llama-3.
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info("groq_audio_processing_start", audio_path=audio_path, template=template.slug)

        try:
            # Step 1: Transcribe with Whisper (sync SDK → thread pool)
            def _transcribe() -> str:
                with open(audio_path, "rb") as f:
                    transcription = self.client.audio.transcriptions.create(
                        model=self.whisper_model,
                        file=f,
                        language="ru",
                        response_format="text",
                    )
                return str(transcription).strip()

            transcript = await asyncio.to_thread(_transcribe)
            if not transcript:
                raise AnalysisError("Groq Whisper returned empty transcription")

            logger.info("groq_transcribed", text_length=len(transcript))

            # Step 2: Analyze transcription with Llama-3
            return await self._analyze_text(transcript, template)

        except (AnalysisError, RateLimitError):
            raise
        except Exception as e:
            if _is_rate_limit_error(e):
                logger.warning("groq_rate_limited", error=str(e))
                raise RateLimitError("Groq API rate limit exceeded") from e
            logger.error("groq_audio_processing_failed", error=str(e))
            raise AnalysisError(f"Groq processing failed: {str(e)}")

    @_ai_retry
    async def process_text(self, text: str, template: BriefTemplate) -> BriefData:
        """Processes text input with Groq Llama-3 to extract brief data."""
        if not text.strip():
            raise AnalysisError("Empty text — nothing to analyze")

        logger.info("groq_text_processing_start", text_length=len(text), template=template.slug)

        try:
            return await self._analyze_text(text, template)
        except (AnalysisError, RateLimitError):
            raise
        except Exception as e:
            if _is_rate_limit_error(e):
                logger.warning("groq_rate_limited", error=str(e))
                raise RateLimitError("Groq API rate limit exceeded") from e
            logger.error("groq_text_processing_failed", error=str(e))
            raise AnalysisError(f"Groq text processing failed: {str(e)}")

    async def _analyze_text(self, text: str, template: BriefTemplate) -> BriefData:
        """Core text analysis using Llama-3 (sync SDK → thread pool)."""
        sections_str = "\n".join([f"- {s.key}: {s.title} ({s.hint})" for s in template.sections])

        system_prompt = f"""You are an expert business assistant. Analyze the client text and extract key business details into a JSON brief.

TEMPLATE: {template.name}

REQUIRED JSON KEYS:
{sections_str}
- summary: concise 1-2 sentence overview
- original_text: original client text (Russian)
- client_assessment: professional assessment for freelancer — client tone, clarity, red flags

RULES:
1. Output ONLY valid JSON.
2. Use exact keys above.
3. Empty string for missing info. Don't invent.
4. Use Markdown lists (- item) for enumerations.
5. Language: Russian.
6. Be precise and professional."""

        def _sync_call() -> str:
            response = self.client.chat.completions.create(
                model=self.text_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=4096,
            )
            return response.choices[0].message.content or ""

        raw_json = await asyncio.to_thread(_sync_call)
        if not raw_json:
            raise AnalysisError("Groq returned empty response")

        return self._parse_response(raw_json, text)

    def _parse_response(self, raw_json: str, fallback_text: str) -> BriefData:
        """Parses JSON response into BriefData."""
        try:
            data = json.loads(raw_json.strip())
            return BriefData(
                service_type=data.get("service_type", ""),
                deadline=data.get("deadline", ""),
                budget=data.get("budget", ""),
                wishes=data.get("wishes", ""),
                missing_info=data.get("missing_info", ""),
                summary=data.get("summary", ""),
                original_text=data.get("original_text", fallback_text),
                client_assessment=data.get("client_assessment", ""),
                extra_sections=[],
            )
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error("groq_parse_failed", error=str(e), raw_response=raw_json[:500])
            raise AnalysisError(f"Failed to parse Groq response: {str(e)}")
