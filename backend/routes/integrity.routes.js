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
    postCitizenMessage,
    setupMfa,
    verifyAndEnableMfa,
    getAssignments,
    createAssignment,
    deleteAssignment,
    getApprovals,
    createApprovalRequest,
    updateApprovalRequest,
    getEvidenceChain,
    getSecurityIncidents,
    resolveSecurityIncident,
    getEscalations,
    escalateReport,
    getDRStatus,
    getGovernanceReport,
    getActiveOfficers,
    getPublicTransparencyMetrics,
    getAITriageResults,
    getWatchlist,
    getEvidenceIntelligence,
    getExecutiveAnalytics,
    getCompliancePackage
} from "../controllers/integrity.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { fail } from "../utils/response.js";

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
router.get("/public/transparency", getPublicTransparencyMetrics); // V4 Public transparency aggregation

// ─── ENFORCED RBAC ENDPOINTS ───
router.use(authMiddleware);
router.use(allowRoles("integrity_officer", "oversight_auditor", "executive_oversight"));

// Helper: restrict executive_oversight role from report detail contents
const restrictExecutive = (req, res, next) => {
    if (req.user.role === "executive_oversight") {
        return fail(res, "Access denied. Executive Oversight role is restricted from accessing detailed report contents.", 403);
    }
    next();
};

// Read-only auditor or executive helper middleware
const restrictAuditorOrExecutive = (req, res, next) => {
    if (req.user.role === "oversight_auditor" || req.user.role === "executive_oversight") {
        return fail(res, "Mutation denied. Oversight role is read-only.", 403);
    }
    next();
};

// GET read routes (restricted from executive_oversight)
router.get("/reports", restrictExecutive, getReports);
router.get("/reports/:id/evidence/:fileId", restrictExecutive, downloadEvidence);
router.get("/reports/:id/messages", restrictExecutive, getOfficerMessages);
router.get("/reports/:id/assignments", restrictExecutive, getAssignments);
router.get("/reports/:id/approvals", restrictExecutive, getApprovals);
router.get("/reports/:id/evidence-chain", restrictExecutive, getEvidenceChain);
router.get("/reports/:id/escalate", restrictExecutive, getEscalations);
router.get("/reports/:id/triage", restrictExecutive, getAITriageResults);
router.get("/reports/:id/evidence-intelligence", restrictExecutive, getEvidenceIntelligence);

// GET aggregated analytics routes (accessible by executive_oversight)
router.get("/metrics", getMetrics);
router.get("/incidents", getSecurityIncidents);
router.get("/disaster-recovery/status", getDRStatus);
router.get("/governance/report", getGovernanceReport);
router.get("/officers", getActiveOfficers);
router.get("/watchlist", getWatchlist);
router.get("/analytics/executive", getExecutiveAnalytics);
router.get("/compliance/export", getCompliancePackage);

// Mutation routes (Integrity Officer only)
router.put("/reports/:id/status", restrictAuditorOrExecutive, updateStatus);
router.put("/reports/:id/notes", restrictAuditorOrExecutive, updateNotes);
router.post("/reports/:id/messages", restrictAuditorOrExecutive, postOfficerMessage);
router.post("/mfa/setup", restrictAuditorOrExecutive, setupMfa);
router.post("/mfa/verify", restrictAuditorOrExecutive, verifyAndEnableMfa);
router.post("/reports/:id/assignments", restrictAuditorOrExecutive, createAssignment);
router.delete("/reports/:id/assignments/:assignmentId", restrictAuditorOrExecutive, deleteAssignment);
router.post("/reports/:id/approvals", restrictAuditorOrExecutive, createApprovalRequest);
router.put("/approvals/:approvalId", restrictAuditorOrExecutive, updateApprovalRequest);
router.put("/incidents/:id/resolve", restrictAuditorOrExecutive, resolveSecurityIncident);
router.post("/reports/:id/escalate", restrictAuditorOrExecutive, escalateReport);

export default router;
