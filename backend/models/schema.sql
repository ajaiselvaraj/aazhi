-- ═══════════════════════════════════════════════════════════════
-- SUVIDHA KIOSK — Complete PostgreSQL Database Schema
-- Unified Civic Utility Self-Service KIOSK Platform
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. CITIZENS (User accounts)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citizens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    mobile          VARCHAR(15) NOT NULL UNIQUE,
    email           VARCHAR(100),
    aadhaar_hash    VARCHAR(255) NOT NULL,
    aadhaar_masked  VARCHAR(16),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'citizen'
                    CHECK (role IN ('citizen', 'admin', 'staff')),
    address         TEXT,
    ward            VARCHAR(10),
    zone            VARCHAR(50),
    is_active       BOOLEAN DEFAULT true,
    refresh_token   TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citizens_mobile ON citizens(mobile);
CREATE INDEX IF NOT EXISTS idx_citizens_role ON citizens(role);

-- ─────────────────────────────────────────────
-- 2. UTILITY ACCOUNTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utility_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id      UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    service_type    VARCHAR(30) NOT NULL
                    CHECK (service_type IN ('electricity', 'gas', 'water', 'property', 'waste')),
    account_number  VARCHAR(50) NOT NULL UNIQUE,
    meter_number    VARCHAR(50),
    connection_date DATE,
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'suspended', 'disconnected')),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utility_citizen ON utility_accounts(citizen_id);
CREATE INDEX IF NOT EXISTS idx_utility_service ON utility_accounts(service_type);
CREATE INDEX IF NOT EXISTS idx_utility_account_num ON utility_accounts(account_number);

-- ─────────────────────────────────────────────
-- 3. BILLS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id      UUID NOT NULL REFERENCES utility_accounts(id) ON DELETE CASCADE,
    citizen_id      UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    service_type    VARCHAR(30) NOT NULL,
    bill_number     VARCHAR(50) UNIQUE,
    amount          NUMERIC(12, 2) NOT NULL,
    tax_amount      NUMERIC(12, 2) DEFAULT 0,
    total_amount    NUMERIC(12, 2) NOT NULL,
    units_consumed  NUMERIC(10, 2),
    reading_current NUMERIC(10, 2),
    reading_previous NUMERIC(10, 2),
    billing_month   VARCHAR(10),
    billing_year    VARCHAR(4),
    billing_cycle   VARCHAR(20),
    due_date        DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid', 'waived')),
    paid_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_citizen ON bills(citizen_id);
CREATE INDEX IF NOT EXISTS idx_bills_account ON bills(account_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);

-- ─────────────────────────────────────────────
-- 4. TRANSACTIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id             UUID REFERENCES bills(id),
    citizen_id          UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    amount              NUMERIC(12, 2) NOT NULL,
    currency            VARCHAR(5) DEFAULT 'INR',
    payment_method      VARCHAR(30) DEFAULT 'razorpay',
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature  VARCHAR(255),
    payment_status      VARCHAR(20) DEFAULT 'created'
                        CHECK (payment_status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
    receipt_number      VARCHAR(50),
    receipt_url         TEXT,
    gateway_response    JSONB DEFAULT '{}',
    paid_at             TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_citizen ON transactions(citizen_id);
CREATE INDEX IF NOT EXISTS idx_txn_bill ON transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_txn_razorpay_order ON transactions(razorpay_order_id);

-- ─────────────────────────────────────────────
-- 5. COMPLAINTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number   VARCHAR(30) NOT NULL UNIQUE,
    citizen_id      UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    citizen_name    VARCHAR(100),
    category        VARCHAR(50) NOT NULL,
    issue_category  VARCHAR(50),
    department      VARCHAR(50) NOT NULL,
    subject         VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    ward            VARCHAR(10),
    priority        VARCHAR(20) DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status          VARCHAR(30) DEFAULT 'submitted'
                    CHECK (status IN (
                        'submitted', 'acknowledged', 'assigned', 'in_progress',
                        'resolved', 'closed', 'reopened', 'rejected'
                    )),
    assigned_to     UUID REFERENCES citizens(id),
    resolution_note TEXT,
    resolved_at     TIMESTAMP,
    closed_at       TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_ticket ON complaints(ticket_number);
CREATE INDEX IF NOT EXISTS idx_complaints_dept ON complaints(department);

-- ─────────────────────────────────────────────
-- 6. COMPLAINT STAGES (lifecycle tracking)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_stages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    stage           VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'current', 'pending')),
    notes           TEXT,
    updated_by      UUID REFERENCES citizens(id),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaint_stages_complaint ON complaint_stages(complaint_id);

