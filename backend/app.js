// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Express Application Configuration
// ═══════════════════════════════════════════════════════════════

import express from "express";
import "dotenv/config";
import cors from "cors";
import morgan from "morgan";

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

import { pool, getPoolStatus } from "./config/db.js";

// Middleware
import errorHandler from "./middleware/error.middleware.js";
import auditLogger from "./middleware/audit.middleware.js";
import { SecurityEngine } from "./middleware/SecurityEngine.js";

const app = express();


// ─── Security Headers ─────────────────────────────────
app.use(SecurityEngine.applySecurityHeaders);


// ─── CORS CONFIG ───────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL ||
    "http://localhost:3000,http://localhost:3001,http://localhost:3002")
    .split(",")
    .map(o => o.trim());

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));


// ⭐⭐⭐ VERY IMPORTANT FIX ⭐⭐⭐
// Allow PREFLIGHT to PASS before security engine
app.options("*", cors());


// ─── Body Parsing ─────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ─── Logging ──────────────────────────────────────────
app.use(morgan("combined"));


// ⭐ Gatekeeper SAFE WRAPPER ⭐
app.use((req, res, next) => {
    if (req.method === "OPTIONS") return next();
    return SecurityEngine.gatekeeper(req, res, next);
});


// ─── Audit Logger ──────────────────────────────────────
app.use(auditLogger);


// ─── Health ────────────────────────────────────────────
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