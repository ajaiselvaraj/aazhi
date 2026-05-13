// ═══════════════════════════════════════════════════════════════
// Complaint Public Tracking Route  (NEW – plug-in only)
// GET  /api/track/:complaintId   — Public, no auth required
//
// Returns full complaint data for the mobile tracking page.
// Uses existing complaint + complaint_stages tables (read-only).
// ═══════════════════════════════════════════════════════════════

import express from "express";
import { pool } from "../config/db.js";
import { success, fail } from "../utils/response.js";

const router = express.Router();

// ─── GET /api/track/:complaintId ─────────────────────────────
// Accepts both ticket numbers (CMP-XXXXXX) and UUID complaint IDs
router.get("/:complaintId", async (req, res, next) => {
    try {
        const { complaintId } = req.params;

        // Determine query strategy: ticket_number vs UUID
        const isTicketNumber = /^CMP-/i.test(complaintId);

        const whereClause = isTicketNumber
            ? "c.ticket_number = $1"
            : "c.id::text = $1";

        const complaint = await pool.query(
            `SELECT
                c.id,
                c.ticket_number,
                c.category,
                c.issue_category,
                c.department,
                c.subject,
                c.description,
                c.ward,
                c.priority,
                c.status,
                c.resolution_note,
                c.rejection_reason,
                c.created_at,
                c.updated_at,
                c.resolved_at,
                COALESCE(c.citizen_name, ci.name) AS citizen_name
             FROM complaints c
             LEFT JOIN citizens ci ON c.citizen_id = ci.id
             WHERE ${whereClause}`,
            [complaintId]
        );

        if (complaint.rows.length === 0) {
            return fail(res, "Complaint not found. Please check the tracking ID.", 404);
        }

        const cmp = complaint.rows[0];

        // Fetch stages timeline
        const stages = await pool.query(
            `SELECT stage, status, notes, updated_at, updated_by
             FROM complaint_stages
             WHERE complaint_id = $1
             ORDER BY updated_at ASC`,
            [cmp.id]
        );

        // Fetch public messages (authority ↔ citizen)
        const messages = await pool.query(
            `SELECT m.text, m.sender_type, m.created_at
             FROM messages m
             WHERE m.complaint_id = $1
             ORDER BY m.created_at ASC`,
            [cmp.id]
        );

        return success(res, "Tracking details fetched", {
            complaint: cmp,
            stages: stages.rows,
            messages: messages.rows,
        });
    } catch (err) {
        next(err);
    }
});

export default router;