-- ─────────────────────────────────────────────
-- 7. SERVICE REQUESTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number   VARCHAR(30) NOT NULL UNIQUE,
    citizen_id      UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    citizen_name    VARCHAR(100),
    request_type    VARCHAR(100) NOT NULL,
    department      VARCHAR(50) NOT NULL,
    description     TEXT NOT NULL,
    ward            VARCHAR(10),
    phone           VARCHAR(15),
    status          VARCHAR(30) DEFAULT 'submitted'
                    CHECK (status IN (
                        'submitted', 'under_review', 'verification',
                        'approval_pending', 'completed', 'rejected'
                    )),
    current_stage   VARCHAR(50) DEFAULT 'submitted',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_req_citizen ON service_requests(citizen_id);
CREATE INDEX IF NOT EXISTS idx_service_req_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_req_ticket ON service_requests(ticket_number);
CREATE INDEX IF NOT EXISTS idx_service_req_dept ON service_requests(department);

-- ─────────────────────────────────────────────
-- 8. SERVICE REQUEST STAGES (lifecycle tracking)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_request_stages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_request_id  UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    stage               VARCHAR(50) NOT NULL,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'current', 'pending')),
    notes               TEXT,
    updated_by          UUID REFERENCES citizens(id),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_stages_request ON service_request_stages(service_request_id);

-- ─────────────────────────────────────────────
-- 9. INTERACTION LOGS (Kiosk audit trail)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interaction_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    citizen_id      UUID REFERENCES citizens(id),
    kiosk_id        VARCHAR(50),
    action          VARCHAR(100) NOT NULL,
    module          VARCHAR(50),
    endpoint        VARCHAR(200),
    method          VARCHAR(10),
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    request_body    JSONB DEFAULT '{}',
    response_status INTEGER,
    response_time   INTEGER,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interaction_citizen ON interaction_logs(citizen_id);
CREATE INDEX IF NOT EXISTS idx_interaction_action ON interaction_logs(action);
CREATE INDEX IF NOT EXISTS idx_interaction_created ON interaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_kiosk ON interaction_logs(kiosk_id);

-- ─────────────────────────────────────────────
-- 10. SERVICE CONFIG (dynamic service toggle)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name    VARCHAR(50) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    is_enabled      BOOLEAN DEFAULT true,
    description     TEXT,
    config          JSONB DEFAULT '{}',
    updated_by      UUID REFERENCES citizens(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 11. MESSAGES (complaint/request conversations)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id    UUID REFERENCES complaints(id) ON DELETE CASCADE,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES citizens(id),
    sender_type     VARCHAR(20) NOT NULL CHECK (sender_type IN ('citizen', 'authority')),
    text            TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_complaint ON messages(complaint_id);
CREATE INDEX IF NOT EXISTS idx_messages_sr ON messages(service_request_id);

-- ─────────────────────────────────────────────
-- 12. AUDIT LOGS (Cryptographic Tamper-Evident Chain)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id            VARCHAR(255) NOT NULL,
    ip_fingerprint      VARCHAR(255),
    resource_id         VARCHAR(255) NOT NULL,
    action              VARCHAR(100) NOT NULL,
    previous_state_hash VARCHAR(64) NOT NULL,
    current_state_hash  VARCHAR(64) NOT NULL,
    previous_log_id     UUID REFERENCES audit_logs(id),
    hmac_signature      VARCHAR(64) NOT NULL,
    timestamp           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ─────────────────────────────────────────────
-- SEED DATA — Default service configurations
-- ─────────────────────────────────────────────
INSERT INTO service_config (service_name, display_name, is_enabled, description) VALUES
    ('electricity', 'Electricity Service', true, 'Electricity bill payment and service management'),
    ('gas', 'Gas Service', true, 'LPG cylinder booking and gas bill management'),
    ('water', 'Water Supply', true, 'Water bill payment and water supply services'),
    ('waste', 'Waste Management', true, 'Solid waste management services'),
    ('property', 'Property Tax', true, 'Property tax payment and assessment'),
    ('complaints', 'Complaint Portal', true, 'Civic complaint registration and tracking')
ON CONFLICT (service_name) DO NOTHING;