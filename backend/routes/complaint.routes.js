// ═══════════════════════════════════════════════════════════════
// Complaint Routes
// POST /api/complaints                      - Register complaint
// GET  /api/complaints                      - My complaints
// GET  /api/complaints/track/:ticketNumber  - Track by ticket
// PUT  /api/complaints/:id/status           - Update status (admin/staff)
// POST /api/complaints/:id/messages         - Add message
// ═══════════════════════════════════════════════════════════════

import express from "express";
import {
    registerComplaint, trackComplaint,
    getMyComplaints, updateComplaintStatus, addMessage, getAllComplaintsAdmin,
    getAllComplaintsAdminDebug, createComplaintDebug, updateComplaintStatusDebug,
    getMyComplaintsDebug
} from "../controllers/complaint.controller.js";
import { getPublicWorkflow } from "../controllers/admin.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";
import { checkServiceEnabled } from "../middleware/serviceCheck.middleware.js";
import { validate, createComplaintSchema, updateComplaintStatusSchema } from "../utils/validator.js";

const router = express.Router();

router.use(checkServiceEnabled("complaints"));

// --- DEBUG ROUTES ---
router.get("/admin/debug", getAllComplaintsAdminDebug);
router.get("/debug", getMyComplaintsDebug);
router.post("/debug", createComplaintDebug);
router.put("/debug/:id/status", updateComplaintStatusDebug);
// --------------------

// --- PUBLIC: Workflow Definition (no auth — used by user-side hook) ---
// GET /api/complaints/workflow/complaint        - complaint stages
// GET /api/complaints/workflow/service_request  - service request stages
router.get("/workflow/:type", getPublicWorkflow);
// -------------------------------------------------------------------

router.post("/", authMiddleware, validate(createComplaintSchema), registerComplaint);
router.get("/", authMiddleware, getMyComplaints);
router.get("/admin", authMiddleware, staffOnly, getAllComplaintsAdmin);
router.get("/track/:ticketNumber", optionalAuth, trackComplaint);
router.put("/:id/status", authMiddleware, staffOnly, validate(updateComplaintStatusSchema), updateComplaintStatus);
router.post("/:id/messages", authMiddleware, addMessage);

export default router;
