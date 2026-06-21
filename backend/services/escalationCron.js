// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Escalation Cron Job
// Runs every 30 minutes, auto-escalates SLA-breached complaints
// Fully wrapped in try-catch — NEVER crashes the server
// ═══════════════════════════════════════════════════════════════

import cron from "node-cron";
import { pool } from "../config/db.js";
import { triggerAutoEscalation, computeSLAStatus } from "./escalation.service.js";
import logger from "../utils/logger.js";

let cronJob = null;

/**
 * Start the escalation background cron job.
 * Called once from app.js after all routes are mounted.
 */
export const startEscalationCron = () => {
    if (cronJob) {
        logger.warn("[Escalation Cron] Already started, skipping duplicate.");
        return;
    }

    // Run every 30 minutes
    cronJob = cron.schedule("*/30 * * * *", async () => {
        logger.info("⏰ [Escalation Cron] Running SLA breach check...");
        try {
            await runEscalationSweep();
        } catch (err) {
            logger.error(`❌ [Escalation Cron] Sweep failed: ${err.message}`);
        }
    });

    logger.info("⭐ [Escalation Cron] Started — running every 30 minutes.");
};

/**
 * Stop the cron (used in tests / graceful shutdown)
 */
export const stopEscalationCron = () => {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
        logger.info("[Escalation Cron] Stopped.");
    }
};

/**
 * Main sweep: find all open complaints whose SLA has passed
 * and trigger auto-escalation.
 */
async function runEscalationSweep() {
    // Find all open complaints that have an SLA record
    const result = await pool.query(`
        SELECT c.id, c.ticket_number, c.priority, cs.sla_deadline, cs.is_breached
        FROM complaints c
        JOIN complaint_sla cs ON cs.complaint_id = c.id
        WHERE c.status NOT IN ('resolved', 'closed', 'rejected')
        ORDER BY cs.sla_deadline ASC
    `);

    const complaints = result.rows;
    logger.info(`[Escalation Cron] Checking ${complaints.length} open complaints...`);

    let escalated = 0;
    let checked   = 0;

    for (const comp of complaints) {
        try {
            checked++;
            // Update is_breached in DB if SLA has passed
            await computeSLAStatus(comp.id);

            // Try to escalate
            const result = await triggerAutoEscalation(comp.id);
            if (result) {
                escalated++;
                logger.info(
                    `⬆️ [Escalation Cron] Ticket ${comp.ticket_number} → Level ${result.level} (${result.title})`
                );
            }
        } catch (err) {
            logger.warn(`⚠️ [Escalation Cron] Failed for complaint ${comp.id}: ${err.message}`);
        }
    }

    logger.info(`✅ [Escalation Cron] Sweep complete — checked: ${checked}, escalated: ${escalated}`);
}

// Also export for manual invocation (e.g. for testing or admin trigger)
export { runEscalationSweep };
