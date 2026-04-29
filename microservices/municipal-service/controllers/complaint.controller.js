// ═══════════════════════════════════════════════════════════════
// Complaint Controller
// Register, Track, Update, List complaints
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import { generateTicketNumber } from "../utils/helpers.js";
import logger from "../utils/logger.js";

// ─── AI Service URL ──────────────────────────────────────
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://ai-service:5005";

// ─── Spam Filter Helper ──────────────────────────────────
const checkSpam = async (text) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const response = await fetch(`${AI_SERVICE_URL}/api/ai/validate-complaint`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
            logger.warn("AI service returned non-OK status", { status: response.status });
            return { is_spam: false, reason: "AI service error — allowing through" };
        }

        const result = await response.json();
        return result.data || { is_spam: false, reason: "No data in AI response" };
    } catch (err) {
        // Fail-open: if AI service is down, don't block citizens
        logger.warn("AI spam check unavailable — allowing complaint through", { error: err.message });
        return { is_spam: false, reason: "AI service unavailable — fail-open" };
    }
};

// ─── Duplicate Check Helper ──────────────────────────────
const checkDuplicate = async (text, citizenId) => {
    try {
        // Fetch citizen's complaints from the last 30 days
        const recent = await pool.query(
            `SELECT id, ticket_number, subject, description FROM complaints 
             WHERE citizen_id = $1 AND created_at > NOW() - INTERVAL '30 days'
             ORDER BY created_at DESC LIMIT 20`,
            [citizenId]
        );

        if (recent.rows.length === 0) {
            return { is_duplicate: false, reason: "No recent complaints" };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${AI_SERVICE_URL}/api/ai/check-duplicate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                existing_complaints: recent.rows.map(r => ({
                    id: r.id,
                    ticket_number: r.ticket_number,
                    subject: r.subject || "",
                    description: r.description || "",
                })),
            }),
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
            logger.warn("AI duplicate check returned non-OK", { status: response.status });
            return { is_duplicate: false, reason: "AI service error — allowing through" };
        }

        const result = await response.json();
        return result.data || { is_duplicate: false, reason: "No data in AI response" };
    } catch (err) {
        logger.warn("AI duplicate check unavailable — allowing through", { error: err.message });
        return { is_duplicate: false, reason: "AI service unavailable — fail-open" };
    }
};

// ─── Register Complaint ──────────────────────────────────
export const registerComplaint = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { category, issue_category, department, subject, description, ward, priority } = req.body;

        // 🤖 AI Spam Filter — check before persisting
        const complaintText = `${subject || ""} ${description || ""}`.trim();
        if (complaintText.length >= 5) {
            const spamResult = await checkSpam(complaintText);
            if (spamResult.is_spam) {
                logger.warn("Spam complaint blocked", { citizenId, reason: spamResult.reason, confidence: spamResult.confidence });
                return fail(res, "Your complaint was flagged as spam. If this is a mistake, please rephrase and try again.", 400);
            }

            // 🔁 Duplicate Check — block repeated complaints
            const dupResult = await checkDuplicate(complaintText, citizenId);
            if (dupResult.is_duplicate) {
                logger.warn("Duplicate complaint blocked", { citizenId, similarity: dupResult.similarity, matched_ticket: dupResult.matched_ticket });
                return fail(res, `This complaint appears to be a duplicate of ticket ${dupResult.matched_ticket} (${Math.round(dupResult.similarity * 100)}% similar). Please check your existing complaints.`, 409);
            }
        }

        const ticketNumber = generateTicketNumber("CMP");

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, category, issue_category, department, subject, description, ward, priority, status)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), $3, $4, $5, $6, $7, $8, $9, 'submitted')
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
        const { status, notes, assigned_to, resolution_note } = req.body;
        const updatedBy = req.user.id;

        // Get current complaint
        const current = await pool.query("SELECT * FROM complaints WHERE id = $1", [id]);
        if (current.rows.length === 0) {
            return fail(res, "Complaint not found.", 404);
        }

        // Update complaint
        const updateFields = ["status = $2", "updated_at = NOW()"];
        const updateParams = [id, status];

        if (assigned_to) {
            updateFields.push(`assigned_to = $${updateParams.length + 1}`);
            updateParams.push(assigned_to);
        }
        if (resolution_note) {
            updateFields.push(`resolution_note = $${updateParams.length + 1}`);
            updateParams.push(resolution_note);
        }
        if (status === "resolved") {
            updateFields.push("resolved_at = NOW()");
        }
        if (status === "closed") {
            updateFields.push("closed_at = NOW()");
        }

        clearTimeout(timeout);

        if (!response.ok) {
            logger.warn("AI duplicate check returned non-OK", { status: response.status });
            return { is_duplicate: false, reason: "AI service error — allowing through" };
        }

        const result = await response.json();
        return result.data || { is_duplicate: false, reason: "No data in AI response" };
    } catch (err) {
        logger.warn("AI duplicate check unavailable — allowing through", { error: err.message });
        return { is_duplicate: false, reason: "AI service unavailable — fail-open" };
    }
};

