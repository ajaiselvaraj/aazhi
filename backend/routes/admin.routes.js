// ═══════════════════════════════════════════════════════════════
// Admin Dashboard Routes (Admin-only access)
// GET  /api/admin/dashboard        - Overview statistics
// GET  /api/admin/logs             - Kiosk interaction logs
// GET  /api/admin/analytics/sr     - Service request analytics
// GET  /api/admin/analytics/pay    - Payment statistics
// GET  /api/admin/complaints       - All complaints
// GET  /api/admin/service-requests - All service requests
// GET  /api/admin/citizens         - All citizens
// GET  /api/admin/config           - Service configuration
// PUT  /api/admin/config/:service  - Enable/disable service
// ═══════════════════════════════════════════════════════════════

import express from "express";
import {
    getDashboardStats, getInteractionLogs,
    getServiceRequestAnalytics, getPaymentStats,
    getAllComplaints, getServiceConfig, updateServiceConfig,
    getAllServiceRequests, getAllCitizens,
} from "../controllers/admin.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { adminOnly } from "../middleware/role.middleware.js";
import { validate, updateServiceConfigSchema } from "../utils/validator.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(adminOnly);

router.get("/dashboard", getDashboardStats);
router.get("/logs", getInteractionLogs);
router.get("/analytics/service-requests", getServiceRequestAnalytics);
router.get("/analytics/payments", getPaymentStats);
router.get("/complaints", getAllComplaints);
router.get("/service-requests", getAllServiceRequests);
router.get("/citizens", getAllCitizens);
router.get("/config", getServiceConfig);
router.put("/config/:serviceName", validate(updateServiceConfigSchema), updateServiceConfig);

export default router;
