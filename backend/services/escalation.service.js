// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Complaint Escalation & Accountability Service
// Core business logic — SLA computation, escalation triggers,
// accountability scoring. Purely additive, zero side effects
// on existing complaint flow.
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

// ─── Default SLA hours by priority ───────────────────────────
const DEFAULT_SLA_HOURS = {
    critical: 72,   // 3 days
    high:     168,  // 7 days
    medium:   336,  // 14 days
    low:      504,  // 21 days
};

// ─── Default escalation hierarchy ────────────────────────────
const DEFAULT_ESCALATION_LEVELS = [
    { level: 1, title: "Field Officer",          trigger_day: 0  },
    { level: 2, title: "Ward Commissioner",      trigger_day: 7  },
    { level: 3, title: "Municipal Commissioner", trigger_day: 10 },
    { level: 4, title: "District Collector",     trigger_day: 14 },
];

// ─── Load config from DB (with fallback) ─────────────────────
export const loadEscalationConfig = async () => {
    try {
        const res = await pool.query(
            `SELECT config_key, config_value FROM escalation_config WHERE config_key IN ('sla_hours_by_priority', 'escalation_levels')`
        );
        const cfg = {};
        for (const row of res.rows) {
            cfg[row.config_key] = row.config_value;
        }
        return {
            slaHours: cfg['sla_hours_by_priority'] || DEFAULT_SLA_HOURS,
            levels:   cfg['escalation_levels']     || DEFAULT_ESCALATION_LEVELS,
        };
    } catch {
        return { slaHours: DEFAULT_SLA_HOURS, levels: DEFAULT_ESCALATION_LEVELS };
    }
};

// ─── Ensure complaint_sla row exists ─────────────────────────
/**
 * Creates (or skips if exists) a complaint_sla row for a complaint.
 * Called right after complaint is registered.
 */
export const ensureSLARecord = async (complaintId) => {
    try {
        // Check if already exists
        const exists = await pool.query(
            `SELECT id FROM complaint_sla WHERE complaint_id = $1`,
            [complaintId]
        );
        if (exists.rows.length > 0) return exists.rows[0];

        // Fetch complaint priority and created_at
        const comp = await pool.query(
            `SELECT priority, created_at FROM complaints WHERE id = $1`,
            [complaintId]
        );
        if (comp.rows.length === 0) return null;

        const { priority, created_at } = comp.rows[0];
        const { slaHours } = await loadEscalationConfig();
        const hours = slaHours[priority] || slaHours['medium'] || 336;

        const slaDeadline = new Date(new Date(created_at).getTime() + hours * 60 * 60 * 1000);

        const result = await pool.query(
            `INSERT INTO complaint_sla (complaint_id, sla_hours, sla_deadline)
             VALUES ($1, $2, $3)
             ON CONFLICT (complaint_id) DO NOTHING
             RETURNING *`,
            [complaintId, hours, slaDeadline.toISOString()]
        );

        logger.info(`⭐ [SLA] Created SLA record for complaint ${complaintId} — deadline: ${slaDeadline.toISOString()}`);
        return result.rows[0] || null;
    } catch (err) {
        logger.error(`⚠️ [SLA] Failed to ensure SLA record: ${err.message}`);
        return null;
    }
};

// ─── Compute SLA Status ───────────────────────────────────────
/**
 * Returns full SLA status + color state for a complaint.
 * Green >50%, Yellow ≤50%, Orange ≤24h, Red breached
 */
