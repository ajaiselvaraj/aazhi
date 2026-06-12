// ═══════════════════════════════════════════════════════════════
// Complaint Controller
// Register, Track, Update, List complaints
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import { generateTicketNumber, isValidUuid } from "../utils/helpers.js";
import logger from "../utils/logger.js";
import axios from "axios";
import { emitComplaintStatusUpdate, emitComplaintTimelineUpdate } from "../socket.js"; // ⭐ PLUG-IN: real-time tracking

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5005';

// Helper to proactively sync citizen name in DB if currently null/empty
const syncCitizenName = async (citizenId, name) => {
    if (!citizenId || !name || name === 'Unknown' || name === 'Guest Citizen' || name === 'Developer Citizen' || name === 'Unknown Citizen') return;
    try {
        const citizenRes = await pool.query("SELECT name FROM citizens WHERE id = $1", [citizenId]);
        if (citizenRes.rows.length > 0 && !citizenRes.rows[0].name) {
            await pool.query("UPDATE citizens SET name = $1, updated_at = NOW() WHERE id = $2", [name.trim(), citizenId]);
            logger.info(`👤 [Auth Sync] Proactively synced citizen name in DB to "${name.trim()}"`);
        }
    } catch (err) {
        logger.error(`⚠️ [Auth Sync] Failed to sync citizen name in DB: ${err.message}`);
    }
};

export const deriveCategory = (department, category, subject = '') => {
    const dept = (department || '').toLowerCase();
    const cat = (category || '').toLowerCase();
    const sub = (subject || '').toLowerCase();
    
    if (dept.includes('electricity') || dept.includes('power') || dept.includes('eb') || 
        cat.includes('electricity') || cat.includes('power') || cat.includes('eb')) {
        return 'power';
    }
    if (dept.includes('gas') || cat.includes('gas')) {
        return 'gas';
    }
    if (dept.includes('water') || dept.includes('municipal') || dept.includes('waste') || dept.includes('property') ||
        cat.includes('water') || cat.includes('municipal') || cat.includes('waste') || cat.includes('property') ||
        sub.includes('water') || sub.includes('municipal') || sub.includes('waste') || sub.includes('property')) {
        return 'municipal';
    }
    return 'civic';
};


// ─── Register Complaint ──────────────────────────────────
const WARD_COORDS = {
    'Ward 1': [26.182, 91.745],
    'Ward 2': [26.195, 91.758],
    'Ward 3': [26.171, 91.762],
    'Ward 4': [26.208, 91.731],
    'Ward 5': [26.164, 91.776],
    'Ward 6': [26.212, 91.724],
    'Ward 7': [26.155, 91.749],
    'Ward 8': [26.226, 91.768],
    'Ward 9': [26.141, 91.735],
    'Ward 10': [26.234, 91.752],
};

