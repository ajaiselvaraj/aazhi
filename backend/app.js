// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Express Application Configuration
// Unified Civic Utility Self-Service KIOSK Platform
// Auth0 Integration using express-openid-connect
// ═══════════════════════════════════════════════════════════════

import express from "express";
import "dotenv/config"; // Load environment variables from .env file
import cors from "cors";
import morgan from "morgan";

// Route imports
import electricityRoutes from "./routes/electricity.routes.js";
import gasRoutes from "./routes/gas.routes.js";
import municipalRoutes from "./routes/municipal.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import serviceRequestRoutes from "./routes/serviceRequest.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";

// Middleware imports
import { generalLimiter } from "./middleware/rateLimiter.js";
import errorHandler from "./middleware/error.middleware.js";
import auditLogger from "./middleware/audit.middleware.js";
import { accountLockout } from "./middleware/accountLockout.js";
import { auth } from "express-openid-connect";
import { SecurityEngine } from "./middleware/SecurityEngine.js";

const app = express();

// ─── Security Middleware ─────────────────────────────────
app.use(SecurityEngine.applySecurityHeaders); // Apply A+ Zero-Trust Headers (CSP, HSTS)
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Kiosk-Id"],
}));

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: "100kb" })); // Defends against JSON-bomb DoS attacks
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ─── Request Logging ─────────────────────────────────────
app.use(morgan("combined"));

// ─── Auth0 OpenID Connect ────────────────────────────────
// This middleware attaches authentication routes (/login, /logout, /callback)
// and provides user session management.
const auth0Config = {
  authRequired: false, // False = Don't protect all routes by default
  auth0Logout: true, // True = Redirect to Auth0 for logout
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
};

app.use(auth(auth0Config));

// ─── Root Route (For Auth Testing) ───────────────────────
// A simple test route to check if the user is authenticated.
// This is provided by the express-openid-connect middleware.
app.get("/", (req, res) => {
  res.send(
    req.oidc.isAuthenticated() ? `Logged in as ${req.oidc.user.name}` : "Logged out"
  );
});

// ─── Advanced Rate Limiting & Security Gates ─────────────
// This single middleware handles WAF secret validation, Geo-Fencing,
// and a high-performance, role-aware Leaky Bucket rate limiter.
// The older `generalLimiter` is removed to avoid redundancy.
app.use(SecurityEngine.gatekeeper); // Apply Geo-Fencing, WAF Secrets, and Leaky Bucket

// ─── Audit Logging ───────────────────────────────────────
app.use(auditLogger);

// ─── Health Check ────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "SUVIDHA KIOSK Backend is running",
        data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            uptime: process.uptime(),
        },
    });
});

// ─── Hardware Heartbeat ──────────────────────────────────
app.post("/api/system/heartbeat", (req, res) => {
    // This endpoint receives the hardware heartbeat from the frontend KioskShell
    // It prevents the frontend from throwing proxy/404 errors every 30 seconds
    const { terminalId, batteryLevel, isCharging, timestamp } = req.body;
    
    // Optional: You can log or update the kiosk status in your database here
    res.status(200).json({
        success: true,
        message: "Heartbeat acknowledged"
    });
});

// ─── API Routes ──────────────────────────────────────────
app.use("/api/electricity", electricityRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/municipal", municipalRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

// ─── 404 Handler ─────────────────────────────────────────
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        data: {},
    });
});

// ─── Error Handler (must be last) ────────────────────────
app.use(errorHandler);

export default app;