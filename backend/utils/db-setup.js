// ═══════════════════════════════════════════════════════════════
// Automated DB Setup on Startup
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import logger from "./logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        // 🚀 TRANSACTION MODULE REDESIGN MIGRATIONS
        logger.info("📡 Applying migrations to transactions table for guest support & failure tracking...");
        
        // 1. Allow guest checkout transactions without citizen account
        await pool.query(`
            ALTER TABLE transactions 
            ALTER COLUMN citizen_id DROP NOT NULL;
        `).catch(e => {
            logger.warn(`Migration transactions.citizen_id DROP NOT NULL failed or already applied: ${e.message}`);
        });

        // 2. Add columns for failure reason and user details
        await pool.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS failure_reason TEXT;
        `).catch(e => {
            logger.warn(`Migration transactions.failure_reason failed or already applied: ${e.message}`);
        });

        await pool.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS user_details JSONB;
        `).catch(e => {
            logger.warn(`Migration transactions.user_details failed or already applied: ${e.message}`);
        });

        // 3. Drop constraint if it exists to allow cancelled status
        await pool.query(`
            ALTER TABLE transactions 
            DROP CONSTRAINT IF EXISTS transactions_payment_status_check;
        `).catch(e => {
            logger.warn(`Could not drop transactions_payment_status_check constraint: ${e.message}`);
        });

        // 4. Add constraint supporting new status values (created, authorized, captured, failed, refunded, cancelled)
        await pool.query(`
            ALTER TABLE transactions 
            ADD CONSTRAINT transactions_payment_status_check 
            CHECK (payment_status IN ('created', 'authorized', 'captured', 'failed', 'refunded', 'cancelled'));
        `).catch(e => {
            logger.warn(`Could not add updated transactions_payment_status_check constraint (might already exist): ${e.message}`);
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

        // 🚀 REQUEST CATEGORY SEGREGATION MIGRATIONS
        logger.info("📡 Applying request_category columns to complaints and service_requests tables...");
        
        await pool.query(`
            ALTER TABLE complaints 
            ADD COLUMN IF NOT EXISTS request_category VARCHAR(20) DEFAULT 'civic' CHECK (request_category IN ('civic', 'power', 'gas', 'municipal'));
        `).catch(e => {
            logger.warn(`Migration complaints.request_category failed or already applied: ${e.message}`);
        });

        await pool.query(`
            ALTER TABLE service_requests 
            ADD COLUMN IF NOT EXISTS request_category VARCHAR(20) DEFAULT 'civic' CHECK (request_category IN ('civic', 'power', 'gas', 'municipal'));
        `).catch(e => {
            logger.warn(`Migration service_requests.request_category failed or already applied: ${e.message}`);
        });

        // Seed/Update existing records
        logger.info("📡 Categorizing existing complaints and service requests...");
        
        await pool.query("UPDATE complaints SET request_category = 'power' WHERE department = 'Electricity' OR department = 'Electricity Board' OR category ILIKE '%electricity%' OR category ILIKE '%power%'");
        await pool.query("UPDATE complaints SET request_category = 'gas' WHERE department = 'Gas' OR category ILIKE '%gas%'");
        await pool.query("UPDATE complaints SET request_category = 'municipal' WHERE department = 'Municipal' OR department = 'Municipal Corp' OR department = 'Water Supply & Sewage' OR department = 'Waste Management' OR category ILIKE '%water%' OR category ILIKE '%municipal%' OR category ILIKE '%waste%' OR category ILIKE '%property%'");
        await pool.query("UPDATE complaints SET request_category = 'civic' WHERE request_category IS NULL OR request_category NOT IN ('power', 'gas', 'municipal')");

        await pool.query("UPDATE service_requests SET request_category = 'power' WHERE department = 'Electricity' OR department = 'Electricity Board' OR request_type ILIKE '%electricity%' OR request_type ILIKE '%power%'");
        await pool.query("UPDATE service_requests SET request_category = 'gas' WHERE department = 'Gas' OR request_type ILIKE '%gas%'");
        await pool.query("UPDATE service_requests SET request_category = 'municipal' WHERE department = 'Municipal' OR department = 'Municipal Corp' OR department = 'Water' OR department = 'Water Supply' OR department = 'Waste Management' OR request_type ILIKE '%water%' OR request_type ILIKE '%municipal%' OR request_type ILIKE '%waste%' OR request_type ILIKE '%property%'");
        await pool.query("UPDATE service_requests SET request_category = 'civic' WHERE request_category IS NULL OR request_category NOT IN ('power', 'gas', 'municipal')");
        
        logger.info("✅ Database request_category migration complete.");

        // 🚀 ANONYMOUS INTEGRITY REPORTS MIGRATIONS V2 (Government-Grade Security Standard)
        logger.info("📡 Applying Anonymous Integrity Reports V2 migrations (Government-Grade)...");
        
        try {
            const auditSqlPath = path.resolve(__dirname, "..", "models", "audit_chain_schema.sql");
            if (fs.existsSync(auditSqlPath)) {
                const migrationSql = fs.readFileSync(auditSqlPath, "utf8");
                await pool.query(migrationSql);
                logger.info("✅ audit_chain_schema.sql applied successfully.");
            } else {
                logger.warn(`⚠️ Migration file not found at ${auditSqlPath}`);
            }

            const sqlPath = path.resolve(__dirname, "..", "models", "integrity_v2_schema.sql");
            if (fs.existsSync(sqlPath)) {
                const migrationSql = fs.readFileSync(sqlPath, "utf8");
                await pool.query(migrationSql);
                logger.info("✅ integrity_v2_schema.sql applied successfully.");
            } else {
                logger.warn(`⚠️ Migration file not found at ${sqlPath}`);
            }

            const sqlV3Path = path.resolve(__dirname, "..", "models", "integrity_v3_schema.sql");
            if (fs.existsSync(sqlV3Path)) {
                const migrationSql = fs.readFileSync(sqlV3Path, "utf8");
                await pool.query(migrationSql);
                logger.info("✅ integrity_v3_schema.sql applied successfully.");
            } else {
                logger.warn(`⚠️ Migration file not found at ${sqlV3Path}`);
            }

            // Seed default integrity officer in officer_accounts
            const checkOfficer = await pool.query("SELECT * FROM officer_accounts WHERE username = $1", ["integrity_admin"]);
            if (checkOfficer.rows.length === 0) {
                const passHash = bcrypt.hashSync("integrity_pass", 10);
                await pool.query(`
                    INSERT INTO officer_accounts (username, password_hash, department, role)
                    VALUES ($1, $2, $3, $4)
                `, ["integrity_admin", passHash, "Integrity Office", "integrity_officer"]);
                logger.info("👤 Seeded default integrity officer (username: integrity_admin).");
            }

            const sqlV4Path = path.resolve(__dirname, "..", "models", "integrity_v4_schema.sql");
            if (fs.existsSync(sqlV4Path)) {
                const migrationSql = fs.readFileSync(sqlV4Path, "utf8");
                await pool.query(migrationSql);
                logger.info("✅ integrity_v4_schema.sql applied successfully.");
            } else {
                logger.warn(`⚠️ Migration file not found at ${sqlV4Path}`);
            }

            // Seed default executive oversight officer in officer_accounts
            const checkExecutive = await pool.query("SELECT * FROM officer_accounts WHERE username = $1", ["executive_admin"]);
            if (checkExecutive.rows.length === 0) {
                const passHash = bcrypt.hashSync("executive_pass", 10);
                await pool.query(`
                    INSERT INTO officer_accounts (username, password_hash, department, role)
                    VALUES ($1, $2, $3, $4)
                `, ["executive_admin", passHash, "Executive Oversight Board", "executive_oversight"]);
                logger.info("👤 Seeded default executive oversight officer (username: executive_admin).");
            }

            // 🚀 CCI (Cross-Complaint Cascade Intelligence) MIGRATIONS
            const cciSqlPath = path.resolve(__dirname, "..", "models", "cci_schema.sql");
            if (fs.existsSync(cciSqlPath)) {
                const migrationSql = fs.readFileSync(cciSqlPath, "utf8");
                await pool.query(migrationSql);
                logger.info("✅ cci_schema.sql applied successfully.");
            } else {
                logger.warn(`⚠️ Migration file not found at ${cciSqlPath}`);
            }

            // 🚀 STATUS SUBSCRIPTION MIGRATIONS
            const subSqlPath = path.resolve(__dirname, "..", "models", "status_subscription_schema.sql");
            if (fs.existsSync(subSqlPath)) {
                const migrationSql = fs.readFileSync(subSqlPath, "utf8");
                await pool.query(migrationSql);
                logger.info("✅ status_subscription_schema.sql applied successfully.");
            } else {
                logger.warn(`⚠️ Migration file not found at ${subSqlPath}`);
            }

            // 🚀 DIRECT NOTIFICATION SYSTEM MIGRATIONS
            logger.info("📡 Applying direct notification columns to complaints table...");
            await pool.query(`
                ALTER TABLE complaints 
                ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(20) CHECK (notification_channel IN ('SMS', 'WHATSAPP', 'BOTH')),
                ADD COLUMN IF NOT EXISTS notification_phone VARCHAR(20),
                ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMP;
            `).catch(e => {
                logger.warn(`Migration complaints direct notification columns failed or already applied: ${e.message}`);
            });

            // Apply updated status check constraint on complaints table to support additional statuses
            await pool.query(`
                ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
                ALTER TABLE complaints ADD CONSTRAINT complaints_status_check 
                CHECK (status IN ('pending', 'submitted', 'active', 'acknowledged', 'assigned', 'under_review', 'field_team_assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'rejected', 'open'));
            `).catch(e => {
                logger.warn(`Failed to update complaints_status_check constraint: ${e.message}`);
            });

            logger.info("📡 Creating notification_logs table if not exists...");
            await pool.query(`
                CREATE TABLE IF NOT EXISTS notification_logs (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
                    phone_number VARCHAR(20) NOT NULL,
                    channel VARCHAR(20) NOT NULL CHECK (channel IN ('SMS', 'WHATSAPP')),
                    status_sent VARCHAR(50) NOT NULL,
                    message_body TEXT NOT NULL,
                    delivery_status VARCHAR(20) NOT NULL CHECK (delivery_status IN ('queued', 'sent', 'failed')),
                    created_at TIMESTAMP DEFAULT NOW(),
                    retry_count INTEGER DEFAULT 0,
                    error_message TEXT
                );
            `).catch(e => {
                logger.warn(`Creating notification_logs table failed: ${e.message}`);
            });
            
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_notif_logs_complaint_id ON notification_logs(complaint_id);
                CREATE INDEX IF NOT EXISTS idx_notif_logs_created_at ON notification_logs(created_at DESC);
            `).catch(e => {
                logger.warn(`Creating indexes on notification_logs failed: ${e.message}`);
            });
        } catch (e) {
            logger.error(`❌ Failed to run Integrity V2/V3/V4/CCI/Subscription migrations / seeding: ${e.message}`);
            throw e;
        }

        logger.info("✅ DB Optimization complete: Performance indexes verified/created.");
    } catch (err) {
        logger.error(`❌ Error initializing Auth DB or Performance Indexes: ${err.message}`);
    }
};
