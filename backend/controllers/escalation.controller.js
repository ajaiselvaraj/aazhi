// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Escalation Controller
// 7 handler functions for the new escalation API endpoints
// All new endpoints — existing complaint APIs untouched
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import { isValidUuid } from "../utils/helpers.js";
import logger from "../utils/logger.js";
import {
    computeSLAStatus,
    ensureSLARecord,
    triggerAutoEscalation,
    updateOfficerMetrics,
    loadEscalationConfig,
} from "../services/escalation.service.js";

// ─── Helper: Resolve complaint ID from UUID or ticket number ──
async function resolveComplaintId(id) {
    if (isValidUuid(id)) {
        const res = await pool.query(`SELECT id FROM complaints WHERE id = $1`, [id]);
        return res.rows[0]?.id || null;
    }
    // Try ticket number
    const res = await pool.query(`SELECT id FROM complaints WHERE ticket_number = $1`, [id]);
    return res.rows[0]?.id || null;
}

// ────────────────────────────────────────────────────────────────
// 1. GET /api/complaints/:id/sla
// Returns SLA status for a complaint (citizen-visible)
// ────────────────────────────────────────────────────────────────
export const getComplaintSLA = async (req, res, next) => {
    try {
        const complaintId = await resolveComplaintId(req.params.id);
        if (!complaintId) return fail(res, "Complaint not found.", 404);

        // Ensure SLA record exists (auto-creates if missing)
        await ensureSLARecord(complaintId);

        const slaStatus = await computeSLAStatus(complaintId);
        if (!slaStatus) return fail(res, "SLA data not available for this complaint.", 404);

        // Check AI risk prediction if available (non-blocking)
        let aiRiskBadge = null;
        try {
            const slaRow = await pool.query(`SELECT * FROM complaint_sla WHERE complaint_id = $1`, [complaintId]);
            const complaintRow = await pool.query(
                `SELECT priority, created_at, description FROM complaints WHERE id = $1`, [complaintId]
            );
            if (slaRow.rows.length && complaintRow.rows.length) {
                const { percent_elapsed, is_breached } = slaStatus;
                if (is_breached || percent_elapsed >= 70) {
                    aiRiskBadge = "High Risk of Delay";
                } else if (percent_elapsed >= 50) {
                    aiRiskBadge = "Moderate Delay Risk";
                }
            }
        } catch { /* non-critical */ }

        return success(res, "SLA status retrieved", {
            ...slaStatus,
            ai_risk_badge: aiRiskBadge,
        });
    } catch (err) {
        next(err);
    }
};

// ────────────────────────────────────────────────────────────────
// 2. GET /api/complaints/:id/escalations
// Returns full escalation history + SLA (citizen-visible)
// ────────────────────────────────────────────────────────────────
export const getComplaintEscalations = async (req, res, next) => {
    try {
        const complaintId = await resolveComplaintId(req.params.id);
        if (!complaintId) return fail(res, "Complaint not found.", 404);

        // SLA status
        await ensureSLARecord(complaintId);
        const slaStatus = await computeSLAStatus(complaintId);

        // Escalation history
        const escRes = await pool.query(
            `SELECT * FROM complaint_escalations 
             WHERE complaint_id = $1 
             ORDER BY escalation_level ASC, escalated_at ASC`,
            [complaintId]
        );

        // Citizen escalation requests for this complaint
        const reqRes = await pool.query(
            `SELECT id, reason, status, admin_note, created_at, reviewed_at 
             FROM escalation_requests 
             WHERE complaint_id = $1 
             ORDER BY created_at DESC`,
            [complaintId]
        );

        // Build accountability timeline (visible to citizen)
        const compRes = await pool.query(
            `SELECT c.ticket_number, c.created_at, c.status, c.subject,
                    ci.name AS assigned_officer_name
             FROM complaints c
             LEFT JOIN citizens ci ON ci.id = c.assigned_to
             WHERE c.id = $1`,
            [complaintId]
        );
        const complaint = compRes.rows[0] || {};

        const timeline = [
            {
                event: "Complaint Created",
                timestamp: complaint.created_at,
                icon: "file-plus",
            },
            ...escRes.rows.map(e => ({
                event: `Escalated to ${e.officer_title}`,
                officer_name: e.officer_name,
                officer_title: e.officer_title,
                timestamp: e.escalated_at,
                level: e.escalation_level,
                reason: e.escalation_reason,
                triggered_by: e.triggered_by,
                icon: "arrow-up-circle",
            })),
        ];

        return success(res, "Escalation details retrieved", {
            sla: slaStatus,
            escalation_history: escRes.rows,
            escalation_requests: reqRes.rows,
            current_officer: slaStatus?.current_officer || null,
            accountability_timeline: timeline,
        });
    } catch (err) {
        next(err);
    }
};

