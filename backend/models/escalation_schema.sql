-- ═══════════════════════════════════════════════════════════════
-- ⭐ ADD-ON: Complaint Escalation & Accountability Engine
-- Schema: 4 NEW tables only — NO existing tables are altered
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. COMPLAINT SLA
-- Stores SLA deadline per complaint
-- Linked to complaints(id) — fully additive
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_sla (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id     UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sla_hours        INTEGER NOT NULL DEFAULT 336,  -- 14 days default (medium priority)
    sla_deadline     TIMESTAMP NOT NULL,
    breached_at      TIMESTAMP,
    is_breached      BOOLEAN DEFAULT false,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW(),
    UNIQUE(complaint_id)
);

CREATE INDEX IF NOT EXISTS idx_complaint_sla_complaint ON complaint_sla(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_sla_deadline  ON complaint_sla(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_complaint_sla_breached  ON complaint_sla(is_breached);

-- ─────────────────────────────────────────────
-- 2. COMPLAINT ESCALATIONS
-- Records each escalation event (automatic or admin-triggered)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_escalations (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id     UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    escalation_level INTEGER NOT NULL DEFAULT 1,
    officer_name     VARCHAR(200),
    officer_title    VARCHAR(100),
    escalation_reason TEXT,
    triggered_by     VARCHAR(20) DEFAULT 'automatic'
                     CHECK (triggered_by IN ('automatic', 'manual_admin', 'citizen_request')),
    escalated_at     TIMESTAMP DEFAULT NOW(),
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalations_complaint ON complaint_escalations(complaint_id);
CREATE INDEX IF NOT EXISTS idx_escalations_level     ON complaint_escalations(escalation_level);
CREATE INDEX IF NOT EXISTS idx_escalations_at        ON complaint_escalations(escalated_at);

-- ─────────────────────────────────────────────
-- 3. ESCALATION REQUESTS
-- Citizen-submitted escalation requests pending admin review
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalation_requests (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id     UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id       UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    reason           TEXT NOT NULL,
    status           VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note       TEXT,
    reviewed_by      UUID REFERENCES citizens(id),
    reviewed_at      TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esc_requests_complaint ON escalation_requests(complaint_id);
CREATE INDEX IF NOT EXISTS idx_esc_requests_citizen   ON escalation_requests(citizen_id);
CREATE INDEX IF NOT EXISTS idx_esc_requests_status    ON escalation_requests(status);

-- ─────────────────────────────────────────────
-- 4. OFFICER ACCOUNTABILITY
-- Aggregated performance metrics per officer
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS officer_accountability (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    officer_id            UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    complaints_assigned   INTEGER DEFAULT 0,
    complaints_resolved   INTEGER DEFAULT 0,
    avg_resolution_hours  NUMERIC(10,2) DEFAULT 0,
    sla_breaches          INTEGER DEFAULT 0,
    escalations_received  INTEGER DEFAULT 0,
    escalations_caused    INTEGER DEFAULT 0,
    accountability_score  NUMERIC(5,2) DEFAULT 100,
    last_computed_at      TIMESTAMP DEFAULT NOW(),
    created_at            TIMESTAMP DEFAULT NOW(),
    updated_at            TIMESTAMP DEFAULT NOW(),
    UNIQUE(officer_id)
);

CREATE INDEX IF NOT EXISTS idx_officer_accountability_id    ON officer_accountability(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_accountability_score ON officer_accountability(accountability_score);

-- ─────────────────────────────────────────────
-- 5. SLA RULES CONFIG (configurable escalation thresholds)
-- Stored as a single JSONB config row, editable via admin
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalation_config (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key       VARCHAR(100) NOT NULL UNIQUE,
    config_value     JSONB NOT NULL DEFAULT '{}',
    description      TEXT,
    updated_by       UUID REFERENCES citizens(id),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

-- Seed default SLA hours by priority
INSERT INTO escalation_config (config_key, config_value, description) VALUES
    ('sla_hours_by_priority', '{
        "critical": 72,
        "high": 168,
        "medium": 336,
        "low": 504
    }', 'SLA duration in hours for each complaint priority level'),
    ('escalation_levels', '[
        {"level": 1, "title": "Field Officer",          "trigger_day": 0},
        {"level": 2, "title": "Ward Commissioner",      "trigger_day": 7},
        {"level": 3, "title": "Municipal Commissioner", "trigger_day": 10},
        {"level": 4, "title": "District Collector",     "trigger_day": 14}
    ]', 'Configurable escalation hierarchy and trigger days')
ON CONFLICT (config_key) DO NOTHING;
