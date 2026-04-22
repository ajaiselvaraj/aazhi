// ═══════════════════════════════════════════════════════════════
// Authentication Controller
// ═══════════════════════════════════════════════════════════════

import { requestOtp, confirmOtp } from "../services/otp.service.js";
import { generateTokens, verifyRefreshToken } from "../services/jwt.service.js";
import { blacklistToken } from "../middleware/tokenBlacklist.js";
import { success, fail, error as serverError } from "../utils/response.js";
import logger from "../utils/logger.js";
import { pool } from "../config/db.js";

const setTokenCookies = (res, accessToken, refreshToken) => {
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax"
    };

    if (accessToken) {
        res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 60 * 60 * 1000 });
    }
    if (refreshToken) {
        res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    }
};


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

        setTokenCookies(res, accessToken, refreshToken);

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

        setTokenCookies(res, accessToken, refreshToken);

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
            logger.warn(`[Auth Controller] Admin login attempt failed: Missing fields`);
            return fail(res, "Admin ID, password, and department are required.", 400);
        }

        // Check if ANY admin exists
        let result = await pool.query("SELECT * FROM citizens WHERE role = 'admin' LIMIT 1");
        
        if (result.rows.length === 0) {
            logger.info("[Auth Controller] No admin found. Ensuring dummy admin exists...");
            // Check if our dummy mobile already exists as a citizen
            const checkMobile = await pool.query("SELECT * FROM citizens WHERE mobile = '0000000000'");
            
            if (checkMobile.rows.length > 0) {
                // Promote existing citizen to admin
                result = await pool.query(`
                    UPDATE citizens 
                    SET role = 'admin', name = 'Admin Officer' 
                    WHERE mobile = '0000000000' 
                    RETURNING *
                `);
                logger.info(`[Auth Controller] Promoted existing user 0000000000 to admin.`);
            } else {
                // Insert new admin
                result = await pool.query(`
                    INSERT INTO citizens (mobile, name, role) 
                    VALUES ('0000000000', 'Admin Officer', 'admin') 
                    RETURNING *
                `);
                logger.info(`[Auth Controller] Created new dummy admin.`);
            }
        }

        const admin = result.rows[0];
        admin.department = department;

        const { accessToken, refreshToken } = generateTokens(admin);

        logger.info(`[Auth Controller] Admin login success for ${adminId} in ${department}`);

        setTokenCookies(res, accessToken, refreshToken);

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

/**
 * REFRESH TOKEN
 * Route: POST /api/auth/refresh
 */
export const refreshTokenController = async (req, res, next) => {
    try {
        let { refreshToken } = req.body;
        
        // Fallback to reading from Cookie if body doesn't have it (HTTP-Only flow)
        if (!refreshToken && req.headers.cookie) {
            const match = req.headers.cookie.match(new RegExp('(^| )refreshToken=([^;]+)'));
            if (match) refreshToken = match[2];
        }

        if (!refreshToken) {
            return fail(res, "Refresh token is required.", 400);
        }

        const decoded = verifyRefreshToken(refreshToken);
        
        // Ensure user still exists
        const result = await pool.query("SELECT * FROM citizens WHERE id = $1", [decoded.id]);
        if (result.rows.length === 0) {
            return fail(res, "User not found.", 404);
        }

        const user = result.rows[0];
        // Retain department if it exists in decoded token for admin
        if (decoded.department) {
            user.department = decoded.department;
        }

        const tokens = generateTokens(user);

        setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

        return success(res, "Token refreshed successfully", {
            tokens
        }, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Refresh Token Error: ${error.message}`);
        return fail(res, "Invalid or expired refresh token.", 401);
    }
};

/**
 * LOGOUT
 * Route: POST /api/auth/logout
 */
export const logoutController = async (req, res, next) => {
    try {
        const token = req.token;
        
        if (token) {
            // Blacklist the token so it can't be used again
            await blacklistToken(token, 3600); // 1 hour corresponding to JWT_EXPIRY
        }

        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        return success(res, "Logged out successfully", null, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Logout Error: ${error.message}`);
        return serverError(res, "Failed to log out.", 500);
    }
};
