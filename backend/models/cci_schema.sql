-- ═══════════════════════════════════════════════════════════════
-- Cross-Complaint Cascade Intelligence (CCI) Schema
-- ═══════════════════════════════════════════════════════════════

-- 1. Infrastructure Incident Clusters
CREATE TABLE IF NOT EXISTS infrastructure_clusters (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_code        VARCHAR(30) UNIQUE NOT NULL,
    root_cause_category VARCHAR(100),
    ward_id             VARCHAR(50),
    locality            VARCHAR(255),
    status              VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'resolved', 'closed')),
    severity            VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cluster Complaints Mapping
CREATE TABLE IF NOT EXISTS cluster_complaints (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id          UUID NOT NULL REFERENCES infrastructure_clusters(id) ON DELETE CASCADE,
    complaint_id        UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    department          VARCHAR(100),
    relationship_score  NUMERIC(5,2),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cluster Departments SLAs
CREATE TABLE IF NOT EXISTS cluster_departments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id          UUID NOT NULL REFERENCES infrastructure_clusters(id) ON DELETE CASCADE,
    department_name     VARCHAR(100) NOT NULL,
    assigned_at         TIMESTAMPTZ DEFAULT NOW(),
    sla_deadline        TIMESTAMPTZ NOT NULL,
    completion_status   VARCHAR(50) DEFAULT 'pending' CHECK (completion_status IN ('pending', 'completed')),
    CONSTRAINT uniq_cluster_dept UNIQUE(cluster_id, department_name)
);

-- 4. Planned Maintenance/Excavation Activities
CREATE TABLE IF NOT EXISTS planned_activities (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_type       VARCHAR(100) NOT NULL, -- e.g., 'Excavation', 'Utility Work', 'Road Resurfacing'
    ward_id             VARCHAR(50),
    locality            VARCHAR(255),
    start_time          TIMESTAMPTZ NOT NULL,
    end_time            TIMESTAMPTZ NOT NULL,
    description         TEXT,
    predicted_cascades  JSONB DEFAULT '[]', -- JSON array of predicted affected departments/issues
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Proactive Alerts for Departments
CREATE TABLE IF NOT EXISTS proactive_alerts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id         UUID NOT NULL REFERENCES planned_activities(id) ON DELETE CASCADE,
    department          VARCHAR(100) NOT NULL,
    alert_message       TEXT NOT NULL,
    sent_at             TIMESTAMPTZ DEFAULT NOW(),
    status              VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'acknowledged'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cluster_complaints_cluster ON cluster_complaints(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_complaints_complaint ON cluster_complaints(complaint_id);
CREATE INDEX IF NOT EXISTS idx_cluster_depts_cluster ON cluster_departments(cluster_id);
CREATE INDEX IF NOT EXISTS idx_proactive_alerts_activity ON proactive_alerts(activity_id);
CREATE INDEX IF NOT EXISTS idx_infra_clusters_ward ON infrastructure_clusters(ward_id);
