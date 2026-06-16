-- ═══════════════════════════════════════════════════════════════
-- Anonymous Civic Whistleblower Channel — Government-Grade Schema
-- ═══════════════════════════════════════════════════════════════

-- 1. Revert check constraint on citizens table to exclude integrity_officer
DELETE FROM citizens WHERE role = 'integrity_officer';
ALTER TABLE citizens DROP CONSTRAINT IF EXISTS citizens_role_check;
ALTER TABLE citizens ADD CONSTRAINT citizens_role_check CHECK (role IN ('citizen', 'admin', 'staff'));

-- 2. Create isolated officer_accounts table
CREATE TABLE IF NOT EXISTS officer_accounts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    department    VARCHAR(100) NOT NULL,
    role          VARCHAR(50) NOT NULL CHECK (role = 'integrity_officer'),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Upgrade anonymous_integrity_reports columns
ALTER TABLE anonymous_integrity_reports 
ADD COLUMN IF NOT EXISTS hashed_client_fingerprint VARCHAR(64),
ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT FALSE;

-- 4. Create two-way messaging table
CREATE TABLE IF NOT EXISTS integrity_case_messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id     UUID REFERENCES anonymous_integrity_reports(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) CHECK (sender_type IN ('citizen', 'officer')) NOT NULL,
    message     TEXT NOT NULL, -- AES-256-GCM encrypted message string
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create secure performance and rate-limit indexes
CREATE INDEX IF NOT EXISTS idx_case_messages_case_id 
    ON integrity_case_messages(case_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_reports_fingerprint 
    ON anonymous_integrity_reports(hashed_client_fingerprint) 
    WHERE hashed_client_fingerprint IS NOT NULL;