// ─── Register Complaint ──────────────────────────────────
export const registerComplaint = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        let { category, issue_category, department, subject, description, ward, priority, name, phone, latitude, longitude } = req.body;

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

        const citizenName = name || req.user?.name || null;
        const citizenMobile = phone || req.user?.mobileNumber || null;

        if (citizenName) {
            await syncCitizenName(citizenId, citizenName);
        }
        
        const finalMetadata = { ai_analysis: aiData, citizen_mobile: citizenMobile };
        // ═══════════════════════════════════════════════════════════════

        // Populate latitude and longitude if missing deterministically
        let finalLat = latitude;
        let finalLng = longitude;
        if (!finalLat || !finalLng) {
            const baseCoords = WARD_COORDS[ward] || [26.180, 91.740];
            const seed = (description || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const latJitter = ((seed % 100) / 100 - 0.5) * 0.01;
            const lngJitter = (((seed * 17) % 100) / 100 - 0.5) * 0.01;
            finalLat = baseCoords[0] + latJitter;
            finalLng = baseCoords[1] + lngJitter;
        }

        const ticketNumber = generateTicketNumber("CMP");

        const requestCategory = req.body.request_category || deriveCategory(classifiedDepartment || department, category, subject || description);

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, citizen_mobile, category, issue_category, department, subject, description, ward, priority, status, latitude, longitude, request_category)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, $14)
             RETURNING *`,
            [ticketNumber, citizenId, citizenName, citizenMobile, category, issue_category || null, classifiedDepartment, subject, description, ward || null, classifiedPriority, finalLat, finalLng, requestCategory]
        );

        // ─── Dynamic stages from workflow_definitions (Single Source of Truth) ───
        let workflowStages = null;
        try {
            const wfResult = await pool.query(
                `SELECT stages FROM workflow_definitions 
                 WHERE workflow_type = 'complaint' AND is_active = true
                 ORDER BY updated_at DESC LIMIT 1`
            );
            if (wfResult.rows.length > 0) {
                workflowStages = wfResult.rows[0].stages;
            }
        } catch (wfErr) {
            // workflow_definitions table may not exist yet (pre-migration) — use fallback
            logger.warn("workflow_definitions lookup failed, using hardcoded fallback.", { error: wfErr.message });
        }

        const stageDefs = workflowStages || [
            { key: "pending",     label: "Submitted" },
            { key: "assigned",    label: "Assigned" },
            { key: "in_progress", label: "In Progress" },
            { key: "resolved",    label: "Resolved" },
        ];

        const stages = stageDefs.map((s, i) => ({
            stage: s.key,
            status: i === 0 ? "current" : "pending"
        }));
        // ──────────────────────────────────────────────────────────────────────────

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
        const { status, department, category, page = 1, limit = 10 } = req.query;
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
        
        const activeCategory = category || 'civic';
        if (activeCategory !== 'all') {
            query += ` AND request_category = $${params.length + 1}`;
            params.push(activeCategory);
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

// ─── DEBUG: Get My Complaints (Bypass Auth) ────────────────
export const getMyComplaintsDebug = async (req, res, next) => {
    try {
        const { citizen_id, phone, category } = req.query;
        if (!citizen_id && !phone) {
            return fail(res, "citizen_id or phone is required for debug fetching.", 400);
        }
 
        const validCitizenId = isValidUuid(citizen_id) ? citizen_id : null;
        let query = `SELECT * FROM complaints WHERE (citizen_id = $1 OR citizen_mobile = $2)`;
        const params = [validCitizenId, phone || null];
 
        const activeCategory = category || 'civic';
        if (activeCategory !== 'all') {
            query += ` AND request_category = $${params.length + 1}`;
            params.push(activeCategory);
        }
        query += ` ORDER BY created_at DESC LIMIT 50`;
        const result = await pool.query(query, params);

        return success(res, "Complaints retrieved (DEBUG)", result.rows);
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
        const isTicket = id.startsWith('CMP-') || id.startsWith('TKT-');
        if (!isTicket && !isValidUuid(id)) {
            return fail(res, "Invalid complaint identifier format.", 400);
        }

        const idCheckQuery = isTicket
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

        // ⭐ PLUG-IN: Emit real-time Socket.IO event (wrapped in try-catch — will NEVER break existing flow)
        try {
            const ticketNumber = result.rows[0].ticket_number;
            const socketPayload = {
                complaintId: actualId,
                ticketNumber: ticketNumber,
                oldStatus: current.rows[0].status,
                newStatus: finalStatus,
                notes: notes || null,
                resolutionNote: resolution_note || null,
                updatedAt: result.rows[0].updated_at,
            };

            // Emit to both UUID room and Ticket Number room to be 100% sure mobile phone receives it
            emitComplaintStatusUpdate(actualId, socketPayload);
            emitComplaintStatusUpdate(ticketNumber, socketPayload);
            
            emitComplaintTimelineUpdate(actualId, { stage: finalStatus, updatedAt: new Date().toISOString() });
            emitComplaintTimelineUpdate(ticketNumber, { stage: finalStatus, updatedAt: new Date().toISOString() });
        } catch (socketErr) {
            logger.warn("[Socket.IO] Failed to emit status update (non-critical):", socketErr.message);
        }

        return success(res, "Complaint status updated", result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── Add Message to Complaint ────────────────────────────
export const addMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidUuid(id)) {
            return fail(res, "Invalid complaint identifier format.", 400);
        }
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
        const { status, department, category, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                c.*, 
                COALESCE(c.citizen_name, ci.name) AS citizen_name, 
                COALESCE(c.citizen_mobile, ci.mobile) AS citizen_mobile
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
        
        const activeCategory = category || 'all';
        if (activeCategory !== 'all') {
            conditions.push(`c.request_category = $${params.length + 1}`);
            params.push(activeCategory);
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
        const { category } = req.query;
        let query = `
            SELECT 
                c.*, 
                COALESCE(c.citizen_name, ci.name) as citizen_name, 
                COALESCE(c.citizen_mobile, ci.mobile) as citizen_mobile
            FROM complaints c
            LEFT JOIN citizens ci ON c.citizen_id = ci.id
        `;
        const params = [];
        const activeCategory = category || 'all';
        if (activeCategory !== 'all') {
            query += ` WHERE c.request_category = $1`;
            params.push(activeCategory);
        }
        query += ` ORDER BY c.created_at DESC`;
        const result = await pool.query(query, params);
        return success(res, "All complaints retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};

// ─── DEBUG: Create Complaint (Bypass Auth) ────────────────
export const createComplaintDebug = async (req, res, next) => {
    try {
        // Validate citizen_id — it must be a real UUID or we fall back to the first citizen in the DB
        let citizenId = req.body.citizen_id;
        const isCitizenUuidValid = citizenId && isValidUuid(citizenId);

        if (!isCitizenUuidValid) {
            const cit = await pool.query("SELECT id FROM citizens LIMIT 1");
            citizenId = cit.rows.length > 0 ? cit.rows[0].id : null;
        }

        if (!citizenId) {
            return fail(res, "No citizen found in DB to attribute this complaint to.", 422);
        }

        let { category, issue_category, department, subject, description, ward, priority, name, phone, latitude, longitude } = req.body;
        
        // Fallback for subject if missing in debug route
        if (!subject || subject.trim() === '') {
            subject = category || issue_category || "Debug Complaint";
        }

        // Populate latitude and longitude if missing deterministically
        let finalLat = latitude;
        let finalLng = longitude;
        if (!finalLat || !finalLng) {
            const baseCoords = WARD_COORDS[ward] || [26.180, 91.740];
            const seed = (description || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const latJitter = ((seed % 100) / 100 - 0.5) * 0.01;
            const lngJitter = (((seed * 17) % 100) / 100 - 0.5) * 0.01;
            finalLat = baseCoords[0] + latJitter;
            finalLng = baseCoords[1] + lngJitter;
        }

        const ticketNumber = generateTicketNumber("CMP");

        // Use provided name/phone for offline attribution, else look up from DB
        const citizenName = name || req.body.citizen_name || null;

        if (citizenName) {
            await syncCitizenName(citizenId, citizenName);
        }

        const requestCategory = req.body.request_category || deriveCategory(department, category, subject || description);

        const result = await pool.query(
            `INSERT INTO complaints 
             (ticket_number, citizen_id, citizen_name, citizen_mobile, category, issue_category, department, subject, description, ward, priority, status, latitude, longitude, request_category)
             VALUES ($1, $2, COALESCE($3, (SELECT name FROM citizens WHERE id = $2), 'No Name Provided'), $4, $5, $6, $7, $8, $9, $10, $11, 'submitted', $12, $13, $14)
             RETURNING *`,
            [ticketNumber, citizenId, citizenName, phone || req.body.citizen_mobile || null, category, issue_category || null, department, subject, description, ward || null, priority || "medium", finalLat, finalLng, requestCategory]
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
        if (!isValidUuid(id)) {
            return fail(res, "Invalid complaint identifier format.", 400);
        }
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
