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
router.post("/debug", async (req, res, next) => {
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
}, validate(createComplaintSchema), registerComplaint);

// B. Temporary Debug Fix: Bypass Auth to Fetch All for Frontend sync
router.get("/admin/debug", getAllComplaintsAdmin);

// C. Temporary Debug Fix: Bypass Auth to Update Status for Frontend mockup admin
router.put("/debug/:id/status", async (req, res, next) => {
    try {
        const dbRes = await import("../config/db.js").then(m => m.pool.query("SELECT id FROM citizens LIMIT 1"));
        let staffId = "9eb3f201-174d-48e9-a061-b88093fe58dc";
        if (dbRes.rows.length > 0) staffId = dbRes.rows[0].id;
        req.user = { id: staffId, role: "admin" };
        next();
    } catch (e) { next(e); }
}, updateComplaintStatus);

router.post("/", authMiddleware, validate(createComplaintSchema), registerComplaint);
router.get("/", authMiddleware, getMyComplaints);
router.get("/track/:ticketNumber", optionalAuth, trackComplaint);
router.put("/:id/status", authMiddleware, staffOnly, validate(updateComplaintStatusSchema), updateComplaintStatus);
router.post("/:id/messages", authMiddleware, addMessage);

export default router;
