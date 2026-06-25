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
    getAllRequestsAdminDebug, createRequestDebug, updateRequestStatusDebug,
    addMessageToRequest, getMyServiceRequestsDebug
} from "../controllers/serviceRequest.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";
import { validate, createServiceRequestSchema, updateServiceRequestStatusSchema } from "../utils/validator.js";
import { trackingLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// --- RESTORED DEBUG ROUTES FOR KIOSK GUEST ACCESS ---
router.post("/debug", createRequestDebug);
router.get("/debug", getMyServiceRequestsDebug);
router.get("/admin/debug", getAllRequestsAdminDebug);
router.put("/:id/status/debug", updateRequestStatusDebug);
router.post("/", authMiddleware, validate(createServiceRequestSchema), createServiceRequest);
router.get("/", authMiddleware, getMyServiceRequests);
router.get("/admin", authMiddleware, staffOnly, getAllServiceRequestsAdmin);
router.get("/search", authMiddleware, searchRequests); // SEARCH requires auth to prevent data leak
router.get("/track/:ticketNumber", trackingLimiter, optionalAuth, trackServiceRequest);
router.put("/:id/status", authMiddleware, staffOnly, validate(updateServiceRequestStatusSchema), updateServiceRequestStatus);
router.post("/:id/messages", authMiddleware, addMessageToRequest);

export default router;
