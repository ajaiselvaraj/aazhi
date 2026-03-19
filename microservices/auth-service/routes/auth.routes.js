// ═══════════════════════════════════════════════════════════════
// Authentication Routes
// ═══════════════════════════════════════════════════════════════

import express from "express";
import { sendOtpController, verifyOtpController } from "../controllers/auth.controller.js";
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

export default router;