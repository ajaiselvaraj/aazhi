// ═══════════════════════════════════════════════════════════════
// SUVIDHA — Civic Alert Controller (ADD-ON MODULE)
// Handles HTTP layer for admin-controlled civic alerts.
// Safe: does NOT touch existing controllers.
// ═══════════════════════════════════════════════════════════════

import { success, fail, error } from "../utils/response.js";
import {
    getAllAlerts,
    getActiveAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
} from "../services/alert.service.js";

// ─── Validation helpers ───────────────────────────────────────────────────────
// VALID_TYPES doesn't restrict custom categories for Notices anymore.
const VALID_SEVERITIES = ["Critical", "Warning", "Info"];

function validateAlertInput({ title, message, type, severity, priority }) {
    const errs = [];
    if (!title || String(title).trim().length < 3)         errs.push("title must be at least 3 characters.");
    if (!message || String(message).trim().length < 5)     errs.push("message must be at least 5 characters.");
    if (severity  && !VALID_SEVERITIES.includes(severity)) errs.push(`severity must be one of: ${VALID_SEVERITIES.join(", ")}.`);
    if (priority !== undefined && (isNaN(priority) || priority < 1 || priority > 5))
                                                           errs.push("priority must be an integer between 1 and 5.");
    return errs;
}

// ─── GET /api/admin/alerts ────────────────────────────────────────────────────
export async function adminGetAllAlerts(req, res) {
    try {
        const alerts = await getAllAlerts();
        return success(res, "Alerts retrieved successfully.", alerts);
    } catch (err) {
        console.error("❌ [AlertController] adminGetAllAlerts:", err.message);
        return error(res, "Failed to retrieve alerts.");
    }
}

// ─── POST /api/admin/alerts ───────────────────────────────────────────────────
export async function adminCreateAlert(req, res) {
    try {
        const { title, message, type, severity, priority, ward, start_date, expires_at, is_notice } = req.body;
        const created_by = req.user?.id || null;

        const validationErrors = validateAlertInput({ title, message, type, severity, priority });
        if (validationErrors.length > 0) {
            return fail(res, validationErrors.join(" "), 422);
        }

        const alert = await createAlert({
            title:      String(title).trim(),
            message:    String(message).trim(),
            type:       type       || "Civic",
            severity:   severity   || "Info",
            priority:   parseInt(priority) || 3,
            ward:       ward       || "Global",
            start_date: start_date || null,
            expires_at: expires_at || null,
            created_by,
            is_notice:  is_notice === true,
        });

        return success(res, "Alert created successfully.", alert, 201);
    } catch (err) {
        console.error("❌ [AlertController] adminCreateAlert:", err.message);
        return error(res, "Failed to create alert.");
    }
}

// ─── PUT /api/admin/alerts/:id ────────────────────────────────────────────────
export async function adminUpdateAlert(req, res) {
    try {
        const { id } = req.params;
        const { title, message, type, severity, priority, ward, is_active, start_date, expires_at, is_notice } = req.body;

        if (isNaN(parseInt(id))) {
            return fail(res, "Invalid alert ID.", 400);
        }

        // Only validate fields that are being updated
        const validationErrors = validateAlertInput({
            title:    title    ?? "ok",    // pass a safe default to skip required-check
            message:  message  ?? "ok ok", // same
            type,
            severity,
            priority,
        });
        // Remove title/message errors when they weren't provided (update is partial)
        const filteredErrors = validationErrors.filter(e => {
            if (!title   && e.startsWith("title"))   return false;
            if (!message && e.startsWith("message")) return false;
            return true;
        });

        if (filteredErrors.length > 0) {
            return fail(res, filteredErrors.join(" "), 422);
        }

        const updated = await updateAlert(parseInt(id), {
            title:      title   ? String(title).trim()   : undefined,
            message:    message ? String(message).trim() : undefined,
            type,
            severity,
            priority:   priority !== undefined ? parseInt(priority) : undefined,
            ward,
            is_active:  is_active !== undefined ? Boolean(is_active) : undefined,
            start_date: start_date || null,
            expires_at: expires_at || null,
            is_notice:  is_notice !== undefined ? Boolean(is_notice) : undefined,
        });

        if (!updated) {
            return fail(res, "Alert not found.", 404);
        }

        return success(res, "Alert updated successfully.", updated);
    } catch (err) {
        console.error("❌ [AlertController] adminUpdateAlert:", err.message);
        return error(res, "Failed to update alert.");
    }
}

// ─── DELETE /api/admin/alerts/:id ────────────────────────────────────────────
export async function adminDeleteAlert(req, res) {
    try {
        const { id } = req.params;

        if (isNaN(parseInt(id))) {
            return fail(res, "Invalid alert ID.", 400);
        }

        const deleted = await deleteAlert(parseInt(id));

        if (!deleted) {
            return fail(res, "Alert not found.", 404);
        }

        return success(res, "Alert deleted successfully.", { id: deleted.id });
    } catch (err) {
        console.error("❌ [AlertController] adminDeleteAlert:", err.message);
        return error(res, "Failed to delete alert.");
    }
}

// ─── GET /api/alerts/active (PUBLIC — user kiosk) ────────────────────────────
export async function getPublicActiveAlerts(req, res) {
    try {
        const alerts = await getActiveAlerts();
        return success(res, "Active alerts retrieved.", alerts);
    } catch (err) {
        console.error("❌ [AlertController] getPublicActiveAlerts:", err.message);
        // Graceful degradation — return empty list, not a 500
        return success(res, "No alerts available.", []);
    }
}
