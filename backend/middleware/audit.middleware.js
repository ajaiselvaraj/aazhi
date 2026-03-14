// ═══════════════════════════════════════════════════════════════
// Audit Logging Middleware
// Logs every kiosk interaction to the database + winston
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

export default function auditLogger(req, res, next) {
    const start = Date.now();

    // Capture the original end method
    const originalEnd = res.end;

    res.end = function (...args) {
        const responseTime = Date.now() - start;
        const logEntry = {
            citizen_id: req.user?.id || null,
            kiosk_id: req.headers["x-kiosk-id"] || null,
            action: `${req.method} ${req.originalUrl}`,
            module: extractModule(req.originalUrl),
            endpoint: req.originalUrl,
            method: req.method,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers["user-agent"],
            request_body: sanitizeBody(req.body),
            response_status: res.statusCode,
            response_time: responseTime,
        };

        // Log to winston (always)
        logger.info("API Request", logEntry);

        // Log to database (async, non-blocking)
        persistAuditLog(logEntry).catch((err) => {
            logger.error("Failed to persist audit log", { error: err.message });
        });

        originalEnd.apply(res, args);
    };

    next();
}

function extractModule(url) {
    const parts = url.split("/");
    // /api/auth/login → auth, /api/gas/book → gas
    return parts[2] || "unknown";
}

function sanitizeBody(body) {
    if (!body || typeof body !== "object") return {};
    const sanitized = { ...body };
    // Remove sensitive fields from audit logs
    delete sanitized.password;
    delete sanitized.aadhaar;
    delete sanitized.razorpay_signature;
    return sanitized;
}

async function persistAuditLog(entry) {
    try {
        await pool.query(
            `INSERT INTO interaction_logs 
            (citizen_id, kiosk_id, action, module, endpoint, method, ip_address, 
             user_agent, request_body, response_status, response_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                entry.citizen_id,
                entry.kiosk_id,
                entry.action,
                entry.module,
                entry.endpoint,
                entry.method,
                entry.ip_address,
                entry.user_agent,
                JSON.stringify(entry.request_body),
                entry.response_status,
                entry.response_time,
            ]
        );
    } catch {
        // Silently fail — audit logging should not break the request
    }
}