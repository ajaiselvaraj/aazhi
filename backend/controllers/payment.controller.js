// ═══════════════════════════════════════════════════════════════
// Payment Controller
// Razorpay Order Creation, Verification, Webhook, Receipts
// ═══════════════════════════════════════════════════════════════

import crypto from "crypto";
import { pool } from "../config/db.js";
import razorpay from "../config/razorpay.js";
import { success, fail } from "../utils/response.js";
import { generateReceiptNumber } from "../utils/helpers.js";
import logger from "../utils/logger.js";

// ─── Create Payment Order ────────────────────────────────
export const createOrder = async (req, res, next) => {
    try {
        const { bill_id, amount } = req.body;
        const citizenId = req.user.id;

        // Verify bill exists and belongs to user
        const bill = await pool.query(
            "SELECT * FROM bills WHERE id = $1 AND citizen_id = $2",
            [bill_id, citizenId]
        );

        if (bill.rows.length === 0) {
            return fail(res, "Bill not found.", 404);
        }

        if (bill.rows[0].status === "paid") {
            return fail(res, "Bill already paid.", 400);
        }

        // Create Razorpay order
        const receiptNumber = generateReceiptNumber();
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: "INR",
            receipt: receiptNumber,
            notes: {
                bill_id,
                citizen_id: citizenId,
                service_type: bill.rows[0].service_type,
            },
        });

        // Create transaction record
        const txn = await pool.query(
            `INSERT INTO transactions 
             (bill_id, citizen_id, amount, razorpay_order_id, receipt_number, payment_status)
             VALUES ($1, $2, $3, $4, $5, 'created')
             RETURNING *`,
            [bill_id, citizenId, amount, order.id, receiptNumber]
        );

        logger.info("Payment order created", {
            citizenId,
            billId: bill_id,
            orderId: order.id,
            amount,
        });

        return success(res, "Payment order created", {
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: receiptNumber,
            transaction_id: txn.rows[0].id,
            key_id: process.env.RAZORPAY_KEY,
        }, 201);
    } catch (err) {
        next(err);
    }
};

