"""
Gemini Agent for native audio-to-brief and text-to-brief processing using Gemini 2.0 Flash.
Uses the new google-genai SDK with Structured Outputs (response_schema).

v2: Adds response_schema for guaranteed JSON, client_assessment field,
    and Markdown list instructions in prompts.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.config import get_settings
from app.logger import get_logger
from app.models.brief import BriefData, BriefTemplate
from app.services.analysis import AnalysisError, RateLimitError

logger = get_logger("gemini_agent")


def _build_response_schema(template: BriefTemplate) -> dict[str, Any]:
    """
    Build a JSON schema dict for Gemini's response_schema parameter.
    Includes template-specific section keys + standard fields.
    """
    properties: dict[str, Any] = {}

    # Template-defined sections
    for section in template.sections:
        properties[section.key] = {
            "type": "string",
            "description": f"{section.title}: {section.hint}" if section.hint else section.title,
        }

    # Standard fields always present
    properties["summary"] = {
        "type": "string",
        "description": "A concise 1-2 sentence overview of the request.",
    }
    properties["original_text"] = {
        "type": "string",
        "description": "Full transcription of the audio / original client text (in Russian).",
    }
    properties["client_assessment"] = {
        "type": "string",
        "description": (
            "Professional assessment of the client for the freelancer: "
            "tone, clarity, red flags, risk of rework. "
            "Example: 'Клиент чётко формулирует задачу, адекватный бюджет' or "
            "'Требования размыты, риск переделок высокий (Red Flag: просит поиграться со шрифтами)'"
        ),
    }

    return {
        "type": "object",
        "properties": properties,
        "required": list(properties.keys()),
    }


def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if the exception is a 429 / Resource Exhausted rate-limit error."""
    err_str = str(exc).lower()
    return "429" in err_str or "resource exhausted" in err_str or "rate limit" in err_str


class GeminiAgent:
    """Agent that uses Gemini 2.0 Flash for multimodal audio and text processing."""

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not set")

        self.client = genai.Client(api_key=settings.google_api_key.get_secret_value())
        self.model_name = "gemini-2.0-flash"

    async def process_audio(self, audio_path: str, template: BriefTemplate) -> BriefData:
        """
        Processes audio file directly with Gemini 2.0 Flash to extract brief data.
        Uses Structured Outputs (response_schema) for guaranteed valid JSON.
        """
        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info("gemini_audio_processing_start", audio_path=audio_path, template=template.slug)

        try:
            # Upload audio file
            uploaded_file = self.client.files.upload(
                file=audio_path,
                config=types.UploadFileConfig(display_name="voice_message"),
            )

            prompt = self._build_audio_prompt(template)
            schema = _build_response_schema(template)

            # Generate content with audio + prompt + structured output
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[uploaded_file, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )

            if not response.text:
                raise AnalysisError("Gemini returned empty response")

            return self._parse_response(response.text, "Processed via Gemini 2.0 Flash")

        except (AnalysisError, RateLimitError):
            raise
        except Exception as e:
            if _is_rate_limit_error(e):
                logger.warning("gemini_rate_limited", error=str(e))
                raise RateLimitError("Gemini API rate limit exceeded") from e
            logger.error("gemini_processing_failed", error=str(e))
            raise AnalysisError(f"Gemini processing failed: {str(e)}")

    async def process_text(self, text: str, template: BriefTemplate) -> BriefData:
        """
        Processes text input with Gemini 2.0 Flash to extract brief data.
        Uses Structured Outputs (response_schema) for guaranteed valid JSON.
        """
        if not text.strip():
            raise AnalysisError("Empty text — nothing to analyze")

        logger.info("gemini_text_processing_start", text_length=len(text), template=template.slug)

        try:
            prompt = self._build_text_prompt(template, text)
            schema = _build_response_schema(template)

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )

            if not response.text:
                raise AnalysisError("Gemini returned empty response")

            return self._parse_response(response.text, text)

        except (AnalysisError, RateLimitError):
            raise
        except Exception as e:
            if _is_rate_limit_error(e):
                logger.warning("gemini_rate_limited", error=str(e))
                raise RateLimitError("Gemini API rate limit exceeded") from e
            logger.error("gemini_text_processing_failed", error=str(e))
            raise AnalysisError(f"Gemini text processing failed: {str(e)}")

    def _build_audio_prompt(self, template: BriefTemplate) -> str:
        """Builds a strict prompt for Gemini audio processing with Markdown list instructions."""
        sections_str = "\n".join([f"- {s.key}: {s.title} ({s.hint})" for s in template.sections])

        return f"""You are an expert business assistant. Your task is to listen to the provided audio (voice message from a client) and extract key business details to create a formal project brief.

TEMPLATE: {template.name}

REQUIRED SECTIONS (output these keys in JSON):
{sections_str}

ADDITIONAL FIELDS (always include):
- summary: A concise 1-2 sentence overview of the request.
- original_text: Full transcription of the audio (in Russian).
- client_assessment: Professional assessment for the freelancer — client tone, clarity, risk of rework, red flags. Be honest and useful.

FORMATTING RULES:
1. Output ONLY a valid JSON object matching the provided schema.
2. Use the exact keys specified above.
3. If a piece of information is missing, use an empty string. Do not invent details.
4. For lists and enumerations in field values, use Markdown format:
   - Use "- item" for bullet lists
   - Use "1. item" for numbered lists
   - Use **bold** for emphasis
5. Capture the tone and specific requirements of the client.
6. Language of output: Russian (Cyrillic).
7. Be precise and professional."""

    def _build_text_prompt(self, template: BriefTemplate, text: str) -> str:
        """Builds a strict prompt for Gemini text processing with Markdown list instructions."""
        sections_str = "\n".join([f"- {s.key}: {s.title} ({s.hint})" for s in template.sections])

        return f"""You are an expert business assistant. Your task is to analyze the provided text (message from a client) and extract key business details to create a formal project brief.

TEMPLATE: {template.name}

CLIENT TEXT:
{text}

REQUIRED SECTIONS (output these keys in JSON):
{sections_str}

ADDITIONAL FIELDS (always include):
- summary: A concise 1-2 sentence overview of the request.
- original_text: The original client text (in Russian).
- client_assessment: Professional assessment for the freelancer — client tone, clarity, risk of rework, red flags. Be honest and useful. Example: "Клиент чётко ставит задачу, адекватный бюджет" or "Требования размыты, высокий риск переделок".

FORMATTING RULES:
1. Output ONLY a valid JSON object matching the provided schema.
2. Use the exact keys specified above.
3. If a piece of information is missing, use an empty string. Do not invent details.
4. For lists and enumerations in field values, use Markdown format:
   - Use "- item" for bullet lists
   - Use "1. item" for numbered lists
   - Use **bold** for emphasis
5. Capture the tone and specific requirements of the client.
6. Language of output: Russian (Cyrillic).
7. Be precise and professional."""

    def _parse_response(self, raw_json: str, fallback_text: str) -> BriefData:
        """
        Parses JSON response into BriefData.
        With response_schema, Gemini guarantees valid JSON — no Markdown stripping needed.
        We still handle edge cases defensively.
        """
        try:
            # With structured outputs, response should be clean JSON
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
            logger.error("parse_brief_data_failed", error=str(e), raw_response=raw_json[:500])
            raise AnalysisError(f"Failed to parse brief data: {str(e)}")
