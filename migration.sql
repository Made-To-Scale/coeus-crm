-- Schema: coeus
-- Migrations for Robust Backend & MVP Outreach

-- 1. Ingestion & Traceability
CREATE TABLE IF NOT EXISTS coeus.scrape_runs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    query text NOT NULL,
    niche_tag text,
    geo text,
    batch_id text,
    config jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coeus.scrape_run_leads (
    run_id uuid REFERENCES coeus.scrape_runs(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES coeus.leads(id) ON DELETE CASCADE,
    PRIMARY KEY (run_id, lead_id)
);

-- 2. Verification Tracking
CREATE TABLE IF NOT EXISTS coeus.email_verifications (
    email text PRIMARY KEY,
    status text NOT NULL,
    provider text DEFAULT 'hunter',
    raw_response jsonb,
    verified_at timestamptz DEFAULT now()
);

-- 3. Outreach & Unified Events
CREATE TABLE IF NOT EXISTS coeus.outreach_enrollments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES coeus.leads(id) ON DELETE CASCADE,
    provider_id text,
    status text DEFAULT 'enrolled',
    current_step int DEFAULT 0,
    meta jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coeus.comm_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid REFERENCES coeus.leads(id) ON DELETE CASCADE,
    enrollment_id uuid REFERENCES coeus.outreach_enrollments(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    provider text NOT NULL,
    external_id text UNIQUE,
    meta jsonb DEFAULT '{}',
    occurred_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_scrape_run_leads_lead_id ON coeus.scrape_run_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_comm_events_lead_id ON coeus.comm_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_enrollments_lead_id ON coeus.outreach_enrollments(lead_id);
