import express from "express";
import {
    getAllClusters,
    getClusterDetails,
    updateDepartmentCompletion,
    getCCIAnalytics,
    createPlannedActivity,
    getPlannedActivities,
    acknowledgeProactiveAlert
} from "../controllers/cci.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";

const router = express.Router();

// Enforce auth & staff roles on all CCI operations
router.use(authMiddleware);
router.use(staffOnly);

// Incident Clusters Management
router.get("/clusters", getAllClusters);
router.get("/clusters/:id", getClusterDetails);
router.put("/clusters/:clusterId/departments/:deptName", updateDepartmentCompletion);

// System Alerts & Analytics
router.get("/analytics", getCCIAnalytics);

// Planned Activities & Proactive Alerts
router.post("/planned-activities", createPlannedActivity);
router.get("/planned-activities", getPlannedActivities);
router.put("/proactive-alerts/:id/acknowledge", acknowledgeProactiveAlert);

export default router;
