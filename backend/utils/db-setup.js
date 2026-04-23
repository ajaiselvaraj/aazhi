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

        // 🚀 CRITICAL PERFORMANCE INDEXES (Resolves 10s Admin Dashboard lag)
        logger.info("📡 Applying Performance Optimization Indexes to primary tables...");
        const performanceIndexes = `
            -- Use DO blocks or individual IF NOT EXISTS to ensure safety
            CREATE INDEX IF NOT EXISTS idx_complaints_updated_at ON complaints(updated_at DESC NULLS LAST);
            CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_service_requests_updated_at ON service_requests(updated_at DESC NULLS LAST);
            CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_citizens_updated_at ON citizens(updated_at DESC NULLS LAST);
            CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at DESC);
            
            -- Filter & Join performance
            CREATE INDEX IF NOT EXISTS idx_complaints_status_dept ON complaints(status, department);
            CREATE INDEX IF NOT EXISTS idx_service_requests_status_dept ON service_requests(status, department);
            CREATE INDEX IF NOT EXISTS idx_citizens_role_active ON citizens(role, is_active);
            CREATE INDEX IF NOT EXISTS idx_complaints_citizen_id ON complaints(citizen_id);
            CREATE INDEX IF NOT EXISTS idx_service_requests_citizen_id ON service_requests(citizen_id);
            
            ANALYZE complaints;
            ANALYZE service_requests;
            ANALYZE citizens;
            ANALYZE interaction_logs;
        `;
        await pool.query(performanceIndexes);

        logger.info("✅ DB Optimization complete: Performance indexes verified/created.");
    } catch (err) {
        logger.error(`❌ Error initializing Auth DB or Performance Indexes: ${err.message}`);
    }
};
