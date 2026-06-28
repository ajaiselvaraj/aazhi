// ═══════════════════════════════════════════════════════════════
// Authentication Controller
// ═══════════════════════════════════════════════════════════════

import { requestOtp, confirmOtp } from "../services/otp.service.js";
import { generateTokens, verifyRefreshToken } from "../services/jwt.service.js";
import { blacklistToken } from "../middleware/tokenBlacklist.js";
import { success, fail, error as serverError } from "../utils/response.js";
import logger from "../utils/logger.js";
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { encrypt, decrypt } from "../utils/crypto.js";
import { logSecurityIncident } from "../services/securityMonitoring.js";
import { logIntegrityAudit } from "../utils/auditChain.js";

const setTokenCookies = (res, accessToken, refreshToken) => {
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: "strict"
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

        return success(res, "Mobile number verified successfully.", {
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
 * Handles Kiosk Citizen Login purely via Consumer ID
 * Route: POST /api/auth/kiosk/login
 */
export const kioskLoginController = async (req, res, next) => {
    try {
        const { consumerId } = req.body;
        const kioskSecret = req.headers["x-kiosk-secret"];

        // Secure kiosk authentication
        const expectedSecret = process.env.KIOSK_SECRET || "default_kiosk_secret_for_dev";
        if (kioskSecret !== expectedSecret) {
            logger.warn(`[Auth Controller] Unauthorized Kiosk Login Attempt. Invalid KIOSK_SECRET.`);
            return fail(res, "Unauthorized kiosk terminal.", 401);
        }

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
            logger.info("[Auth Controller] Using mock demo user for " + consumerId);
            const demoCitizenId = "9eb3f201-174d-48e9-a061-b88093fe58dc";
            accountResult = await pool.query("SELECT * FROM citizens WHERE id = $1", [demoCitizenId]);
            
            if (accountResult.rows.length === 0) {
                accountResult = await pool.query("SELECT * FROM citizens LIMIT 1");
            }
            if (accountResult.rows.length === 0) {
                return fail(res, "Invalid Consumer ID. No citizen linked.", 404);
            }
        }

        const citizen = accountResult.rows[0];

        // 2. Generate auth tokens strictly for this citizen
        const { accessToken, refreshToken } = generateTokens(citizen);

        logger.info(`[Auth Controller] Kiosk Consumer Login success for Citizen ID: ${citizen.id}`);

        setTokenCookies(res, accessToken, refreshToken);

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

const globalOfficerLoginFailures = new Map();

/**
 * ADMIN LOGIN (For Admin Dashboard)
 * Route: POST /api/auth/admin-login
 */
export const adminLogin = async (req, res, next) => {
    try {
        const { adminId, password, department, deviceFingerprint } = req.body;

        if (!adminId || !password || !department) {
            logger.warn(`[Auth Controller] Admin login attempt failed: Missing fields`);
            return fail(res, "Admin ID, password, and department are required.", 400);
        }

        // Compute/get device fingerprint
        const computedFingerprint = crypto.createHash("sha256").update((req.headers["user-agent"] || "unknown") + (req.ip || "127.0.0.1")).digest("hex");
        const fingerprint = deviceFingerprint || computedFingerprint;

        // Check if Integrity Office login is requested
        let admin;
        if (department === "Integrity Office" || department === "Executive Oversight Board") {
            const officerRes = await pool.query("SELECT * FROM officer_accounts WHERE username = $1", [adminId]);
            if (officerRes.rows.length === 0) {
                logger.warn(`[Auth Controller] Integrity login attempt failed: Officer account ${adminId} not found.`);
                return fail(res, "Invalid Admin ID, password, or department.", 401);
            }
            
            const officer = officerRes.rows[0];

            // Lockout checks
            const lockoutKey = `lockout:officer:${officer.id}`;
            const failCountKey = `fails:officer:${officer.id}`;
            const lockoutTime = globalOfficerLoginFailures.get(lockoutKey) || 0;
            if (Date.now() < lockoutTime) {
                const waitMins = Math.ceil((lockoutTime - Date.now()) / 60000);
                return fail(res, `Account locked due to repeated failures. Please try again after ${waitMins} minute(s).`, 423);
            }

            const isMatch = bcrypt.compareSync(password, officer.password_hash);
            if (!isMatch) {
                const fails = (globalOfficerLoginFailures.get(failCountKey) || 0) + 1;
                globalOfficerLoginFailures.set(failCountKey, fails);
                
                if (fails >= 5) {
                    globalOfficerLoginFailures.set(lockoutKey, Date.now() + 15 * 60 * 1000); // 15 mins lockout
                    globalOfficerLoginFailures.set(failCountKey, 0); // reset
                    
                    await logSecurityIncident("Repeated failed officer logins", "Critical", { username: adminId, officerId: officer.id, fingerprint });
                    await logIntegrityAudit(
                        officer.id,
                        officer.role,
                        officer.id,
                        "SECURITY_EVENT",
                        req.ip || "127.0.0.1",
                        req.headers["user-agent"] || "Unknown",
                        null,
                        { event: "OFFICER_LOCKOUT", username: adminId },
                        { message: "Officer account locked out after 5 failed password attempts." }
                    );
                } else {
                    await logSecurityIncident("Repeated failed officer logins", "Medium", { username: adminId, attempts: fails });
                }
                
                logger.warn(`[Auth Controller] Integrity login attempt failed: Password mismatch for ${adminId}.`);
                return fail(res, "Invalid Admin ID, password, or department.", 401);
            }
            
            // Login matches, reset failures
            globalOfficerLoginFailures.set(failCountKey, 0);

            // Device Fingerprint validation & Login anomaly detection
            let fingerprints = [];
            try {
                fingerprints = officer.device_fingerprints || [];
            } catch (e) {
                fingerprints = [];
            }
            const isNewDevice = !fingerprints.includes(fingerprint);
            if (isNewDevice) {
                fingerprints.push(fingerprint);
                await pool.query(
                    "UPDATE officer_accounts SET device_fingerprints = $1 WHERE id = $2",
                    [JSON.stringify(fingerprints), officer.id]
                );
                
                // Log security incident for new device login
                await logSecurityIncident("New device login", "Medium", { username: adminId, officerId: officer.id, fingerprint });
                await logIntegrityAudit(
                    officer.id,
                    officer.role,
                    officer.id,
                    "SECURITY_EVENT",
                    req.ip || "127.0.0.1",
                    req.headers["user-agent"] || "Unknown",
                    null,
                    { event: "NEW_DEVICE_LOGIN", fingerprint },
                    { message: "New device fingerprint registered for officer." }
                );
            }

            // Check if MFA is enabled
            if (officer.mfa_enabled) {
                // Return temp_token for MFA verification
                const tempToken = encrypt(JSON.stringify({
                    officerId: officer.id,
                    expiry: Date.now() + 5 * 60 * 1000 // 5 minutes validity
                }));
                return success(res, "MFA code required.", {
                    mfa_required: true,
                    temp_token: tempToken
                }, 200);
            }

            admin = {
                id: officer.id,
                mobile: "1111111111", // Compatibility mapping
                name: officer.username,
                role: officer.role,
                department: officer.department
            };
        } else {
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
            admin = result.rows[0];
        }
        admin.department = department;

        const { accessToken, refreshToken } = generateTokens(admin);

        logger.info(`[Auth Controller] Admin login success for ${adminId} in ${department} (role: ${admin.role})`);

        setTokenCookies(res, accessToken, refreshToken);

        return success(res, "Admin verification successful.", {
            admin: {
                id: admin.id,
                adminId,
                name: admin.name || (department === "Integrity Office" ? "Integrity Officer" : "Admin Officer"),
                department,
                role: admin.role
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
 * VERIFY MFA TOKEN & LOG IN
 * Route: POST /api/auth/verify-mfa
 */
export const verifyMfaLogin = async (req, res) => {
    try {
        const { temp_token, code } = req.body;
        if (!temp_token || !code) {
            return fail(res, "MFA token and code are required.", 400);
        }

        const decrypted = decrypt(temp_token);
        if (decrypted === "[Decryption Failed]" || !decrypted) {
            return fail(res, "Invalid MFA token.", 400);
        }

        const { officerId, expiry } = JSON.parse(decrypted);
        if (Date.now() > expiry) {
            return fail(res, "MFA verification session expired. Please log in again.", 401);
        }

        const officerRes = await pool.query("SELECT * FROM officer_accounts WHERE id = $1", [officerId]);
        if (officerRes.rows.length === 0) {
            return fail(res, "Officer account not found.", 404);
        }

        const officer = officerRes.rows[0];
        const { verifyTOTP } = await import("../utils/mfa.js");
        const isValid = verifyTOTP(officer.mfa_secret, code);

        if (!isValid) {
            await logSecurityIncident("Failed MFA", "High", { username: officer.username, officerId });
            await logIntegrityAudit(
                officer.id,
                officer.role,
                officer.id,
                "SECURITY_EVENT",
                req.ip || "127.0.0.1",
                req.headers["user-agent"] || "Unknown",
                null,
                { event: "FAILED_MFA", username: officer.username },
                { message: "Officer failed MFA TOTP verification." }
            );
            return fail(res, "Invalid verification code.", 401);
        }

        const admin = {
            id: officer.id,
            mobile: "1111111111",
            name: officer.username,
            role: officer.role,
            department: officer.department
        };

        const { accessToken, refreshToken } = generateTokens(admin);
        setTokenCookies(res, accessToken, refreshToken);

        logger.info(`[Auth Controller] MFA login successful for officer: ${officer.username}`);

        return success(res, "MFA verification successful.", {
            admin: {
                id: admin.id,
                adminId: officer.username,
                name: officer.username,
                department: officer.department,
                role: admin.role
            },
            tokens: {
                accessToken,
                refreshToken
            }
        }, 200);

    } catch (err) {
        logger.error(`[Auth Controller] verifyMfaLogin Error: ${err.message}`);
        return serverError(res, "MFA verification failed.", 500);
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
        let user;
        if (decoded.role === "integrity_officer" || decoded.role === "executive_oversight") {
            const officerRes = await pool.query("SELECT * FROM officer_accounts WHERE id = $1", [decoded.id]);
            if (officerRes.rows.length === 0) {
                return fail(res, "Officer account not found.", 404);
            }
            const officer = officerRes.rows[0];
            user = {
                id: officer.id,
                mobile: "1111111111",
                name: officer.username,
                role: officer.role,
                department: officer.department
            };
        } else {
            const result = await pool.query("SELECT * FROM citizens WHERE id = $1", [decoded.id]);
            if (result.rows.length === 0) {
                return fail(res, "User not found.", 404);
            }
            user = result.rows[0];
        }

        // Retain department if it exists in decoded token for admin/officer
        if (decoded.department) {
            user.department = decoded.department;
        }

        const tokens = generateTokens(user);

        // Blacklist the old refresh token (7 days)
        await blacklistToken(refreshToken, 7 * 24 * 3600);

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
        let refreshToken = req.body.refreshToken || null;
        
        if (!refreshToken && req.headers.cookie) {
            const match = req.headers.cookie.match(new RegExp('(^| )refreshToken=([^;]+)'));
            if (match) refreshToken = match[2];
        }
        if (token) {
            // Blacklist the token so it can't be used again
            await blacklistToken(token, 3600); // 1 hour corresponding to JWT_EXPIRY
        }
        
        if (refreshToken) {
            // Blacklist the refresh token (7 days)
            await blacklistToken(refreshToken, 7 * 24 * 3600);
        }

        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        return success(res, "Logged out successfully", null, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Logout Error: ${error.message}`);
        return serverError(res, "Failed to log out.", 500);
    }
};

/**
 * UPDATE CITIZEN PROFILE
 * Route: PUT /api/auth/profile
 */
export const updateProfileController = async (req, res, next) => {
    try {
        const citizenId = req.user.id;
        const { name, email, address } = req.body;

        if (!name || name.trim().length < 2) {
            return fail(res, "Name must be at least 2 characters.", 400);
        }

        // Ensure email/address columns exist (safe migration)
        await pool.query(`ALTER TABLE citizens ADD COLUMN IF NOT EXISTS email TEXT`).catch(() => {});
        await pool.query(`ALTER TABLE citizens ADD COLUMN IF NOT EXISTS address TEXT`).catch(() => {});
        await pool.query(`ALTER TABLE citizens ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`).catch(() => {});
        await pool.query(`ALTER TABLE citizens ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255)`).catch(() => {});
        await pool.query(`ALTER TABLE citizens ADD COLUMN IF NOT EXISTS email_verification_expiry BIGINT`).catch(() => {});

        // Check if email changed
        const currentRes = await pool.query(`SELECT email, email_verified FROM citizens WHERE id = $1`, [citizenId]);
        const currentEmail = currentRes.rows[0]?.email;
        let requiresVerification = false;
        let verificationToken = null;
        let verificationExpiry = null;
        let emailVerified = currentRes.rows[0]?.email_verified || false;

        if (email && email !== currentEmail) {
            requiresVerification = true;
            emailVerified = false;
            verificationToken = crypto.randomBytes(32).toString('hex');
            verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
            logger.info(`[Auth Controller] MOCK EMAIL VERIFICATION for ${email}: ${process.env.BASE_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${verificationToken}`);
        }

        const result = await pool.query(
            `UPDATE citizens
             SET name = $1,
                 email = COALESCE($2, email),
                 address = COALESCE($3, address),
                 email_verified = $4,
                 email_verification_token = COALESCE($5, email_verification_token),
                 email_verification_expiry = COALESCE($6, email_verification_expiry),
                 updated_at = NOW()
             WHERE id = $7
             RETURNING id, name, mobile, email, email_verified, address, role, created_at`,
            [name.trim(), email || null, address || null, emailVerified, verificationToken, verificationExpiry, citizenId]
        );

        if (result.rows.length === 0) {
            return fail(res, "Citizen not found.", 404);
        }

        const updated = result.rows[0];

        // Issue fresh tokens with the updated name baked in
        const { accessToken, refreshToken } = generateTokens(updated);
        setTokenCookies(res, accessToken, refreshToken);

        logger.info(`[Auth Controller] Profile updated for citizen ${citizenId}: name="${updated.name}"`);

        return success(res, "Profile updated successfully", {
            citizen: {
                id: updated.id,
                name: updated.name,
                mobile: updated.mobile,
                email: updated.email,
                email_verified: updated.email_verified,
                address: updated.address,
                role: updated.role
            },
            tokens: { accessToken, refreshToken }
        }, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Update Profile Error: ${error.message}`);
        return serverError(res, "Failed to update profile.", 500);
    }
};

/**
 * VERIFY EMAIL
 * Route: GET /api/auth/verify-email
 */
export const verifyEmailController = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return fail(res, "Verification token is required.", 400);

        const result = await pool.query(
            `SELECT id, email_verification_expiry FROM citizens WHERE email_verification_token = $1`, 
            [token]
        );

        if (result.rows.length === 0) {
            return fail(res, "Invalid verification token.", 400);
        }

        const citizen = result.rows[0];
        if (Date.now() > citizen.email_verification_expiry) {
            return fail(res, "Verification token has expired.", 400);
        }

        await pool.query(
            `UPDATE citizens 
             SET email_verified = TRUE, email_verification_token = NULL, email_verification_expiry = NULL 
             WHERE id = $1`,
            [citizen.id]
        );

        logger.info(`[Auth Controller] Email successfully verified for citizen: ${citizen.id}`);
        return success(res, "Email verified successfully.", null, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Verify Email Error: ${error.message}`);
        return serverError(res, "Failed to verify email.", 500);
    }
};

/**
 * FORGOT PASSWORD
 * Route: POST /api/auth/forgot-password
 */
export const forgotPasswordController = async (req, res) => {
    try {
        const { adminId } = req.body;
        if (!adminId) return fail(res, "Admin ID is required.", 400);

        // Safe migration for officer accounts
        await pool.query(`ALTER TABLE officer_accounts ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255)`).catch(() => {});
        await pool.query(`ALTER TABLE officer_accounts ADD COLUMN IF NOT EXISTS reset_token_expiry BIGINT`).catch(() => {});

        const officerRes = await pool.query("SELECT * FROM officer_accounts WHERE username = $1", [adminId]);
        if (officerRes.rows.length === 0) {
            // Return success anyway to prevent user enumeration
            return success(res, "If the account exists, a password reset token has been generated.", null, 200);
        }

        const officer = officerRes.rows[0];
        
        // Generate a 15-minute secure token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
        const resetTokenExpiry = Date.now() + 15 * 60 * 1000;

        await pool.query(
            `UPDATE officer_accounts SET reset_token_hash = $1, reset_token_expiry = $2 WHERE id = $3`,
            [resetTokenHash, resetTokenExpiry, officer.id]
        );

        // In a real system, send this via email/SMS. Logging for demonstration.
        logger.info(`[Auth Controller] MOCK PASSWORD RESET for ${adminId}: Token is ${resetToken}`);

        return success(res, "If the account exists, a password reset token has been generated.", null, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Forgot Password Error: ${error.message}`);
        return serverError(res, "Failed to process forgot password.", 500);
    }
};

/**
 * RESET PASSWORD
 * Route: POST /api/auth/reset-password
 */
export const resetPasswordController = async (req, res) => {
    try {
        const { adminId, token, newPassword } = req.body;

        if (!adminId || !token || !newPassword) {
            return fail(res, "Admin ID, token, and new password are required.", 400);
        }

        const officerRes = await pool.query("SELECT * FROM officer_accounts WHERE username = $1", [adminId]);
        if (officerRes.rows.length === 0) {
            return fail(res, "Invalid request.", 400);
        }

        const officer = officerRes.rows[0];

        if (!officer.reset_token_hash || !officer.reset_token_expiry) {
            return fail(res, "Invalid or expired reset token.", 400);
        }

        if (Date.now() > officer.reset_token_expiry) {
            return fail(res, "Reset token has expired.", 400);
        }

        const inputTokenHash = crypto.createHash("sha256").update(token).digest("hex");
        if (inputTokenHash !== officer.reset_token_hash) {
            return fail(res, "Invalid or expired reset token.", 400);
        }

        // Validate strong password
        if (newPassword.length < 12) {
            return fail(res, "Password must be at least 12 characters long.", 400);
        }

        // Hash new password and clear reset tokens
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query(
            `UPDATE officer_accounts 
             SET password_hash = $1, reset_token_hash = NULL, reset_token_expiry = NULL 
             WHERE id = $2`,
            [hashedPassword, officer.id]
        );

        await logSecurityIncident("Password Reset Successful", "Low", { username: adminId, officerId: officer.id });

        logger.info(`[Auth Controller] Password successfully reset for ${adminId}`);
        return success(res, "Password reset successfully.", null, 200);
    } catch (error) {
        logger.error(`[Auth Controller] Reset Password Error: ${error.message}`);
        return serverError(res, "Failed to reset password.", 500);
    }
};
