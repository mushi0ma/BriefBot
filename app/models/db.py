"""
Supabase table schema definitions (for documentation & migration SQL generation).
"""

# Run this once in the Supabase SQL editor.

from pydantic import BaseModel

class UserSettings(BaseModel):
    """User preferences for brief generation and UI customization."""
    brand_color: str = ""
    logo_url: str = ""
    default_template: str = "default"
    include_assessment: bool = True
    include_keywords: bool = True
    include_summary: bool = True
    include_competitors: bool = True
    include_tone: bool = True

MIGRATION_SQL = """
-- ── Users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id   BIGINT UNIQUE NOT NULL,
    username      TEXT DEFAULT '',
    first_name    TEXT DEFAULT '',
    last_name     TEXT DEFAULT '',
    first_seen    TIMESTAMPTZ DEFAULT now(),
    briefs_count  INTEGER DEFAULT 0,
    is_blocked    BOOLEAN DEFAULT false,
    brand_color   TEXT DEFAULT '',
    logo_url      TEXT DEFAULT '',
    updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS include_assessment BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS include_keywords BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS include_summary BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS include_competitors BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS include_tone BOOLEAN DEFAULT true;

-- ── Brief History ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brief_history (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    telegram_id       BIGINT NOT NULL,
    template_slug     TEXT DEFAULT 'default',
    original_text     TEXT DEFAULT '',
    brief_data        JSONB DEFAULT '{}',
    pdf_url           TEXT DEFAULT '',
    processing_state  TEXT DEFAULT 'received',
    processing_time_ms INTEGER DEFAULT 0,
    error_message     TEXT DEFAULT '',
    title             VARCHAR(255) DEFAULT '',
    keywords          JSONB DEFAULT '[]'::jsonb,
    is_downloaded     BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_user ON brief_history (user_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON brief_history (created_at DESC);

-- Idempotent column additions for existing deployments
ALTER TABLE brief_history ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '';
ALTER TABLE brief_history ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE brief_history ADD COLUMN IF NOT EXISTS is_downloaded BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_history_keywords ON brief_history USING GIN (keywords);


-- ── Templates ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    sections    JSONB NOT NULL DEFAULT '[]',
    style       JSONB NOT NULL DEFAULT '{}',
    is_default  BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates (slug);

-- ── pgvector extension ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Flexible briefs: JSONB data + embedding + client_assessment ─────────
ALTER TABLE brief_history ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE brief_history ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE brief_history ADD COLUMN IF NOT EXISTS client_assessment TEXT DEFAULT '';
ALTER TABLE brief_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- GIN index for JSONB queries on flexible data
CREATE INDEX IF NOT EXISTS idx_history_data ON brief_history USING GIN (data);

-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_history_embedding ON brief_history
  USING hnsw (embedding vector_cosine_ops);
"""
