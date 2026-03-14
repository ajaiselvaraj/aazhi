// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Database Migration Runner
// Reads schema.sql and executes it against the configured DB
// ═══════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({ connectionString: process.env.DB_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        const schemaPath = path.join(__dirname, "schema.sql");
        const sql = fs.readFileSync(schemaPath, "utf-8");

        console.log("🔄 Running SUVIDHA database migration...\n");

        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");

        console.log("✅ Database migration completed successfully!");
        console.log("   Tables created: citizens, utility_accounts, bills, transactions,");
        console.log("   complaints, complaint_stages, service_requests, service_request_stages,");
        console.log("   interaction_logs, service_config, messages");
        console.log("   Seed data: service_config defaults inserted.\n");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
