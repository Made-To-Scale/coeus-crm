-- Add missing columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Add missing columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'manual';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Optional: Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_business_type ON leads(business_type);
