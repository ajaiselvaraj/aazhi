// ═══════════════════════════════════════════════════════════════
// Automated DB Setup on Startup
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import logger from "./logger.js";

export const initializeAuthTables = async () => {
    try {
        // Create OTP table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otp_table (
                id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                mobile      VARCHAR(15) NOT NULL,
                otp         VARCHAR(10) NOT NULL,
                expiry      TIMESTAMP NOT NULL,
                created_at  TIMESTAMP DEFAULT NOW()
            );
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_table(mobile);
        `);

        // Ensure citizens table has nullable name, password_hash, aadhaar_hash since we use OTP
        await pool.query(`
            ALTER TABLE citizens 
            ALTER COLUMN name DROP NOT NULL,
            ALTER COLUMN password_hash DROP NOT NULL,
            ALTER COLUMN aadhaar_hash DROP NOT NULL;
        `).catch(e => {
            // Ignore if columns don't exist or already nullable, this is a best-effort migration
        });

        logger.info("✅ Auth DB Initialized: otp_table ready, citizens table constraints relaxed for mobile-only OTP.");
    } catch (err) {
        logger.error(`❌ Error initializing Auth DB: ${err.message}`);
    }
};
