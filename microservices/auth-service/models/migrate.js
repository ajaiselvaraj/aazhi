// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Database Migration Runner
// Reads schema.sql and executes it safely with retry + SSL support
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

// ─── Dedicated Migration Pool ─────────────────────────────────
// Separate pool from the main app pool to avoid interfering with
// app queries during migration. Uses same SSL config.
const migrationPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15_000,    // migrations can be slow — allow more time
    ssl: {
        rejectUnauthorized: false
    }
});

// ─── Retry Logic ──────────────────────────────────────────────
async function connectWithRetry(maxRetries = 5, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔗 [Migration] Connecting to DB (attempt ${attempt}/${maxRetries})...`);
            const client = await migrationPool.connect();
            console.log("✅ [Migration] Connected to Supabase successfully.");
            return client;
        } catch (err) {
            console.error(`❌ [Migration] Attempt ${attempt} failed: ${err.message}`);
            if (attempt === maxRetries) {
                throw new Error(`Could not connect to database after ${maxRetries} attempts.`);
            }
            const wait = delayMs * 2 ** (attempt - 1);
            console.log(`   ⏳ Retrying in ${wait / 1000}s...`);
            await new Promise((res) => setTimeout(res, wait));
        }
    }
}

// ─── Main Migration Function ──────────────────────────────────
async function migrate() {
    let client;
    try {
        client = await connectWithRetry();

        const schemaPath = path.join(__dirname, "../models/schema.sql");

        if (!fs.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at ${schemaPath}`);
        }

        const sql = fs.readFileSync(schemaPath, "utf-8");
        const lines = sql.split("\n").filter((l) => l.trim().length > 0).length;

        console.log(`\n🔄 Running SUVIDHA database migration...`);
        console.log(`   📄 Schema file: ${schemaPath}`);
        console.log(`   📝 SQL lines  : ${lines}\n`);

        const startTime = Date.now();
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log("✅ Migration completed successfully!");
        console.log(`   ⏱️  Duration: ${duration}s`);
        console.log(`   Tables: citizens, otp_table, utility_accounts, bills, transactions`);
        console.log(`   Tables: complaints, service_requests, interaction_logs, users\n`);

    } catch (err) {
        if (client) {
            try { await client.query("ROLLBACK"); } catch (_) {}
        }
        console.error("\n❌ Migration failed:", err.message);
        process.exit(1);
    } finally {
        if (client) client.release();
        await migrationPool.end();
    }
}

migrate();
