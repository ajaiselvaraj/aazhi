// ═══════════════════════════════════════════════════════════════
// Rate Limiter Configuration
// Configurable via environment variables
// ═══════════════════════════════════════════════════════════════

import rateLimit from "express-rate-limit";

// General API rate limiter
export const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
        data: {},
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter limiter for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10, // 10 login attempts per window
    message: {
        success: false,
        message: "Too many login attempts. Please try again after 15 minutes.",
        data: {},
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Payment endpoint limiter
export const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        message: "Too many payment requests. Please try again later.",
        data: {},
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default generalLimiter;