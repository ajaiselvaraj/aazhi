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

// ─── GET /api/track/:trackingId ─────────────────────────────
// Accepts both ticket numbers (CMP-XXXXXX, SRQ-XXXXXX) and UUIDs
router.get("/:trackingId", async (req, res, next) => {
    try {
        const { trackingId } = req.params;

        const isServiceTicket = /^SRQ-/i.test(trackingId) || /^TKT-/i.test(trackingId);
        const isComplaintTicket = /^CMP-/i.test(trackingId);

        let isService = isServiceTicket;
        let record = null;

        if (isServiceTicket) {
            // Search service requests
            const srQuery = await pool.query(
                `SELECT sr.*, COALESCE(sr.citizen_name, ci.name, 'No Name Provided') AS citizen_name, staff.name as assigned_to_name
                 FROM service_requests sr
                 LEFT JOIN citizens ci ON sr.citizen_id = ci.id
                 LEFT JOIN citizens staff ON sr.assigned_to = staff.id
                 WHERE sr.ticket_number = $1`,
                [trackingId]
            );
            if (srQuery.rows.length > 0) {
                record = srQuery.rows[0];
            }
        } else if (isComplaintTicket) {
            // Search complaints
            const cmpQuery = await pool.query(
                `SELECT c.*, COALESCE(c.citizen_name, ci.name, 'No Name Provided') AS citizen_name, staff.name as assigned_to_name
                 FROM complaints c
                 LEFT JOIN citizens ci ON c.citizen_id = ci.id
                 LEFT JOIN citizens staff ON c.assigned_to = staff.id
                 WHERE c.ticket_number = $1`,
                [trackingId]
            );
            if (cmpQuery.rows.length > 0) {
                record = cmpQuery.rows[0];
            }
        } else {
            // UUID strategy: try complaints first, then service requests
            const cmpQuery = await pool.query(
                `SELECT c.*, COALESCE(c.citizen_name, ci.name, 'No Name Provided') AS citizen_name, staff.name as assigned_to_name
                 FROM complaints c
                 LEFT JOIN citizens ci ON c.citizen_id = ci.id
                 LEFT JOIN citizens staff ON c.assigned_to = staff.id
                 WHERE c.id::text = $1`,
                [trackingId]
            );
            if (cmpQuery.rows.length > 0) {
                record = cmpQuery.rows[0];
                isService = false;
            } else {
                const srQuery = await pool.query(
                    `SELECT sr.*, COALESCE(sr.citizen_name, ci.name, 'No Name Provided') AS citizen_name, staff.name as assigned_to_name
                     FROM service_requests sr
                     LEFT JOIN citizens ci ON sr.citizen_id = ci.id
                     LEFT JOIN citizens staff ON sr.assigned_to = staff.id
                     WHERE sr.id::text = $1`,
                    [trackingId]
                );
                if (srQuery.rows.length > 0) {
                    record = srQuery.rows[0];
                    isService = true;
                }
            }
        }

        if (!record) {
            return fail(res, "Ticket or tracking ID not found.", 404);
        }

        if (isService) {
            // Fetch service request stages
            const stages = await pool.query(
                `SELECT stage, status, notes, updated_at, updated_by
                 FROM service_request_stages
                 WHERE service_request_id = $1
                 ORDER BY updated_at ASC`,
                [record.id]
            );

            // Fetch service request messages
            const messages = await pool.query(
                `SELECT m.text, m.sender_type, m.created_at
                 FROM messages m
                 WHERE m.service_request_id = $1
                 ORDER BY m.created_at ASC`,
                [record.id]
            );

            return success(res, "Tracking details fetched", {
                complaint: {
                    id: record.id,
                    ticket_number: record.ticket_number,
                    category: record.department || record.request_type,
                    department: record.department,
                    description: record.description,
                    ward: record.ward,
                    priority: record.priority || 'medium',
                    status: record.status,
                    resolution_note: record.resolution_note,
                    rejection_reason: record.rejection_reason,
                    scheduled_at: record.scheduled_at,
                    resolved_at: record.resolved_at,
                    closed_at: record.closed_at,
                    citizen_name: record.citizen_name,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                    assigned_to_name: record.assigned_to_name,
                    request_category: record.request_category,
                    type: 'service_request'
                },
                stages: stages.rows,
                messages: messages.rows,
            });
        } else {
            // Fetch complaints stages
            const stages = await pool.query(
                `SELECT stage, status, notes, updated_at, updated_by
                 FROM complaint_stages
                 WHERE complaint_id = $1
                 ORDER BY updated_at ASC`,
                [record.id]
            );

            // Fetch complaints messages
            const messages = await pool.query(
                `SELECT m.text, m.sender_type, m.created_at
                 FROM messages m
                 WHERE m.complaint_id = $1
                 ORDER BY m.created_at ASC`,
                [record.id]
            );

            // ⭐ INTEGRATION: Cross-Complaint Cascade Intelligence (CCI)
            const { rows: mappings } = await pool.query(
                "SELECT * FROM cluster_complaints WHERE complaint_id = $1",
                [record.id]
            );

            let cciData = null;
            if (mappings.length > 0) {
                const clusterId = mappings[0].cluster_id;
                const { rows: clusterRows } = await pool.query(
                    "SELECT * FROM infrastructure_clusters WHERE id = $1",
                    [clusterId]
                );

                if (clusterRows.length > 0) {
                    const cluster = clusterRows[0];
                    const { rows: depts } = await pool.query(
                        "SELECT * FROM cluster_departments WHERE cluster_id = $1 ORDER BY assigned_at ASC",
                        [clusterId]
                    );

                    const { rows: otherComps } = await pool.query(
                        `SELECT c.ticket_number, c.category, c.department, c.status, c.subject
                         FROM complaints c
                         JOIN cluster_complaints cc ON c.id = cc.complaint_id
                         WHERE cc.cluster_id = $1`,
                        [clusterId]
                    );

                    const totalDepts = depts.length;
                    const completedDepts = depts.filter(d => d.completion_status === 'completed').length;
                    const progress = totalDepts > 0 ? Math.round((completedDepts / totalDepts) * 100) : 0;

                    cciData = {
                        detected: true,
                        cluster_id: clusterId,
                        cluster_code: cluster.cluster_code,
                        root_cause: cluster.root_cause_category,
                        status: cluster.status,
                        severity: cluster.severity,
                        locality: cluster.locality,
                        progress: progress,
                        departments: depts,
                        complaints: otherComps
                    };
                }
            }

            return success(res, "Tracking details fetched", {
                complaint: {
                    ...record,
                    type: 'complaint'
                },
                stages: stages.rows,
                messages: messages.rows,
                cci: cciData
            });
        }
    } catch (err) {
        next(err);
    }
});

export default router;