// ────────────────────────────────────────────────────────────────
// 3. POST /api/complaints/:id/request-escalation
// Citizen submits an escalation request (pending admin review)
// ────────────────────────────────────────────────────────────────
export const requestEscalation = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const complaintId = await resolveComplaintId(req.params.id);
        if (!complaintId) return fail(res, "Complaint not found.", 404);

        const { reason } = req.body;
        if (!reason || reason.trim().length < 5) {
            return fail(res, "Please provide a reason for escalation (min 5 characters).", 400);
        }

        // Verify this complaint belongs to the citizen OR citizen is staff
        const compRes = await pool.query(
            `SELECT citizen_id, status FROM complaints WHERE id = $1`,
            [complaintId]
        );
        if (!compRes.rows.length) return fail(res, "Complaint not found.", 404);

        const comp = compRes.rows[0];
        const isOwner = comp.citizen_id === citizenId;
        const isStaff = ['staff', 'admin'].includes(req.user.role);

        if (!isOwner && !isStaff) {
            return fail(res, "You can only request escalation for your own complaints.", 403);
        }

        // Terminal status check
        if (['resolved', 'closed', 'rejected'].includes(comp.status)) {
            return fail(res, "Cannot request escalation for a resolved/closed complaint.", 400);
        }

        // Check for existing pending request (prevent spam)
        const existing = await pool.query(
            `SELECT id FROM escalation_requests WHERE complaint_id = $1 AND citizen_id = $2 AND status = 'pending'`,
            [complaintId, citizenId]
        );
        if (existing.rows.length > 0) {
            return fail(res, "You already have a pending escalation request for this complaint.", 409);
        }

        const result = await pool.query(
            `INSERT INTO escalation_requests (complaint_id, citizen_id, reason)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [complaintId, citizenId, reason.trim()]
        );

        logger.info(`⭐ [Escalation] Citizen ${citizenId} requested escalation for complaint ${complaintId}`);
        return success(res, "Escalation request submitted. Pending admin review.", result.rows[0], 201);
    } catch (err) {
        next(err);
    }
};

// ────────────────────────────────────────────────────────────────
// 4. GET /api/admin/escalations
// Admin: get all escalation requests (paginated, filterable)
// ────────────────────────────────────────────────────────────────
export const getAllEscalationRequests = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT 
                er.*,
                c.ticket_number, c.subject, c.department, c.status AS complaint_status,
                ci.name AS citizen_name, ci.mobile AS citizen_mobile,
                rv.name AS reviewed_by_name
            FROM escalation_requests er
            JOIN complaints c ON c.id = er.complaint_id
            JOIN citizens ci ON ci.id = er.citizen_id
            LEFT JOIN citizens rv ON rv.id = er.reviewed_by
        `;
        const params = [];
        if (status) {
            params.push(status);
            query += ` WHERE er.status = $${params.length}`;
        }

        const countQuery = query.replace(
            /SELECT[\s\S]+?FROM escalation_requests/,
            `SELECT COUNT(*) FROM escalation_requests`
        );
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY er.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        return paginated(res, "Escalation requests retrieved", result.rows, {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};

// ────────────────────────────────────────────────────────────────
// 5. POST /api/admin/escalations/:id/approve
// Admin: approve an escalation request → triggers escalation
// ────────────────────────────────────────────────────────────────
export const approveEscalationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { admin_note } = req.body;

        if (!isValidUuid(id)) return fail(res, "Invalid request ID.", 400);

        const reqRes = await pool.query(
            `SELECT * FROM escalation_requests WHERE id = $1`,
            [id]
        );
        if (!reqRes.rows.length) return fail(res, "Escalation request not found.", 404);

        const escReq = reqRes.rows[0];
        if (escReq.status !== 'pending') {
            return fail(res, `Request is already ${escReq.status}.`, 409);
        }

        // Update request status
        await pool.query(
            `UPDATE escalation_requests 
             SET status = 'approved', admin_note = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
             WHERE id = $3`,
            [admin_note || null, adminId, id]
        );

        // Get escalation config levels
        const { levels } = await loadEscalationConfig();

        // Get current escalation level
        const curEscRes = await pool.query(
            `SELECT escalation_level FROM complaint_escalations 
             WHERE complaint_id = $1 ORDER BY escalation_level DESC LIMIT 1`,
            [escReq.complaint_id]
        );
        const currentLevel = curEscRes.rows[0]?.escalation_level || 0;
        const nextLevelDef = levels.find(l => l.level > currentLevel);

        if (nextLevelDef) {
            await pool.query(
                `INSERT INTO complaint_escalations 
                 (complaint_id, escalation_level, officer_title, escalation_reason, triggered_by)
                 VALUES ($1, $2, $3, $4, 'citizen_request')`,
                [escReq.complaint_id, nextLevelDef.level, nextLevelDef.title, escReq.reason]
            );
            logger.info(`⭐ [Escalation] Admin approved → escalated to Level ${nextLevelDef.level}`);
        }

        return success(res, "Escalation request approved.", { approved: true });
    } catch (err) {
        next(err);
    }
};