// ─── Verify Payment ──────────────────────────────────────
export const verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify signature
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            // Update transaction as failed
            await pool.query(
                `UPDATE transactions SET payment_status = 'failed', updated_at = NOW()
                 WHERE razorpay_order_id = $1`,
                [razorpay_order_id]
            );

            logger.warn("Payment signature mismatch", { razorpay_order_id });
            return fail(res, "Payment verification failed. Invalid signature.", 400);
        }

        // Update transaction
        const txn = await pool.query(
            `UPDATE transactions SET 
                razorpay_payment_id = $1,
                razorpay_signature = $2,
                payment_status = 'captured',
                paid_at = NOW(),
                updated_at = NOW()
             WHERE razorpay_order_id = $3
             RETURNING *`,
            [razorpay_payment_id, razorpay_signature, razorpay_order_id]
        );

        if (txn.rows.length === 0) {
            return fail(res, "Transaction not found.", 404);
        }

        const transaction = txn.rows[0];

        // Update bill status
        await pool.query(
            `UPDATE bills SET status = 'paid', paid_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [transaction.bill_id]
        );

        logger.info("Payment verified", {
            transactionId: transaction.id,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
        });

        return success(res, "Payment verified successfully", {
            transaction_id: transaction.id,
            receipt_number: transaction.receipt_number,
            amount: transaction.amount,
            payment_status: "captured",
            paid_at: transaction.paid_at,
        });
    } catch (err) {
        next(err);
    }
};

// ─── Create Guest Payment Order ──────────────────────────
export const createGuestOrder = async (req, res, next) => {
    try {
        const { amount } = req.body; // Amount in INR

        if (!amount || amount <= 0) {
            return fail(res, "Invalid amount", 400);
        }

        const receiptNumber = generateReceiptNumber();
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // paise
            currency: "INR",
            receipt: receiptNumber,
        });

        logger.info("Guest payment order created", { orderId: order.id, amount });

        return success(res, "Guest payment order created", {
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: receiptNumber,
            key_id: process.env.RAZORPAY_KEY,
        }, 201);
    } catch (err) {
        next(err);
    }
};

// ─── Verify Guest Payment ────────────────────────────────
export const verifyGuestPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            logger.warn("Guest payment signature mismatch", { razorpay_order_id });
            return fail(res, "Payment verification failed. Invalid signature.", 400);
        }

        logger.info("Guest payment verified", {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
        });

        return success(res, "Payment verified successfully", {
            payment_status: "captured",
            razorpay_payment_id
        });
    } catch (err) {
        next(err);
    }
};


// ─── Razorpay Webhook ────────────────────────────────────
export const webhook = async (req, res, next) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(JSON.stringify(req.body))
            .digest("hex");

        if (expectedSignature !== signature) {
            logger.warn("Webhook signature mismatch");
            return res.status(400).json({ status: "invalid_signature" });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        switch (event) {
            case "payment.captured": {
                const paymentEntity = payload.payment.entity;
                const orderId = paymentEntity.order_id;

                await pool.query(
                    `UPDATE transactions SET 
                        payment_status = 'captured',
                        razorpay_payment_id = $1,
                        gateway_response = $2,
                        paid_at = NOW(),
                        updated_at = NOW()
                     WHERE razorpay_order_id = $3`,
                    [paymentEntity.id, JSON.stringify(paymentEntity), orderId]
                );

                // Update bill
                const txn = await pool.query(
                    "SELECT bill_id FROM transactions WHERE razorpay_order_id = $1",
                    [orderId]
                );
                if (txn.rows.length > 0) {
                    await pool.query(
                        "UPDATE bills SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1",
                        [txn.rows[0].bill_id]
                    );
                }

                logger.info("Webhook: payment captured", { orderId, paymentId: paymentEntity.id });
                break;
            }

            case "payment.failed": {
                const failedPayment = payload.payment.entity;
                await pool.query(
                    `UPDATE transactions SET 
                        payment_status = 'failed',
                        gateway_response = $1,
                        updated_at = NOW()
                     WHERE razorpay_order_id = $2`,
                    [JSON.stringify(failedPayment), failedPayment.order_id]
                );

                logger.warn("Webhook: payment failed", { orderId: failedPayment.order_id });
                break;
            }

            case "refund.created": {
                const refundEntity = payload.refund.entity;
                await pool.query(
                    `UPDATE transactions SET 
                        payment_status = 'refunded',
                        gateway_response = $1,
                        updated_at = NOW()
                     WHERE razorpay_payment_id = $2`,
                    [JSON.stringify(refundEntity), refundEntity.payment_id]
                );

                logger.info("Webhook: refund created", { paymentId: refundEntity.payment_id });
                break;
            }

            default:
                logger.info("Webhook: unhandled event", { event });
        }

        return res.status(200).json({ status: "ok" });
    } catch (err) {
        logger.error("Webhook processing error", { error: err.message });
        return res.status(500).json({ status: "error" });
    }
};

// ─── Get Receipt Details ─────────────────────────────────
export const getReceipt = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT t.*, b.bill_number, b.service_type, b.amount as bill_amount,
                    b.billing_month, b.billing_year, b.billing_cycle,
                    c.name as citizen_name, c.mobile as citizen_mobile,
                    ua.account_number
             FROM transactions t
             JOIN bills b ON t.bill_id = b.id
             JOIN citizens c ON t.citizen_id = c.id
             JOIN utility_accounts ua ON b.account_id = ua.id
             WHERE t.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return fail(res, "Receipt not found.", 404);
        }

        const receipt = result.rows[0];

        return success(res, "Receipt retrieved", {
            receipt_number: receipt.receipt_number,
            transaction_id: receipt.id,
            citizen_name: receipt.citizen_name,
            citizen_mobile: receipt.citizen_mobile,
            account_number: receipt.account_number,
            service_type: receipt.service_type,
            bill_number: receipt.bill_number,
            billing_period: `${receipt.billing_month}-${receipt.billing_year}`,
            bill_amount: receipt.bill_amount,
            amount_paid: receipt.amount,
            payment_status: receipt.payment_status,
            payment_method: receipt.payment_method,
            razorpay_payment_id: receipt.razorpay_payment_id,
            paid_at: receipt.paid_at,
            generated_at: new Date().toISOString(),
        });
    } catch (err) {
        next(err);
    }
};

// ─── Get Transaction History ─────────────────────────────
export const getTransactions = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT t.*, b.bill_number, b.service_type
            FROM transactions t
            LEFT JOIN bills b ON t.bill_id = b.id
            WHERE t.citizen_id = $1`;
        const params = [citizenId];

        if (status) {
            query += ` AND t.payment_status = $${params.length + 1}`;
            params.push(status);
        }

        query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        return success(res, "Transactions retrieved", result.rows);
    } catch (err) {
        next(err);
    }
};
