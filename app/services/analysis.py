"""
GPT Agent — Text analysis and structuring service using GPT-4o-mini.
Accepts transcribed text + template → returns structured BriefData as JSON.
Includes self-healing: if the JSON is malformed, it retries with a correction prompt.
"""

from __future__ import annotations

import json
import time

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import get_settings
from app.logger import get_logger
from app.models.brief import BriefData, BriefTemplate

logger = get_logger("gpt_agent")


class AnalysisError(Exception):
    """Raised when text analysis fails after retries."""


class RateLimitError(AnalysisError):
    """Raised when the AI API returns a 429 rate-limit response."""


def _build_system_prompt(template: BriefTemplate) -> str:
    """Build the system prompt with template-specific sections and hints."""
    sections_description = "\n".join(
        f'  - "{s.key}": {s.title} — {s.hint}' for s in template.sections
    )

    return f"""Ты — профессиональный бизнес-аналитик. Твоя задача — проанализировать расшифровку голосового сообщения клиента и извлечь из неё структурированную информацию.

ШАБЛОН БРИФА: «{template.name}»

Из текста клиента нужно извлечь следующие поля:
{sections_description}

ПРАВИЛА:
1. Отвечай ТОЛЬКО валидным JSON-объектом и ничем больше.
2. Используй ТОЧНО эти ключи в JSON: {', '.join(f'"{s.key}"' for s in template.sections)}
3. Также ОБЯЗАТЕЛЬНО добавь ключ "summary" — краткое резюме запроса в 2-3 предложениях.
4. Если информация не была озвучена клиентом — поставь пустую строку "".
5. Для поля "missing_info" — сформулируй конкретные вопросы, которые нужно задать клиенту.
6. Пиши НА РУССКОМ ЯЗЫКЕ.
7. Не придумывай данные — извлекай только то, что реально сказал клиент.
8. Структурируй длинные ответы: используй нумерацию (1. 2. 3.) для списков.

Пример формата ответа:
{{
  "service_type": "Разработка сайта-визитки",
  "deadline": "2 недели",
  "budget": "50 000 руб.",
  "wishes": "1. Минималистичный дизайн\\n2. Адаптивная верстка",
  "missing_info": "1. Нужен ли домен?\\n2. Есть ли готовый контент?",
  "summary": "Клиент запрашивает разработку сайта-визитки с минималистичным дизайном, бюджет 50 000 руб., срок 2 недели."
}}"""


CORRECTION_PROMPT = """Предыдущий ответ содержал невалидный JSON. Пожалуйста, исправь и верни ТОЛЬКО валидный JSON-объект.
Невалидный ответ был: {bad_response}
Ошибка парсинга: {error}
Верни только JSON, без Markdown, без блоков кода, без пояснений."""


class GPTAgent:
    """Async GPT agent for analyzing transcribed text into structured BriefData."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = "gpt-4o-mini"

    async def analyze(self, text: str, template: BriefTemplate) -> BriefData:
        """
        Analyze transcribed text using GPT-4o-mini and return structured BriefData.

        Args:
            text: Transcribed text from Whisper agent.
            template: The brief template to use for structuring.

        Returns:
            Parsed BriefData model.

        Raises:
            AnalysisError: If analysis fails after retries.
        """
        if not text.strip():
            raise AnalysisError("Empty transcription text — nothing to analyze")

        logger.info("analysis_started", text_length=len(text), template=template.slug)
        start = time.monotonic()

        system_prompt = _build_system_prompt(template)
        user_content = f"Вот расшифровка голосового сообщения клиента:\n\n{text}"

        try:
            raw_json = await self._call_gpt(system_prompt, user_content)
            brief_data = self._parse_response(raw_json, text)

            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.info("analysis_completed", template=template.slug, duration_ms=elapsed_ms)
            return brief_data

        except json.JSONDecodeError as e:
            # Self-healing: retry with correction prompt
            logger.warning("analysis_json_malformed", error=str(e), attempting_correction=True)
            try:
                corrected_json = await self._call_gpt(
                    system_prompt,
                    CORRECTION_PROMPT.format(bad_response=raw_json[:500], error=str(e)),
                )
                brief_data = self._parse_response(corrected_json, text)
                elapsed_ms = int((time.monotonic() - start) * 1000)
                logger.info("analysis_self_healed", template=template.slug, duration_ms=elapsed_ms)
                return brief_data
            except Exception as e2:
                raise AnalysisError(f"GPT self-healing failed: {e2}") from e2

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.error("analysis_failed", error=str(e), duration_ms=elapsed_ms, exc_info=True)
            raise AnalysisError(f"GPT analysis failed: {e}") from e

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )
    async def _call_gpt(self, system_prompt: str, user_content: str) -> str:
        """Make the actual GPT API call with retries."""
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000,
        )
        return response.choices[0].message.content or ""

    @staticmethod
    def _parse_response(raw_json: str, original_text: str) -> BriefData:
        """Parse GPT JSON response into BriefData model."""
        data = json.loads(raw_json)

        return BriefData(
            service_type=data.get("service_type", ""),
            deadline=data.get("deadline", ""),
            budget=data.get("budget", ""),
            wishes=data.get("wishes", ""),
            missing_info=data.get("missing_info", ""),
            summary=data.get("summary", ""),
            original_text=original_text,
        )
