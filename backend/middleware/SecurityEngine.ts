import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Security Engine Configuration
const GEO_FENCE_ALLOWED_COUNTRY = 'IN'; // Example: Only allow India

const RATE_LIMIT_TIERS = {
  PUBLIC: { rate: 60, capacity: 60 },      // 60 req/min
  CITIZEN: { rate: 200, capacity: 200 },   // 200 req/min
  ADMIN: { rate: 1000, capacity: 1000 },   // 1000 req/min
};

/**
 * Leaky Bucket implementation using Redis Lua scripting for atomic execution
 * Time complexity: O(1)
 */
const leakyBucketLua = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local leak_rate = tonumber(ARGV[2])
  local current_time = tonumber(ARGV[3])
  local requested = 1

  local bucket = redis.call("HMGET", key, "water", "last_update")
  local water = tonumber(bucket[1]) or 0
  local last_update = tonumber(bucket[2]) or current_time

  -- Calculate leaked water
  local time_passed = math.max(0, current_time - last_update)
  local leaked = time_passed * (leak_rate / 60)
  water = math.max(0, water - leaked)

  if water + requested <= capacity then
    water = water + requested
    redis.call("HMSET", key, "water", water, "last_update", current_time)
    redis.call("EXPIRE", key, 60) -- 1 minute TTL
    return 1 -- Allowed
  else
    return 0 -- Rate Limited
  end
`;

redis.defineCommand('leakyBucket', { numberOfKeys: 1, lua: leakyBucketLua });

export class SecurityEngine {
  
  /**
   * Zero-Trust Headers Middleware (CSP, HSTS)
   */
  static applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
    // Generate a nonce for the current request
    const nonce = crypto.randomBytes(16).toString('base64');
    res.locals.nonce = nonce;

    // Strict Content Security Policy (CSP)
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}'`, // No 'unsafe-inline' or 'eval'
      `style-src 'self' 'nonce-${nonce}'`,
      `object-src 'none'`,
      `base-uri 'none'`,
      `form-action 'self'`,
      `frame-ancestors 'none'`,
      `upgrade-insecure-requests`,
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);

    // HSTS (HTTP Strict Transport Security) - A+ Tier
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    
    // Prevent MIME-type sniffing & Clickjacking
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent Browser/Proxy Caching of PII data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    next();
  }

  /**
   * Context-Aware Rate Limiter with Geo-Fencing
   */
  static async gatekeeper(req: Request, res: Response, next: NextFunction) {
    try {
      // 0. Anti-Spoofing: Ensure request comes through approved WAF/CDN
      if (process.env.NODE_ENV === 'production') {
        const expectedWafSecret = process.env.WAF_SECRET;
        const providedWafSecret = req.headers['x-waf-secret'];
        
        if (expectedWafSecret) {
          if (!providedWafSecret || typeof providedWafSecret !== 'string') {
            return res.status(403).json({ error: 'Direct Origin Access Prohibited. Route through WAF.' });
          }
          
          const expectedBuffer = Buffer.from(expectedWafSecret);
          const providedBuffer = Buffer.from(providedWafSecret);
          
          if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
            return res.status(403).json({ error: 'Direct Origin Access Prohibited. Invalid WAF Signature.' });
          }
        }
      }

      // 1. Geo-Fencing Check (Using Cloudflare header or similar proxy Geo-IP)
      const countryCode = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'];
      if (countryCode && countryCode !== GEO_FENCE_ALLOWED_COUNTRY) {
        return res.status(403).json({ 
          error: 'Sovereign Territory Violation. Access Denied.' 
        });
      }

      // 2. Identify Role & Set Tier
      const userRole = (req as any).user?.role || 'PUBLIC';
      const tier = RATE_LIMIT_TIERS[userRole as keyof typeof RATE_LIMIT_TIERS] || RATE_LIMIT_TIERS.PUBLIC;
      
      // 3. Define Limiter Identifier (IP or User ID)
      const identifier = (req as any).user?.id || req.ip;
      const key = `rate_limit:${userRole}:${identifier}`;
      const now = Math.floor(Date.now() / 1000);

      // 4. Execute atomic Leaky Bucket script
      // @ts-ignore - custom defined command
      const allowed = await (redis as any).leakyBucket(key, tier.capacity, tier.rate, now);

      if (!allowed) {
        return res.status(429).json({ 
          error: 'Traffic Baseline Exceeded. Rate Limit Applied.' 
        });
      }

      next();
    } catch (error) {
      console.error('Gatekeeper Error:', error);
      res.status(500).json({ error: 'Internal Security Gatekeeper Error' });
    }
  }
}