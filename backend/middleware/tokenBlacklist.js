import Redis from "ioredis";
import crypto from "crypto";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * Middleware to check if the current JWT token is blacklisted.
 * Drop this into your routes directly AFTER your JWT verification middleware.
 */
export const checkTokenBlacklist = async (req, res, next) => {
    try {
        const token = req.token;
        if (!token) {
            return next();
        }
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const isBlacklisted = await redis.get(`bl_${hashedToken}`);

        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: "Session expired or terminated. Please log in again.",
                errorCode: "TOKEN_BLACKLISTED"
            });
        }

        next();
    } catch (error) {
        console.error("Redis Blacklist Error:", error);
        next();
    }
};

export const blacklistToken = async (token, expiresInSeconds = 3600) => {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    await redis.set(`bl_${hashedToken}`, "true", "EX", expiresInSeconds);
};