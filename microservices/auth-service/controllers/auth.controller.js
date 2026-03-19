// ═══════════════════════════════════════════════════════════════
// Authentication Controller
// ═══════════════════════════════════════════════════════════════

import { requestOtp, confirmOtp } from "../services/otp.service.js";
import { generateTokens } from "../services/jwt.service.js";
import { success, fail, error as serverError } from "../utils/response.js";
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
