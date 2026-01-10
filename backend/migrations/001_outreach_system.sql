-- ============================================================================
-- OUTREACH SYSTEM MIGRATION
-- Coeus CRM - Instantly.ai Integration
-- ============================================================================

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS coeus.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version INT DEFAULT 1,
    
    -- Hypothesis Metadata
    hypothesis JSONB NOT NULL,
    
    -- Instantly Integration
    instantly_campaign_id VARCHAR(255) UNIQUE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    
    -- Settings
    template_config JSONB,
    sending_config JSONB,
    
    -- Metadata
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    launched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON coeus.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_hypothesis ON coeus.campaigns USING GIN(hypothesis);

-- 2. BATCHES TABLE
CREATE TABLE IF NOT EXISTS coeus.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES coeus.campaigns(id) ON DELETE CASCADE,
    
    -- Frozen Snapshot
    filters_snapshot JSONB NOT NULL,
    total_leads INT NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'created',
    frozen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_campaign ON coeus.batches(campaign_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON coeus.batches(status);

-- 3. BATCH_LEADS TABLE
CREATE TABLE IF NOT EXISTS coeus.batch_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES coeus.batches(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES coeus.leads(id) ON DELETE CASCADE,
    contact_email VARCHAR(255),
    
    -- Personalization Status
    personalization_status VARCHAR(50) DEFAULT 'pending',
    personalization_id UUID,
    
    -- Instantly Integration
    instantly_prospect_id VARCHAR(255),
    
    -- Enrollment Status
    enrollment_status VARCHAR(50) DEFAULT 'not_enrolled',
    
    -- Metadata
    enrolled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(batch_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_leads_batch ON coeus.batch_leads(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_leads_lead ON coeus.batch_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_batch_leads_status ON coeus.batch_leads(personalization_status, enrollment_status);

-- 4. PERSONALIZATIONS TABLE
CREATE TABLE IF NOT EXISTS coeus.personalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES coeus.leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES coeus.campaigns(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES coeus.batches(id) ON DELETE CASCADE,
    
    -- Bloques de Personalización
    first_line TEXT,
    why_you TEXT,
    micro_offer TEXT,
    cta_question TEXT,
    
    -- Metadata de Generación
    prompt_version VARCHAR(50) DEFAULT 'v1.0',
    model VARCHAR(100),
    quality_flag VARCHAR(50) DEFAULT 'pending',
    quality_score DECIMAL(3,2),
    
    -- Contexto usado
    context_snapshot JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lead_id, campaign_id, batch_id)
);

CREATE INDEX IF NOT EXISTS idx_personalizations_lead ON coeus.personalizations(lead_id);
CREATE INDEX IF NOT EXISTS idx_personalizations_campaign ON coeus.personalizations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_personalizations_quality ON coeus.personalizations(quality_flag);

-- 5. OUTREACH_EVENTS TABLE
CREATE TABLE IF NOT EXISTS coeus.outreach_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES coeus.leads(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES coeus.campaigns(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES coeus.batches(id) ON DELETE SET NULL,
    batch_lead_id UUID REFERENCES coeus.batch_leads(id) ON DELETE SET NULL,
    
    -- Event Data
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) DEFAULT 'instantly',
    provider_payload JSONB,
    
    -- External References
    external_id VARCHAR(255) UNIQUE,
    
    -- Timestamps
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_events_lead ON coeus.outreach_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_campaign ON coeus.outreach_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_events_type ON coeus.outreach_events(event_type);
CREATE INDEX IF NOT EXISTS idx_outreach_events_occurred ON coeus.outreach_events(occurred_at DESC);

-- 6. LEAD_ROUTING TABLE
CREATE TABLE IF NOT EXISTS coeus.lead_routing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES coeus.leads(id) ON DELETE CASCADE UNIQUE,
    
    -- Current State
    current_stage VARCHAR(50) NOT NULL,
    next_action VARCHAR(50),
    
    -- Ownership
    owner_id UUID,
    
    -- Metadata
    notes TEXT,
    last_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_routing_stage ON coeus.lead_routing(current_stage);
CREATE INDEX IF NOT EXISTS idx_lead_routing_next_action ON coeus.lead_routing(next_action);
CREATE INDEX IF NOT EXISTS idx_lead_routing_owner ON coeus.lead_routing(owner_id);

-- 7. ADD FIELDS TO LEADS TABLE
ALTER TABLE coeus.leads 
ADD COLUMN IF NOT EXISTS niche_tag VARCHAR(100),
ADD COLUMN IF NOT EXISTS digital_maturity VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_niche_tag ON coeus.leads(niche_tag);
CREATE INDEX IF NOT EXISTS idx_leads_digital_maturity ON coeus.leads(digital_maturity);
CREATE INDEX IF NOT EXISTS idx_leads_dnc ON coeus.leads(do_not_contact) WHERE do_not_contact = TRUE;

-- 8. GRANT PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA coeus TO authenticator, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA coeus TO authenticator, anon, authenticated;

-- Migration completed
SELECT 'Outreach system migration completed successfully' AS status;
