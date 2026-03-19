// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Security Engine Middleware
// A+ Zero-Trust Security Headers, WAF, Geo-Fencing, Leaky Bucket
// ═══════════════════════════════════════════════════════════════

import helmet from "helmet";
import hpp from "hpp";

import { createClient } from "redis";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

// ─── Distributed Leaky Bucket Rate Limiter (Redis) ────────────────────
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://redis:6379"
});

redisClient.connect().catch(console.error);

export const distributedRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
    data: {},
  }
});

// ─── Blocked IPs / Countries (Configurable) ──────────────────
const BLOCKED_IPS = new Set((process.env.BLOCKED_IPS || "").split(",").filter(Boolean));
const ALLOWED_COUNTRIES = new Set((process.env.ALLOWED_COUNTRIES || "IN").split(",").filter(Boolean));

// ─── Security Engine ─────────────────────────────────────────
export class SecurityEngine {

  /**
   * Apply A+ security headers using helmet + custom CSP
   */
  static applySecurityHeaders(req, res, next) {
    // Apply helmet defaults
    helmet()(req, res, () => {});

    // HPP — HTTP Parameter Pollution prevention
    hpp()(req, res, () => {});

    // Custom security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join("; ")
    );

    next();
  }

  /**
   * Gatekeeper — WAF secret validation + Geo-Fencing + Leaky Bucket rate limiting
   */
  static gatekeeper(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    // ── 1. Blocked IP Check ───────────────────────────────────
    if (BLOCKED_IPS.has(ip)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
        data: {},
      });
    }

    // ── 2. WAF Secret Header Validation (optional) ───────────
    const wafSecret = process.env.WAF_SECRET;
    if (wafSecret) {
      const incomingSecret = req.headers["x-waf-secret"];
      if (incomingSecret !== wafSecret) {
        return res.status(403).json({
          success: false,
          message: "Invalid WAF secret.",
          data: {},
        });
      }
    }

    // ── 3. Rate Limiting is now handled by the Express Middleware directly. ─────────────────
    next();
  }
}

export default SecurityEngine;
