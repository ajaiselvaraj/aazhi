// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Server Entry Point
// ═══════════════════════════════════════════════════════════════

import app from "./app.js";
import dotenv from "dotenv";
import { testConnection } from "./config/db.js";
import logger from "./utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { initializeAuthTables } from "./utils/db-setup.js";
import { pool } from "./config/db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const PORT = process.env.PORT || 5000;

async function startServer() {
    // Test database connection with retry logic (5 attempts, exponential back-off)
    const dbConnected = await testConnection(5, 2000);

    if (!dbConnected) {
        logger.warn("⚠️  Database connection failed after retries. Server will start but DB operations may fail.");
        logger.warn("   Check your DATABASE_URL and Supabase dashboard for connection issues.");
    } else {
        // Initialize Auth tables & execute migrations if needed
        await initializeAuthTables();
    }

    // Schedule cron job to clean up expired OTPs every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        try {
            const res = await pool.query(`DELETE FROM otp_table WHERE expiry < NOW()`);
            if (res.rowCount > 0) {
                logger.info(`[CRON] Cleaned up ${res.rowCount} expired OTPs`);
            }
        } catch (error) {
            logger.error(`[CRON] Failed to clean up expired OTPs: ${error.message}`);
        }
    });

    app.listen(PORT, () => {
        logger.info(`
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════      ═╗
║                                                                                                                         ║
║   🏛️  SUVIDHA KIOSK Backend Server                                                                                     ║
║   Unified Civic Utility Self-Service Platform                                                                           ║
║                                                                                                                         ║
║   🌐 Server:    ${process.env.BASE_URL || `http://localhost:${PORT}`}                                                       ║
║   📋 Health:    ${(process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "")}/api/health                   ║
║   🗄️  Database:  ${dbConnected ? "✅ Connected" : "❌ Not connected"}                                                   ║
║   🔒 Auth:      JWT (${process.env.JWT_EXPIRY || "1h"} access / ${process.env.JWT_REFRESH_EXPIRY || "7d"} refresh)       ║
║   📁 Env:       ${process.env.NODE_ENV || "development"}                                                                 ║
║                                                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════                                                                 ╝
        `);
    });
}

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", { error: err.message, stack: err.stack });
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection:", { reason: reason?.message || reason });
});

startServer();