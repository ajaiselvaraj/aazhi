// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Express Application Configuration
// Unified Civic Utility Self-Service KIOSK Platform
// ═══════════════════════════════════════════════════════════════

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import electricityRoutes from "./routes/electricity.routes.js";
import gasRoutes from "./routes/gas.routes.js";
import municipalRoutes from "./routes/municipal.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import serviceRequestRoutes from "./routes/serviceRequest.routes.js";
import adminRoutes from "./routes/admin.routes.js";

// Middleware imports
import { generalLimiter } from "./middleware/rateLimiter.js";
import errorHandler from "./middleware/error.middleware.js";
import auditLogger from "./middleware/audit.middleware.js";

const app = express();

// ─── Security Middleware ─────────────────────────────────
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Kiosk-Id"],
}));

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ─────────────────────────────────────
app.use(morgan("combined"));

// ─── Rate Limiting ───────────────────────────────────────
app.use(generalLimiter);

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

// ─── API Routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/electricity", electricityRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/municipal", municipalRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/admin", adminRoutes);

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