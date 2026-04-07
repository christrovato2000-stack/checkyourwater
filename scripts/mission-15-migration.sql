-- Mission 15: community action toolkit follow-up tables
-- Run this in the Supabase SQL editor before deploying Mission 15:
--   https://supabase.com/dashboard/project/_/sql
-- Safe to re-run.

-- ============================================================================
-- CITY UPDATES (the "What Happened Next" tracker)
-- ============================================================================
CREATE TABLE IF NOT EXISTS city_updates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_slug    TEXT NOT NULL,
    update_date  DATE NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    source_url   TEXT,
    source_name  TEXT,
    category     TEXT NOT NULL CHECK (category IN (
                     'government-action',
                     'utility-response',
                     'legal',
                     'community-action',
                     'media-coverage'
                 )),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_updates_city_slug
    ON city_updates (city_slug);
CREATE INDEX IF NOT EXISTS idx_city_updates_city_date
    ON city_updates (city_slug, update_date DESC);

ALTER TABLE city_updates ENABLE ROW LEVEL SECURITY;

-- Public read access. Inserts/updates/deletes only via service_role.
DO $$ BEGIN
    CREATE POLICY "Public read city updates" ON city_updates
        FOR SELECT USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- INVESTIGATION REQUESTS (demand signal pipeline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS investigation_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL,
    zip_code      VARCHAR(5) NOT NULL,
    city_name     TEXT NOT NULL,
    state         VARCHAR(2) NOT NULL,
    reason        TEXT NOT NULL CHECK (char_length(reason) <= 500),
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                      'pending',
                      'reviewing',
                      'researching',
                      'published',
                      'declined'
                  ))
);

CREATE INDEX IF NOT EXISTS idx_investigation_requests_status
    ON investigation_requests (status);
CREATE INDEX IF NOT EXISTS idx_investigation_requests_email
    ON investigation_requests (email);

ALTER TABLE investigation_requests ENABLE ROW LEVEL SECURITY;
-- Intentionally no anon policies. service_role bypasses RLS for inserts/reads.
