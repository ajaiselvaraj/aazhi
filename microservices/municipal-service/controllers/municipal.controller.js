// ═══════════════════════════════════════════════════════════════
// Municipal Services Controller
// Water, Waste Management, Property Tax, Address Change
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import { generateTicketNumber } from "../utils/helpers.js";
import logger from "../utils/logger.js";

// ─── Water Bills ─────────────────────────────────────────
export const getWaterBills = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT b.*, ua.account_number
             FROM bills b
             JOIN utility_accounts ua ON b.account_id = ua.id
             WHERE b.citizen_id = $1 AND b.service_type = 'water'
             ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
            [citizenId, parseInt(limit), parseInt(offset)]
        );

        return success(res, "Water bills retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};

// ─── Property Tax ────────────────────────────────────────
export const getPropertyTax = async (req, res, next) => {
    try {
        const citizenId = req.user.id;

        const result = await pool.query(
            `SELECT b.*, ua.account_number
             FROM bills b
             JOIN utility_accounts ua ON b.account_id = ua.id
             WHERE b.citizen_id = $1 AND b.service_type = 'property'
             ORDER BY b.created_at DESC`,
            [citizenId]
        );

        return success(res, "Property tax bills retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};

// ─── Pay Property Tax ────────────────────────────────────
export const payPropertyTax = async (req, res, next) => {
    try {
        // Delegates to payment flow — this just validates the tax bill
        const { bill_id } = req.body;

        const bill = await pool.query(
            "SELECT * FROM bills WHERE id = $1 AND service_type = 'property' AND citizen_id = $2",
            [bill_id, req.user.id]
        );

        if (bill.rows.length === 0) {
            return fail(res, "Property tax bill not found.", 404);
        }

        if (bill.rows[0].status === "paid") {
            return fail(res, "This bill has already been paid.", 400);
        }

        return success(res, "Property tax bill verified. Proceed to payment.", bill.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── Address Change Request ──────────────────────────────
export const addressChange = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { description, ward, phone } = req.body;

        const ticketNumber = generateTicketNumber("MUN");

        const result = await pool.query(
            `INSERT INTO service_requests
             (ticket_number, citizen_id, citizen_name, request_type, department, description, ward, phone, status, current_stage)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), 'Address Change', 'Municipal', $3, $4, $5, 'submitted', 'submitted')
             RETURNING *`,
            [ticketNumber, citizenId, description, ward || null, phone || null]
        );

        // Insert tracking stages
        const stages = ["submitted", "under_review", "verification", "approval_pending", "completed"];
        for (let i = 0; i < stages.length; i++) {
            await pool.query(
                `INSERT INTO service_request_stages (service_request_id, stage, status)
                 VALUES ($1, $2, $3)`,
                [result.rows[0].id, stages[i], i === 0 ? "current" : "pending"]
            );
        }

        logger.info("Address change requested", { citizenId, ticketNumber });

        return success(res, "Address change request submitted", result.rows[0], 201);
    } catch (err) {
        next(err);
    }
};

// ─── Waste Management Service Request ────────────────────
export const wasteServiceRequest = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { description, ward, phone, request_type } = req.body;

        const ticketNumber = generateTicketNumber("WST");

        const result = await pool.query(
            `INSERT INTO service_requests
             (ticket_number, citizen_id, citizen_name, request_type, department, description, ward, phone, status, current_stage)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), $3, 'Waste Management', $4, $5, $6, 'submitted', 'submitted')
             RETURNING *`,
            [ticketNumber, citizenId, request_type || "Waste Collection", description, ward || null, phone || null]
        );

        const stages = ["submitted", "under_review", "verification", "approval_pending", "completed"];
        for (let i = 0; i < stages.length; i++) {
            await pool.query(
                `INSERT INTO service_request_stages (service_request_id, stage, status)
                 VALUES ($1, $2, $3)`,
                [result.rows[0].id, stages[i], i === 0 ? "current" : "pending"]
            );
        }

        logger.info("Waste service request", { citizenId, ticketNumber });

        return success(res, "Waste management service request submitted", result.rows[0], 201);
    } catch (err) {
        next(err);
    }
};

// ─── Get Municipal Service Requests ──────────────────────
export const getMyServiceRequests = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { department, status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `SELECT * FROM service_requests WHERE citizen_id = $1`;
        const params = [citizenId];

        if (department) {
            query += ` AND department = $${params.length + 1}`;
            params.push(department);
        }
        if (status) {
            query += ` AND status = $${params.length + 1}`;
            params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return success(res, "Service requests retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};