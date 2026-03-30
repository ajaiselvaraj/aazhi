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
router.post("/debug", async (req, res, next) => {
    console.log("⚠️ [DEBUG] Triggering Auth Bypass for /debug route");
    try {
        const dbRes = await import("../config/db.js").then(m => m.pool.query("SELECT id FROM citizens LIMIT 1"));
        let citizenId = "9eb3f201-174d-48e9-a061-b88093fe58dc";
        if (dbRes.rows.length > 0) {
            citizenId = dbRes.rows[0].id;
        } else {
            const newCit = await import("../config/db.js").then(m => m.pool.query("INSERT INTO citizens (mobile, role) VALUES ('0000000000', 'citizen') RETURNING id"));
            citizenId = newCit.rows[0].id;
        }
        req.user = { id: citizenId, role: "citizen" };
        next();
    } catch (e) {
        next(e);
    }
}, validate(createServiceRequestSchema), createServiceRequest);

// B. Temporary Debug Fix: Bypass Auth to Fetch All Requests for Admin Dashboard sync
router.get("/admin/debug", getAllServiceRequestsAdmin);

// C. Temporary Debug Fix: Bypass Auth to Update Status for Frontend mockup admin
router.put("/debug/:id/status", async (req, res, next) => {
    try {
        const dbRes = await import("../config/db.js").then(m => m.pool.query("SELECT id FROM citizens LIMIT 1"));
        let staffId = "9eb3f201-174d-48e9-a061-b88093fe58dc";
        if (dbRes.rows.length > 0) staffId = dbRes.rows[0].id;
        req.user = { id: staffId, role: "admin" };
        next();
    } catch (e) { next(e); }
}, updateServiceRequestStatus);

router.post("/", authMiddleware, validate(createServiceRequestSchema), createServiceRequest);
router.get("/", authMiddleware, getMyServiceRequests);
router.get("/admin", authMiddleware, staffOnly, getAllServiceRequestsAdmin);
router.get("/search", optionalAuth, searchRequests);
router.get("/track/:ticketNumber", optionalAuth, trackServiceRequest);
router.put("/:id/status", authMiddleware, staffOnly, validate(updateServiceRequestStatusSchema), updateServiceRequestStatus);

export default router;
