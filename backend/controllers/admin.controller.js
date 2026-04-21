// ═══════════════════════════════════════════════════════════════
// Admin Dashboard Controller
// Analytics, Monitoring, Service Management, Logs
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { supabase } from "../config/supabaseClient.js";
import { success, fail, paginated } from "../utils/response.js";
import stringSimilarity from "string-similarity";
import logger from "../utils/logger.js";

// ─── Dashboard Overview Stats ────────────────────────────
export const getDashboardStats = async (req, res, next) => {
    try {
        const [citizens, bills, complaints, serviceRequests, transactions] = await Promise.all([
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM citizens WHERE role = 'citizen'"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'pending') as pending, COUNT(*) FILTER (WHERE status = 'paid') as paid, COUNT(*) FILTER (WHERE status = 'overdue') as overdue, COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as revenue FROM bills"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active, COUNT(*) FILTER (WHERE status = 'resolved') as resolved, COUNT(*) FILTER (WHERE status = 'rejected') as rejected FROM complaints"),
            pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'active') as active, COUNT(*) FILTER (WHERE status = 'resolved') as resolved, COUNT(*) FILTER (WHERE status = 'rejected') as rejected FROM service_requests"),
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
        const { status, department, priority, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const useSupabase = supabase !== null;

        if (useSupabase) {
            console.log("📡 [ADMIN] Fetching complaints via SUPABASE CLIENT");
            let query = supabase
                .from('complaints')
                .select('*, citizen:citizens!complaints_citizen_id_fkey(name, mobile)', { count: 'exact' });

            if (status) query = query.eq('status', status);
            if (department) query = query.ilike('department', `%${department}%`);
            if (priority) query = query.eq('priority', priority);

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error("❌ Supabase query error:", error);
                throw error;
            }

            const mapped = data.map(c => ({
                ...c,
                citizen_name: c.citizen?.name,
                citizen_mobile: c.citizen?.mobile
            }));

            return paginated(res, "All complaints", mapped, {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
            });
        } else {
            // Fallback to pool query
            console.log("📡 [ADMIN] Fetching complaints via POOL QUERY (Direct DB)");
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

            const totalQuery = `SELECT COUNT(*) FROM complaints c WHERE 1=1 ${status ? 'AND status=$1' : ''} ${department ? `AND department=$${status ? 2 : 1}` : ''} ${priority ? `AND priority=$${params.length}` : ''}`;
            const totalResult = await pool.query(totalQuery, params);
            const total = parseInt(totalResult.rows[0].count);

            query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), parseInt(offset));

            const result = await pool.query(query, params);

            return paginated(res, "All complaints", result.rows, {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
            });
        }
    } catch (err) {
        console.error("❌ [ADMIN ERROR] getAllComplaints failed:", err);
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

        const useSupabase = supabase !== null;

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

            const countQuery = query.replace(/SELECT sr\.\*.*FROM/i, "SELECT COUNT(*) FROM");
            const totalResult = await pool.query(countQuery, params);
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

        const countQuery = query.replace(/SELECT (.*?) FROM/i, "SELECT COUNT(*) FROM");
        const totalResult = await pool.query(countQuery, params);
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

// ─── Complaint Analytics (Real Data) ─────────────────────
export const getComplaintAnalytics = async (req, res, next) => {
    try {
        const [deptDist, priorityDist, dailyTrend, sentimentDist, topCategories, totalStats] = await Promise.all([
            // Department distribution
            pool.query(`SELECT department, COUNT(*)::int as count FROM complaints GROUP BY department ORDER BY count DESC`),
            // Priority breakdown
            pool.query(`SELECT COALESCE(priority, 'medium') as priority, COUNT(*)::int as count FROM complaints GROUP BY priority ORDER BY count DESC`),
            // Daily trend (last 14 days)
            pool.query(`
                SELECT DATE(created_at) as date,
                       COUNT(*)::int as total,
                       COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved
                FROM complaints
                WHERE created_at >= NOW() - INTERVAL '14 days'
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `),
            // Status distribution (used as sentiment proxy since metadata column doesn't exist)
            pool.query(`
                SELECT
                    CASE
                        WHEN status = 'resolved' THEN 'Positive'
                        WHEN status = 'rejected' THEN 'Angry'
                        WHEN status IN ('pending', 'open') THEN 'Neutral'
                        WHEN status = 'in_progress' THEN 'Frustrated'
                        ELSE 'Neutral'
                    END as sentiment,
                    COUNT(*)::int as count
                FROM complaints
                GROUP BY sentiment
                ORDER BY count DESC
            `),
            // Top categories
            pool.query(`SELECT COALESCE(category, 'Uncategorized') as category, COUNT(*)::int as count FROM complaints GROUP BY category ORDER BY count DESC LIMIT 10`),
            // Total stats
            pool.query(`
                SELECT
                    COUNT(*)::int as total,
                    COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved,
                    COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
                    COUNT(*) FILTER (WHERE status NOT IN ('resolved','rejected','closed'))::int as active,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int as today,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int as this_week
                FROM complaints
            `),
        ]);

        // Extract top keywords from recent complaint descriptions
        const recentComplaints = await pool.query(
            `SELECT description FROM complaints WHERE description IS NOT NULL ORDER BY created_at DESC LIMIT 100`
        );
        const wordFreq = {};
        const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','must','shall','can','need','dare','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','above','below','between','out','off','over','under','again','further','then','once','here','there','where','why','how','all','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','just','because','but','and','or','if','while','that','this','it','its','my','our','your','their','his','her','i','me','we','they','he','she','which','what','when','about','up','them','these','those','any','who','whom','also','get','got','know','like','time','please','help','complaint','issue','problem','sir','madam','dear','kindly']);
        for (const row of recentComplaints.rows) {
            const words = (row.description || '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
            for (const w of words) {
                if (w.length > 3 && !stopWords.has(w)) {
                    wordFreq[w] = (wordFreq[w] || 0) + 1;
                }
            }
        }
        const topKeywords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));

        return success(res, "Complaint analytics", {
            departmentDistribution: deptDist.rows,
            priorityBreakdown: priorityDist.rows,
            dailyTrend: dailyTrend.rows,
            sentimentDistribution: sentimentDist.rows,
            topCategories: topCategories.rows,
            topKeywords,
            stats: totalStats.rows[0],
        });
    } catch (err) {
        next(err);
    }
};

