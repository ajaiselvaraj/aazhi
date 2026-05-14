// ═══════════════════════════════════════════════════════════════
// Authentication Controller
// ═══════════════════════════════════════════════════════════════

import { requestOtp, confirmOtp } from "../services/otp.service.js";
import { generateTokens } from "../services/jwt.service.js";
import { success, fail, error as serverError } from "../utils/response.js";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

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
 * Handles Kiosk Citizen Login purely via Consumer ID
 * Route: POST /api/auth/kiosk/login
 */
export const kioskLoginController = async (req, res, next) => {
    try {
        const { consumerId } = req.body;

        if (!consumerId) {
            return fail(res, "Consumer ID is required for Kiosk login.", 400);
        }

        // 1. Map consumerId to a citizen via utility_accounts
        const accountQuery = `
            SELECT c.*
            FROM utility_accounts ua
            JOIN citizens c ON ua.citizen_id = c.id
            WHERE ua.account_number = $1
            LIMIT 1
        `;
        let accountResult = await pool.query(accountQuery, [consumerId]);

        if (accountResult.rows.length === 0) {
            if (consumerId === '111111111111') {
                logger.info("[Auth Controller] Using mock demo user for 111111111111");
                const demoCitizenId = "9eb3f201-174d-48e9-a061-b88093fe58dc";
                accountResult = await pool.query("SELECT * FROM citizens WHERE id = $1", [demoCitizenId]);
                
                if (accountResult.rows.length === 0) {
                    accountResult = await pool.query("SELECT * FROM citizens LIMIT 1");
                }
            } else {
                // Note: In an actual production scenario, you might have a pin check as well
                return fail(res, "Invalid Consumer ID. No citizen linked.", 404);
            }
        }

        const citizen = accountResult.rows[0];

        // 2. Generate auth tokens strictly for this citizen
        const { accessToken, refreshToken } = generateTokens(citizen);

        logger.info(`[Auth Controller] Kiosk Consumer Login success for Citizen ID: ${citizen.id}`);

        return success(res, "Kiosk login successful", {
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
        logger.error(`[Auth Controller] Kiosk Login Error: ${error.message}`);
        return serverError(res, "Failed to authenticate via Kiosk.", 500);
    }
};
