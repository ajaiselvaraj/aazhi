// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Rate Limiter Middleware
// General & route-specific rate limiters using express-rate-limit
// ═══════════════════════════════════════════════════════════════

import rateLimit from "express-rate-limit";

/**
 * General limiter — applied globally across all routes.
 * 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
    data: {},
  },
});

/**
 * Auth limiter — stricter limits for login/register endpoints.
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
    data: {},
  },
});

/**
 * Payment limiter — extra strict for payment endpoints.
 * 20 requests per 15 minutes per IP.
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many payment requests. Please try again after 15 minutes.",
    data: {},
  },
});

export default generalLimiter;
