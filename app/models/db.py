"""
Supabase table schema definitions (for documentation & migration SQL generation).
"""

# SQL to create tables in Supabase.
# Run this once in the Supabase SQL editor.

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
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_user ON brief_history (user_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON brief_history (created_at DESC);

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
"""
