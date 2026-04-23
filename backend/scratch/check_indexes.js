import { pool } from '../config/db.js';

async function checkIndexes() {
    const sql = `
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('citizens', 'bills', 'complaints', 'service_requests', 'transactions', 'interaction_logs')
        ORDER BY tablename;
    `;
    try {
        console.log("Connecting to database...");
        const res = await pool.query(sql);
        console.log("DATABASE INDEXES AUDIT:");
        console.table(res.rows);
        process.exit(0);
    } catch (e) {
        console.error("Error checking indexes:", e.message);
        process.exit(1);
    }
}

checkIndexes();
