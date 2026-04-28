// ═══════════════════════════════════════════════════════════════
// JWT Authentication Middleware
// Verifies access token and attaches user to request
// ═══════════════════════════════════════════════════════════════

import jwt from "jsonwebtoken";
import { fail } from "../utils/response.js";
import { checkTokenBlacklist } from "./tokenBlacklist.js";

function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }
    if (req.headers.cookie) {
        const match = req.headers.cookie.match(new RegExp('(^| )accessToken=([^;]+)'));
        if (match) return match[2];
    }
    return null;
}

function verifyJwt(req, res, next) {
    try {
        console.log(`\n🛡️ [AUTH] Validating request to: ${req.method} ${req.originalUrl}`);

        const token = extractToken(req);
        const authHeader = req.headers.authorization;

        if (!token) {
            console.warn(`🛡️ [AUTH DEBUG] Request blocked. Missing or malformed token.`);
            console.log(`🛡️ [AUTH DEBUG] Authorization Header present: ${!!authHeader}`);
            if (authHeader) console.log(`🛡️ [AUTH DEBUG] Header prefix: ${authHeader.substring(0, 15)}...`);
            return fail(res, "Access denied. No token provided.", 401);
        }

        // Attach token for downstream middlewares (like blacklist)
        req.token = token;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id,
            role: decoded.role,
            name: decoded.name,
            mobileNumber: decoded.mobile,
            department: decoded.department,
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

const authMiddleware = [verifyJwt, checkTokenBlacklist];
export default authMiddleware;

// Optional auth — attaches user if token present, doesn't block if missing
export function optionalAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                id: decoded.id,
                role: decoded.role,
                name: decoded.name,
                mobileNumber: decoded.mobile,
                department: decoded.department,
            };
        }
    } catch {
        // Token invalid, proceed without user
    }
    next();
}