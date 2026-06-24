// ═══════════════════════════════════════════════════════════════
// Authentication Routes
// ═══════════════════════════════════════════════════════════════

import express from "express";
import { sendOtpController, verifyOtpController, kioskLoginController } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * @desc    Generate and Send OTP to mobile
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
router.post("/send-otp", authLimiter, sendOtpController);

/**
 * @desc    Verify OTP and Authenticate/Register
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
router.post("/verify-otp", authLimiter, verifyOtpController);

/**
 * @desc    Kiosk Citizen Login via Consumer ID
 * @route   POST /api/auth/kiosk/login
 * @access  Public
 */
router.post("/kiosk/login", authLimiter, kioskLoginController);

export default router;