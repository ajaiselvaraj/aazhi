// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Production Database Connection Module
// PostgreSQL via Supabase · Connection Pooling · SSL · Retry Logic
// ═══════════════════════════════════════════════════════════════

import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables if not already loaded by server.js
if (!process.env.DATABASE_URL) {
    dotenv.config();
}

const isProd = process.env.NODE_ENV === "production";

// ─── Pool Configuration (tuned for OTP-heavy multi-user system) ──
// Supabase free tier: max 60 concurrent connections
// We keep max:20 to leave headroom for Render/other services
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: isProd ? 20 : 5,                   // production needs more workers
    min: isProd ? 2 : 1,                    // keep warm connections alive
    idleTimeoutMillis: 30_000,              // release idle connections after 30s
    connectionTimeoutMillis: 10_000,        // fail fast if DB is unreachable
};

// Only enable SSL for Supabase or when explicitly requested
if (process.env.DATABASE_URL?.includes("supabase.co") || process.env.DB_SSL === "true") {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

export const pool = new Pool(poolConfig);

// ─── Pool-level error guard ───────────────────────────────────
// Prevents the server from crashing on an unexpected mid-idle error.
pool.on("error", (err, client) => {
    console.error("❌ [DB Pool] Unexpected idle client error:", err.message);
});

pool.on("connect", () => {
    if (!isProd) console.log("🔌 [DB Pool] New client connected to Supabase");
});

// ─── Connection Test with Retry Logic ───────────────────────
/**
 * Tests whether the database is reachable.
 * Retries up to `maxRetries` times with exponential back-off.
 * Used at server startup to avoid silently running without a DB.
 *
 * @param {number} maxRetries   - Number of retry attempts (default: 5)
 * @param {number} delayMs      - Base delay between retries in ms (default: 2000)
 * @returns {boolean}           - true if connected, false after all retries fail
 */
export const testConnection = async (maxRetries = 5, delayMs = 2000) => {
    if (!process.env.DATABASE_URL) {
        console.warn("⚠️ [DB] DATABASE_URL is not set. Skipping database connection test.");
        return false;
    }
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client = await pool.connect();
            const result = await client.query("SELECT NOW() AS now, version() AS version");
            client.release();

            console.log(`✅ [DB] Connected to Supabase PostgreSQL`);
            console.log(`   ⏱️  Server time : ${result.rows[0].now}`);
            console.log(`   🐘 PG Version  : ${result.rows[0].version.split(" ").slice(0, 2).join(" ")}`);
            return true;
        } catch (err) {
            const isLastAttempt = attempt === maxRetries;
            console.error(`❌ [DB] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);

            if (isLastAttempt) {
                console.error("❌ [DB] All retry attempts exhausted. Server will run but DB calls will fail.");
                return false;
            }

            // Exponential back-off: 2s → 4s → 8s → 16s ...
            const wait = delayMs * 2 ** (attempt - 1);
            console.log(`   ⏳ Retrying in ${wait / 1000}s...`);
            await new Promise((res) => setTimeout(res, wait));
        }
    }
};

// ─── Helper: Execute a parameterised query safely ────────────
/**
 * Wrapper around pool.query with automatic error logging.
 * Ensures every query failure is logged with context.
 *
 * @param {string} sql    - SQL query string with $1, $2 placeholders
 * @param {Array}  params - Parameter values array
 * @returns {pg.QueryResult}
 */
export const query = async (sql, params = []) => {
    const start = Date.now();
    try {
        const result = await pool.query(sql, params);
        const duration = Date.now() - start;
        
        // Performance Monitoring: Log all queries taking more than 500ms in production
        if (duration > 500) {
            console.warn(`🕒 [DB Slow Query] ${duration}ms | SQL: ${sql.slice(0, 100)}...`);
        } else if (!isProd && duration > 100) {
            console.log(`⏱️ [DB Query] ${duration}ms`);
        }
        
        return result;
    } catch (err) {
        console.error(`❌ [DB Query Error] ${err.message}`);
        console.error(`   SQL: ${sql.slice(0, 150)}`);
        throw err;
    }
};

// ─── Helper: Run operations inside a Transaction ─────────────
/**
 * Executes an async callback inside a single DB transaction.
 * Automatically commits on success and rolls back on any error.
 *
 * Usage:
 *   await withTransaction(async (client) => {
 *       await client.query("INSERT ...", [...]);
 *       await client.query("UPDATE ...", [...]);
 *   });
 *
 * @param {Function} callback - async function receiving a pg Client
 * @returns {*} The return value of the callback
 */
export const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ [DB Transaction] Rolled back due to:", err.message);
        throw err;
    } finally {
        client.release();
    }
};

// ─── Health Status Object ─────────────────────────────────────
/**
 * Returns a detailed snapshot of the connection pool status.
 * Used by the /api/health endpoint.
 */
export const getPoolStatus = () => ({
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
});