// ─── Register Complaint ──────────────────────────────────
export const registerComplaint = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { category, issue_category, department, subject, description, ward, priority } = req.body;

        // 🤖 AI Spam Filter — check before persisting
        const complaintText = `${subject || ""} ${description || ""}`.trim();
        if (complaintText.length >= 5) {
            const spamResult = await checkSpam(complaintText);
            if (spamResult.is_spam) {
                logger.warn("Spam complaint blocked", { citizenId, reason: spamResult.reason, confidence: spamResult.confidence });
                return fail(res, "Your complaint was flagged as spam. If this is a mistake, please rephrase and try again.", 400);
            }

            // 🔁 Duplicate Check — block repeated complaints
            const dupResult = await checkDuplicate(complaintText, citizenId);
            if (dupResult.is_duplicate) {
                logger.warn("Duplicate complaint blocked", { citizenId, similarity: dupResult.similarity, matched_ticket: dupResult.matched_ticket });
                return fail(res, `This complaint appears to be a duplicate of ticket ${dupResult.matched_ticket} (${Math.round(dupResult.similarity * 100)}% similar). Please check your existing complaints.`, 409);
            }
        }

        const ticketNumber = generateTicketNumber("CMP");

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, category, issue_category, department, subject, description, ward, priority, status)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), $3, $4, $5, $6, $7, $8, $9, 'submitted')
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
        const { status, notes, assigned_to, resolution_note } = req.body;
        const updatedBy = req.user.id;

        // Get current complaint
        const current = await pool.query("SELECT * FROM complaints WHERE id = $1", [id]);
        if (current.rows.length === 0) {
            return fail(res, "Complaint not found.", 404);
        }

        // Update complaint
        const updateFields = ["status = $2", "updated_at = NOW()"];
        const updateParams = [id, status];

        if (assigned_to) {
            updateFields.push(`assigned_to = $${updateParams.length + 1}`);
            updateParams.push(assigned_to);
        }
        if (resolution_note) {
            updateFields.push(`resolution_note = $${updateParams.length + 1}`);
            updateParams.push(resolution_note);
        }
        if (status === "resolved") {
            updateFields.push("resolved_at = NOW()");
        }
        if (status === "closed") {
            updateFields.push("closed_at = NOW()");
        }

        const result = await pool.query(
            `UPDATE complaints SET ${updateFields.join(", ")} WHERE id = $1 RETURNING *`,
            updateParams
        );

        // Update complaint stages
        // Map top-level status to the actual stage name in complaint_stages
        const stageNameMap = {
            'pending': 'submitted', 'submitted': 'submitted',
            'acknowledged': 'acknowledged', 'assigned': 'assigned',
            'in_progress': 'in_progress', 'resolved': 'resolved',
            'closed': 'closed', 'rejected': 'closed',
        };
        const dbStageName = stageNameMap[status] || status;

        // Mark previous stage as completed
        await pool.query(
            `UPDATE complaint_stages SET status = 'completed', updated_at = NOW()
             WHERE complaint_id = $1 AND status = 'current'`,
            [id]
        );

        // Mark new stage as current
        await pool.query(
            `UPDATE complaint_stages SET status = 'current', notes = $1, updated_by = $2, updated_at = NOW()
             WHERE complaint_id = $3 AND stage = $4`,
            [notes || null, updatedBy, id, dbStageName]
        );

        logger.info("Complaint status updated", { complaintId: id, oldStatus: current.rows[0].status, newStatus: status, updatedBy });

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

