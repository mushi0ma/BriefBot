"""
Whisper Agent — Speech-to-Text service using Groq Whisper API.
Accepts an audio file and returns a text transcription.
Uses Groq's ultra-fast inference with whisper-large-v3-turbo model.
"""

from __future__ import annotations

import time
from pathlib import Path

from groq import AsyncGroq
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("whisper_agent")


class TranscriptionError(Exception):
    """Raised when speech-to-text fails after retries."""


class WhisperAgent:
    """Async Whisper agent for transcribing audio files via Groq."""

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not set")
        self._client = AsyncGroq(api_key=settings.groq_api_key.get_secret_value())

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type((Exception,)),
        reraise=True,
    )
    async def transcribe(self, audio_path: str) -> str:
        """
        Transcribe an audio file to text via Groq Whisper.

        Args:
            audio_path: Absolute path to the audio file (ogg, mp3, wav, etc.)

        Returns:
            Transcribed text string.

        Raises:
            TranscriptionError: If transcription fails after retries.
        """
        file_path = Path(audio_path)
        if not file_path.exists():
            raise TranscriptionError(f"Audio file not found: {audio_path}")

        file_size_kb = file_path.stat().st_size / 1024
        logger.info("transcription_started", file=file_path.name, size_kb=round(file_size_kb, 1))

        start = time.monotonic()
        try:
            with open(file_path, "rb") as audio_file:
                response = await self._client.audio.transcriptions.create(
                    model="whisper-large-v3-turbo",
                    file=audio_file,
                    language="ru",
                    response_format="text",
                )

            elapsed_ms = int((time.monotonic() - start) * 1000)
            text = response.strip() if isinstance(response, str) else response.text.strip()

            logger.info(
                "transcription_completed",
                file=file_path.name,
                text_length=len(text),
                duration_ms=elapsed_ms,
            )
            return text

        except Exception as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            logger.error(
                "transcription_failed",
                file=file_path.name,
                error=str(e),
                duration_ms=elapsed_ms,
                exc_info=True,
            )
            raise TranscriptionError(f"Groq Whisper transcription failed: {e}") from e
