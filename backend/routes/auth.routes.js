// ═══════════════════════════════════════════════════════════════
// Authentication Routes
// ═══════════════════════════════════════════════════════════════

import express from "express";
import { sendOtpController, verifyOtpController, mockAadhaarLogin, adminLogin, refreshTokenController, logoutController } from "../controllers/auth.controller.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import authMiddleware from "../middleware/auth.middleware.js";

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

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
router.post("/refresh", refreshTokenController);

/**
 * @desc    Log out the user and blacklist token
 * @route   POST /api/auth/logout
 * @access  Protected
 */
router.post("/logout", authMiddleware, logoutController);

export default router;