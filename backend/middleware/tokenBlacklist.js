import Redis from "ioredis";
import crypto from "crypto";

let redisClient = null;
let useMemoryFallback = !process.env.REDIS_URL;
const memoryBlacklist = new Map();

if (!useMemoryFallback) {
    redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
            if (times > 3) {
                console.warn("⚠️ [Redis] Connection failed 3 times. Disabling Redis and falling back to in-memory blacklist.");
                useMemoryFallback = true;
                return null; // Stop retrying
            }
            return Math.min(times * 500, 2000);
        },
        maxRetriesPerRequest: 1
    });

    redisClient.on("error", (err) => {
        if (!useMemoryFallback) {
            console.error("⚠️ [Redis Error]:", err.message);
        }
    });
} else {
    console.warn("⚠️ [Redis] No REDIS_URL provided. Using in-memory blacklist fallback.");
}

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
        
        let isBlacklisted = false;
        if (useMemoryFallback) {
            isBlacklisted = memoryBlacklist.has(hashedToken) && memoryBlacklist.get(hashedToken) > Date.now();
        } else if (redisClient) {
            try {
                isBlacklisted = await redisClient.get(`bl_${hashedToken}`);
            } catch (err) {
                useMemoryFallback = true;
                isBlacklisted = memoryBlacklist.has(hashedToken) && memoryBlacklist.get(hashedToken) > Date.now();
            }
        }

        if (isBlacklisted) {
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
        if (useMemoryFallback) {
            memoryBlacklist.set(hashedToken, Date.now() + expiresInSeconds * 1000);
        } else if (redisClient) {
            await redisClient.set(`bl_${hashedToken}`, "true", "EX", expiresInSeconds);
        }
    } catch (err) {
        console.error("Blacklist Set Error:", err.message);
    }
};