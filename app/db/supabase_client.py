"""
Async Supabase client singleton.
Provides a shared client for all repository modules.
"""

from __future__ import annotations

from pathlib import Path

from supabase import create_client, Client

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("supabase_client")

_client: Client | None = None


def get_supabase() -> Client:
    """Return a Supabase client singleton (sync client used in async context through repos)."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = create_client(settings.supabase_url, settings.supabase_key)
        logger.info("supabase_client_initialized", url=settings.supabase_url)
    return _client


def upload_file(bucket: str, remote_path: str, file_path: str) -> str:
    """
    Upload a file to Supabase Storage and return its public URL.

    Args:
        bucket: Storage bucket name (e.g. 'briefs')
        remote_path: Path inside the bucket (e.g. 'user_123/brief_2026.pdf')
        file_path: Local file path to upload

    Returns:
        Public URL of the uploaded file
    """
    sb = get_supabase()
    local = Path(file_path)

    if not local.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "rb") as f:
        # Auto-detect content type from extension
        ext = local.suffix.lower()
        content_types = {
            ".pdf": "application/pdf",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        content_type = content_types.get(ext, "application/octet-stream")

        sb.storage.from_(bucket).upload(
            path=remote_path,
            file=f,
            file_options={"content-type": content_type, "upsert": "true"},
        )

    public_url = sb.storage.from_(bucket).get_public_url(remote_path)
    logger.info("file_uploaded", bucket=bucket, path=remote_path, url=public_url)
    return public_url

