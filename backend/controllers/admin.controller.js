// ═══════════════════════════════════════════════════════════════
// Admin Dashboard Controller
// Analytics, Monitoring, Service Management, Logs
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import logger from "../utils/logger.js";

// ─── Dashboard Overview Stats ────────────────────────────
export const getDashboardStats = async (req, res, next) => {
    try {
        const [citizens, bills, complaints, serviceRequests, transactions] = await Promise.all([
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM citizens WHERE role = 'citizen'"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'pending') as pending, COUNT(*) FILTER (WHERE status = 'paid') as paid, COUNT(*) FILTER (WHERE status = 'overdue') as overdue, COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as revenue FROM bills"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'submitted') as new, COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress, COUNT(*) FILTER (WHERE status = 'resolved') as resolved FROM complaints"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'submitted') as new, COUNT(*) FILTER (WHERE status = 'completed') as completed FROM service_requests"),
            pool.query("SELECT COUNT(*) as total, COALESCE(SUM(amount) FILTER (WHERE payment_status = 'captured'), 0) as total_collected FROM transactions"),
        ]);

        return success(res, "Dashboard statistics", {
            citizens: citizens.rows[0],
            bills: bills.rows[0],
            complaints: complaints.rows[0],
            service_requests: serviceRequests.rows[0],
            transactions: transactions.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

// ─── View Kiosk Interaction Logs ─────────────────────────
export const getInteractionLogs = async (req, res, next) => {
    try {
        const { kiosk_id, module, action, start_date, end_date, page = 1, limit = 25 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT il.*, c.name as citizen_name, c.mobile as citizen_mobile
            FROM interaction_logs il
            LEFT JOIN citizens c ON il.citizen_id = c.id
            WHERE 1=1`;
        const params = [];

        if (kiosk_id) {
            params.push(kiosk_id);
            query += ` AND il.kiosk_id = $${params.length}`;
        }
        if (module) {
            params.push(module);
            query += ` AND il.module = $${params.length}`;
        }
        if (action) {
            params.push(`%${action}%`);
            query += ` AND il.action ILIKE $${params.length}`;
        }
        if (start_date) {
            params.push(start_date);
            query += ` AND il.created_at >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND il.created_at <= $${params.length}`;
        }

        const countQuery = query.replace(/SELECT il\.\*.*FROM/, "SELECT COUNT(*) FROM");
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY il.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return paginated(res, "Interaction logs", result.rows, {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Service Request Analytics ───────────────────────────
export const getServiceRequestAnalytics = async (req, res, next) => {
    try {
        const { period = "30" } = req.query; // days

        const [byDepartment, byStatus, recentTrend, avgResolution] = await Promise.all([
            pool.query(
                `SELECT department, COUNT(*) as count 
                 FROM service_requests 
                 WHERE created_at >= NOW() - INTERVAL '1 day' * $1
                 GROUP BY department ORDER BY count DESC`,
                [parseInt(period)]
            ),
            pool.query(
                `SELECT status, COUNT(*) as count 
                 FROM service_requests 
                 WHERE created_at >= NOW() - INTERVAL '1 day' * $1
                 GROUP BY status ORDER BY count DESC`,
                [parseInt(period)]
            ),
            pool.query(
                `SELECT DATE(created_at) as date, COUNT(*) as count 
                 FROM service_requests 
                 WHERE created_at >= NOW() - INTERVAL '1 day' * $1
                 GROUP BY DATE(created_at) ORDER BY date DESC`,
                [parseInt(period)]
            ),
            pool.query(
                `SELECT department,
                        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
                 FROM service_requests 
                 WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 day' * $1
                 GROUP BY department`,
                [parseInt(period)]
            ),
        ]);

        return success(res, "Service request analytics", {
            by_department: byDepartment.rows,
            by_status: byStatus.rows,
            daily_trend: recentTrend.rows,
            avg_resolution_hours: avgResolution.rows,
            period_days: parseInt(period),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Payment Statistics ──────────────────────────────────
export const getPaymentStats = async (req, res, next) => {
    try {
        const { period = "30" } = req.query;

        const [summary, byService, dailyTrend, recentPayments] = await Promise.all([
            pool.query(
                `SELECT 
                    COUNT(*) as total_transactions,
                    COUNT(*) FILTER (WHERE payment_status = 'captured') as successful,
                    COUNT(*) FILTER (WHERE payment_status = 'failed') as failed,
                    COALESCE(SUM(amount) FILTER (WHERE payment_status = 'captured'), 0) as total_collected,
                    COALESCE(AVG(amount) FILTER (WHERE payment_status = 'captured'), 0) as avg_amount
                 FROM transactions 
                 WHERE created_at >= NOW() - INTERVAL '1 day' * $1`,
                [parseInt(period)]
            ),
            pool.query(
                `SELECT b.service_type, COUNT(t.*) as count, 
                        COALESCE(SUM(t.amount) FILTER (WHERE t.payment_status = 'captured'), 0) as amount
                 FROM transactions t
                 JOIN bills b ON t.bill_id = b.id
                 WHERE t.created_at >= NOW() - INTERVAL '1 day' * $1
                 GROUP BY b.service_type ORDER BY amount DESC`,
                [parseInt(period)]
            ),
            pool.query(
                `SELECT DATE(created_at) as date, 
                        COUNT(*) as count,
                        COALESCE(SUM(amount) FILTER (WHERE payment_status = 'captured'), 0) as amount
                 FROM transactions 
                 WHERE created_at >= NOW() - INTERVAL '1 day' * $1
                 GROUP BY DATE(created_at) ORDER BY date DESC`,
                [parseInt(period)]
            ),
            pool.query(
                `SELECT t.*, b.bill_number, b.service_type, c.name as citizen_name
                 FROM transactions t
                 JOIN bills b ON t.bill_id = b.id
                 JOIN citizens c ON t.citizen_id = c.id
                 ORDER BY t.created_at DESC LIMIT 20`
            ),
        ]);

        return success(res, "Payment statistics", {
            summary: summary.rows[0],
            by_service: byService.rows,
            daily_trend: dailyTrend.rows,
            recent_payments: recentPayments.rows,
            period_days: parseInt(period),
        });
    } catch (err) {
        next(err);
    }
};

// ─── All Complaints (Admin View) ─────────────────────────
export const getAllComplaints = async (req, res, next) => {
    try {
        const { status, department, priority, page = 1, limit = 25 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT c.*, ci.name as citizen_name, ci.mobile as citizen_mobile,
                   staff.name as assigned_to_name
            FROM complaints c
            JOIN citizens ci ON c.citizen_id = ci.id
            LEFT JOIN citizens staff ON c.assigned_to = staff.id
            WHERE 1=1`;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND c.status = $${params.length}`;
        }
        if (department) {
            params.push(department);
            query += ` AND c.department = $${params.length}`;
        }
        if (priority) {
            params.push(priority);
            query += ` AND c.priority = $${params.length}`;
        }

        const totalResult = await pool.query(
          `SELECT COUNT(*) FROM complaints c WHERE 1=1 ${status ? 'AND status = $1' : ''} ${department ? `AND department = $${status ? 2 : 1}` : ''}`,
          params.slice(0, (status ? 1 : 0) + (department ? 1 : 0))
        );
        const total = parseInt(totalResult.rows[0].count);

        query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return paginated(res, "All complaints", result.rows, {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Manage Service Config (Enable/Disable) ──────────────
export const getServiceConfig = async (req, res, next) => {
    try {
        const result = await pool.query(
            "SELECT * FROM service_config ORDER BY service_name"
        );
        return success(res, "Service configuration", result.rows);
    } catch (err) {
        next(err);
    }
};

export const updateServiceConfig = async (req, res, next) => {
    try {
        const { serviceName } = req.params;
        const { is_enabled, description } = req.body;

        const result = await pool.query(
            `UPDATE service_config SET is_enabled = $1, description = COALESCE($2, description), 
             updated_by = $3, updated_at = NOW()
             WHERE service_name = $4 RETURNING *`,
            [is_enabled, description || null, req.user.id, serviceName]
        );

        if (result.rows.length === 0) {
            return fail(res, "Service not found.", 404);
        }

        logger.info("Service config updated", {
            serviceName,
            is_enabled,
            updatedBy: req.user.id,
        });

        return success(res, `Service '${serviceName}' ${is_enabled ? "enabled" : "disabled"}`, result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── All Service Requests (Admin View) ───────────────────
export const getAllServiceRequests = async (req, res, next) => {
    try {
        const { status, department, page = 1, limit = 25 } = req.query;
        const offset = (page - 1) * limit;

        const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (useSupabase) {
            console.log("📡 [ADMIN] Fetching service requests via SUPABASE CLIENT");
            let query = supabase
                .from('service_requests')
                .select('*, citizen:citizens(name, mobile)', { count: 'exact' });

            if (status) query = query.eq('status', status);
            if (department) query = query.ilike('department', `%${department}%`);

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            const mapped = data.map(sr => ({
                ...sr,
                citizen_name: sr.citizen?.name,
                citizen_mobile: sr.citizen?.mobile
            }));

            return paginated(res, "All service requests", mapped, {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
            });
        } else {
            // Fallback to pool query
            console.log("📡 [ADMIN] Fetching service requests via POOL QUERY (Direct DB)");
            let query = `
                SELECT sr.*, c.name as citizen_name, c.mobile as citizen_mobile
                FROM service_requests sr
                JOIN citizens c ON sr.citizen_id = c.id
                WHERE 1=1`;
            const params = [];

            if (status) {
                params.push(status);
                query += ` AND sr.status = $${params.length}`;
            }
            if (department) {
                params.push(department);
                query += ` AND sr.department = $${params.length}`;
            }

            const totalResult = await pool.query(
                `SELECT COUNT(*) FROM service_requests sr WHERE 1=1 ${status ? 'AND status = $1' : ''} ${department ? `AND department = $${status ? 2 : 1}` : ''}`,
                params.slice(0, (status ? 1 : 0) + (department ? 1 : 0))
            );
            const total = parseInt(totalResult.rows[0].count);

            query += ` ORDER BY sr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), parseInt(offset));

            const result = await pool.query(query, params);

            return paginated(res, "All service requests", result.rows, {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
            });
        }
    } catch (err) {
        console.error("❌ [ADMIN ERROR] getAllServiceRequests failed:", err);
        next(err);
    }
};

// ─── Manage Citizens (Admin View) ────────────────────────
export const getAllCitizens = async (req, res, next) => {
    try {
        const { page = 1, limit = 25, search } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT id, name, mobile, email, aadhaar_masked, role, ward, zone, is_active, created_at FROM citizens WHERE 1=1`;
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name ILIKE $${params.length} OR mobile ILIKE $${params.length})`;
        }

        const totalResult = await pool.query(
          `SELECT COUNT(*) FROM citizens WHERE 1=1 ${search ? 'AND (name ILIKE $1 OR mobile ILIKE $1)' : ''}`,
          params.slice(0, (search ? 1 : 0))
        );
        const total = parseInt(totalResult.rows[0].count);

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return paginated(res, "Citizens list", result.rows, {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};
