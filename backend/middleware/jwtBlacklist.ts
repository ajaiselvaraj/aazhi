import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisEnabled } from '../config/redisClient.js';

/**
 * Checks if the current token has been invalidated (e.g. after aggressive secure logout)
 */
export const verifyTokenNotBlacklisted = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next();
  }

  try {
    if (isRedisEnabled()) {
      const redis = getRedisClient();
      const isBlacklisted = await redis.get(`bl_${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Session Terminated. Token Invalidated.' });
      }
    }
    
    // Attach logout helper method for the auth controller
    req.blacklistToken = async (expiresInSeconds: number = 3600) => {
      if (isRedisEnabled()) {
        const redis = getRedisClient();
        await redis.set(`bl_${token}`, 'true', 'EX', expiresInSeconds);
      }
    };

    next();
  } catch (error) {
    console.error('Redis Blacklist Error:', error);
    next();
  }
};