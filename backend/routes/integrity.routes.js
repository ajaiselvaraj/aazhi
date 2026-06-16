// ═══════════════════════════════════════════════════════════════
// Anonymous Civic Whistleblower Routes
// ═══════════════════════════════════════════════════════════════

import express from "express";
import rateLimit from "express-rate-limit";
import {
    getCaptcha,
    lodgeReport,
    trackReport,
    getReports,
    updateStatus,
    updateNotes,
    downloadEvidence,
    getMetrics,
    getOfficerMessages,
    postOfficerMessage,
    getCitizenMessages,
    postCitizenMessage
} from "../controllers/integrity.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";

const router = express.Router();

// Strict rate limiting for lodging whistleblower reports to prevent spam (max 5 submissions per 15 mins per IP)
const reportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many whistleblower reports submitted from this IP. Please try again after 15 minutes."
    }
});

// CAPTCHA rate limit (max 20 per 15 minutes)
const captchaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many CAPTCHA requests. Please try again after 15 minutes."
    }
});

// ─── PUBLIC ENDPOINTS ───
router.get("/captcha", captchaLimiter, getCaptcha);
router.post("/report", reportLimiter, lodgeReport);
router.get("/track/:caseCode", trackReport);
router.get("/track/:caseCode/messages", getCitizenMessages);
router.post("/track/:caseCode/messages", postCitizenMessage);

// ─── INTEGRITY OFFICER ENFORCED RBAC ENDPOINTS ───
router.use(authMiddleware);
router.use(allowRoles("integrity_officer"));

router.get("/reports", getReports);
router.get("/reports/:id/evidence/:fileId", downloadEvidence);
router.put("/reports/:id/status", updateStatus);
router.put("/reports/:id/notes", updateNotes);
router.get("/metrics", getMetrics);
router.get("/reports/:id/messages", getOfficerMessages);
router.post("/reports/:id/messages", postOfficerMessage);

export default router;
