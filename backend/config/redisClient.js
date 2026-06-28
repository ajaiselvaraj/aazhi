import Redis from 'ioredis';
import logger from '../utils/logger.js';

let sharedRedisClient = null;
let sharedBullClient = null;
let sharedBullSubscriber = null;

let redisEnabled = process.env.ENABLE_REDIS !== 'false'; // Enabled by default
let connectionFailures = 0;
const MAX_FAILURES = 3;

/**
 * Common retry strategy for all Redis connections.
 */
function getRetryStrategy() {
    return function(times) {
        connectionFailures++;
        if (connectionFailures >= MAX_FAILURES) {
            if (redisEnabled) {
                logger.warn("⚠️ [Redis] Connection failed 3 times. Disabling Redis for this session.");
                redisEnabled = false;
            }
            return null; // Stop retrying
        }
        return Math.min(times * 100, 2000); // Backoff up to 2 seconds
    };
}

/**
 * Handle events for all created redis instances.
 */
function attachHandlers(client, name) {
    client.on('error', (err) => {
        // Prevent spam if already disabled
        if (redisEnabled || connectionFailures < MAX_FAILURES) {
            logger.error(`⚠️ [Redis Error (${name})]: ${err.message}`);
        }
    });

    client.on('connect', () => {
        connectionFailures = 0; // Reset counter on successful connection
    });

    client.on('ready', () => {
        logger.info(`✅ [Redis] Connected successfully (${name}).`);
    });
}

/**
 * Get a standard shared Redis client.
 */
export function getRedisClient() {
    if (!redisEnabled) {
        return null;
    }
    if (sharedRedisClient) {
        return sharedRedisClient;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    sharedRedisClient = new Redis(redisUrl, {
        retryStrategy: getRetryStrategy(),
        maxRetriesPerRequest: 1 // Fail fast on requests if offline
    });

    attachHandlers(sharedRedisClient, 'Main');
    return sharedRedisClient;
}

/**
 * Get a shared Redis client configured for BullMQ (maxRetriesPerRequest must be null).
 * @param {string} type - 'client' or 'subscriber'
 */
export function getBullRedisClient(type = 'client') {
    if (!redisEnabled) {
        return null;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    if (type === 'client') {
        if (!sharedBullClient) {
            sharedBullClient = new Redis(redisUrl, {
                retryStrategy: getRetryStrategy(),
                maxRetriesPerRequest: null
            });
            attachHandlers(sharedBullClient, 'BullMQ Client');
        }
        return sharedBullClient;
    } else if (type === 'subscriber') {
        if (!sharedBullSubscriber) {
            sharedBullSubscriber = new Redis(redisUrl, {
                retryStrategy: getRetryStrategy(),
                maxRetriesPerRequest: null
            });
            attachHandlers(sharedBullSubscriber, 'BullMQ Subscriber');
        }
        return sharedBullSubscriber;
    }
}

/**
 * Helper to check if Redis is currently enabled and available.
 */
export function isRedisEnabled() {
    return redisEnabled && sharedRedisClient && sharedRedisClient.status === 'ready';
}