// ─── Duplicate Clusters (Real Data) ──────────────────────
export const getDuplicateClusters = async (req, res, next) => {
    try {
        // Get recent complaints to cluster
        const { rows: complaints } = await pool.query(`
            SELECT c.id, c.ticket_number, c.subject, c.description, c.department, c.ward, c.status, c.created_at,
                   ci.name as citizen_name
            FROM complaints c
            LEFT JOIN citizens ci ON c.citizen_id = ci.id
            WHERE c.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY c.created_at DESC
            LIMIT 200
        `);

        if (complaints.length < 2) {
            return success(res, "Duplicate clusters", []);
        }

        // Build clusters using string similarity
        const THRESHOLD = 0.45;
        const used = new Set();
        const clusters = [];
        let clusterId = 1;

        for (let i = 0; i < complaints.length; i++) {
            if (used.has(i)) continue;
            const textI = `${complaints[i].subject || ''} ${complaints[i].description || ''}`.toLowerCase();
            const cluster = {
                id: `DUP-${String(clusterId).padStart(3, '0')}`,
                title: complaints[i].subject || complaints[i].description?.substring(0, 50) || 'Untitled',
                dept: complaints[i].department || 'General',
                ward: complaints[i].ward || 'N/A',
                masterTicket: complaints[i].ticket_number,
                reportCount: 1,
                status: 'Open',
                timeAgo: getTimeAgo(complaints[i].created_at),
                tickets: [complaints[i].ticket_number],
            };

            for (let j = i + 1; j < complaints.length; j++) {
                if (used.has(j)) continue;
                const textJ = `${complaints[j].subject || ''} ${complaints[j].description || ''}`.toLowerCase();
                const sim = stringSimilarity.compareTwoStrings(textI, textJ);
                if (sim >= THRESHOLD) {
                    cluster.reportCount++;
                    cluster.tickets.push(complaints[j].ticket_number);
                    used.add(j);
                }
            }

            if (cluster.reportCount > 1) {
                used.add(i);
                if (complaints[i].status === 'resolved') cluster.status = 'Merged Into Master Ticket';
                else if (cluster.reportCount >= 3) cluster.status = 'Under Review';
                clusters.push(cluster);
                clusterId++;
            }
        }

        return success(res, "Duplicate clusters", clusters);
    } catch (err) {
        next(err);
    }
};

function getTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

