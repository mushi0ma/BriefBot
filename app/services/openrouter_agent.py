"""
OpenRouter Agent — AI provider using Kimi K2.5 via OpenRouter API.
Uses the OpenAI-compatible endpoint at https://openrouter.ai/api/v1.
Optimized for high-quality brief/document generation.
"""

from __future__ import annotations

import json
from pathlib import Path

from openai import AsyncOpenAI
from pydantic import ValidationError

from app.config import get_settings
from app.logger import get_logger
from app.models.brief import BriefData, BriefTemplate
from app.services.analysis import AnalysisError, RateLimitError

logger = get_logger("openrouter_agent")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
KIMI_MODEL = "moonshotai/kimi-k2.5"


def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if the exception is a rate-limit error."""
    err_str = str(exc).lower()
    return "429" in err_str or "rate limit" in err_str or "rate_limit" in err_str


class OpenRouterAgent:
    """
    AI agent using Kimi K2.5 via OpenRouter.
    - Text processing: Kimi K2.5 (262K context, excellent document generation)
    - Audio: Groq Whisper transcription → Kimi K2.5 text processing
    """

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is not set")

        self.client = AsyncOpenAI(
            api_key=settings.openrouter_api_key.get_secret_value(),
            base_url=OPENROUTER_BASE_URL,
            default_headers={
                "HTTP-Referer": "https://briefbot.app",
                "X-Title": "BriefBot",
            },
        )
        self.text_model = KIMI_MODEL

        # Groq client for Whisper (audio transcription only)
        self._groq_client = None
        if settings.groq_api_key:
            from groq import Groq
            self._groq_client = Groq(api_key=settings.groq_api_key.get_secret_value())

    async def process_audio(self, audio_path: str, template: BriefTemplate) -> BriefData:
        """
        Processes audio: transcribe via Groq Whisper, then analyze text via Kimi K2.5.
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        if not self._groq_client:
            raise AnalysisError("Groq API key not set — cannot transcribe audio for Kimi agent")

        logger.info("kimi_audio_processing_start", audio_path=audio_path, template=template.slug)

        try:
            # Step 1: Transcribe with Groq Whisper
            with open(audio_path, "rb") as f:
                transcription = self._groq_client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=f,
                    language="ru",
                    response_format="text",
                )

            transcript = str(transcription).strip()
            if not transcript:
                raise AnalysisError("Groq Whisper returned empty transcription")

            logger.info("kimi_transcribed", text_length=len(transcript))

            # Step 2: Analyze transcription with Kimi K2.5
            return await self._analyze_text(transcript, template)

        except (AnalysisError, RateLimitError):
            raise
        except Exception as e:
            if _is_rate_limit_error(e):
                logger.warning("kimi_rate_limited", error=str(e))
                raise RateLimitError("OpenRouter/Kimi API rate limit exceeded") from e
            logger.error("kimi_audio_processing_failed", error=str(e))
            raise AnalysisError(f"Kimi processing failed: {str(e)}")

    async def process_text(self, text: str, template: BriefTemplate) -> BriefData:
        """Processes text input with Kimi K2.5 to extract brief data."""
        if not text.strip():
            raise AnalysisError("Empty text — nothing to analyze")

        logger.info("kimi_text_processing_start", text_length=len(text), template=template.slug)

        try:
            return await self._analyze_text(text, template)
        except (AnalysisError, RateLimitError):
            raise
        except Exception as e:
            if _is_rate_limit_error(e):
                logger.warning("kimi_rate_limited", error=str(e))
                raise RateLimitError("OpenRouter/Kimi API rate limit exceeded") from e
            logger.error("kimi_text_processing_failed", error=str(e))
            raise AnalysisError(f"Kimi text processing failed: {str(e)}")

    async def _analyze_text(self, text: str, template: BriefTemplate) -> BriefData:
        """Core text analysis using Kimi K2.5."""
        sections_str = "\n".join([f"- {s.key}: {s.title} ({s.hint})" for s in template.sections])

        system_prompt = f"""Ты — эксперт бизнес-аналитик. Проанализируй текст клиента и извлеки ключевые детали в структурированный JSON-бриф.

ШАБЛОН: {template.name}

ОБЯЗАТЕЛЬНЫЕ КЛЮЧИ JSON:
{sections_str}
- summary: краткое резюме запроса в 1-2 предложениях
- original_text: исходный текст клиента (на русском)
- client_assessment: профессиональная оценка для фрилансера — тон клиента, чёткость запроса, красные флаги

ПРАВИЛА:
1. Выводи ТОЛЬКО валидный JSON-объект.
2. Используй точно указанные ключи.
3. Для отсутствующей информации — пустая строка. Не выдумывай данных.
4. Для списков используй Markdown:
   - "- элемент" для маркированных списков
   - "1. элемент" для нумерованных
   - **жирный** для выделения
5. Язык: русский.
6. Будь точен и профессионален."""

        response = await self.client.chat.completions.create(
            model=self.text_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=4096,
        )

        raw_json = response.choices[0].message.content
        if not raw_json:
            raise AnalysisError("Kimi K2.5 returned empty response")

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
            logger.error("kimi_parse_failed", error=str(e), raw_response=raw_json[:500])
            raise AnalysisError(f"Failed to parse Kimi response: {str(e)}")
