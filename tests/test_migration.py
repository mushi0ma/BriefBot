"""
Tests for scripts/migrate.py — Supabase migration script.
Covers: skip logic, happy path, retry with exponential backoff, exhausted retries.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch, call

import pytest


class TestMigration:
    """Test run_migration() behavior."""

    @patch("scripts.migrate.setup_logging")
    @patch("app.config.get_settings")
    def test_migration_skipped_without_url(self, mock_get_settings, _mock_logging):
        """Should skip silently when SUPABASE_DB_URL is not set."""
        mock_settings = MagicMock()
        mock_settings.supabase_db_url = None
        mock_get_settings.return_value = mock_settings

        from scripts.migrate import run_migration
        run_migration()

    @patch("scripts.migrate.setup_logging")
    @patch("app.config.get_settings")
    def test_migration_runs_sql(self, mock_get_settings, _mock_logging):
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
            mock_psycopg2.OperationalError = type("OperationalError", (Exception,), {})

            from scripts.migrate import run_migration
            run_migration()

            mock_psycopg2.connect.assert_called_once_with(
                "postgresql://user:pass@localhost/db"
            )
            mock_cursor.execute.assert_called_once()
            mock_conn.close.assert_called_once()

    @patch("time.sleep")
    @patch("scripts.migrate.setup_logging")
    @patch("app.config.get_settings")
    def test_migration_retries_on_transient_error(self, mock_get_settings, _mock_logging, mock_sleep):
        """Should retry on OperationalError and succeed on 3rd attempt."""
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
            OpError = type("OperationalError", (Exception,), {})
            mock_psycopg2.OperationalError = OpError

            # Fail twice, succeed on 3rd
            mock_psycopg2.connect.side_effect = [
                OpError("Connection refused"),
                OpError("Network is unreachable"),
                mock_conn,
            ]

            from scripts.migrate import run_migration
            run_migration()  # Should NOT raise

            assert mock_psycopg2.connect.call_count == 3
            mock_cursor.execute.assert_called_once()
            # Verify backoff sleeps: 1s, 2s
            assert mock_sleep.call_args_list == [call(1), call(2)]

    @patch("time.sleep")
    @patch("scripts.migrate.setup_logging")
    @patch("app.config.get_settings")
    def test_migration_exits_after_max_retries(self, mock_get_settings, _mock_logging, mock_sleep):
        """Should sys.exit(1) after exhausting all 5 retry attempts."""
        mock_settings = MagicMock()
        mock_settings.supabase_db_url = "postgresql://user:pass@localhost/db"
        mock_get_settings.return_value = mock_settings

        with patch.dict("sys.modules", {"psycopg2": MagicMock()}) as _:
            import sys
            mock_psycopg2 = sys.modules["psycopg2"]
            OpError = type("OperationalError", (Exception,), {})
            mock_psycopg2.OperationalError = OpError

            mock_psycopg2.connect.side_effect = OpError("Connection refused")

            from scripts.migrate import run_migration
            with pytest.raises(SystemExit) as exc_info:
                run_migration()

            assert exc_info.value.code == 1
            assert mock_psycopg2.connect.call_count == 5
            # Verify exponential backoff: 1, 2, 4, 8
            assert mock_sleep.call_args_list == [call(1), call(2), call(4), call(8)]

    @patch("time.sleep")
    @patch("scripts.migrate.setup_logging")
    @patch("app.config.get_settings")
    def test_migration_non_operational_error_exits_immediately(self, mock_get_settings, _mock_logging, mock_sleep):
        """Non-OperationalError (e.g. SQL syntax) should exit immediately, no retry."""
        mock_settings = MagicMock()
        mock_settings.supabase_db_url = "postgresql://user:pass@localhost/db"
        mock_get_settings.return_value = mock_settings

        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_cursor.execute.side_effect = Exception("syntax error in SQL")

        with patch.dict("sys.modules", {"psycopg2": MagicMock()}) as _:
            import sys
            mock_psycopg2 = sys.modules["psycopg2"]
            mock_psycopg2.OperationalError = type("OperationalError", (Exception,), {})
            mock_psycopg2.connect.return_value = mock_conn

            from scripts.migrate import run_migration
            with pytest.raises(SystemExit) as exc_info:
                run_migration()

            assert exc_info.value.code == 1
            mock_psycopg2.connect.assert_called_once()
            mock_sleep.assert_not_called()
