// ═══════════════════════════════════════════════════════════════
// Service Availability Middleware
// Checks if a civic service module is enabled before processing
// ═══════════════════════════════════════════════════════════════

import { pool } from "../config/db.js";
import { fail } from "../utils/response.js";

export const checkServiceEnabled = (serviceName) => {
    return async (req, res, next) => {
        try {
            const result = await pool.query(
                "SELECT is_enabled FROM service_config WHERE service_name = $1",
                [serviceName]
            );

            if (result.rows.length === 0) {
                return fail(res, `Service '${serviceName}' is not configured.`, 404);
            }

            if (!result.rows[0].is_enabled) {
                return fail(
                    res,
                    `The ${serviceName} service is currently unavailable. Please try again later.`,
                    503
                );
            }

            next();
        } catch {
            // If service_config check fails, allow request through
            next();
        }
    };
};
