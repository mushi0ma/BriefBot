"""
Centralized application configuration via pydantic-settings.
All values are loaded from environment variables / .env file.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single source of truth for every configurable parameter."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Telegram ─────────────────────────────
    telegram_bot_token: SecretStr
    telegram_admin_bot_token: SecretStr
    admin_chat_ids: str  # comma-separated list of admin IDs

    @property
    def admin_ids(self) -> list[int]:
        return [int(x.strip()) for x in self.admin_chat_ids.split(",") if x.strip()]

    # ── AI APIs ──────────────────────────────
    openai_api_key: SecretStr | None = None
    google_api_key: SecretStr | None = None
    groq_api_key: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None
    ai_provider: str = "gemini"  # gemini, groq, kimi, openai

    # ── Supabase ─────────────────────────────
    supabase_url: str
    supabase_key: str
    supabase_db_url: str | None = None  # PostgreSQL URI for migrations

    # ── Redis ────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── Logging ──────────────────────────────
    log_level: str = "INFO"
    log_format: str = "json"  # "json" | "console"

    # ── Limits ───────────────────────────────
    max_audio_duration_sec: int = 300  # 5 minutes
    cache_ttl_sec: int = 86400  # 24 hours
    default_template_slug: str = "default"

    # ── Paths ────────────────────────────────
    base_dir: Path = Path(__file__).resolve().parent.parent
    assets_dir: Path = base_dir / "assets"
    fonts_dir: Path = assets_dir / "fonts"
    temp_dir: Path = Path("/tmp/briefbot")

    # ── Admin Web App ────────────────────────
    tma_admin_url: str = "https://your-domain.vercel.app"
    tma_user_url: str = "https://your-user-tma.vercel.app"
    admin_web_port: int = 8080

    # ── Telegram Stickers (Epic 3: UX Analytics) ─────────────
    sticker_onboarding_id: str = ""        # /start greeting
    sticker_processing_id: str = ""        # Loading / thinking
    sticker_missing_fields_id: str = ""    # Magnifying glass / notepad
    sticker_success_id: str = ""           # Approved / checkmark
    sticker_error_id: str = ""             # Error / failed STT

    # Admin specific stickers
    sticker_stats_id: str = ""
    sticker_health_check_healthy_id: str = ""
    sticker_health_check_errors_id: str = ""
    sticker_welcome_admin_id: str = ""
    sticker_notification_id: str = ""

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached Settings singleton."""
    return Settings()  # type: ignore[call-arg]
