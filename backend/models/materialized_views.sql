-- ═══════════════════════════════════════════════════════════════
-- SUVIDHA KIOSK — Materialized Views for Analytics
-- This runs after schema.sql to optimize heavy dashboard queries
-- ═══════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT 
    1 AS id, -- Primary key for concurrent refresh
    (SELECT COUNT(*) FROM citizens WHERE role = 'citizen') AS citizens_total,
    (SELECT COUNT(*) FROM citizens WHERE role = 'citizen' AND is_active = true) AS citizens_active,
    
    (SELECT COUNT(*) FROM bills) AS bills_total,
    (SELECT COUNT(*) FROM bills WHERE status = 'pending') AS bills_pending,
    (SELECT COUNT(*) FROM bills WHERE status = 'paid') AS bills_paid,
    (SELECT COUNT(*) FROM bills WHERE status = 'overdue') AS bills_overdue,
    (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE status = 'paid') AS bills_revenue,
    
    (SELECT COUNT(*) FROM complaints) AS complaints_total,
    (SELECT COUNT(*) FROM complaints WHERE status = 'active') AS complaints_active,
    (SELECT COUNT(*) FROM complaints WHERE status = 'resolved') AS complaints_resolved,
    (SELECT COUNT(*) FROM complaints WHERE status = 'rejected') AS complaints_rejected,
    
    (SELECT COUNT(*) FROM service_requests) AS service_requests_total,
    (SELECT COUNT(*) FROM service_requests WHERE status = 'active') AS service_requests_active,
    (SELECT COUNT(*) FROM service_requests WHERE status = 'resolved') AS service_requests_resolved,
    (SELECT COUNT(*) FROM service_requests WHERE status = 'rejected') AS service_requests_rejected,
    
    (SELECT COUNT(*) FROM transactions) AS transactions_total,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE payment_status = 'captured') AS transactions_revenue;

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats_id ON mv_dashboard_stats (id);
