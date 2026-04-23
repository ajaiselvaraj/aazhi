import { pool } from "./config/db.js";
import logger from "./utils/logger.js";

async function runOptimizations() {
    console.log("🚀 Starting Database Performance Optimization...");
    try {
        const client = await pool.connect();
        try {
            // Add indexes for fast timestamp scans (essential for checkUpdates & ordering)
            console.log("Applying indexes on created_at and updated_at...");
            await client.query('CREATE INDEX IF NOT EXISTS idx_complaints_updated_at ON complaints(updated_at DESC);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_sr_updated_at ON service_requests(updated_at DESC);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_sr_created_at ON service_requests(created_at DESC);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON interaction_logs(created_at DESC);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_citizens_updated_at ON citizens(updated_at DESC);');

            // Add indexes for filtering columns (department, status)
            console.log("Applying functional indexes for fast filtering...");
            await client.query('CREATE INDEX IF NOT EXISTS idx_complaints_dept_status ON complaints(department, status);');
            await client.query('CREATE INDEX IF NOT EXISTS idx_sr_dept_status ON service_requests(department, status);');
            
            // Re-analyze tables to update statistics
            console.log("Updating statistics...");
            await client.query('ANALYZE complaints;');
            await client.query('ANALYZE service_requests;');
            await client.query('ANALYZE citizens;');
            await client.query('ANALYZE transactions;');
            
            console.log("✅ Database Optimization Completed Successfully!");
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("❌ DB Optimization error:", err);
    }
    process.exit(0);
}

runOptimizations();