export const computeSLAStatus = async (complaintId) => {
    try {
        const slaRes = await pool.query(
            `SELECT * FROM complaint_sla WHERE complaint_id = $1`,
            [complaintId]
        );

        if (slaRes.rows.length === 0) {
            // Auto-create if missing
            await ensureSLARecord(complaintId);
            const retry = await pool.query(
                `SELECT * FROM complaint_sla WHERE complaint_id = $1`,
                [complaintId]
            );
            if (retry.rows.length === 0) return null;
            slaRes.rows = retry.rows;
        }

        const sla = slaRes.rows[0];
        const now = new Date();
        const deadline = new Date(sla.sla_deadline);
        const created = new Date(sla.created_at);

        const totalMs        = deadline.getTime() - created.getTime();
        const remainingMs    = deadline.getTime() - now.getTime();
        const elapsedMs      = now.getTime() - created.getTime();
        const isBreached     = remainingMs < 0;
        const percentElapsed = Math.min(100, (elapsedMs / totalMs) * 100);

        let colorState = 'green';
        if (isBreached) {
            colorState = 'red';
        } else if (remainingMs <= 24 * 60 * 60 * 1000) {
            colorState = 'orange';
        } else if (percentElapsed >= 50) {
            colorState = 'yellow';
        }

        // Mark breached in DB if newly breached
        if (isBreached && !sla.is_breached) {
            await pool.query(
                `UPDATE complaint_sla SET is_breached = true, breached_at = NOW(), updated_at = NOW() WHERE complaint_id = $1`,
                [complaintId]
            );
        }

        // Get current escalation level
        const escRes = await pool.query(
            `SELECT escalation_level, officer_name, officer_title 
             FROM complaint_escalations 
             WHERE complaint_id = $1 
             ORDER BY escalation_level DESC LIMIT 1`,
            [complaintId]
        );
        const currentEscalation = escRes.rows[0] || null;

        return {
            sla_id:                    sla.id,
            complaint_id:              complaintId,
            sla_hours:                 sla.sla_hours,
            sla_deadline:              sla.sla_deadline,
            is_breached:               isBreached,
            breached_at:               isBreached ? sla.breached_at || now.toISOString() : null,
            time_remaining_ms:         Math.max(0, remainingMs),
            time_breached_ms:          isBreached ? Math.abs(remainingMs) : 0,
            percent_elapsed:           Math.round(percentElapsed),
            color_state:               colorState,
            current_escalation_level:  currentEscalation?.escalation_level || 0,
            current_officer:           currentEscalation 
                ? { name: currentEscalation.officer_name, title: currentEscalation.officer_title }
                : null,
        };
    } catch (err) {
        logger.error(`⚠️ [SLA] computeSLAStatus failed: ${err.message}`);
        return null;
    }
};

// ─── Get Day Since Complaint Created ─────────────────────────
const getDaysSinceCreated = async (complaintId) => {
    const res = await pool.query(
        `SELECT created_at FROM complaints WHERE id = $1`,
        [complaintId]
    );
    if (!res.rows.length) return 0;
    const ms = Date.now() - new Date(res.rows[0].created_at).getTime();
    return ms / (1000 * 60 * 60 * 24); // days
};

// ─── Trigger Automatic Escalation ────────────────────────────
/**
 * Checks current escalation state and creates next level record if warranted.
 * Called by cron job and on SLA breach detection.
 */
export const triggerAutoEscalation = async (complaintId) => {
    try {
        const { levels } = await loadEscalationConfig();

        // Check complaint is still open
        const compRes = await pool.query(
            `SELECT status, assigned_to FROM complaints WHERE id = $1`,
            [complaintId]
        );
        if (!compRes.rows.length) return null;

        const comp = compRes.rows[0];
        const terminalStatuses = ['resolved', 'closed', 'rejected'];
        if (terminalStatuses.includes(comp.status)) return null;

        // Get current escalation level
        const escRes = await pool.query(
            `SELECT escalation_level FROM complaint_escalations 
             WHERE complaint_id = $1 ORDER BY escalation_level DESC LIMIT 1`,
            [complaintId]
        );
        const currentLevel = escRes.rows[0]?.escalation_level || 0;

        // Days since complaint created
        const daysSince = await getDaysSinceCreated(complaintId);

        // Find which level to escalate to
        const nextLevel = levels.find(l => l.level > currentLevel && daysSince >= l.trigger_day);
        if (!nextLevel) return null; // No escalation needed yet

        // Create escalation record
        const reason = currentLevel === 0
            ? `Initial assignment at Day 0`
            : `SLA escalation: complaint unresolved for ${Math.floor(daysSince)} days (trigger: Day ${nextLevel.trigger_day})`;

        await pool.query(
            `INSERT INTO complaint_escalations 
             (complaint_id, escalation_level, officer_title, escalation_reason, triggered_by)
             VALUES ($1, $2, $3, $4, 'automatic')`,
            [complaintId, nextLevel.level, nextLevel.title, reason]
        );

        // Update officer_accountability for the assigned officer
        if (comp.assigned_to && nextLevel.level > 1) {
            await updateOfficerMetrics(comp.assigned_to);
        }

        logger.info(`⭐ [Escalation] Complaint ${complaintId} escalated to Level ${nextLevel.level} (${nextLevel.title})`);
        return { level: nextLevel.level, title: nextLevel.title };
    } catch (err) {
        logger.error(`⚠️ [Escalation] triggerAutoEscalation failed: ${err.message}`);
        return null;
    }
};

