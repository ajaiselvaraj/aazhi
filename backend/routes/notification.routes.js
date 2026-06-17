import express from "express";
import { pool } from "../config/db.js";
import { success } from "../utils/response.js";
import { retryFailedNotification } from "../services/notification.service.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { staffOnly } from "../middleware/role.middleware.js";

const router = express.Router();

// Enforce admin/staff only
router.use(authMiddleware);
router.use(staffOnly);

/**
 * GET /api/notifications/logs
 * Retrieve all notification history logs from notification_logs
 */
router.get("/logs", async (req, res, next) => {
    try {
        const { rows: logs } = await pool.query(
            `SELECT nl.*, c.ticket_number, c.citizen_name, c.department
             FROM notification_logs nl
             JOIN complaints c ON nl.complaint_id = c.id
             ORDER BY nl.created_at DESC
             LIMIT 100`
        );
        return success(res, "Notification logs retrieved successfully.", logs);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/notifications/retry-trigger
 * Manually trigger retry sweep for failed notification logs
 */
router.post("/retry-trigger", async (req, res, next) => {
    try {
        await retryFailedNotification();
        return success(res, "Retry sweep completed successfully.", {});
    } catch (err) {
        next(err);
    }
});

export default router;
