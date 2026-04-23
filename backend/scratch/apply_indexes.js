import { pool } from '../config/db.js';

async function applyIndexes() {
    const sql = `
        -- 1. Complaints Table
        CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
        CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department);
        CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);

        -- 2. Service Requests
        CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
        CREATE INDEX IF NOT EXISTS idx_service_requests_department ON service_requests(department);
        CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);

        -- 3. Transactions
        CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
        CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_transactions_bill_id ON transactions(bill_id);

        -- 4. Bills
        CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
        CREATE INDEX IF NOT EXISTS idx_bills_service_type ON bills(service_type);

        -- 5. Citizens
        CREATE INDEX IF NOT EXISTS idx_citizens_role_active ON citizens(role, is_active);

        -- 6. Interaction Logs
        CREATE INDEX IF NOT EXISTS idx_interaction_logs_module ON interaction_logs(module);
        CREATE INDEX IF NOT EXISTS idx_interaction_logs_kiosk_id ON interaction_logs(kiosk_id);
        CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at DESC);

        ANALYZE;
    `;
    try {
        console.log("🚀 Applying high-performance indexes to Supabase...");
        await pool.query(sql);
        console.log("✅ Database indexing complete! Admin page fetching speed increased.");
        process.exit(0);
    } catch (e) {
        console.error("❌ Failed to apply indexes automatically:", e.message);
        console.log("Please run the SQL script found in /backend/docs/PERFORMANCE_OPTIMIZATION.md manually in Supabase.");
        process.exit(1);
    }
}

applyIndexes();
