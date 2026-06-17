import express from "express";
import {
    requestSubscription,
    verifySubscription,
    confirmResolution,
    getSubscriptionAnalytics,
    getSubscriptionLogs
} from "../controllers/subscription.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";

const router = express.Router();

// Public citizen convenience routes (no auth needed for kiosk guest updates)
router.post("/request", requestSubscription);
router.post("/verify", verifySubscription);
router.post("/confirm-resolution", confirmResolution);

// Staff/Admin control center routes
router.get("/analytics", authMiddleware, staffOnly, getSubscriptionAnalytics);
router.get("/logs", authMiddleware, staffOnly, getSubscriptionLogs);

export default router;
