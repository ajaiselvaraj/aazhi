// ═══════════════════════════════════════════════════════════════
// Authentication Controller
// Citizen / Admin / Staff Login, Register, Token Refresh
// ═══════════════════════════════════════════════════════════════

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { success, fail } from "../utils/response.js";
import { maskAadhaar } from "../utils/helpers.js";
import logger from "../utils/logger.js";
import crypto from "crypto";
import { firebaseAdmin } from "../config/firebase.js";

// ─── Citizen Registration ─────────────────────────────────
export const register = async (req, res, next) => {
    try {
        const { name, mobile, email, aadhaar, password, address, ward, zone } = req.body;

        // Check if mobile already registered
        const existing = await pool.query(
            "SELECT id FROM citizens WHERE mobile = $1",
            [mobile]
        );
        if (existing.rows.length > 0) {
            return fail(res, "Mobile number already registered.", 409);
        }

        // Hash password and Aadhaar
        const passwordHash = await bcrypt.hash(password, 12);
        const aadhaarHash = crypto.createHash("sha256").update(aadhaar).digest("hex");
        const aadhaarMasked = maskAadhaar(aadhaar);

        const result = await pool.query(
            `INSERT INTO citizens (name, mobile, email, aadhaar_hash, aadhaar_masked, password_hash, role, address, ward, zone)
             VALUES ($1, $2, $3, $4, $5, $6, 'citizen', $7, $8, $9) RETURNING id, name, mobile, role, created_at`,
            [name, mobile, email || null, aadhaarHash, aadhaarMasked, passwordHash, address || null, ward || null, zone || null]
        );

        const user = result.rows[0];

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        await pool.query("UPDATE citizens SET refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

        logger.info("Citizen registered", { citizenId: user.id, mobile });

        return success(res, "Registration successful", {
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                role: user.role,
            },
            accessToken,
            refreshToken,
        }, 201);
    } catch (err) {
        next(err);
    }
};

// ─── Login (All Roles) ───────────────────────────────────
export const login = async (req, res, next) => {
    try {
        const { mobile, password } = req.body;

        const result = await pool.query(
            "SELECT id, name, mobile, password_hash, role, is_active, aadhaar_masked, address, ward, zone FROM citizens WHERE mobile = $1",
            [mobile]
        );

        if (result.rows.length === 0) {
            return fail(res, "Invalid credentials.", 401);
        }

        const user = result.rows[0];

        if (!user.is_active) {
            return fail(res, "Account is deactivated. Contact support.", 403);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return fail(res, "Invalid credentials.", 401);
        }

        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        await pool.query("UPDATE citizens SET refresh_token = $1, updated_at = NOW() WHERE id = $2", [refreshToken, user.id]);

        logger.info("User logged in", { userId: user.id, role: user.role });

        return success(res, "Login successful", {
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                role: user.role,
                aadhaar_masked: user.aadhaar_masked,
                address: user.address,
                ward: user.ward,
                zone: user.zone,
            },
            accessToken,
            refreshToken,
        });
    } catch (err) {
        next(err);
    }
};

// ─── Refresh Token ────────────────────────────────────────
export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return fail(res, "Refresh token required.", 400);
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch {
            return fail(res, "Invalid or expired refresh token.", 401);
        }

        // Check if token matches stored token
        const result = await pool.query(
            "SELECT id, name, mobile, role, refresh_token FROM citizens WHERE id = $1",
            [decoded.id]
        );

        if (result.rows.length === 0 || result.rows[0].refresh_token !== token) {
            return fail(res, "Invalid refresh token.", 401);
        }

        const user = result.rows[0];
        const tokens = generateTokens(user);

        await pool.query("UPDATE citizens SET refresh_token = $1, updated_at = NOW() WHERE id = $2", [tokens.refreshToken, user.id]);

        return success(res, "Token refreshed", {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (err) {
        next(err);
    }
};

// ─── Logout ───────────────────────────────────────────────
export const logout = async (req, res, next) => {
    try {
        if (!req.user) {
            return fail(res, "Authentication required.", 401);
        }
        // Invalidate the refresh token in the database
        await pool.query("UPDATE citizens SET refresh_token = NULL WHERE id = $1", [req.user.id]);
        
        // Blacklist the access token for its remaining validity
        if (req.blacklistToken) {
            await req.blacklistToken();
        }

        return success(res, "Logged out successfully");
    } catch (err) {
        next(err);
    }
};

// ─── Get Current User Profile ─────────────────────────────
export const getProfile = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT c.id, c.name, c.mobile, c.email, c.aadhaar_masked, c.role, c.address, c.ward, c.zone, c.created_at,
                    json_agg(json_build_object(
                        'id', ua.id,
                        'service_type', ua.service_type,
                        'account_number', ua.account_number,
                        'status', ua.status
                    )) FILTER (WHERE ua.id IS NOT NULL) AS utility_accounts
             FROM citizens c
             LEFT JOIN utility_accounts ua ON ua.citizen_id = c.id
             WHERE c.id = $1
             GROUP BY c.id`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return fail(res, "User not found.", 404);
        }

        return success(res, "Profile retrieved", result.rows[0]);
    } catch (err) {
        next(err);
    }
};

// ─── Firebase Mobile Login ───────────────────────────────
export const firebaseLogin = async (req, res, next) => {
    try {
        const { firebaseToken } = req.body;

        if (!firebaseToken) {
            return fail(res, "Firebase token required.", 400);
        }

        // 1. Verify token with Firebase
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
        const { phone_number, uid } = decodedToken;

        if (!phone_number) {
            return fail(res, "Phone number not found in token.", 400);
        }

        // Clean up phone number (remove +91 if present)
        const mobile = phone_number.replace("+91", "").slice(-10);

        // 2. Find or Create user in our DB
        let userResult = await pool.query(
            "SELECT id, name, mobile, role, is_active FROM citizens WHERE mobile = $1",
            [mobile]
        );

        let user;

        if (userResult.rows.length === 0) {
            // New user - auto register
            const newUser = await pool.query(
                `INSERT INTO citizens (name, mobile, role, is_active)
                 VALUES ($1, $2, 'citizen', true) 
                 RETURNING id, name, mobile, role, is_active`,
                [`Citizen ${mobile.slice(-4)}`, mobile]
            );
            user = newUser.rows[0];
            logger.info("New user auto-registered via Firebase", { userId: user.id, mobile });
        } else {
            user = userResult.rows[0];
        }

        if (!user.is_active) {
            return fail(res, "Account is deactivated.", 403);
        }

        // 3. Issue our JWT tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Store refresh token
        await pool.query(
            "UPDATE citizens SET refresh_token = $1, updated_at = NOW() WHERE id = $2",
            [refreshToken, user.id]
        );

        return success(res, "Firebase login successful", {
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                role: user.role,
            },
            accessToken,
            refreshToken,
        });
    } catch (error) {
        logger.error("Firebase Login Error:", error);
        return fail(res, "Identity verification failed.", 401);
    }
};

// ─── Token Generation Helper ─────────────────────────────
function generateTokens(user) {
    const accessToken = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || "1h" }
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY || "7d" }
    );

    return { accessToken, refreshToken };
}
