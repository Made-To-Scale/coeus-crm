-- Instantly.ai Integration Schema
-- Run this in Supabase SQL Editor

-- 1. Campaigns Table
CREATE TABLE IF NOT EXISTS instantly_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instantly_campaign_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB,
    stats JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Enrollments Table
CREATE TABLE IF NOT EXISTS instantly_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES instantly_campaigns(id) ON DELETE CASCADE,
    instantly_lead_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    current_step INT DEFAULT 1,
    email_account VARCHAR(255),
    enrolled_at TIMESTAMP DEFAULT NOW(),
    last_event_at TIMESTAMP,
    last_event_type VARCHAR(50),
    meta JSONB,
    UNIQUE(lead_id, campaign_id)
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON instantly_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_campaign ON instantly_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON instantly_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON instantly_campaigns(status);

-- 4. Verify comm_events table exists (should already exist from previous work)
-- If not, create it:
CREATE TABLE IF NOT EXISTS comm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) DEFAULT 'instantly',
    external_id VARCHAR(255),
    occurred_at TIMESTAMP DEFAULT NOW(),
    meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_comm_events_lead ON comm_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_comm_events_type ON comm_events(event_type);
