-- Mission 12: PFAS news tracker + email notification tables
-- Run this in the Supabase SQL editor once:
--   https://supabase.com/dashboard/project/_/sql
-- Safe to re-run.

-- NEWS ITEMS (curated PFAS news tracker)
CREATE TABLE IF NOT EXISTS news_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    url             TEXT NOT NULL,
    source_name     TEXT NOT NULL,
    summary         TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN (
                        'epa-action',
                        'state-regulation',
                        'legal',
                        'research',
                        'local-coverage',
                        'industry'
                    )),
    published_date  DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    featured        BOOLEAN NOT NULL DEFAULT FALSE,
    city_slug       TEXT,
    state           VARCHAR(2),
    status          TEXT NOT NULL DEFAULT 'published'
);

CREATE INDEX IF NOT EXISTS idx_news_items_published_date ON news_items (published_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_category ON news_items (category);
CREATE INDEX IF NOT EXISTS idx_news_items_city_slug ON news_items (city_slug) WHERE city_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_news_items_state ON news_items (state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_news_items_featured ON news_items (featured) WHERE featured = TRUE;

-- EMAIL SUBSCRIBERS (notification list)
CREATE TABLE IF NOT EXISTS email_subscribers (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email              TEXT UNIQUE NOT NULL,
    zip_code           VARCHAR(5),
    subscribed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed          BOOLEAN NOT NULL DEFAULT FALSE,
    confirm_token      TEXT NOT NULL,
    unsubscribe_token  TEXT NOT NULL,
    unsubscribed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_subscribers_confirm_token ON email_subscribers (confirm_token);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_unsubscribe_token ON email_subscribers (unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_confirmed ON email_subscribers (confirmed) WHERE confirmed = TRUE;

-- RLS
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- news_items: public read for 'published' rows only; writes only via service role
DO $$ BEGIN
    CREATE POLICY "Public read published news" ON news_items
        FOR SELECT USING (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- email_subscribers: no anon policies, service role bypasses RLS
-- (intentionally no SELECT/INSERT/UPDATE policies for anon)
