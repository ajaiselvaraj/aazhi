// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Global Error Handler Middleware
// Centralized error handling for all thrown/passed errors
// ═══════════════════════════════════════════════════════════════

import logger from "../utils/logger.js";

/**
 * Custom application error class.
 * Use this to throw structured errors from anywhere in the app.
 *
 * Example:
 *   throw new AppError("Bill not found", 404);
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, data = {}) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = true; // Distinguishes known errors from crashes
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express global error handler.
 * Must be registered LAST in app.js using: app.use(errorHandler)
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let data = err.data || {};

  // ── Joi Validation Errors ─────────────────────────────────
  if (err.isJoi || err.name === "ValidationError") {
    statusCode = 400;
    message = err.details?.[0]?.message || "Validation error";
    data = {};
  }

  // ── JWT Errors ────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please log in again.";
  }

  // ── PostgreSQL Errors ─────────────────────────────────────
  if (err.code === "23505") {
    // Unique constraint violation
    statusCode = 409;
    message = "A record with this information already exists.";
  }

  if (err.code === "23503") {
    // Foreign key violation
    statusCode = 400;
    message = "Related record not found.";
  }

  // ── Log the error ─────────────────────────────────────────
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} — ${message}`, {
      stack: err.stack,
      body: req.body,
      params: req.params,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} — ${message}`);
  }

  // ── Send response ─────────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    data,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
