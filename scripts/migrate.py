"""
Supabase migration script — runs MIGRATION_SQL at container startup.
Idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.

Retry policy: up to MAX_RETRIES attempts with exponential backoff
for transient connection errors (psycopg2.OperationalError).
"""

from __future__ import annotations

import sys
import time

from app.logger import get_logger, setup_logging

logger = get_logger("migrate")

MAX_RETRIES = 5
INITIAL_BACKOFF_S = 1


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

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            conn = psycopg2.connect(settings.supabase_db_url)
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute(MIGRATION_SQL)
            conn.close()
            logger.info("migration_completed", attempt=attempt)
            return
        except psycopg2.OperationalError as e:
            if attempt < MAX_RETRIES:
                backoff = INITIAL_BACKOFF_S * (2 ** (attempt - 1))
                logger.warning(
                    "migration_retry",
                    attempt=attempt,
                    max_retries=MAX_RETRIES,
                    backoff_s=backoff,
                    error=str(e),
                )
                time.sleep(backoff)
            else:
                logger.error(
                    "migration_failed",
                    error=str(e),
                    attempts=MAX_RETRIES,
                    exc_info=True,
                )
                sys.exit(1)
        except Exception as e:
            logger.error("migration_failed", error=str(e), exc_info=True)
            sys.exit(1)


if __name__ == "__main__":
    run_migration()
