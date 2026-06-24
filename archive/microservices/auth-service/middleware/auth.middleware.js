// ═══════════════════════════════════════════════════════════════
// JWT Authentication Middleware
// Verifies access token and attaches user to request
// ═══════════════════════════════════════════════════════════════

import jwt from "jsonwebtoken";
import { fail } from "../utils/response.js";

export default function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return fail(res, "Access denied. No token provided.", 401);
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id,
            role: decoded.role,
            name: decoded.name,
        };

        next();
    } catch (err) {
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