"""
Tests for app.db.user_repo — UserRepo CRUD operations.
Covers: get_or_create (upsert), increment_briefs, update_branding.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


class TestUserRepoGetOrCreate:
    """Test UserRepo.get_or_create behavior."""

    @pytest.mark.asyncio
    @patch("app.db.user_repo.get_supabase")
    async def test_upsert_returns_existing_user(self, mock_get_sb):
        """When user already exists, upsert should return the existing record."""
        existing = {"id": "uuid-1", "telegram_id": 123, "username": "alice"}
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_result = MagicMock()
        mock_result.data = [existing]
        mock_sb.table.return_value.upsert.return_value.execute.return_value = mock_result

        from app.db.user_repo import UserRepo
        result = await UserRepo.get_or_create(123, "alice")

        assert result == existing
        mock_sb.table.return_value.upsert.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.db.user_repo.get_supabase")
    async def test_upsert_creates_new_user(self, mock_get_sb):
        """When user doesn't exist, upsert should create and return a new record."""
        new_user = {"id": "uuid-2", "telegram_id": 456, "username": "bob"}
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_result = MagicMock()
        mock_result.data = [new_user]
        mock_sb.table.return_value.upsert.return_value.execute.return_value = mock_result

        from app.db.user_repo import UserRepo
        result = await UserRepo.get_or_create(456, "bob")

        assert result["telegram_id"] == 456
        assert result["username"] == "bob"
        # Verify upsert was called with correct data
        call_args = mock_sb.table.return_value.upsert.call_args
        user_data = call_args[0][0]
        assert user_data["telegram_id"] == 456
        assert user_data["username"] == "bob"

    @pytest.mark.asyncio
    @patch("app.db.user_repo.get_supabase")
    async def test_upsert_uses_on_conflict_telegram_id(self, mock_get_sb):
        """Upsert must specify on_conflict='telegram_id' for atomicity."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_result = MagicMock()
        mock_result.data = [{"id": "uuid-3", "telegram_id": 789}]
        mock_sb.table.return_value.upsert.return_value.execute.return_value = mock_result

        from app.db.user_repo import UserRepo
        await UserRepo.get_or_create(789, "charlie")

        call_args = mock_sb.table.return_value.upsert.call_args
        assert call_args[1].get("on_conflict") == "telegram_id"


class TestUserRepoIncrementBriefs:
    """Test UserRepo.increment_briefs behavior."""

    @pytest.mark.asyncio
    @patch("app.db.user_repo.get_supabase")
    async def test_increment_briefs(self, mock_get_sb):
        """Should increment briefs_count for the given telegram_id."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        mock_select_result = MagicMock()
        mock_select_result.data = [{"briefs_count": 5}]
        mock_sb.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = mock_select_result

        from app.db.user_repo import UserRepo
        await UserRepo.increment_briefs(123)

        mock_sb.table.return_value.update.assert_called_once_with({"briefs_count": 6})


class TestUserRepoUpdateBranding:
    """Test UserRepo.update_branding behavior."""

    @pytest.mark.asyncio
    @patch("app.db.user_repo.get_supabase")
    async def test_update_branding_sends_only_provided_fields(self, mock_get_sb):
        """Should only update fields that are provided (not None)."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        from app.db.user_repo import UserRepo
        await UserRepo.update_branding(123, brand_color="#FF0000")

        mock_sb.table.return_value.update.assert_called_once_with({"brand_color": "#FF0000"})

    @pytest.mark.asyncio
    @patch("app.db.user_repo.get_supabase")
    async def test_update_branding_skips_if_no_fields(self, mock_get_sb):
        """Should not call update if no fields are provided."""
        mock_sb = MagicMock()
        mock_get_sb.return_value = mock_sb

        from app.db.user_repo import UserRepo
        await UserRepo.update_branding(123)

        mock_sb.table.return_value.update.assert_not_called()
