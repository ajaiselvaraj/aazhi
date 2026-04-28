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
        const { consumerId, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT t.*, b.bill_number, b.service_type, b.billing_month, b.billing_year,
                    ua.account_number
             FROM transactions t
             JOIN bills b ON t.bill_id = b.id
             JOIN utility_accounts ua ON b.account_id = ua.id
             WHERE b.service_type = 'electricity'`;
        
        const params = [];

        if (consumerId) {
            query += ` AND ua.account_number = $${params.length + 1}`;
            params.push(consumerId);
        } else if (req.user) {
            query += ` AND t.citizen_id = $${params.length + 1}`;
            params.push(req.user.id);
        } else {
            return fail(res, "Consumer ID or authentication required", 401);
        }

        query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        
        // Mock data for demo if nothing found and consumerId provided
        if (result.rows.length === 0 && consumerId) {
             return success(res, "Demo history retrieved", [
                 { consumerId, date: '2026-04-10', amount: 850.00, transactionId: 'TXN88921', status: 'Success' },
                 { consumerId, date: '2026-03-12', amount: 920.00, transactionId: 'TXN77210', status: 'Success' },
                 { consumerId, date: '2026-02-15', amount: 780.00, transactionId: 'TXN66105', status: 'Success' }
             ]);
        }

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

// ─── Get Bill by Consumer Number (Quick Pay) ─────────────
export const getQuickPayBill = async (req, res, next) => {
    try {
        const { id: consumerNumber } = req.params;

        // Implementation Note: In a real bill payment system, this would call the utility provider's API.
        // Here we query our bills table linked via utility_accounts.
        const result = await pool.query(
            `SELECT b.*, ua.account_number, c.name as citizen_name
             FROM bills b 
             JOIN utility_accounts ua ON b.account_id = ua.id
             JOIN citizens c ON b.citizen_id = c.id
             WHERE ua.account_number = $1 AND b.service_type = 'electricity'
             AND b.status = 'pending'
             ORDER BY b.due_date ASC LIMIT 1`,
            [consumerNumber]
        );

        if (result.rows.length === 0) {
            // For Demo Purposes: If the characteristic "04-123-456" is used, return a mock bill if not found in DB
            if (consumerNumber === '04-123-456' || consumerNumber === '123456789' || /^\d{12}$/.test(consumerNumber)) {
                return success(res, "Demo bill retrieved", {
                    id: "demo-bill-id",
                    account_number: consumerNumber,
                    amount: 1450.50,
                    billing_month: "April",
                    billing_year: "2026",
                    bill_number: "ELE-DEMO-99",
                    due_date: "2026-05-15",
                    status: "pending",
                    metadata: {
                        consumer_name_masked: "RAM*** KUMA*"
                    }
                });
            }
            return fail(res, "No pending bill found for this consumer number.", 404);
        }

        const bill = result.rows[0];
        // Mask the name for security in public fetch
        if (bill.citizen_name) {
            const names = bill.citizen_name.split(' ');
            bill.metadata = {
                ...bill.metadata,
                consumer_name_masked: names.map(n => n[0] + '*'.repeat(Math.max(0, n.length - 1))).join(' ')
            };
        }

        return success(res, "Bill details retrieved", bill);
    } catch (err) {
        next(err);
    }
};