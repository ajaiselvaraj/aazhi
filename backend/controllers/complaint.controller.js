// ═══════════════════════════════════════════════════════════════
// Complaint Controller
// Register, Track, Update, List complaints
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import { generateTicketNumber } from "../utils/helpers.js";
import logger from "../utils/logger.js";
import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5005';

// ─── Register Complaint ──────────────────────────────────
export const registerComplaint = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        let { category, issue_category, department, subject, description, ward, priority, name, phone } = req.body;

        // Validation for mandatory fields
        if (!subject || subject.trim() === '') {
            subject = category || issue_category || "Civic Complaint";
        }

        if (!description || description.trim().length < 10) {
            return fail(res, "Description is too short. Please provide more details.", 400);
        }

        // ═══════════════════════════════════════════════════════════════
        // AAZHI AI INTEGRATION - Full Analysis Pipeline
        // ═══════════════════════════════════════════════════════════════
        let aiData = {};
        let classifiedDepartment = department; // Fallback to user-provided department
        let classifiedPriority = priority || "medium"; // Fallback to user-provided priority

        try {
            // 1. Fetch recent complaints for duplicate check
            const { rows: existing_complaints_raw } = await pool.query(
                `SELECT id, ticket_number, subject, description FROM complaints WHERE citizen_id = $1 ORDER BY created_at DESC LIMIT 5`,
                [citizenId]
            );

            // 2. Call the single /analyze endpoint
            const analysisResponse = await axios.post(`${AI_SERVICE_URL}/api/ai/analyze`, {
                text: `${subject || ''} ${description}`,
                existing_complaints: existing_complaints_raw
            });

            const analysis = analysisResponse.data?.data;

            if (!analysis) {
                throw new Error("AI analysis returned no data.");
            }

            // 3. Process Validation result
            if (analysis.validation?.is_spam) {
                logger.warn("Spam detected for complaint", { citizenId, description, reason: analysis.validation.reason });
                return fail(res, `Request rejected: ${analysis.validation.reason}`, 400);
            }
            aiData.validation = analysis.validation;

            // 4. Process Duplicate result
            if (analysis.duplicate?.is_duplicate) {
                logger.warn("Duplicate complaint detected", { citizenId, matched_ticket: analysis.duplicate.matched_ticket });
                return fail(res, `Complaint may be a duplicate of ticket ${analysis.duplicate.matched_ticket}. Similarity: ${Math.round(analysis.duplicate.similarity * 100)}%`, 409);
            }
            aiData.duplicate = analysis.duplicate;

            // 5. Process Department routing result
            if (analysis.department?.department) {
                classifiedDepartment = analysis.department.department;
                logger.info(`AI classified department as: ${classifiedDepartment}`);
            }
            aiData.department = analysis.department;

            // 6. Process Sentiment result
            if (analysis.sentiment) {
                aiData.sentiment = analysis.sentiment;
                logger.info(`AI analyzed complaint sentiment as: ${analysis.sentiment.sentiment} (Urgency: ${analysis.sentiment.urgency})`);
            }

        } catch (aiErr) {
            logger.error("AI service full analysis call failed. Proceeding with user-provided data.", { error: aiErr.response ? aiErr.response.data : aiErr.message });
        }

        const citizenName = name || req.user.name;
        const citizenMobile = phone || req.user.mobileNumber;
        
        const finalMetadata = { ai_analysis: aiData, citizen_mobile: citizenMobile };
        // ═══════════════════════════════════════════════════════════════

        const ticketNumber = generateTicketNumber("CMP");

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, category, issue_category, department, subject, description, ward, priority, status, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
             RETURNING *`,
            [ticketNumber, citizenId, citizenName, category, issue_category || null, classifiedDepartment, subject, description, ward || null, classifiedPriority, JSON.stringify(finalMetadata)]
        );

        // Create complaint lifecycle stages
        const stages = [
            { stage: "pending", status: "current" },
            { stage: "assigned", status: "pending" },
            { stage: "in_progress", status: "pending" },
            { stage: "resolved", status: "pending" },
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
            `SELECT 
                c.*, 
                COALESCE(c.citizen_name, ci.name) as citizen_name, 
                ci.mobile as citizen_mobile
             FROM complaints c
             LEFT JOIN citizens ci ON c.citizen_id = ci.id
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
        const { status, notes, assigned_to, resolution_note, rejection_reason } = req.body;
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
        // 1. Enhanced Normalization logic for DB consistency
        let rawStatus = status || current.rows[0].status || "pending";
        let finalStatus = rawStatus.toLowerCase()
                                   .trim()
                                   .replace(/[\s-]+/g, '_')
                                   .replace(/inprogress/g, 'in_progress');

        console.log(`🔄 [Backend Debug] Complaint ${actualId}: Raw="${status}" -> Final="${finalStatus}"`);

        // Update complaint
        const updateFields = ["status = $2", "updated_at = NOW()"];
        const updateParams = [actualId, finalStatus];

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
        if (finalStatus === "resolved") {
            updateFields.push("resolved_at = NOW()");
        }
        if (finalStatus === "closed") {
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
        // For complaints without a custom stage, we track status as the "stage" name
        const stageCheck = await pool.query(
            "SELECT id FROM complaint_stages WHERE complaint_id = $1 AND stage = $2",
            [actualId, finalStatus]
        );

        if (stageCheck.rows.length > 0) {
            await pool.query(
                `UPDATE complaint_stages SET status = 'current', notes = $1, updated_by = $2, updated_at = NOW()
                 WHERE complaint_id = $3 AND stage = $4`,
                [notes || rejection_reason || resolution_note || null, updatedBy, actualId, finalStatus]
            );
        } else {
            await pool.query(
                `INSERT INTO complaint_stages (complaint_id, stage, status, notes, updated_by)
                 VALUES ($1, $2, 'current', $3, $4)`,
                [actualId, finalStatus, notes || rejection_reason || null, updatedBy]
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
            SELECT 
                c.*, 
                COALESCE(c.citizen_name, ci.name) AS citizen_name, 
                ci.mobile AS citizen_mobile
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

// ─── DEBUG: Get All Complaints (Bypass Auth) ─────────────
export const getAllComplaintsAdminDebug = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT c.*, ci.name as citizen_name, ci.mobile as citizen_mobile
            FROM complaints c
            LEFT JOIN citizens ci ON c.citizen_id = ci.id
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
        // Validate citizen_id — it must be a real UUID or we fall back to the first citizen in the DB
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let citizenId = req.body.citizen_id;
        const isValidUuid = citizenId && UUID_REGEX.test(citizenId);

        if (!isValidUuid) {
            const cit = await pool.query("SELECT id FROM citizens LIMIT 1");
            citizenId = cit.rows.length > 0 ? cit.rows[0].id : null;
        }

        if (!citizenId) {
            return fail(res, "No citizen found in DB to attribute this complaint to.", 422);
        }

        let { category, issue_category, department, subject, description, ward, priority, name, phone } = req.body;
        
        // Fallback for subject if missing in debug route
        if (!subject || subject.trim() === '') {
            subject = category || issue_category || "Debug Complaint";
        }

        const ticketNumber = generateTicketNumber("CMP");

        // Use provided name/phone for offline attribution, else look up from DB
        const citizenName = name || null;

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, category, issue_category, department, subject, description, ward, priority, status)
             VALUES ($1, $2, COALESCE($3, (SELECT name FROM citizens WHERE id = $2)), $4, $5, $6, $7, $8, $9, $10, 'submitted')
             RETURNING *`,
            [ticketNumber, citizenId, citizenName, category, issue_category || null, department, subject, description, ward || null, priority || "medium"]
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

        await pool.query(
            `UPDATE complaint_stages SET status = 'completed', updated_at = NOW()
             WHERE complaint_id = $1 AND status = 'current'`,
            [id]
        );

        await pool.query(
            `UPDATE complaint_stages SET status = 'current', notes = $1, updated_by = $2, updated_at = NOW()
             WHERE complaint_id = $3 AND stage = $4`,
            [notes || null, updatedBy, id, status]
        );

        return success(res, "Complaint updated (DEBUG)", result.rows[0]);
    } catch (err) {
        next(err);
    }
};