// ────────────────────────────────────────────────────────────────
// 6. POST /api/admin/escalations/:id/reject
// Admin: reject an escalation request with a note
// ────────────────────────────────────────────────────────────────
export const rejectEscalationRequest = async (req, res, next) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        const { admin_note } = req.body;

        if (!isValidUuid(id)) return fail(res, "Invalid request ID.", 400);

        const reqRes = await pool.query(`SELECT status FROM escalation_requests WHERE id = $1`, [id]);
        if (!reqRes.rows.length) return fail(res, "Escalation request not found.", 404);

        if (reqRes.rows[0].status !== 'pending') {
            return fail(res, `Request is already ${reqRes.rows[0].status}.`, 409);
        }

        await pool.query(
            `UPDATE escalation_requests 
             SET status = 'rejected', admin_note = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
             WHERE id = $3`,
            [admin_note || null, adminId, id]
        );

        return success(res, "Escalation request rejected.", { rejected: true });
    } catch (err) {
        next(err);
    }
};

// ────────────────────────────────────────────────────────────────
// 7. GET /api/admin/officer-accountability
// Admin: officer performance metrics + accountability scores
// ────────────────────────────────────────────────────────────────
export const getOfficerAccountability = async (req, res, next) => {
    try {
        // Rebuild metrics for all officers fresh (lightweight)
        const officersRes = await pool.query(
            `SELECT DISTINCT assigned_to FROM complaints 
             WHERE assigned_to IS NOT NULL`
        );

        for (const row of officersRes.rows) {
            await updateOfficerMetrics(row.assigned_to);
        }

        // Fetch the leaderboard
        const result = await pool.query(`
            SELECT 
                oa.*,
                ci.name AS officer_name,
                ci.mobile AS officer_mobile,
                ci.role AS officer_role
            FROM officer_accountability oa
            JOIN citizens ci ON ci.id = oa.officer_id
            ORDER BY oa.accountability_score DESC, oa.complaints_resolved DESC
        `);

        return success(res, "Officer accountability data retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};

// ────────────────────────────────────────────────────────────────
// 8. GET /api/admin/escalation-analytics
// Admin: aggregate escalation stats for dashboard
// ────────────────────────────────────────────────────────────────
export const getEscalationAnalytics = async (req, res, next) => {
    try {
        const [total, pending, approved, rejected, breached, escalated] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM escalation_requests`),
            pool.query(`SELECT COUNT(*) FROM escalation_requests WHERE status = 'pending'`),
            pool.query(`SELECT COUNT(*) FROM escalation_requests WHERE status = 'approved'`),
            pool.query(`SELECT COUNT(*) FROM escalation_requests WHERE status = 'rejected'`),
            pool.query(`SELECT COUNT(*) FROM complaint_sla WHERE is_breached = true`),
            pool.query(`SELECT COUNT(DISTINCT complaint_id) FROM complaint_escalations WHERE escalation_level >= 2`),
        ]);

        // Level distribution
        const levelDist = await pool.query(
            `SELECT escalation_level, COUNT(*) as count 
             FROM complaint_escalations 
             GROUP BY escalation_level ORDER BY escalation_level`
        );

        return success(res, "Escalation analytics retrieved", {
            total_requests:          parseInt(total.rows[0].count),
            pending_requests:        parseInt(pending.rows[0].count),
            approved_requests:       parseInt(approved.rows[0].count),
            rejected_requests:       parseInt(rejected.rows[0].count),
            sla_breached_complaints: parseInt(breached.rows[0].count),
            escalated_complaints:    parseInt(escalated.rows[0].count),
            level_distribution:      levelDist.rows,
        });
    } catch (err) {
        next(err);
    }
};
