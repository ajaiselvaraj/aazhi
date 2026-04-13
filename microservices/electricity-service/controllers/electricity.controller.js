// ═══════════════════════════════════════════════════════════════
// Electricity Service Controller
// Bill viewing, payment, history, new connection requests
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { success, fail, paginated } from "../utils/response.js";
import logger from "../utils/logger.js";

// ─── Get Electricity Bills for User ──────────────────────
export const getBills = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT b.*, ua.account_number, ua.meter_number 
            FROM bills b 
            JOIN utility_accounts ua ON b.account_id = ua.id 
            WHERE b.citizen_id = $1 AND b.service_type = 'electricity'`;
        const params = [citizenId];

        if (status) {
            query += ` AND b.status = $${params.length + 1}`;
            params.push(status);
        }

        query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM bills WHERE citizen_id = $1 AND service_type = 'electricity'`,
            [citizenId]
        );

        return paginated(res, "Electricity bills retrieved", result.rows, {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Get Single Bill Details ─────────────────────────────
export const getBillById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT b.*, ua.account_number, ua.meter_number, c.name as citizen_name
             FROM bills b 
             JOIN utility_accounts ua ON b.account_id = ua.id
             JOIN citizens c ON b.citizen_id = c.id
             WHERE b.id = $1 AND b.service_type = 'electricity'`,
            [id]
        );

        if (result.rows.length === 0) {
            return fail(res, "Bill not found.", 404);
        }

        return success(res, "Bill details retrieved", result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── Get Payment History ─────────────────────────────────
export const getPaymentHistory = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT t.*, b.bill_number, b.service_type, b.billing_month, b.billing_year,
                    ua.account_number
             FROM transactions t
             JOIN bills b ON t.bill_id = b.id
             JOIN utility_accounts ua ON b.account_id = ua.id
             WHERE t.citizen_id = $1 AND b.service_type = 'electricity'
             ORDER BY t.created_at DESC
             LIMIT $2 OFFSET $3`,
            [citizenId, parseInt(limit), parseInt(offset)]
        );

        return success(res, "Payment history retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};

// ─── Get Electricity Account Info ────────────────────────
export const getAccount = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT ua.*, c.name, c.mobile, c.aadhaar_masked, c.ward, c.zone
             FROM utility_accounts ua
             JOIN citizens c ON ua.citizen_id = c.id
             WHERE ua.citizen_id = $1 AND ua.service_type = 'electricity'`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return fail(res, "No electricity account found.", 404);
        }

        return success(res, "Electricity account details", result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── Submit New Connection Request ───────────────────────
export const requestNewConnection = async (req, res, next) => {
    try {
        const { description, ward, phone } = req.body;
        const citizenId = req.user.id;

        // Use the service_requests system
        const { generateTicketNumber } = await import("../utils/helpers.js");
        const ticketNumber = generateTicketNumber("ELEC");

        const result = await pool.query(
            `INSERT INTO service_requests 
             (ticket_number, citizen_id, citizen_name, request_type, department, description, ward, phone, status, current_stage)
             VALUES ($1, $2, (SELECT name FROM citizens WHERE id = $2), 'New Electricity Connection', 'Electricity', $3, $4, $5, 'submitted', 'submitted')
             RETURNING *`,
            [ticketNumber, citizenId, description, ward || null, phone || null]
        );

        // Insert initial tracking stages
        const stages = ["submitted", "under_review", "verification", "approval_pending", "completed"];
        for (let i = 0; i < stages.length; i++) {
            await pool.query(
                `INSERT INTO service_request_stages (service_request_id, stage, status)
                 VALUES ($1, $2, $3)`,
                [result.rows[0].id, stages[i], i === 0 ? "current" : "pending"]
            );
        }

        logger.info("New electricity connection requested", { citizenId, ticketNumber });

        return success(res, "New connection request submitted", result.rows[0], 201);
    } catch (err) {
        next(err);
    }
};

// ─── Get Bill Details for Quick Pay (Unauthenticated) ──────
export const getQuickPayBill = async (req, res, next) => {
    try {
        const { consumerId } = req.params;
        const result = await pool.query(
            `SELECT b.id, b.bill_number, b.amount, b.due_date, b.status, b.billing_month, b.billing_year,
                    ua.account_number, c.name as consumer_name_masked 
             FROM bills b 
             JOIN utility_accounts ua ON b.account_id = ua.id
             JOIN citizens c ON b.citizen_id = c.id
             WHERE ua.account_number = $1 AND b.service_type = 'electricity'
             ORDER BY b.created_at DESC LIMIT 1`,
            [consumerId]
        );

        if (result.rows.length === 0) {
            return fail(res, "No bills found for this Consumer ID.", 404);
        }
        
        // Mask the consumer name for privacy since this is an unauthenticated endpoint
        const bill = result.rows[0];
        if (bill.consumer_name_masked) {
            const nameParts = bill.consumer_name_masked.split(" ");
            bill.consumer_name_masked = nameParts.map(n => n.charAt(0) + "*".repeat(n.length > 1 ? n.length - 1 : 0)).join(" ");
        }

        return success(res, "Quick Pay bill retrieved successfully", bill);
    } catch (err) {
        next(err);
    }
};