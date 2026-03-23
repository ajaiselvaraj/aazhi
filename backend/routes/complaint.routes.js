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
    getMyComplaints, updateComplaintStatus, addMessage, getAllComplaintsAdmin
} from "../controllers/complaint.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";
import { checkServiceEnabled } from "../middleware/serviceCheck.middleware.js";
import { validate, createComplaintSchema, updateComplaintStatusSchema } from "../utils/validator.js";

const router = express.Router();

router.use(checkServiceEnabled("complaints"));

// A. Temporary Debug Fix: Bypass Auth to Test Insert
router.post("/debug", (req, res, next) => {
    req.user = { id: "9eb3f201-174d-48e9-a061-b88093fe58dc", role: "citizen" }; // Valid Mock DB ID
    next();
}, validate(createComplaintSchema), registerComplaint);

// B. Temporary Debug Fix: Bypass Auth to Fetch All for Frontend sync
router.get("/admin/debug", getAllComplaintsAdmin);

router.post("/", authMiddleware, validate(createComplaintSchema), registerComplaint);
router.get("/", authMiddleware, getMyComplaints);
router.get("/track/:ticketNumber", optionalAuth, trackComplaint);
router.put("/:id/status", authMiddleware, staffOnly, validate(updateComplaintStatusSchema), updateComplaintStatus);
router.post("/:id/messages", authMiddleware, addMessage);

export default router;
