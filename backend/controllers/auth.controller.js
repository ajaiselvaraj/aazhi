// ═══════════════════════════════════════════════════════════════
// Authentication Controller
// ═══════════════════════════════════════════════════════════════

import { requestOtp, confirmOtp } from "../services/otp.service.js";
import { generateTokens } from "../services/jwt.service.js";
import { success, fail, error as serverError } from "../utils/response.js";
import logger from "../utils/logger.js";
import { pool } from "../config/db.js";

/**
 * Handles generating and sending OTP to a given mobile number
 * Route: POST /api/auth/send-otp
 */
export const sendOtpController = async (req, res, next) => {
    try {
        const { mobile } = req.body;

        if (!mobile || !/^\d{10}$/.test(mobile)) {
            return fail(res, "Valid 10-digit mobile number is required.", 400);
        }

        const otpDetails = await requestOtp(mobile);
        logger.info(`[Auth Controller] OTP generated for ${mobile}`);

        return success(res, "OTP sent successfully via SMS", {
            mobile: otpDetails.mobile,
            expiresAt: otpDetails.expiry,
        }, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Send OTP Error: ${error.message}`);
        // Handle rate limit specifically
        if (error.message.includes("Too many OTP requests")) {
            return fail(res, error.message, 429);
        }
        return serverError(res, error.message || "Failed to send OTP.", 500);
    }
};

/**
 * Handles verifying an OTP submitted by a citizen
 * Route: POST /api/auth/verify-otp
 */
export const verifyOtpController = async (req, res, next) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return fail(res, "Mobile number and OTP are required.", 400);
        }

        const citizen = await confirmOtp(mobile, otp);
        const { accessToken, refreshToken } = generateTokens(citizen);

        logger.info(`[Auth Controller] Successful login mapping to Citizen ID: ${citizen.id}`);

        return success(res, "Logged in successfully", {
            citizen: {
                id: citizen.id,
                mobile: citizen.mobile,
                name: citizen.name || null,
                createdAt: citizen.created_at
            },
            tokens: {
                accessToken,
                refreshToken
            }
        }, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Verify OTP Error: ${error.message}`);
        if (error.message.includes("Invalid") || error.message.includes("expired") || error.message.includes("not found")) {
            return fail(res, error.message, 400);
        }
        return serverError(res, "Failed to verify OTP due to server issue.", 500);
    }
};

/**
 * MOCK AADHAAR LOGIN (For Demo/Simulation with Real JWT Sync)
 * Route: POST /api/auth/mock-aadhaar
 */
export const mockAadhaarLogin = async (req, res, next) => {
    try {
        const { aadhaarNumber } = req.body;
        
        // 1. Validate Aadhaar Format (12 digits)
        if (!aadhaarNumber || aadhaarNumber.replace(/\s/g, '').length !== 12) {
            return fail(res, "Invalid Aadhaar number format.", 400);
        }

        // 2. We use our Demo Citizen ID from the database
        // This is the same ID I used in the debug routes: 9eb3f201-174d-48e9-a061-b88093fe58dc
        const demoCitizenId = "9eb3f201-174d-48e9-a061-b88093fe58dc";
        
        let result = await pool.query("SELECT * FROM citizens WHERE id = $1", [demoCitizenId]);
        if (result.rows.length === 0) {
            result = await pool.query("SELECT * FROM citizens LIMIT 1");
            if (result.rows.length === 0) {
                // Insert a dummy citizen if none exist
                result = await pool.query(`
                    INSERT INTO citizens (mobile, name, role) 
                    VALUES ('9999999999', 'Mock Aadhaar User', 'citizen') 
                    RETURNING *
                `);
            }
        }

        const citizen = result.rows[0];
        const { accessToken, refreshToken } = generateTokens(citizen);

        logger.info(`[Auth Controller] Mock Aadhaar login success for citizen ${citizen.id}`);

        return success(res, "Aadhaar verified (Demo Mode)", {
            citizen: {
                id: citizen.id,
                mobile: citizen.mobile,
                name: citizen.name || "Aadhaar User",
                role: citizen.role
            },
            tokens: {
                accessToken,
                refreshToken
            }
        }, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Mock Aadhaar Error: ${error.message}`);
        return serverError(res, "Failed to process mock Aadhaar login.", 500);
    }
};

/**
 * ADMIN LOGIN (For Admin Dashboard)
 * Route: POST /api/auth/admin-login
 */
export const adminLogin = async (req, res, next) => {
    try {
        const { adminId, password, department } = req.body;

        if (!adminId || !password || !department) {
            return fail(res, "Admin ID, password, and department are required.", 400);
        }

        // Just a mock check for demonstration, or we can query real DB if we want to store admins.
        // Let's check for an admin user in DB.
        let result = await pool.query("SELECT * FROM citizens WHERE role = 'admin' LIMIT 1");
        
        if (result.rows.length === 0) {
            // Insert a dummy admin if none exist
            result = await pool.query(`
                INSERT INTO citizens (mobile, name, role) 
                VALUES ('0000000000', 'Admin Officer', 'admin') 
                RETURNING *
            `);
        }

        const admin = result.rows[0];
        admin.department = department;

        const { accessToken, refreshToken } = generateTokens(admin);

        logger.info(`[Auth Controller] Admin login success for ${adminId} in ${department}`);

        return success(res, "Admin verification successful.", {
            admin: {
                id: admin.id,
                adminId,
                name: admin.name || "Admin Officer",
                department,
                role: "admin"
            },
            tokens: {
                accessToken,
                refreshToken
            }
        }, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Admin Login Error: ${error.message}`);
        return serverError(res, "Failed to process admin login.", 500);
    }
};
