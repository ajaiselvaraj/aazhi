// ═══════════════════════════════════════════════════════════════
// Complaint Controller
// Register, Track, Update, List complaints
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import { generateTicketNumber } from "../utils/helpers.js";
import logger from "../utils/logger.js";

// ─── Register Complaint ──────────────────────────────────
export const registerComplaint = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { category, issue_category, department, subject, description, ward, priority } = req.body;

        const ticketNumber = generateTicketNumber("CMP");

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, category, issue_category, department, subject, description, ward, priority, stage, status)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), $3, $4, $5, $6, $7, $8, $9, 'submitted', 'active')
             RETURNING *`,
            [ticketNumber, citizenId, category, issue_category || null, department, subject, description, ward || null, priority || "medium"]
        );

        // Create complaint lifecycle stages
        const stages = [
            { stage: "submitted", status: "current" },
            { stage: "acknowledged", status: "pending" },
            { stage: "assigned", status: "pending" },
            { stage: "in_progress", status: "pending" },
            { stage: "resolved", status: "pending" },
            { stage: "closed", status: "pending" },
        ];

        for (const s of stages) {
            await pool.query(
                `INSERT INTO complaint_stages (complaint_id, stage, status) VALUES ($1, $2, $3)`,
                [result.rows[0].id, s.stage, s.status]
            );
        }

        logger.info("Complaint registered", { citizenId, ticketNumber, category, department });

        return success(res, "Complaint registered successfully", {
            ...result.rows[0],
            stages: stages.map((s) => ({
                stage: s.stage,
                status: s.status,
            })),
        }, 201);
    } catch (err) {
        next(err);
    }
};

// ─── Track Complaint by Ticket Number ────────────────────
export const trackComplaint = async (req, res, next) => {
    try {
        const { ticketNumber } = req.params;

        const complaint = await pool.query(
            `SELECT c.*, ci.name as citizen_name, ci.mobile as citizen_mobile
             FROM complaints c
             JOIN citizens ci ON c.citizen_id = ci.id
             WHERE c.ticket_number = $1`,
            [ticketNumber]
        );

        if (complaint.rows.length === 0) {
            return fail(res, "Complaint not found.", 404);
        }

        // Get stages
        const stages = await pool.query(
            `SELECT stage, status, notes, updated_at 
             FROM complaint_stages 
             WHERE complaint_id = $1 
             ORDER BY updated_at ASC`,
            [complaint.rows[0].id]
        );

        // Get messages
        const messages = await pool.query(
            `SELECT m.*, c.name as sender_name
             FROM messages m
             LEFT JOIN citizens c ON m.sender_id = c.id
             WHERE m.complaint_id = $1
             ORDER BY m.created_at ASC`,
            [complaint.rows[0].id]
        );

        return success(res, "Complaint tracking details", {
            ...complaint.rows[0],
            stages: stages.rows,
            messages: messages.rows,
        });
    } catch (err) {
        next(err);
    }
};

// ─── Get My Complaints ───────────────────────────────────
export const getMyComplaints = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { status, department, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM complaints WHERE citizen_id = $1`;
        const params = [citizenId];

        if (status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(status);
        }
        if (department) {
            query += ` AND department = $${params.length + 1}`;
            params.push(department);
        }

        // Get total count
        const countQuery = query.replace("SELECT *", "SELECT COUNT(*)");
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return paginated(res, "Complaints retrieved", result.rows, {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Update Complaint Status (Admin/Staff) ───────────────
export const updateComplaintStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { stage, status, notes, assigned_to, resolution_note, rejection_reason } = req.body;
        const updatedBy = req.user.id;

        // Get current complaint bypass UUID cast error by checking ticket_number or id
        const idCheckQuery = id.startsWith('CMP-') || id.startsWith('TKT-') 
             ? "SELECT * FROM complaints WHERE ticket_number = $1" 
             : "SELECT * FROM complaints WHERE id = $1";
             
        const current = await pool.query(idCheckQuery, [id]);
        if (current.rows.length === 0) {
            return fail(res, "Complaint not found.", 404);
        }
        
        const actualId = current.rows[0].id;

        // Logical overrides
        let finalStatus = status || current.rows[0].status;
        let finalStage = stage || current.rows[0].stage;

        // Normalize stage/status values for DB consistency
        const normalizedStage = finalStage.toLowerCase();
        const normalizedStatus = finalStatus.toLowerCase();

        if (normalizedStage === "resolved" || normalizedStage === "completed") {
            finalStatus = "resolved";
        }
        
        console.log(`🔄 [DEBUG] Updating Complaint ${actualId}: stage=${finalStage}, status=${finalStatus}`);

        // Update complaint
        const updateFields = ["stage = $2", "status = $3", "updated_at = NOW()"];
        const updateParams = [actualId, finalStage, finalStatus];

        if (assigned_to) {
            updateFields.push(`assigned_to = $${updateParams.length + 1}`);
            updateParams.push(assigned_to);
        }
        if (resolution_note) {
            updateFields.push(`resolution_note = $${updateParams.length + 1}`);
            updateParams.push(resolution_note);
        }
        if (rejection_reason) {
            updateFields.push(`rejection_reason = $${updateParams.length + 1}`);
            updateParams.push(rejection_reason);
        }
        if (finalStatus === "resolved" || finalStage === "resolved" || finalStage === "Resolved") {
            updateFields.push("resolved_at = NOW()");
        }
        if (finalStatus === "closed" || finalStatus === "Closed") {
            updateFields.push("closed_at = NOW()");
        }

        const result = await pool.query(
            `UPDATE complaints SET ${updateFields.join(", ")} WHERE id = $1 RETURNING *`,
            updateParams
        );

        // Update complaint stages table (lifecycle tracker)
        // Mark previous stage as completed
        await pool.query(
            `UPDATE complaint_stages SET status = 'completed', updated_at = NOW()
             WHERE complaint_id = $1 AND status = 'current'`,
            [actualId]
        );

        // Mark new stage as current
        // Try to find the exact stage or fallback to creating one if missing
        const stageCheck = await pool.query(
            "SELECT id FROM complaint_stages WHERE complaint_id = $1 AND stage = $2",
            [actualId, finalStage]
        );

        if (stageCheck.rows.length > 0) {
            await pool.query(
                `UPDATE complaint_stages SET status = 'current', notes = $1, updated_by = $2, updated_at = NOW()
                 WHERE complaint_id = $3 AND stage = $4`,
                [notes || rejection_reason || resolution_note || null, updatedBy, actualId, finalStage]
            );
        } else {
            // If the frontend sent a stage we don't have in the static list, insert it
            await pool.query(
                `INSERT INTO complaint_stages (complaint_id, stage, status, notes, updated_by)
                 VALUES ($1, $2, 'current', $3, $4)`,
                [actualId, finalStage, notes || rejection_reason || null, updatedBy]
            );
        }

        logger.info("Complaint status updated", { complaintId: actualId, oldStatus: current.rows[0].status, newStatus: finalStatus, updatedBy });

        return success(res, "Complaint status updated", result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── Add Message to Complaint ────────────────────────────
export const addMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const senderId = req.user.id;
        const senderType = req.user.role === "citizen" ? "citizen" : "authority";

        // Verify complaint exists
        const complaint = await pool.query("SELECT id FROM complaints WHERE id = $1", [id]);
        if (complaint.rows.length === 0) {
            return fail(res, "Complaint not found.", 404);
        }

        const result = await pool.query(
            `INSERT INTO messages (complaint_id, sender_id, sender_type, text)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, senderId, senderType, text]
        );

        return success(res, "Message added", result.rows[0], 201);
    } catch (err) {
        next(err);
    }
};

// ─── Get All Complaints (Admin/Staff Only) ───────────────
export const getAllComplaintsAdmin = async (req, res, next) => {
    try {
        const { status, department, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT c.*, ci.name AS citizen_name, ci.mobile AS citizen_mobile
            FROM complaints c
            LEFT JOIN citizens ci ON c.citizen_id = ci.id
        `;
        const params = [];

        const conditions = [];
        if (status) {
            conditions.push(`c.status = $${params.length + 1}`);
            params.push(status);
        }
        if (department) {
            conditions.push(`c.department = $${params.length + 1}`);
            params.push(department);
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        const countQuery = `SELECT COUNT(*) FROM complaints c${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''}`;
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return paginated(res, "All complaints retrieved", result.rows, {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};
