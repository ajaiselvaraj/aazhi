// ═══════════════════════════════════════════════════════════════
// SUVIDHA — Civic Alert Routes (ADD-ON MODULE)
// Mounts independently — no collision with existing routes.
//
// PROTECTED (admin only):
//   POST   /api/admin/alerts
//   GET    /api/admin/alerts
//   PUT    /api/admin/alerts/:id
//   DELETE /api/admin/alerts/:id
//
// PUBLIC (no auth — user kiosk polling):
//   GET    /api/alerts/active
// ═══════════════════════════════════════════════════════════════

import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import {
    adminGetAllAlerts,
    adminCreateAlert,
    adminUpdateAlert,
    adminDeleteAlert,
    getPublicActiveAlerts,
} from "../controllers/alert.controller.js";
import { ensureAlertsTable } from "../services/alert.service.js";

// ─── Create the table if it doesn't exist yet (one-time, non-blocking) ───────
ensureAlertsTable().catch(err =>
    console.error("⚠️  [AlertRoutes] Table initialization failed:", err.message)
);

// ─── Admin router (mounted at /api/admin/alerts in app.js) ───────────────────
export const adminAlertRouter = express.Router();
adminAlertRouter.use(authMiddleware);
adminAlertRouter.use(adminOnly);

adminAlertRouter.get("/",    adminGetAllAlerts);
adminAlertRouter.post("/",   adminCreateAlert);
adminAlertRouter.put("/:id", adminUpdateAlert);
adminAlertRouter.delete("/:id", adminDeleteAlert);

// ─── Public router (mounted at /api/alerts in app.js) ────────────────────────
export const publicAlertRouter = express.Router();
publicAlertRouter.get("/active", getPublicActiveAlerts);