// ─── Fraud Signals (Real Data) ───────────────────────────
export const getFraudSignals = async (req, res, next) => {
    try {
        // Identify citizens with suspicious patterns
        const { rows: citizenActivity } = await pool.query(`
            SELECT
                ci.id as citizen_id,
                ci.name,
                ci.mobile,
                COUNT(c.id)::int as total_complaints,
                COUNT(c.id) FILTER (WHERE c.status = 'rejected')::int as rejected_count,
                COUNT(c.id) FILTER (WHERE c.created_at >= NOW() - INTERVAL '7 days')::int as recent_complaints,
                0::int as spam_flagged,
                MIN(c.created_at) as first_complaint,
                MAX(c.created_at) as last_complaint
            FROM citizens ci
            JOIN complaints c ON c.citizen_id = ci.id
            GROUP BY ci.id, ci.name, ci.mobile
            HAVING COUNT(c.id) >= 2
            ORDER BY COUNT(c.id) DESC
            LIMIT 50
        `);

        const fraudUsers = citizenActivity.map(u => {
            // Calculate risk score
            let riskScore = 0;
            // High volume = higher risk
            if (u.total_complaints >= 10) riskScore += 30;
            else if (u.total_complaints >= 5) riskScore += 15;
            // High rejection rate = higher risk
            const rejectRate = u.total_complaints > 0 ? u.rejected_count / u.total_complaints : 0;
            if (rejectRate > 0.5) riskScore += 30;
            else if (rejectRate > 0.25) riskScore += 15;
            // Rapid-fire complaints in last 7 days
            if (u.recent_complaints >= 5) riskScore += 25;
            else if (u.recent_complaints >= 3) riskScore += 10;
            // Spam flags
            if (u.spam_flagged > 0) riskScore += 15 * Math.min(u.spam_flagged, 3);
            riskScore = Math.min(riskScore, 100);

            let status = 'Cleared';
            if (riskScore >= 80) status = 'Banned';
            else if (riskScore >= 60) status = 'Flagged';
            else if (riskScore >= 40) status = 'Under Review';

            // Pattern description
            let pattern = '';
            if (u.recent_complaints >= 5) pattern = `${u.recent_complaints} complaints in last 7 days`;
            else if (rejectRate > 0.5) pattern = `${Math.round(rejectRate * 100)}% rejection rate`;
            else if (u.spam_flagged > 0) pattern = `${u.spam_flagged} spam-flagged submissions`;
            else pattern = `${u.total_complaints} total complaints`;

            return {
                odUserId: u.citizen_id,
                userId: u.name || `CIT-${u.citizen_id.substring(0, 6)}`,
                submitted: u.total_complaints,
                pattern,
                riskScore,
                status,
                dept: 'All',
            };
        });

        // Sort by risk score descending
        fraudUsers.sort((a, b) => b.riskScore - a.riskScore);

        return success(res, "Fraud signals", fraudUsers);
    } catch (err) {
        next(err);
    }
};

// ═══════════════════════════════════════════════════════════
// ML INNOVATION ENDPOINTS
// ═══════════════════════════════════════════════════════════

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://ai-service-aazhi.onrender.com';

// ─── Smart Complaint Clusters (ML) ───────────────────────
export const getMLComplaintClusters = async (req, res, next) => {
    try {
        const { rows: complaints } = await pool.query(`
            SELECT c.id, c.ticket_number, c.subject, c.description, c.department,
                   c.ward, c.status, c.created_at,
                   ci.name as citizen_name
            FROM complaints c
            LEFT JOIN citizens ci ON c.citizen_id = ci.id
            WHERE c.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY c.created_at DESC
            LIMIT 200
        `);

        if (complaints.length < 2) {
            return success(res, "ML complaint clusters", { clusters: [], total_complaints: complaints.length });
        }

        const aiRes = await fetch(`${AI_SERVICE_URL}/api/ai/summarize-clusters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ complaints, threshold: 0.40 }),
        });
        const aiData = await aiRes.json();

        return success(res, "ML complaint clusters", aiData.data || aiData);
    } catch (err) {
        console.error("❌ ML Clusters error:", err.message);
        next(err);
    }
};

// ─── ML Forecast ─────────────────────────────────────────
export const getMLForecast = async (req, res, next) => {
    try {
        const { rows: dailyCounts } = await pool.query(`
            SELECT DATE(created_at) as date,
                   COUNT(*)::int as total,
                   COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved
            FROM complaints
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        if (dailyCounts.length < 3) {
            return success(res, "ML forecast", { forecast: [], trend: "insufficient_data" });
        }

        const aiRes = await fetch(`${AI_SERVICE_URL}/api/ai/forecast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ daily_counts: dailyCounts, forecast_days: 7 }),
        });
        const aiData = await aiRes.json();

        return success(res, "ML forecast", {
            ...(aiData.data || aiData),
            historical: dailyCounts,
        });
    } catch (err) {
        console.error("❌ ML Forecast error:", err.message);
        next(err);
    }
};

// ─── ML Sentiment Pulse ──────────────────────────────────
export const getMLSentimentPulse = async (req, res, next) => {
    try {
        const { rows: complaints } = await pool.query(`
            SELECT c.id, c.subject, c.description, c.department, c.created_at
            FROM complaints c
            WHERE c.description IS NOT NULL
              AND c.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY c.created_at DESC
            LIMIT 150
        `);

        const formatted = complaints.map(c => ({
            id: c.id,
            text: `${c.subject || ''} ${c.description || ''}`.trim(),
            department: c.department || 'Unknown',
            created_at: c.created_at,
        }));

        const aiRes = await fetch(`${AI_SERVICE_URL}/api/ai/sentiment-pulse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ complaints: formatted }),
        });
        const aiData = await aiRes.json();

        return success(res, "ML sentiment pulse", aiData.data || aiData);
    } catch (err) {
        console.error("❌ ML Sentiment error:", err.message);
        next(err);
    }
};

// ─── ML Diagnostics ──────────────────────────────────────
export const getMLDiagnostics = async (req, res, next) => {
    try {
        const aiRes = await fetch(`${AI_SERVICE_URL}/api/ai/diagnostics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ run_full: true }),
        });
        const aiData = await aiRes.json();

        return success(res, "ML diagnostics", aiData.data || aiData);
    } catch (err) {
        console.error("❌ ML Diagnostics error:", err.message);
        next(err);
    }
};
