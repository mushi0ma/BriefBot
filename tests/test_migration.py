"""
Tests for scripts/migrate.py — Supabase migration script.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch, call

import pytest


class TestMigration:
    """Test run_migration() behavior."""

    @patch("app.config.get_settings")
    def test_migration_skipped_without_url(self, mock_get_settings):
        """Should skip silently when SUPABASE_DB_URL is not set."""
        mock_settings = MagicMock()
        mock_settings.supabase_db_url = None
        mock_get_settings.return_value = mock_settings

        from scripts.migrate import run_migration
        # Should return without error and without importing psycopg2
        run_migration()

    @patch("app.config.get_settings")
    def test_migration_runs_sql(self, mock_get_settings):
        """Should execute MIGRATION_SQL on the database connection."""
        mock_settings = MagicMock()
        mock_settings.supabase_db_url = "postgresql://user:pass@localhost/db"
        mock_get_settings.return_value = mock_settings

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        with patch.dict("sys.modules", {"psycopg2": MagicMock()}) as _:
            import sys
            mock_psycopg2 = sys.modules["psycopg2"]
            mock_psycopg2.connect.return_value = mock_conn

            from scripts.migrate import run_migration
            run_migration()

            mock_psycopg2.connect.assert_called_once_with(
                "postgresql://user:pass@localhost/db"
            )
            mock_cursor.execute.assert_called_once()
            mock_conn.close.assert_called_once()

    @patch("app.config.get_settings")
    def test_migration_exits_on_connection_error(self, mock_get_settings):
        """Should sys.exit(1) when psycopg2.connect raises."""
        mock_settings = MagicMock()
        mock_settings.supabase_db_url = "postgresql://user:pass@localhost/db"
        mock_get_settings.return_value = mock_settings

        with patch.dict("sys.modules", {"psycopg2": MagicMock()}) as _:
            import sys
            mock_psycopg2 = sys.modules["psycopg2"]
            mock_psycopg2.connect.side_effect = Exception("Connection refused")

            from scripts.migrate import run_migration
            with pytest.raises(SystemExit) as exc_info:
                run_migration()

            assert exc_info.value.code == 1
