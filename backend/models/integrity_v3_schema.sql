-- ═══════════════════════════════════════════════════════════════
-- Anonymous Civic Whistleblower Channel — V3 Enterprise-Grade Schema
-- ═══════════════════════════════════════════════════════════════

-- 1. Alter anonymous_integrity_reports to support risk scoring, witness protection, and escalation levels
ALTER TABLE anonymous_integrity_reports 
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'Low',
ADD COLUMN IF NOT EXISTS retaliation_risk BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(100) DEFAULT 'Level 1: Integrity Officer';

-- 2. Alter officer_accounts to support MFA and device fingerprinting
ALTER TABLE officer_accounts
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS device_fingerprints JSONB DEFAULT '[]'::jsonb;

-- 3. Create integrity_case_assignments table
CREATE TABLE IF NOT EXISTS integrity_case_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES anonymous_integrity_reports(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES officer_accounts(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES officer_accounts(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    role VARCHAR(50) NOT NULL CHECK (role IN ('Lead Investigator', 'Reviewer', 'Legal Officer', 'Auditor'))
);

-- 4. Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES anonymous_integrity_reports(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    requested_by UUID NOT NULL REFERENCES officer_accounts(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES officer_accounts(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP
);

-- 5. Create evidence_chain table
CREATE TABLE IF NOT EXISTS evidence_chain (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL,
    report_id UUID REFERENCES anonymous_integrity_reports(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES officer_accounts(id) ON DELETE SET NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    checksum_before TEXT,
    checksum_after TEXT
);

-- 6. Create security_incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_type VARCHAR(100),
    severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

-- 7. Create case_escalations table
CREATE TABLE IF NOT EXISTS case_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES anonymous_integrity_reports(id) ON DELETE CASCADE,
    escalated_from VARCHAR(100),
    escalated_to VARCHAR(100),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create V3 indexes for optimized query performance on the dashboard
CREATE INDEX IF NOT EXISTS idx_assignments_report ON integrity_case_assignments(report_id);
CREATE INDEX IF NOT EXISTS idx_assignments_officer ON integrity_case_assignments(officer_id);
CREATE INDEX IF NOT EXISTS idx_approvals_report ON approval_requests(report_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_report ON evidence_chain(report_id);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_evidence ON evidence_chain(evidence_id);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved ON security_incidents(resolved);
CREATE INDEX IF NOT EXISTS idx_escalations_report ON case_escalations(report_id);
