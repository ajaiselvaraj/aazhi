// ═══════════════════════════════════════════════════════════════
// Global Error Handler Middleware
// Catches all unhandled errors and returns standardized response
// ═══════════════════════════════════════════════════════════════

import logger from "../utils/logger.js";

export default function errorHandler(err, req, res, _next) {
    // Log the full error details
    logger.error("Unhandled error", {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
        body: req.body,
    });

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Joi validation error
    if (err.isJoi) {
        return res.status(422).json({
            success: false,
            message: `Validation error: ${err.details?.map((d) => d.message).join(", ")}`,
            data: {},
        });
    }

    // PostgreSQL unique violation
    if (err.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "A record with this information already exists.",
            data: {},
        });
    }

    // PostgreSQL foreign key violation
    if (err.code === "23503") {
        return res.status(400).json({
            success: false,
            message: "Referenced record not found.",
            data: {},
        });
    }

    // Generic response (hide internals in production)
    const message =
        process.env.NODE_ENV === "production"
            ? "Internal server error. Please try again later."
            : err.message || "Internal Server Error";

    return res.status(statusCode).json({
        success: false,
        message,
        data: {},
    });
}