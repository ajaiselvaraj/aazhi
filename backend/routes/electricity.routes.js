// ═══════════════════════════════════════════════════════════════
// Electricity Service Routes
// GET  /api/electricity/bills          - Get user's electricity bills
// GET  /api/electricity/bills/:id      - Get single bill details
// GET  /api/electricity/history        - Payment history
// GET  /api/electricity/account        - Account details
// POST /api/electricity/new-connection - Request new connection
// ═══════════════════════════════════════════════════════════════

import express from "express";
import {
    getBills, getBillById, getPaymentHistory,
    getAccount, requestNewConnection, getQuickPayBill
} from "../controllers/electricity.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { checkServiceEnabled } from "../middleware/serviceCheck.middleware.js";

const router = express.Router();

router.use(checkServiceEnabled("electricity"));

router.get("/bills", authMiddleware, getBills);
router.get("/bills/:id", authMiddleware, getBillById);
router.get("/quick-pay/:id", getQuickPayBill); // Public route for Quick Pay
router.get("/history", authMiddleware, getPaymentHistory);
router.get("/account", authMiddleware, getAccount);
router.post("/new-connection", authMiddleware, requestNewConnection);

export default router;