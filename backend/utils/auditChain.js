// ═══════════════════════════════════════════════════════════════
// Tamper-Evident Cryptographic Ledger Hook
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { computeStateHash } from "./crypto.js";
import crypto from "crypto";

/**
 * Appends an entry into the cryptographic, tamper-evident audit chain.
 * 
 * @param {string} actorId - UUID of the logged-in integrity officer or user
 * @param {string} actorRole - Role of the actor (e.g. 'integrity_officer')
 * @param {string} resourceId - UUID of the report being updated/accessed
 * @param {string} action - Action enum (e.g., 'CREATE', 'DATA_EDIT', 'STATUS_CHANGE')
 * @param {string} ip - Client IP address
 * @param {string} userAgent - User agent string
 * @param {object|string} prevState - Previous state of the resource (before change)
 * @param {object|string} curState - Current state of the resource (after change)
 * @param {object} payload - Optional extra details/audit metadata
 */
export async function logIntegrityAudit(actorId, actorRole, resourceId, action, ip, userAgent, prevState, curState, payload = {}) {
    try {
        const secret = process.env.JWT_SECRET || "default_audit_chain_secret_key";
        
        // Ensure IP fingerprint is at least 16 characters (to pass constraints)
        const ipClean = ip || "127.0.0.1";
        const ipFingerprint = crypto.createHash("sha256").update(ipClean).digest("hex").substring(0, 32);
        
        const userAgentClean = userAgent || "Unknown Agent";
        const userAgentFingerprint = crypto.createHash("sha256").update(userAgentClean).digest("hex").substring(0, 32);
        
        // Compute state hashes (SHA-256)
        const prevHash = computeStateHash(prevState);
        const curHash = computeStateHash(curState);
        
        const sql = `
            SELECT * FROM append_audit_chain_entry(
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            )
        `;
        
        const params = [
            secret,
            actorId || null,
            actorRole || "system",
            "anonymous_integrity_report",
            resourceId,
            action,
            ipFingerprint,
            userAgentFingerprint,
            null, // request_id
            prevHash,
            curHash,
            JSON.stringify(payload)
        ];
        
        await pool.query(sql, params);
        console.log(`🔒 [AUDIT CHAIN] Tamper-evident entry appended for action: ${action} on resource: ${resourceId}`);
    } catch (err) {
        console.error("❌ [AUDIT CHAIN ERROR] Failed to append entry:", err.message);
    }
}
