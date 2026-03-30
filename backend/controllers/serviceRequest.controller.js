// ═══════════════════════════════════════════════════════════════
// Service Request Controller
// Generic service request lifecycle management
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { supabase } from "../config/supabaseClient.js";
import { success, fail, paginated } from "../utils/response.js";
import { generateTicketNumber } from "../utils/helpers.js";
import logger from "../utils/logger.js";

// ─── Create Service Request (Auto Supabase / Postgres Version) ──
export const createServiceRequest = async (req, res, next) => {
    try {
        console.log("📥 [DEBUG] Incoming Service Request Body:", req.body);
        
        const useSupabaseRest = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!useSupabaseRest) {
            console.warn("⚠️ [WARN] SUPABASE_SERVICE_ROLE_KEY missing. Falling back to direct database pooling (which still goes to Supabase DB)!");
        }

        const citizenId = req.user.id;
        let { request_type, department, description, ward, phone, metadata } = req.body;

        if (description && typeof description === 'string' && description.length > 5000) {
            description = description.substring(0, 5000); 
        }
        if (metadata && JSON.stringify(metadata).length > 20000) {
            return fail(res, "Metadata payload exceeds strict limits.", 400);
        }

        const ticketNumber = generateTicketNumber("SRQ");
        let requestRecord;

        if (useSupabaseRest) {
            // ─── SUPABASE REST API MODE ───
            let citizenName = 'Unknown';
            try {
                const { data: citizenData } = await supabase.from('citizens').select('name').eq('id', citizenId).single();
                if (citizenData) citizenName = citizenData.name;
            } catch (e) {
                console.error("⚠️ [WARN] Failed getting citizen name", e);
            }

            const insertPayload = {
                ticket_number: ticketNumber,
                citizen_id: citizenId,
                citizen_name: citizenName,
                request_type: request_type,
                department: department,
                description: description,
                ward: ward || null,
                phone: phone || null,
                metadata: metadata || {},
                stage: 'submitted', 
                status: 'active'
            };

            console.log("🚀 [SUPABASE] Attempting insert into 'service_requests':", insertPayload.ticket_number);
            const { data: insertedData, error: insertError } = await supabase.from("service_requests").insert([insertPayload]).select();

            if (insertError) {
                console.error("❌ [SUPABASE ERROR] Insert rejected by Database:", {
                    message: insertError.message,
                    details: insertError.details,
                    hint: insertError.hint,
                    code: insertError.code
                });
                return fail(res, `Database error: ${insertError.message}`, 500);
            }
            if (!insertedData || insertedData.length === 0) {
                console.error("❌ [SUPABASE ERROR] Insert succeeded but no data returned. Check RLS policies.");
                return fail(res, "Request created but failed to retrieve confirmation.", 500);
            }
            
            requestRecord = insertedData[0];

            const stages = ["Submitted", "Officer Assigned", "Manager Review", "GM Approval", "Resolved"];
            const stagesToInsert = stages.map((stage, i) => ({
                service_request_id: requestRecord.id,
                stage: stage,
                status: i === 0 ? "current" : "pending"
            }));

            await supabase.from("service_request_stages").insert(stagesToInsert);

        } else {
            // ─── POSTGRES DIRECT DRIVER MODE (FALLBACK) ───
            const result = await pool.query(
                `INSERT INTO service_requests 
                 (ticket_number, citizen_id, citizen_name, request_type, department, description, ward, phone, metadata, stage, status)
                 VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), $3, $4, $5, $6, $7, $8, 'submitted', 'active')
                 RETURNING *`,
                [ticketNumber, citizenId, request_type, department, description, ward || null, phone || null, JSON.stringify(metadata || {})]
            );
            
            requestRecord = result.rows[0];

            const stages = ["Submitted", "Officer Assigned", "Manager Review", "GM Approval", "Resolved"];
            for (let i = 0; i < stages.length; i++) {
                await pool.query(
                    `INSERT INTO service_request_stages (service_request_id, stage, status) VALUES ($1, $2, $3)`,
                    [requestRecord.id, stages[i], i === 0 ? "current" : "pending"]
                );
            }
        }

        console.log("✅ [DEBUG] Successfully inserted service request:", requestRecord.ticket_number);
        logger.info("Service request created", { citizenId, ticketNumber, request_type, department });

        return success(res, "Service request submitted", requestRecord, 201);
    } catch (err) {
        console.error("❌ [FATAL ERROR] Unexpected bug in createServiceRequest:", err);
        next(err);
    }
};

// ─── Track by Ticket Number ──────────────────────────────
export const trackServiceRequest = async (req, res, next) => {
    try {
        const { ticketNumber } = req.params;

        const sr = await pool.query(
            `SELECT sr.*, c.name as citizen_name, c.mobile as citizen_mobile
             FROM service_requests sr
             JOIN citizens c ON sr.citizen_id = c.id
             WHERE sr.ticket_number = $1`,
            [ticketNumber]
        );

        if (sr.rows.length === 0) {
            return fail(res, "Service request not found.", 404);
        }

        // Get stages
        const stages = await pool.query(
            `SELECT stage, status, notes, updated_at
             FROM service_request_stages
             WHERE service_request_id = $1
             ORDER BY updated_at ASC`,
            [sr.rows[0].id]
        );

        // Get messages
        const messages = await pool.query(
            `SELECT m.*, c.name as sender_name
             FROM messages m
             LEFT JOIN citizens c ON m.sender_id = c.id
             WHERE m.service_request_id = $1
             ORDER BY m.created_at ASC`,
            [sr.rows[0].id]
        );

        return success(res, "Service request details", {
            ...sr.rows[0],
            stages: stages.rows,
            messages: messages.rows,
        });
    } catch (err) {
        next(err);
    }
};

