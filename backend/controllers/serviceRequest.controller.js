// ═══════════════════════════════════════════════════════════════
// Service Request Controller
// Generic service request lifecycle management
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import { generateTicketNumber } from "../utils/helpers.js";
import logger from "../utils/logger.js";

// ─── Create Service Request ──────────────────────────────
export const createServiceRequest = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        let { request_type, department, description, ward, phone, metadata } = req.body;

        // XSS & DB Overload limits (VULN: DoW)
        if (description && typeof description === 'string' && description.length > 5000) {
            description = description.substring(0, 5000); // Strict length truncate
        }
        if (metadata && JSON.stringify(metadata).length > 20000) {
            return fail(res, "Metadata payload exceeds strict limits.", 400);
        }

        const ticketNumber = generateTicketNumber("SRQ");

        const result = await pool.query(
            `INSERT INTO service_requests 
             (ticket_number, citizen_id, citizen_name, request_type, department, description, ward, phone, metadata, status, current_stage)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), $3, $4, $5, $6, $7, $8, 'submitted', 'submitted')
             RETURNING *`,
            [ticketNumber, citizenId, request_type, department, description, ward || null, phone || null, JSON.stringify(metadata || {})]
        );

        // Insert lifecycle stages
        const stages = ["submitted", "under_review", "verification", "approval_pending", "completed"];
        for (let i = 0; i < stages.length; i++) {
            await pool.query(
                `INSERT INTO service_request_stages (service_request_id, stage, status)
                 VALUES ($1, $2, $3)`,
                [result.rows[0].id, stages[i], i === 0 ? "current" : "pending"]
            );
        }

        logger.info("Service request created", { citizenId, ticketNumber, request_type, department });

        return success(res, "Service request submitted", result.rows[0], 201);
    } catch (err) {
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
        const { status, notes } = req.body;
        const updatedBy = req.user.id;

        const current = await pool.query("SELECT * FROM service_requests WHERE id = $1", [id]);
        if (current.rows.length === 0) {
            return fail(res, "Service request not found.", 404);
        }

        // Update request
        const result = await pool.query(
            `UPDATE service_requests SET status = $1, current_stage = $1, updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [status, id]
        );

        // Update stages
        await pool.query(
            `UPDATE service_request_stages SET status = 'completed', updated_at = NOW()
             WHERE service_request_id = $1 AND status = 'current'`,
            [id]
        );

        await pool.query(
            `UPDATE service_request_stages SET status = 'current', notes = $1, updated_by = $2, updated_at = NOW()
             WHERE service_request_id = $3 AND stage = $4`,
            [notes || null, updatedBy, id, status]
        );

        logger.info("Service request updated", { requestId: id, newStatus: status, updatedBy });

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
