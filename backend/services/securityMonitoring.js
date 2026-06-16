// ═══════════════════════════════════════════════════════════════
// Security Incident Detection & Logging Service
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

/**
 * Creates and logs a security incident in the security_incidents table.
 * 
 * @param {string} incidentType Name of the security incident
 * @param {string} severity Severity level ('Low', 'Medium', 'High', 'Critical')
 * @param {object} details JSON metadata describing the event (e.g. IPs, counts, user agents)
 */
export async function logSecurityIncident(incidentType, severity, details = {}) {
    try {
        const sql = `
            INSERT INTO security_incidents (incident_type, severity, details)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(sql, [incidentType, severity, JSON.stringify(details)]);
        logger.warn(`⚠️ [SECURITY INCIDENT] Created: ${incidentType} [Severity: ${severity}]`);
        return result.rows[0];
    } catch (err) {
        logger.error(`❌ [SECURITY MONITORING ERROR] Failed to log security incident: ${err.message}`);
    }
}
