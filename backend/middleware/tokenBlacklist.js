import { getRedisClient, isRedisEnabled } from "../config/redisClient.js";
import crypto from "crypto";

const memoryBlacklist = new Map();

export const isTokenBlacklisted = async (token) => {
    if (!token) return false;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    
    if (!isRedisEnabled()) {
        return memoryBlacklist.has(hashedToken) && memoryBlacklist.get(hashedToken) > Date.now();
    } else {
        try {
            const redisClient = getRedisClient();
            return await redisClient.get(`bl_${hashedToken}`) !== null;
        } catch (err) {
            return memoryBlacklist.has(hashedToken) && memoryBlacklist.get(hashedToken) > Date.now();
        }
    }
    return false;
};

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
        
        const blacklisted = await isTokenBlacklisted(token);

        if (blacklisted) {
            return res.status(401).json({
                success: false,
                message: "Session expired or terminated. Please log in again.",
                errorCode: "TOKEN_BLACKLISTED"
            });
        }

        next();
    } catch (error) {
        console.error("Blacklist Check Error:", error.message);
        next();
    }
};

export const blacklistToken = async (token, expiresInSeconds = 3600) => {
    try {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        if (!isRedisEnabled()) {
            memoryBlacklist.set(hashedToken, Date.now() + expiresInSeconds * 1000);
        } else {
            const redisClient = getRedisClient();
            await redisClient.set(`bl_${hashedToken}`, "true", "EX", expiresInSeconds);
        }
    } catch (err) {
        console.error("Blacklist Set Error:", err.message);
    }
};