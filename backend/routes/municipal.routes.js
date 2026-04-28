// ═══════════════════════════════════════════════════════════════
// Municipal Services Routes
// GET  /api/municipal/water/bills       - Water bills
// GET  /api/municipal/property-tax      - Property tax bills
// POST /api/municipal/property-tax/pay  - Verify property tax for payment
// POST /api/municipal/address-change    - Request address change
// POST /api/municipal/waste             - Waste management request
// GET  /api/municipal/requests          - My service requests
// ═══════════════════════════════════════════════════════════════

import express from "express";
import {
    getWaterBills, getPropertyTax, payPropertyTax,
    addressChange, wasteServiceRequest, getMyServiceRequests, getWaterQuickPayBill
} from "../controllers/municipal.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/water/bills", authMiddleware, getWaterBills);
router.get("/water/quick-pay/:id", getWaterQuickPayBill); // Public route for Quick Pay
router.get("/property-tax", authMiddleware, getPropertyTax);
router.post("/property-tax/pay", authMiddleware, payPropertyTax);
router.post("/address-change", authMiddleware, addressChange);
router.post("/waste", authMiddleware, wasteServiceRequest);
router.get("/requests", authMiddleware, getMyServiceRequests);

export default router;