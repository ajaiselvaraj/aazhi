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
    getMyServiceRequests, updateServiceRequestStatus, searchRequests,
    getAllRequestsAdminDebug, createRequestDebug, updateRequestStatusDebug
} from "../controllers/serviceRequest.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";
import { validate, createServiceRequestSchema, updateServiceRequestStatusSchema } from "../utils/validator.js";

const router = express.Router();

router.post("/", authMiddleware, validate(createServiceRequestSchema), createServiceRequest);
router.get("/", authMiddleware, getMyServiceRequests);

// --- DEBUG ROUTES ---
router.get("/admin/debug", getAllRequestsAdminDebug);
router.post("/debug", createRequestDebug);
router.put("/debug/:id/status", updateRequestStatusDebug);
// --------------------
router.get("/search", optionalAuth, searchRequests);
router.get("/track/:ticketNumber", optionalAuth, trackServiceRequest);
router.put("/:id/status", authMiddleware, staffOnly, validate(updateServiceRequestStatusSchema), updateServiceRequestStatus);

export default router;