// ─── DEBUG: Get All Complaints (Bypass Auth) ─────────────
export const getAllComplaintsAdminDebug = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT c.*, ci.name as citizen_name, ci.mobile as citizen_mobile
            FROM complaints c
            JOIN citizens ci ON c.citizen_id = ci.id
            ORDER BY c.created_at DESC
        `);
        return success(res, "All complaints retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};

// ─── DEBUG: Create Complaint (Bypass Auth) ────────────────
export const createComplaintDebug = async (req, res, next) => {
    try {
        let citizenId = req.body.citizen_id;
        if (!citizenId) {
            const cit = await pool.query("SELECT id FROM citizens LIMIT 1");
            if (cit.rows.length > 0) citizenId = cit.rows[0].id;
            else citizenId = 1;
        }

        const { category, issue_category, department, subject, description, ward, priority } = req.body;
        const ticketNumber = generateTicketNumber("CMP");

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, category, issue_category, department, subject, description, ward, priority, status)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), $3, $4, $5, $6, $7, $8, $9, 'submitted')
             RETURNING *`,
            [ticketNumber, citizenId, category, issue_category || null, department, subject, description, ward || null, priority || "medium"]
        );

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
        return success(res, "Complaint registered (DEBUG)", {
            ...result.rows[0],
            stages: stages.map((s) => ({ stage: s.stage, status: s.status }))
        }, 201);
    } catch (err) {
        next(err);
    }
};

// ─── DEBUG: Update Status (Bypass Auth) ──────────────────
export const updateComplaintStatusDebug = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes, assigned_to, resolution_note } = req.body;
        const updatedBy = 1; // dummy admin ID

        const updateFields = ["status = $2", "updated_at = NOW()"];
        const updateParams = [id, status];

        if (assigned_to) {
            updateFields.push(`assigned_to = $${updateParams.length + 1}`);
            updateParams.push(assigned_to);
        }
        if (resolution_note) {
            updateFields.push(`resolution_note = $${updateParams.length + 1}`);
            updateParams.push(resolution_note);
        }
        if (status === "resolved") {
            updateFields.push("resolved_at = NOW()");
        }
        if (status === "closed") {
            updateFields.push("closed_at = NOW()");
        }

        const result = await pool.query(
            `UPDATE complaints SET ${updateFields.join(", ")} WHERE id = $1 RETURNING *`,
            updateParams
        );

        if (result.rows.length === 0) {
            return fail(res, "Complaint not found", 404);
        }

        const stageNameMap = {
            'pending': 'submitted', 'submitted': 'submitted',
            'acknowledged': 'acknowledged', 'assigned': 'assigned',
            'in_progress': 'in_progress', 'resolved': 'resolved',
            'closed': 'closed', 'rejected': 'closed',
        };
        const dbStageName = stageNameMap[status] || status;

        await pool.query(
            `UPDATE complaint_stages SET status = 'completed', updated_at = NOW()
             WHERE complaint_id = $1 AND status = 'current'`,
            [id]
        );

        await pool.query(
            `UPDATE complaint_stages SET status = 'current', notes = $1, updated_by = $2, updated_at = NOW()
             WHERE complaint_id = $3 AND stage = $4`,
            [notes || null, updatedBy, id, dbStageName]
        );

        return success(res, "Complaint updated (DEBUG)", result.rows[0]);
    } catch (err) {
        next(err);
    }
};
