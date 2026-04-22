// ═══════════════════════════════════════════════════════════════
// Payment Routes
// POST /api/payment/create-order   - Create Razorpay payment order
// POST /api/payment/verify         - Verify payment after completion
// POST /api/payment/webhook        - Razorpay webhook endpoint
// GET  /api/payment/receipt/:id    - Get receipt details
// GET  /api/payment/transactions   - Get transaction history
// ═══════════════════════════════════════════════════════════════

import express from "express";
import {
    createOrder, verifyPayment, webhook,
    getReceipt, getTransactions,
    createGuestOrder, verifyGuestPayment
} from "../controllers/payment.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";
import { validate, createOrderSchema, verifyPaymentSchema } from "../utils/validator.js";

const router = express.Router();

router.post("/create-order", authMiddleware, paymentLimiter, validate(createOrderSchema), createOrder);
router.post("/verify", authMiddleware, validate(verifyPaymentSchema), verifyPayment);
router.post("/webhook", webhook); // No auth — Razorpay calls this directly
router.get("/receipt/:id", authMiddleware, getReceipt);
router.get("/transactions", authMiddleware, getTransactions);

// Guest Payment Routes
router.post("/guest-order", paymentLimiter, createGuestOrder);
router.post("/guest-verify", verifyGuestPayment);

// Temporary Test Route (Accessible at GET /api/payment/test)
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Payment route is working!" });
});

export default router;

