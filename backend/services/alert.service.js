// ═══════════════════════════════════════════════════════════════
// SUVIDHA — Civic Alert Service (ADD-ON MODULE)
// Manages admin-controlled public alerts.
// Reads/writes ONLY the `alerts` table — zero impact on existing tables.
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";

// ─── Ensure table exists (idempotent) ────────────────────────────────────────
export async function ensureAlertsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS alerts (
                id           SERIAL PRIMARY KEY,
                title        VARCHAR(255)    NOT NULL,
                message      TEXT            NOT NULL,
                type         VARCHAR(50)     NOT NULL DEFAULT 'Civic',
                severity     VARCHAR(50)     NOT NULL DEFAULT 'Info',
                priority     INTEGER         NOT NULL DEFAULT 3,
                is_active    BOOLEAN         NOT NULL DEFAULT TRUE,
                ward         VARCHAR(100)             DEFAULT 'Global',
                created_by   UUID,
                is_notice    BOOLEAN         NOT NULL DEFAULT FALSE,
                created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                start_date   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
                expires_at   TIMESTAMPTZ
            );
        `);
        // Safely migrate existing tables to include start_date and is_notice
        await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ NOT NULL DEFAULT NOW();`);
        await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS is_notice BOOLEAN NOT NULL DEFAULT FALSE;`);
        console.log("✅ [AlertService] alerts table is ready.");
    } catch (err) {
        // Non-fatal — if table already exists with slight differences, log & continue
        console.error("⚠️  [AlertService] ensureAlertsTable warning:", err.message);
    }
}

// ─── Fetch ALL alerts (admin view) ───────────────────────────────────────────
export async function getAllAlerts() {
    const result = await pool.query(
        `SELECT * FROM alerts ORDER BY priority ASC, created_at DESC`
    );
    return result.rows;
}

// ─── Fetch ACTIVE alerts (public / user kiosk view) ──────────────────────────
export async function getActiveAlerts() {
    const result = await pool.query(
        `SELECT id, title, message, type, severity, ward, is_notice, start_date
         FROM alerts
         WHERE is_active = TRUE
           AND (start_date <= NOW())
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY priority ASC, created_at DESC
         LIMIT 20`
    );
    return result.rows;
}

// ─── Create a new alert ───────────────────────────────────────────────────────
export async function createAlert({ title, message, type, severity, priority, ward, start_date, expires_at, created_by, is_notice }) {
    const result = await pool.query(
        `INSERT INTO alerts (title, message, type, severity, priority, ward, start_date, expires_at, created_by, is_notice)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
            title,
            message,
            type        || "Civic",
            severity    || "Info",
            priority    ?? 3,
            ward        || "Global",
            start_date  || null,
            expires_at  || null,
            created_by  || null,
            is_notice   || false,
        ]
    );
    return result.rows[0];
}

// ─── Update an existing alert ─────────────────────────────────────────────────
export async function updateAlert(id, { title, message, type, severity, priority, ward, is_active, start_date, expires_at, is_notice }) {
    const result = await pool.query(
        `UPDATE alerts
         SET title      = COALESCE($1, title),
             message    = COALESCE($2, message),
             type       = COALESCE($3, type),
             severity   = COALESCE($4, severity),
             priority   = COALESCE($5, priority),
             ward       = COALESCE($6, ward),
             is_active  = COALESCE($7, is_active),
             start_date = COALESCE($8, start_date),
             expires_at = COALESCE($9, expires_at),
             is_notice  = COALESCE($10, is_notice)
         WHERE id = $11
         RETURNING *`,
        [title, message, type, severity, priority, ward, is_active, start_date, expires_at, is_notice, id]
    );
    return result.rows[0] || null;
}

// ─── Delete an alert ──────────────────────────────────────────────────────────
export async function deleteAlert(id) {
    const result = await pool.query(
        `DELETE FROM alerts WHERE id = $1 RETURNING id`,
        [id]
    );
    return result.rows[0] || null;
}
