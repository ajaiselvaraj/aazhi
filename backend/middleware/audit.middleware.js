// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Audit Logger Middleware
// Logs every incoming request with user, IP, method, and route
// ═══════════════════════════════════════════════════════════════

import logger from "../utils/logger.js";

/**
 * Audit logger middleware.
 * Logs each request with: timestamp, method, URL, IP, user (if authenticated).
 */
const auditLogger = (req, res, next) => {
  const start = Date.now();

  // Extract user info from JWT (req.user) or Auth0 session (if available)
  const user = req.user?.id || req.user?.name || req.oidc?.user?.email || req.oidc?.user?.sub || "anonymous";

  // Log on response finish to capture status code and duration
  res.on("finish", () => {
    const duration = Date.now() - start;
    const kioskId = req.headers["x-kiosk-id"] || "unknown-kiosk";

    logger.info("AUDIT", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ip: req.ip || req.connection?.remoteAddress,
      user,
      kioskId,
      durationMs: duration,
      userAgent: req.headers["user-agent"] || "unknown",
    });
  });

  next();
};

export default auditLogger;
