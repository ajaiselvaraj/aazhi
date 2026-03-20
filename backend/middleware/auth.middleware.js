// ═══════════════════════════════════════════════════════════════
// JWT Authentication Middleware
// Verifies access token and attaches user to request
// ═══════════════════════════════════════════════════════════════

import jwt from "jsonwebtoken";
import { fail } from "../utils/response.js";

export default function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        console.log(`\n🛡️ [AUTH] Validating request to: ${req.method} ${req.originalUrl}`);
        console.log(`🛡️ [AUTH] Authorization Header:`, authHeader ? authHeader.substring(0, 20) + "..." : "MISSING");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn(`🛡️ [AUTH DEBUG] Request blocked. Missing or malformed Bearer token.`);
            return fail(res, "Access denied. No token provided.", 401);
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id,
            role: decoded.role,
            name: decoded.name,
        };
        
        console.log(`✅ [AUTH DEBUG] Token valid. User decoded -> ID: ${req.user.id} | Role: ${req.user.role}`);
        next();
    } catch (err) {
        console.error(`❌ [AUTH ERROR] JWT Verification failed:`, err.message);
        if (err.name === "TokenExpiredError") {
            return fail(res, "Token expired. Please login again.", 401);
        }
        if (err.name === "JsonWebTokenError") {
            return fail(res, "Invalid token.", 401);
        }
        return fail(res, "Authentication failed.", 401);
    }
}

// Optional auth — attaches user if token present, doesn't block if missing
export function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                id: decoded.id,
                role: decoded.role,
                name: decoded.name,
            };
        }
    } catch {
        // Token invalid, proceed without user
    }
    next();
}