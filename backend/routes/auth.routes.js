// ═══════════════════════════════════════════════════════════════
// Authentication Routes
// POST /api/auth/register - Citizen registration
// POST /api/auth/login    - Login (all roles)
// POST /api/auth/refresh  - Refresh access token
// POST /api/auth/logout   - Logout (invalidate refresh token)
// GET  /api/auth/profile  - Get current user profile
// ═══════════════════════════════════════════════════════════════

import express from "express";
import { register, login, refreshToken, logout, getProfile, firebaseLogin } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validate, registerSchema, loginSchema } from "../utils/validator.js";

import { verifyTokenNotBlacklisted } from "../middleware/jwtBlacklist.js";

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/firebase-login", authLimiter, firebaseLogin);
router.post("/refresh", refreshToken);
router.post("/logout", authMiddleware, verifyTokenNotBlacklisted, logout);
router.get("/profile", authMiddleware, verifyTokenNotBlacklisted, getProfile);

export default router;