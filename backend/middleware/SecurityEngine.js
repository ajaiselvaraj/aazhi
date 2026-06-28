// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Security Engine Middleware
// A+ Zero-Trust Security Headers, WAF, Geo-Fencing, Leaky Bucket
// ═══════════════════════════════════════════════════════════════

import helmet from "helmet";
import hpp from "hpp";
import geoip from "geoip-lite";

// ─── Leaky Bucket Rate Limiter (In-Memory) ────────────────────
// Stores: { ip -> { tokens, lastRefill } }
const buckets = new Map();

const BUCKET_CAPACITY = 60;       // Max tokens per bucket
const REFILL_RATE = 1;            // Tokens added per second
const REFILL_INTERVAL_MS = 1000;  // Refill every 1 second

function getTokens(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip) || { tokens: BUCKET_CAPACITY, lastRefill: now };

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / REFILL_INTERVAL_MS;
  bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + elapsed * REFILL_RATE);
  bucket.lastRefill = now;

  buckets.set(ip, bucket);
  return bucket;
}

function consumeToken(ip) {
  const bucket = getTokens(ip);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(ip, bucket);
    return true;
  }
  return false;
}

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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: https://*.razorpay.com",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
        "frame-src 'self' https://api.razorpay.com",
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

    // ── 1.5 Geo-Fencing Check ──────────────────────────────────
    if (ip !== "127.0.0.1" && ip !== "::1" && !ip.startsWith("192.168.") && !ip.startsWith("10.")) {
      const geo = geoip.lookup(ip);
      // If country is detected and not in allowed list, block it.
      if (geo && !ALLOWED_COUNTRIES.has(geo.country)) {
        return res.status(403).json({
          success: false,
          message: "Access from your country is blocked.",
          data: {},
        });
      }
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

    // ── 3. Leaky Bucket Rate Limiting ─────────────────────────
    if (!consumeToken(ip)) {
      res.setHeader("Retry-After", "1");
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please slow down.",
        data: {},
      });
    }

    // ── 4. CSRF Protection (Origin / Referer Check) ───────────
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      const host = req.headers.host;
      
      const allowedOrigins = (process.env.FRONTEND_URL ||
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173,http://localhost:5174,http://localhost:5175")
        .split(",")
        .map(o => o.trim());

      // If neither origin nor referer is present, and it's not a server-to-server or kiosk call (which should have WAF secret), block it
      if (!origin && !referer && !req.headers["x-waf-secret"] && !req.headers["x-kiosk-secret"]) {
          return res.status(403).json({ success: false, message: "CSRF Protection: Missing Origin or Referer." });
      }

      let isValidOrigin = false;
      
      if (origin) {
        isValidOrigin = allowedOrigins.includes(origin);
      } else if (referer) {
        isValidOrigin = allowedOrigins.some(allowed => referer.startsWith(allowed));
      }

      // Allow Postman / cURL if they have valid WAF or KIOSK secrets
      if (!isValidOrigin && (req.headers["x-waf-secret"] || req.headers["x-kiosk-secret"])) {
          isValidOrigin = true;
      }

      if (!isValidOrigin) {
        return res.status(403).json({
          success: false,
          message: "CSRF Protection: Invalid Origin/Referer."
        });
      }
    }

    next();
  }
}

export default SecurityEngine;