// ─── Update Officer Metrics ───────────────────────────────────
export const updateOfficerMetrics = async (officerId) => {
    if (!officerId) return;
    try {
        // Count assignments
        const assigned = await pool.query(
            `SELECT COUNT(*) FROM complaints WHERE assigned_to = $1`, [officerId]
        );
        // Count resolved
        const resolved = await pool.query(
            `SELECT COUNT(*) FROM complaints WHERE assigned_to = $1 AND status IN ('resolved','closed')`, [officerId]
        );
        // Avg resolution time in hours
        const avgRes = await pool.query(
            `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
             FROM complaints WHERE assigned_to = $1 AND resolved_at IS NOT NULL`, [officerId]
        );
        // SLA breaches (complaints with complaint_sla.is_breached = true assigned to officer)
        const slaBreaches = await pool.query(
            `SELECT COUNT(*) FROM complaints c
             JOIN complaint_sla cs ON cs.complaint_id = c.id
             WHERE c.assigned_to = $1 AND cs.is_breached = true`, [officerId]
        );
        // Escalations received (complaints assigned to this officer that got escalated beyond level 1)
        const escalationsReceived = await pool.query(
            `SELECT COUNT(*) FROM complaint_escalations ce
             JOIN complaints c ON c.id = ce.complaint_id
             WHERE c.assigned_to = $1 AND ce.escalation_level > 1`, [officerId]
        );

        const numAssigned  = parseInt(assigned.rows[0].count) || 0;
        const numResolved  = parseInt(resolved.rows[0].count) || 0;
        const avgHours     = parseFloat(avgRes.rows[0].avg_hours) || 0;
        const numBreaches  = parseInt(slaBreaches.rows[0].count) || 0;
        const numEscReceived = parseInt(escalationsReceived.rows[0].count) || 0;

        // Compute accountability score (0-100)
        const score = computeAccountabilityScore({
            complaints_assigned:  numAssigned,
            complaints_resolved:  numResolved,
            sla_breaches:         numBreaches,
            escalations_caused:   numEscReceived,
        });

        await pool.query(
            `INSERT INTO officer_accountability 
             (officer_id, complaints_assigned, complaints_resolved, avg_resolution_hours, sla_breaches, escalations_received, escalations_caused, accountability_score, last_computed_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7, NOW(), NOW())
             ON CONFLICT (officer_id) DO UPDATE SET
               complaints_assigned   = EXCLUDED.complaints_assigned,
               complaints_resolved   = EXCLUDED.complaints_resolved,
               avg_resolution_hours  = EXCLUDED.avg_resolution_hours,
               sla_breaches          = EXCLUDED.sla_breaches,
               escalations_received  = EXCLUDED.escalations_received,
               escalations_caused    = EXCLUDED.escalations_caused,
               accountability_score  = EXCLUDED.accountability_score,
               last_computed_at      = NOW(),
               updated_at            = NOW()`,
            [officerId, numAssigned, numResolved, avgHours, numBreaches, numEscReceived, score]
        );
    } catch (err) {
        logger.warn(`⚠️ [Accountability] updateOfficerMetrics failed for ${officerId}: ${err.message}`);
    }
};

// ─── Accountability Score Formula ────────────────────────────
export const computeAccountabilityScore = ({ complaints_assigned, complaints_resolved, sla_breaches, escalations_caused }) => {
    let score = 100;

    // Deductions
    score -= (sla_breaches      || 0) * 15;
    score -= (escalations_caused || 0) * 10;

    // Resolution rate bonus (up to +20)
    if (complaints_assigned > 0) {
        const resolutionRate = complaints_resolved / complaints_assigned;
        score += Math.round(resolutionRate * 20);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
};
