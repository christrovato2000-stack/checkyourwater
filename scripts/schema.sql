-- checkyourwater.org full database schema
-- Run this in Supabase SQL editor (or via psql) once per project.

CREATE EXTENSION IF NOT EXISTS postgis;

-- WATER SYSTEMS
CREATE TABLE IF NOT EXISTS water_systems (
    pwsid               VARCHAR(9) PRIMARY KEY,
    pws_name            TEXT NOT NULL,
    city_served         TEXT,
    state_code          VARCHAR(2) NOT NULL,
    county              TEXT,
    population_served   INTEGER,
    source_type         TEXT,
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    geom                GEOMETRY(Point, 4326),
    grade               CHAR(1),
    worst_compound      TEXT,
    worst_ratio         NUMERIC(8,4),
    total_pfas_detected INTEGER DEFAULT 0,
    data_release        INTEGER,
    last_updated        TIMESTAMP DEFAULT NOW(),
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_systems_geom ON water_systems USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_water_systems_state ON water_systems (state_code);
CREATE INDEX IF NOT EXISTS idx_water_systems_grade ON water_systems (grade);

-- DETECTIONS
CREATE TABLE IF NOT EXISTS detections (
    id                  SERIAL PRIMARY KEY,
    pwsid               VARCHAR(9) NOT NULL REFERENCES water_systems(pwsid),
    compound_name       TEXT NOT NULL,
    compound_abbrev     TEXT NOT NULL,
    cas_number          VARCHAR(20),
    avg_concentration   NUMERIC(12,4),
    max_concentration   NUMERIC(12,4),
    min_concentration   NUMERIC(12,4),
    sample_count        INTEGER,
    detection_count     INTEGER,
    mrl                 NUMERIC(12,4),
    mcl                 NUMERIC(12,4),
    mcl_ratio           NUMERIC(8,4),
    has_mcl             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (pwsid, compound_abbrev)
);

CREATE INDEX IF NOT EXISTS idx_detections_pwsid ON detections (pwsid);
CREATE INDEX IF NOT EXISTS idx_detections_compound ON detections (compound_abbrev);
CREATE INDEX IF NOT EXISTS idx_detections_mcl_ratio ON detections (mcl_ratio DESC) WHERE mcl_ratio IS NOT NULL;

-- ZIP-TO-WATER-SYSTEM CROSSWALK
CREATE TABLE IF NOT EXISTS zip_to_water_system (
    zip_code            VARCHAR(5) NOT NULL,
    pwsid               VARCHAR(9) NOT NULL REFERENCES water_systems(pwsid),
    pws_name            TEXT,
    population_served   INTEGER,
    source_type         TEXT,
    mapping_tier        INTEGER NOT NULL,
    confidence          TEXT NOT NULL,
    is_primary          BOOLEAN DEFAULT FALSE,
    manually_verified   BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (zip_code, pwsid)
);

CREATE INDEX IF NOT EXISTS idx_zip_lookup ON zip_to_water_system (zip_code);
CREATE INDEX IF NOT EXISTS idx_zip_by_system ON zip_to_water_system (pwsid);

-- CHEMICALS
CREATE TABLE IF NOT EXISTS chemicals (
    compound_abbrev     TEXT PRIMARY KEY,
    compound_name       TEXT NOT NULL,
    cas_number          VARCHAR(20),
    chemical_formula    TEXT,
    mcl_ppt             NUMERIC(12,4),
    mcl_status          TEXT,
    mrl_ppt             NUMERIC(12,4),
    chain_length        TEXT,
    health_effects      TEXT,
    common_sources      TEXT,
    pubchem_cid         INTEGER,
    structure_image_url TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- CONTENT
CREATE TABLE IF NOT EXISTS content (
    id                  SERIAL PRIMARY KEY,
    content_type        TEXT NOT NULL,
    reference_key       TEXT NOT NULL,
    title               TEXT NOT NULL,
    body                TEXT NOT NULL,
    reading_level       TEXT DEFAULT '8th grade',
    model_used          TEXT DEFAULT 'claude-sonnet-4-6',
    generation_date     TIMESTAMP,
    review_status       TEXT DEFAULT 'pending',
    reviewer_notes      TEXT,
    approved_date       TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (content_type, reference_key)
);

-- CITIES
CREATE TABLE IF NOT EXISTS cities (
    slug                TEXT PRIMARY KEY,
    city_name           TEXT NOT NULL,
    state_code          VARCHAR(2) NOT NULL,
    state_name          TEXT NOT NULL,
    population          INTEGER,
    systems_count       INTEGER,
    primary_pwsid       VARCHAR(9) REFERENCES water_systems(pwsid),
    grade               CHAR(1),
    worst_compound      TEXT,
    worst_ratio         NUMERIC(8,4),
    total_detections    INTEGER,
    total_exceedances   INTEGER,
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),
    contamination_source TEXT,
    settlement_status   TEXT,
    news_hook           TEXT,
    launch_wave         INTEGER DEFAULT 1,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_state ON cities (state_code);
CREATE INDEX IF NOT EXISTS idx_cities_wave ON cities (launch_wave);

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
ALTER TABLE water_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_to_water_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read access" ON water_systems FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "Public read access" ON detections FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "Public read access" ON zip_to_water_system FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "Public read access" ON chemicals FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "Public read access" ON content FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE POLICY "Public read access" ON cities FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- news_items: public read for 'published' rows only
DO $$ BEGIN
    CREATE POLICY "Public read published news" ON news_items
        FOR SELECT USING (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- email_subscribers: no anon policies, service role bypasses RLS
