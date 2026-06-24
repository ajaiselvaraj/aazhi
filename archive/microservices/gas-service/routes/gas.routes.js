// ═══════════════════════════════════════════════════════════════
// Gas Service Routes
// POST /api/gas/book       - Book cylinder
// GET  /api/gas/bills      - View gas bills
// GET  /api/gas/status     - Payment status
// GET  /api/gas/account    - Gas account details
// ═══════════════════════════════════════════════════════════════

import express from "express";
import { bookCylinder, viewBills, paymentStatus, getGasAccount, getQuickPayBill } from "../controllers/gas.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { checkServiceEnabled } from "../middleware/serviceCheck.middleware.js";

const router = express.Router();

router.use(checkServiceEnabled("gas"));

router.post("/book", authMiddleware, bookCylinder);
router.get("/bills", authMiddleware, viewBills);
router.get("/quick-pay/:consumerId", getQuickPayBill);
router.get("/status", authMiddleware, paymentStatus);
router.get("/account", authMiddleware, getGasAccount);

export default router;