// ─── Get My Service Requests ─────────────────────────────
export const getMyServiceRequests = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { status, department, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM service_requests WHERE citizen_id = $1`;
        const params = [citizenId];

        if (status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(status);
        }
        if (department) {
            query += ` AND department = $${params.length + 1}`;
            params.push(department);
        }

        const countQuery = query.replace("SELECT *", "SELECT COUNT(*)");
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return paginated(res, "Service requests retrieved", result.rows, {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Get All Service Requests (Admin/Staff Only) ─────────
export const getAllServiceRequestsAdmin = async (req, res, next) => {
    try {
        const { status, department, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT sr.*, c.name AS citizen_name, c.mobile AS citizen_mobile
            FROM service_requests sr
            LEFT JOIN citizens c ON sr.citizen_id = c.id
        `;
        const params = [];

        const conditions = [];
        if (status) {
            conditions.push(`sr.status = $${params.length + 1}`);
            params.push(status);
        }
        if (department) {
            conditions.push(`sr.department = $${params.length + 1}`);
            params.push(department);
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        const countQuery = `SELECT COUNT(*) FROM service_requests sr${conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''}`;
        const countResult = await pool.query(countQuery, params);

        query += ` ORDER BY sr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return paginated(res, "All service requests retrieved", result.rows, {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Update Service Request Status (Admin/Staff) ─────────
export const updateServiceRequestStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { stage, status, notes, rejection_reason } = req.body;
        const updatedBy = req.user.id;

        const idCheckQuery = id.startsWith('TKT-') || id.startsWith('SRQ-') 
            ? "SELECT * FROM service_requests WHERE ticket_number = $1" 
            : "SELECT * FROM service_requests WHERE id = $1";

        const current = await pool.query(idCheckQuery, [id]);
        if (current.rows.length === 0) {
            return fail(res, "Service request not found.", 404);
        }
        
        const actualId = current.rows[0].id;

        // Logical overrides
        let finalStatus = (status || current.rows[0].status).toLowerCase();
        let finalStage = stage || current.rows[0].stage;

        if (finalStage.toLowerCase() === "resolved" || finalStage === "Completed") {
            finalStatus = "resolved";
        }
        
        console.log(`🔄 [DEBUG] Updating Service Request ${actualId}: stage=${finalStage}, status=${finalStatus}`);

        // Update request
        const updateFields = ["stage = $1", "status = $2", "updated_at = NOW()"];
        const updateParams = [finalStage, finalStatus, actualId];

        if (rejection_reason) {
            updateFields.push(`rejection_reason = $${updateParams.length + 1}`);
            updateParams.push(rejection_reason);
        }

        const result = await pool.query(
            `UPDATE service_requests SET ${updateFields.join(", ")} WHERE id = $3 RETURNING *`,
            updateParams
        );

        // Update stages
        // Mark previous current stage as completed
        await pool.query(
            `UPDATE service_request_stages SET status = 'completed', updated_at = NOW()
             WHERE service_request_id = $1 AND status = 'current'`,
            [actualId]
        );

        // Handle case where specific stage might not exist in the pre-defined list
        const stageCheck = await pool.query(
            "SELECT id FROM service_request_stages WHERE service_request_id = $1 AND stage = $2",
            [actualId, finalStage]
        );

        if (stageCheck.rows.length > 0) {
            await pool.query(
                `UPDATE service_request_stages SET status = 'current', notes = $1, updated_by = $2, updated_at = NOW()
                 WHERE service_request_id = $3 AND stage = $4`,
                [notes || rejection_reason || null, updatedBy, actualId, finalStage]
            );
        } else {
            // Flexible stage insertion
            await pool.query(
                `INSERT INTO service_request_stages (service_request_id, stage, status, notes, updated_by)
                 VALUES ($1, $2, 'current', $3, $4)`,
                [actualId, finalStage, notes || rejection_reason || null, updatedBy]
            );
        }

        logger.info("Service request updated", { requestId: actualId, newStatus: finalStatus, updatedBy });

        return success(res, "Service request status updated", result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── Search by Ticket Number or Phone ────────────────────
export const searchRequests = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'staff')) {
            return fail(res, "Unauthorized. You do not have clearance to search global requests.", 403);
        }

        const { query: searchQuery } = req.query;

        if (!searchQuery || searchQuery.length < 3) {
            return fail(res, "Search query must be at least 3 characters.", 400);
        }

        const result = await pool.query(
            `SELECT sr.*, c.name as citizen_name 
             FROM service_requests sr
             JOIN citizens c ON sr.citizen_id = c.id
             WHERE sr.ticket_number ILIKE $1 OR sr.phone ILIKE $1 OR c.name ILIKE $1
             ORDER BY sr.created_at DESC LIMIT 20`,
            [`%${searchQuery}%`]
        );

        return success(res, "Search results", result.rows);
    } catch (err) {
        next(err);
    }
};
