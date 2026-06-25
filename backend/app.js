// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Express Application Configuration
// ═══════════════════════════════════════════════════════════════

import express from "express";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";

// Routes
import electricityRoutes from "./routes/electricity.routes.js";
import gasRoutes from "./routes/gas.routes.js";
import municipalRoutes from "./routes/municipal.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import serviceRequestRoutes from "./routes/serviceRequest.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import trackingRoutes from "./routes/tracking.routes.js"; // ⭐ PLUG-IN: QR Tracking Layer
import { adminAlertRouter, publicAlertRouter } from "./routes/alert.routes.js"; // ⭐ ADD-ON: Civic Alert Management
import integrityRoutes from "./routes/integrity.routes.js"; // ⭐ ADD-ON: Anonymous Civic Whistleblower Channel
import cciRoutes from "./routes/cci.routes.js"; // ⭐ ADD-ON: Cross-Complaint Cascade Intelligence (CCI)
import subscriptionRoutes from "./routes/subscription.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import escalationRoutes from "./routes/escalation.routes.js"; // ⭐ ADD-ON: Complaint Escalation & Accountability Engine
import aiRoutes from "./routes/ai.routes.js"; // ⭐ AI Proxy Routes
import { startEscalationCron } from "./services/escalationCron.js"; // ⭐ ADD-ON: SLA breach background cron

import { pool, getPoolStatus } from "./config/db.js";

// Middleware
import errorHandler from "./middleware/error.middleware.js";
import auditLogger from "./middleware/audit.middleware.js";
import { SecurityEngine } from "./middleware/SecurityEngine.js";

const app = express();

// ─── Trust Cloud Proxies ──────────────────────────────
app.set('trust proxy', 1);

// ─── HTTPS Redirect (Production Only) ──────────────────
app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && !req.secure && req.get("x-forwarded-proto") !== "https" && req.method !== "OPTIONS" && req.hostname !== "localhost") {
        return res.redirect(`https://${req.get("host")}${req.url}`);
    }
    next();
});

// ─── Enable gzip/brotli Compression ───────────────────
app.use(compression());


// ─── Security Headers ─────────────────────────────────
app.use(SecurityEngine.applySecurityHeaders);


// ─── CORS CONFIG ───────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL ||
    "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173,http://localhost:5174,http://localhost:5175")
    .split(",")
    .map(o => o.trim());

// ⭐ DEBUG LOG: Show allowed origins on startup
console.log("🔒 [CORS] Allowed Origins:", allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like server-to-server or mobile apps)
        if (!origin) return callback(null, true);

        // Check against explicitly allowed origins
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        // Allow localhost in development mode
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
            return callback(null, true);
        }

        // Block unauthorized origins
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-waf-secret', 'x-kiosk-secret', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    optionsSuccessStatus: 204
}));

// ─── Body Parsing & XSS Protection ──────────────────────
import xssClean from "xss-clean";

app.use((req, res, next) => {
    if (req.path === '/api/integrity/report') {
        express.json({ limit: '10mb' })(req, res, next);
    } else {
        express.json({ limit: '10kb' })(req, res, next);
    }
});

app.use((req, res, next) => {
    if (req.path === '/api/integrity/report') {
        express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    } else {
        express.urlencoded({ extended: true, limit: '10kb' })(req, res, next);
    }
});

app.use(xssClean()); // Strip malicious scripts and tags globally


// ─── Logging ──────────────────────────────────────────
// ⭐ RAW REQUEST LOGGING (BEFORE BODY PARSING) ⭐
app.use((req, res, next) => {
    console.log(`📡 [RAW] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'N/A'}`);
    next();
});

app.use(morgan("combined"));


// ⭐ Gatekeeper SAFE WRAPPER ⭐
app.use((req, res, next) => {
    if (req.method === "OPTIONS") return next();
    return SecurityEngine.gatekeeper(req, res, next);
});


// ─── Audit Logger ──────────────────────────────────────
app.use(auditLogger);


// ─── Health & Root ─────────────────────────────────────────
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "SUVIDHA KIOSK Backend API is running.",
        healthCheck: "/api/health"
    });
});

app.get("/api/health", async (req, res) => {

    let dbStatus = "unreachable";
    let dbTime = null;

    try {
        const client = await pool.connect();
        const result = await client.query("SELECT NOW() AS now");
        client.release();

        dbStatus = "connected";
        dbTime = result.rows[0].now;

    } catch {
        dbStatus = "error";
    }

    const healthy = dbStatus === "connected";

    res.status(healthy ? 200 : 503).json({
        success: healthy,
        data: {
            database: dbStatus,
            time: dbTime
        }
    });

});


// ─── Routes ────────────────────────────────────────────
app.use("/api/electricity", electricityRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/municipal", municipalRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/track", trackingRoutes); // ⭐ PLUG-IN: Public QR Tracking (no auth)
app.use("/api/admin/alerts", adminAlertRouter); // ⭐ ADD-ON: Admin Civic Alert CRUD
app.use("/api/alerts", publicAlertRouter);       // ⭐ ADD-ON: Public active-alert feed
app.use("/api/integrity", integrityRoutes);     // ⭐ ADD-ON: Anonymous Civic Whistleblower Channel
app.use("/api/cci", cciRoutes);                 // ⭐ ADD-ON: Cross-Complaint Cascade Intelligence (CCI)
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", escalationRoutes);             // ⭐ ADD-ON: Escalation & Accountability API
app.use("/api/ai", aiRoutes);                    // ⭐ AI Proxy Routes
startEscalationCron();                           // ⭐ ADD-ON: Start 30-min SLA breach cron


// ─── 404 ───────────────────────────────────────────────
app.use("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});


// ─── Error Handler ─────────────────────────────────────
app.use(errorHandler);


export default app;