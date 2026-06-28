-- SQL Migration: Phase 2 Database Optimization (CQRS & Materialized Views)
-- This view pre-aggregates complaint statistics for the Admin Dashboard to prevent OOM errors and DB locks under heavy load.

CREATE MATERIALIZED VIEW IF NOT EXISTS admin_dashboard_stats AS
SELECT 
    DATE(created_at) as date,
    status,
    COUNT(id) as total_complaints
FROM 
    complaints
GROUP BY 
    DATE(created_at), status;

-- Create an index to speed up querying the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_dashboard_stats_date_status 
ON admin_dashboard_stats(date, status);
