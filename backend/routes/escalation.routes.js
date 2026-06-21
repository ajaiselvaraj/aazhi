// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Escalation Routes
// NEW routes only — complaint.routes.js is NOT modified
// ═══════════════════════════════════════════════════════════════

import express from "express";
import {
    getComplaintSLA,
    getComplaintEscalations,
    requestEscalation,
    getAllEscalationRequests,
    approveEscalationRequest,
    rejectEscalationRequest,
    getOfficerAccountability,
    getEscalationAnalytics,
} from "../controllers/escalation.controller.js";
import authMiddleware, { optionalAuth } from "../middleware/auth.middleware.js";
import { staffOnly, adminOnly, authenticated } from "../middleware/role.middleware.js";

const router = express.Router();

// ─── Citizen-accessible complaint SLA & escalation data ──────
// GET /api/complaints/:id/sla
router.get(
    "/complaints/:id/sla",
    optionalAuth,
    getComplaintSLA
);

// GET /api/complaints/:id/escalations
router.get(
    "/complaints/:id/escalations",
    optionalAuth,
    getComplaintEscalations
);

// POST /api/complaints/:id/request-escalation
router.post(
    "/complaints/:id/request-escalation",
    authMiddleware,
    requestEscalation
);

// ─── Admin-only escalation management ────────────────────────
// GET /api/admin/escalations
router.get(
    "/admin/escalations",
    authMiddleware,
    staffOnly,
    getAllEscalationRequests
);

// POST /api/admin/escalations/:id/approve
router.post(
    "/admin/escalations/:id/approve",
    authMiddleware,
    staffOnly,
    approveEscalationRequest
);

// POST /api/admin/escalations/:id/reject
router.post(
    "/admin/escalations/:id/reject",
    authMiddleware,
    staffOnly,
    rejectEscalationRequest
);

// GET /api/admin/officer-accountability
router.get(
    "/admin/officer-accountability",
    authMiddleware,
    staffOnly,
    getOfficerAccountability
);

// GET /api/admin/escalation-analytics
router.get(
    "/admin/escalation-analytics",
    authMiddleware,
    staffOnly,
    getEscalationAnalytics
);

export default router;
