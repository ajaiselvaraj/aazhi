// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Escalation Schema Migration Runner
// Idempotent — safe to run multiple times (uses IF NOT EXISTS)
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "back.env") });
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in environment.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase") ? { rejectUnauthorized: false } : false,
    max: 3,
});

async function runMigration() {
    console.log("\n🚀 [Escalation Migration] Starting...\n");
    const client = await pool.connect();

    try {
        const schemaPath = path.resolve(__dirname, "escalation_schema.sql");
        const sql = readFileSync(schemaPath, "utf8");

        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");

        console.log("✅ [Escalation Migration] All 4 tables created/verified:");
        console.log("   ✓ complaint_sla");
        console.log("   ✓ complaint_escalations");
        console.log("   ✓ escalation_requests");
        console.log("   ✓ officer_accountability");
        console.log("   ✓ escalation_config (+ seed data)");
        console.log("\n🎉 Migration complete. Escalation engine is ready.\n");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ [Escalation Migration] Failed:", err.message);
        console.error(err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
