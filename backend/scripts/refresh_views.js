import cron from 'node-cron';
import { pool } from '../config/db.js';

console.log("🕒 [Cron] Refresh Views service initialized.");

// Refresh the materialized view every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    console.log("🕒 [Cron] Refreshing admin_dashboard_stats materialized view...");
    try {
        // CONCURRENTLY prevents read locks while the view is being updated
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY admin_dashboard_stats');
        console.log("✅ [Cron] View refreshed successfully.");
    } catch (err) {
        console.error("❌ [Cron] Error refreshing view:", err);
    }
});
