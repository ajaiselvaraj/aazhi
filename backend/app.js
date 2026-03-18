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
import userRoutes from "./routes/user.routes.js";
import { pool, getPoolStatus } from "./config/db.js";

// Middleware imports
import { generalLimiter } from "./middleware/rateLimiter.js";
import errorHandler from "./middleware/error.middleware.js";
import auditLogger from "./middleware/audit.middleware.js";
import { accountLockout } from "./middleware/accountLockout.js";
import { SecurityEngine } from "./middleware/SecurityEngine.js";

const app = express();

// ─── Security Middleware ─────────────────────────────────
app.use(SecurityEngine.applySecurityHeaders); // Apply A+ Zero-Trust Headers (CSP, HSTS)

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000,http://localhost:3001,http://localhost:3002")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Kiosk-Id", "X-WAF-Secret"],
}));

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: "100kb" })); // Defends against JSON-bomb DoS attacks
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ─── Request Logging ─────────────────────────────────────
app.use(morgan("combined"));

// ─── Root Route ──────────────────────────────────────────
// Returns a clean JSON response for the API root.
// The React frontend is served separately at FRONTEND_URL.
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "🏛️ SUVIDHA KIOSK API Server",
        description: "Unified Civic Utility Self-Service Platform",
        version: "1.0.0",
        health: `${(process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, "")}/api/health`,
        frontend: process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:3000",
    });
});

// ─── Advanced Rate Limiting & Security Gates ─────────────
// This single middleware handles WAF secret validation, Geo-Fencing,
// and a high-performance, role-aware Leaky Bucket rate limiter.
// The older `generalLimiter` is removed to avoid redundancy.
app.use(SecurityEngine.gatekeeper); // Apply Geo-Fencing, WAF Secrets, and Leaky Bucket

// ─── Audit Logging ───────────────────────────────────────
app.use(auditLogger);

// ─── Health Check ────────────────────────────────────────
app.get("/api/health", async (req, res) => {
    let dbStatus = "unreachable";
    let dbTime = null;

    try {
        const client = await pool.connect();
        const result = await client.query("SELECT NOW() AS now");
        client.release();
        dbStatus = "connected";
        dbTime = result.rows[0].now;
    } catch (_) {
        dbStatus = "error";
    }

    const healthy = dbStatus === "connected";

    res.status(healthy ? 200 : 503).json({
        success: healthy,
        message: healthy ? "SUVIDHA KIOSK Backend is healthy" : "Backend running but DB is unreachable",
        data: {
            status: healthy ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            uptime: process.uptime(),
            database: {
                status: dbStatus,
                serverTime: dbTime,
                pool: getPoolStatus(),     // { total, idle, waiting }
            },
            environment: process.env.NODE_ENV || "development",
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
app.use("/api/users", userRoutes);

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