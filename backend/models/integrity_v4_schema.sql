-- ═══════════════════════════════════════════════════════════════
-- Anonymous Civic Whistleblower Channel — V4 Enterprise Schema
-- ═══════════════════════════════════════════════════════════════

-- 1. Alter anonymous_integrity_reports to support AI Triage, Department Heatmap, and Protection Index
ALTER TABLE anonymous_integrity_reports 
ADD COLUMN IF NOT EXISTS triage_results JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS district VARCHAR(100),
ADD COLUMN IF NOT EXISTS protection_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS protection_level VARCHAR(50) DEFAULT 'Standard';

-- 2. Create repeat offender registry
CREATE TABLE IF NOT EXISTS repeat_offender_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'Officer', 'Employee ID', 'Contractor', 'Department'
    entity_value VARCHAR(255) NOT NULL,
    mention_count INTEGER DEFAULT 1,
    case_references JSONB DEFAULT '[]'::jsonb, -- array of { case_id, case_code, timestamp }
    risk_trend VARCHAR(50) DEFAULT 'Stable', -- 'Stable', 'Increasing', 'High Risk'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_entity_type_value UNIQUE (entity_type, entity_value)
);

-- 3. Create index for repeat offender query optimization
CREATE INDEX IF NOT EXISTS idx_repeat_offender_entity ON repeat_offender_registry(entity_type, entity_value);

-- 4. Alter officer_accounts check constraint to support executive_oversight role
ALTER TABLE officer_accounts DROP CONSTRAINT IF EXISTS officer_accounts_role_check;
ALTER TABLE officer_accounts ADD CONSTRAINT officer_accounts_role_check CHECK (role IN ('integrity_officer', 'executive_oversight'));
