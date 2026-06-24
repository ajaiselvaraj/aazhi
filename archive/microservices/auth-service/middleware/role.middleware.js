// ═══════════════════════════════════════════════════════════════
// Role-Based Authorization Middleware
// Restricts access based on user roles (citizen, admin, staff)
// ═══════════════════════════════════════════════════════════════

import { fail } from "../utils/response.js";

export const allowRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return fail(res, "Authentication required.", 401);
        }

        if (!roles.includes(req.user.role)) {
            return fail(
                res,
                `Access denied. Required role: ${roles.join(" or ")}. Your role: ${req.user.role}`,
                403
            );
        }

        next();
    };
};

// Convenience role checks
export const adminOnly = allowRoles("admin");
export const staffOnly = allowRoles("staff", "admin");
export const citizenOnly = allowRoles("citizen");
export const authenticated = allowRoles("citizen", "staff", "admin");