"""
Tests for database migration SQL — ensures all required schema elements
are present in the idempotent migration script.
"""

import pytest

from app.models.db import MIGRATION_SQL


class TestMigrationSQL:
    """Verify that MIGRATION_SQL contains all expected DDL statements."""

    def test_pgvector_extension(self):
        assert "CREATE EXTENSION IF NOT EXISTS vector" in MIGRATION_SQL

    def test_data_jsonb_column(self):
        assert "ADD COLUMN IF NOT EXISTS data JSONB" in MIGRATION_SQL

    def test_embedding_column(self):
        assert "ADD COLUMN IF NOT EXISTS embedding vector(768)" in MIGRATION_SQL

    def test_client_assessment_column(self):
        assert "ADD COLUMN IF NOT EXISTS client_assessment TEXT" in MIGRATION_SQL

    def test_updated_at_column(self):
        assert "ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ" in MIGRATION_SQL

    def test_gin_index_on_data(self):
        assert "idx_history_data" in MIGRATION_SQL
        assert "USING GIN (data)" in MIGRATION_SQL

    def test_hnsw_index_on_embedding(self):
        assert "idx_history_embedding" in MIGRATION_SQL
        assert "USING hnsw (embedding vector_cosine_ops)" in MIGRATION_SQL

    def test_users_table(self):
        assert "CREATE TABLE IF NOT EXISTS users" in MIGRATION_SQL

    def test_brief_history_table(self):
        assert "CREATE TABLE IF NOT EXISTS brief_history" in MIGRATION_SQL

    def test_templates_table(self):
        assert "CREATE TABLE IF NOT EXISTS templates" in MIGRATION_SQL

    def test_idempotence_keywords(self):
        """All CREATE/ALTER statements must use IF NOT EXISTS / IF EXISTS."""
        lines = MIGRATION_SQL.strip().splitlines()
        for line in lines:
            stripped = line.strip().upper()
            if stripped.startswith("CREATE TABLE"):
                assert "IF NOT EXISTS" in stripped, f"Non-idempotent: {line}"
            if stripped.startswith("CREATE INDEX"):
                assert "IF NOT EXISTS" in stripped, f"Non-idempotent: {line}"
            if stripped.startswith("ALTER TABLE") and "ADD COLUMN" in stripped:
                assert "IF NOT EXISTS" in stripped, f"Non-idempotent: {line}"
