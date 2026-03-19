import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

/**
 * Redis-backed targeted brute force protection.
 * Tracks failed login attempts per account identifier (mobile or aadhaar).
 */
export const accountLockout = async (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.body.mobile || req.body.aadhaar;
  
  if (!identifier) {
    return next(); // Let the Zod/Joi validation handle missing fields
  }

  const hashedIdentifier = crypto.createHash('sha256').update(identifier).digest('hex');
  const key = `lockout:${hashedIdentifier}`;
  
  try {
    const attempts = await redis.get(key);

    if (attempts && parseInt(attempts, 10) >= MAX_FAILED_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      const minutesLeft = Math.ceil(ttl / 60);
      return res.status(423).json({
        success: false,
        error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minutes.`,
        errorCode: 'ACCOUNT_LOCKED'
      });
    }

    // Attach helper methods to req so the auth controller can easily update the state
    req.incrementFailedLogin = async () => {
      const currentAttempts = await redis.incr(key);
      if (currentAttempts === 1) {
        await redis.expire(key, LOCKOUT_DURATION_SECONDS);
      }
    };

    req.clearFailedLogin = async () => {
      await redis.del(key);
    };

    next();
  } catch (error) {
    console.error('Account Lockout Redis Error:', error);
    next();
  }
};