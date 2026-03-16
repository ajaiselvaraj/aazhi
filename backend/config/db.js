// ═══════════════════════════════════════════════════════════════
// Database Pool Configuration with connection validation
// ═══════════════════════════════════════════════════════════════

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
    connectionString: process.env.DB_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

// Connection health check
pool.on("error", (err) => {
    console.error("❌ Unexpected database pool error:", err.message);
});

export const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query("SELECT NOW()");
        client.release();
        console.log("✅ Database connected at:", result.rows[0].now);
        return true;
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        return false;
    }
};