-- ═══════════════════════════════════════════════════════════════
-- SUVIDHA KIOSK — Process Hierarchy Migration
-- Creates workflow_definitions as Single Source of Truth
-- SAFE: idempotent, no destructive changes to existing tables
-- Run once on Supabase SQL editor or via node migrate.js
-- ═══════════════════════════════════════════════════════════════

-- 1. Create workflow_definitions table
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_type   VARCHAR(30) NOT NULL,
    -- 'complaint' or 'service_request'
    department      VARCHAR(50) DEFAULT NULL,
    -- NULL = applies to all departments; specific dept overrides global
    stages          JSONB NOT NULL,
    -- ordered array: [{ "key": "pending", "label": "Submitted", "color": "slate" }, ...]
    version         INTEGER NOT NULL DEFAULT 1,
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES citizens(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES citizens(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Unique index: one workflow per (type, department) combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_type_dept
    ON workflow_definitions(workflow_type, COALESCE(department, ''));

CREATE INDEX IF NOT EXISTS idx_workflow_type ON workflow_definitions(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_active ON workflow_definitions(is_active);

-- 2. Seed default complaint workflow (matches existing complaint_stages keys)
INSERT INTO workflow_definitions (workflow_type, department, stages, version) VALUES
(
    'complaint',
    NULL,
    '[
        {"key": "pending",     "label": "Submitted",   "color": "slate"},
        {"key": "assigned",    "label": "Assigned",    "color": "blue"},
        {"key": "in_progress", "label": "In Progress", "color": "indigo"},
        {"key": "resolved",    "label": "Resolved",    "color": "green"},
        {"key": "closed",      "label": "Closed",      "color": "emerald"}
    ]',
    1
)
ON CONFLICT (workflow_type, COALESCE(department, '')) DO NOTHING;

-- 3. Seed default service_request workflow (matches existing service_request_stages keys)
INSERT INTO workflow_definitions (workflow_type, department, stages, version) VALUES
(
    'service_request',
    NULL,
    '[
        {"key": "created",   "label": "Submitted",   "color": "slate"},
        {"key": "assigned",  "label": "Assigned",    "color": "blue"},
        {"key": "working",   "label": "In Progress", "color": "indigo"},
        {"key": "completed", "label": "Completed",   "color": "green"}
    ]',
    1
)
ON CONFLICT (workflow_type, COALESCE(department, '')) DO NOTHING;
