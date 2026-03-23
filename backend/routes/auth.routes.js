// ═══════════════════════════════════════════════════════════════
// Authentication Routes
// ═══════════════════════════════════════════════════════════════

import express from "express";
import { sendOtpController, verifyOtpController, mockAadhaarLogin, adminLogin } from "../controllers/auth.controller.js";
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
 * @desc    Mock Aadhaar login for Demo
 * @route   POST /api/auth/mock-aadhaar
 * @access  Public
 */
router.post("/mock-aadhaar", mockAadhaarLogin);

/**
 * @desc    Admin login
 * @route   POST /api/auth/admin-login
 * @access  Public
 */
router.post("/admin-login", adminLogin);

export default router;