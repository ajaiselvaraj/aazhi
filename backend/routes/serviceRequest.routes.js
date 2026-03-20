// ═══════════════════════════════════════════════════════════════
// Service Request Routes
// POST /api/service-requests                      - Create request
// GET  /api/service-requests                      - My requests
// GET  /api/service-requests/track/:ticketNumber  - Track by ticket
// GET  /api/service-requests/search               - Search
// PUT  /api/service-requests/:id/status           - Update status (staff)
// ═══════════════════════════════════════════════════════════════

import express from "express";
import {
    createServiceRequest, trackServiceRequest,
    getMyServiceRequests, getAllServiceRequestsAdmin, updateServiceRequestStatus, searchRequests,
} from "../controllers/serviceRequest.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";
import { validate, createServiceRequestSchema, updateServiceRequestStatusSchema } from "../utils/validator.js";

const router = express.Router();

// A. Temporary Debug Fix: Bypass Auth to Test Insert
// Uncomment the route below to test insertions without an Authorization header
// Warning: Replace with mock user ID from your citizens table to avoid FK constraint errors!
router.post("/debug", (req, res, next) => {
    console.log("⚠️ [DEBUG] Triggering Auth Bypass for /debug route");
    req.user = { id: "9eb3f201-174d-48e9-a061-b88093fe58dc", role: "citizen" }; // Valid Mock DB ID
    next();
}, validate(createServiceRequestSchema), createServiceRequest);

router.post("/", authMiddleware, validate(createServiceRequestSchema), createServiceRequest);
router.get("/", authMiddleware, getMyServiceRequests);
router.get("/admin", authMiddleware, staffOnly, getAllServiceRequestsAdmin);
router.get("/search", optionalAuth, searchRequests);
router.get("/track/:ticketNumber", optionalAuth, trackServiceRequest);
router.put("/:id/status", authMiddleware, staffOnly, validate(updateServiceRequestStatusSchema), updateServiceRequestStatus);

export default router;
