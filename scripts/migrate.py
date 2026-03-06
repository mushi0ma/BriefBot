"""
Supabase migration script — runs MIGRATION_SQL at container startup.
Idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
"""

from __future__ import annotations

import sys

from app.logger import get_logger, setup_logging

logger = get_logger("migrate")


def run_migration() -> None:
    """Execute the migration SQL against the Supabase PostgreSQL database."""
    setup_logging()

    from app.config import get_settings
    from app.models.db import MIGRATION_SQL

    settings = get_settings()

    if not settings.supabase_db_url:
        logger.warning("migration_skipped", reason="SUPABASE_DB_URL not set")
        return

    try:
        import psycopg2
    except ImportError:
        logger.error("migration_failed", reason="psycopg2 not installed")
        sys.exit(1)

    logger.info("migration_starting")

    try:
        conn = psycopg2.connect(settings.supabase_db_url)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(MIGRATION_SQL)
        conn.close()
        logger.info("migration_completed")
    except Exception as e:
        logger.error("migration_failed", error=str(e), exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    run_migration()
