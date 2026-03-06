"""
Tests for DB repository retry logic (UserRepo, HistoryRepo, TemplateDBRepo).
Verifies that the @retry decorator retries on transient failures.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# UserRepo
# ---------------------------------------------------------------------------

class TestUserRepoRetry:
    """Verify UserRepo methods retry up to 3 times on failure."""

    @patch("app.db.user_repo.get_supabase")
    def test_get_or_create_retries_and_succeeds(self, mock_get_sb):
        """Should succeed on the 3rd attempt after 2 transient failures."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        # First 2 calls raise, 3rd returns data
        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_eq = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_limit = MagicMock()
        mock_eq.limit.return_value = mock_limit

        call_count = 0
        def execute_side_effect():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise ConnectionError("transient DB error")
            result = MagicMock()
            result.data = [{"id": "user-1", "telegram_id": 111}]
            return result

        mock_limit.execute.side_effect = execute_side_effect

        from app.db.user_repo import UserRepo
        user = UserRepo.get_or_create(111, "testuser")

        assert user["id"] == "user-1"
        assert call_count == 3

    @patch("app.db.user_repo.get_supabase")
    def test_get_or_create_fails_after_3_attempts(self, mock_get_sb):
        """Should re-raise after exhausting 3 retry attempts."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_eq = MagicMock()
        mock_select.eq.return_value = mock_eq
        mock_limit = MagicMock()
        mock_eq.limit.return_value = mock_limit
        mock_limit.execute.side_effect = ConnectionError("persistent DB error")

        from app.db.user_repo import UserRepo
        with pytest.raises(ConnectionError, match="persistent DB error"):
            UserRepo.get_or_create(222, "fail_user")

        assert mock_limit.execute.call_count == 3

    @patch("app.db.user_repo.get_supabase")
    def test_get_all_users_retries(self, mock_get_sb):
        """get_all_users should retry on failure."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_select = MagicMock()
        mock_table.select.return_value = mock_select
        mock_order = MagicMock()
        mock_select.order.return_value = mock_order

        call_count = 0
        def execute_side_effect():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("transient")
            result = MagicMock()
            result.data = [{"id": "u1"}, {"id": "u2"}]
            return result

        mock_order.execute.side_effect = execute_side_effect

        from app.db.user_repo import UserRepo
        users = UserRepo.get_all_users()

        assert len(users) == 2
        assert call_count == 2


# ---------------------------------------------------------------------------
# HistoryRepo
# ---------------------------------------------------------------------------

class TestHistoryRepoRetry:
    """Verify HistoryRepo retries on transient failures."""

    @patch("app.db.history_repo.get_supabase")
    def test_create_retries_and_succeeds(self, mock_get_sb):
        """create() should succeed on 2nd attempt after 1 failure."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert

        call_count = 0
        def execute_side_effect():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("transient")
            result = MagicMock()
            result.data = [{"id": "hist-1"}]
            return result

        mock_insert.execute.side_effect = execute_side_effect

        from app.db.history_repo import HistoryRepo
        record = HistoryRepo.create(
            user_id="user-1", telegram_id=111, template_slug="default"
        )

        assert record["id"] == "hist-1"
        assert call_count == 2

    @patch("app.db.history_repo.get_supabase")
    def test_create_fails_after_3_attempts(self, mock_get_sb):
        """create() should re-raise after 3 failures."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_insert = MagicMock()
        mock_table.insert.return_value = mock_insert
        mock_insert.execute.side_effect = ConnectionError("persistent")

        from app.db.history_repo import HistoryRepo
        with pytest.raises(ConnectionError, match="persistent"):
            HistoryRepo.create(
                user_id="user-1", telegram_id=111, template_slug="default"
            )

        assert mock_insert.execute.call_count == 3


# ---------------------------------------------------------------------------
# TemplateDBRepo
# ---------------------------------------------------------------------------

class TestTemplateDBRepoRetry:
    """Verify TemplateDBRepo retries on transient failures."""

    @patch("app.db.template_repo.get_all_templates")
    @patch("app.db.template_repo.get_supabase")
    def test_sync_to_db_retries(self, mock_get_sb, mock_get_templates):
        """sync_to_db() should retry on transient DB failure."""
        from app.models.brief import BriefTemplate, TemplateSection

        mock_get_templates.return_value = {
            "test": BriefTemplate(
                name="Test",
                slug="test",
                sections=[TemplateSection(key="k", title="t", hint="h")],
            )
        }

        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_table = MagicMock()
        mock_sb.table.return_value = mock_table
        mock_upsert = MagicMock()
        mock_table.upsert.return_value = mock_upsert

        call_count = 0
        def execute_side_effect():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("transient")
            return MagicMock()

        mock_upsert.execute.side_effect = execute_side_effect

        from app.db.template_repo import TemplateDBRepo
        TemplateDBRepo.sync_to_db()

        assert call_count == 2
