import { success, fail } from "../utils/response.js";
import logger from "../utils/logger.js";
import CircuitBreaker from "opossum";

// ─── Circuit Breaker Configuration ───────────────────────────
const breakerOptions = {
    timeout: 5000,                // 5 seconds timeout for API response
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000           // Test recovery after 30 seconds
};

// ─── Core API Call Logic (Wrapped by Breaker) ────────────────
const executeGeminiFetch = async (primaryModel, fallbackModel, apiKey, prompt) => {
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    // If primary model fails due to load, immediately attempt the fallback model
    if (!response.ok && (response.status === 503 || response.status === 404 || response.status === 429)) {
        logger.warn(`[AI Controller] Primary model failed (${response.status}). Falling back to ${fallbackModel}.`);
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
    }

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || "Unknown API Error");
    }
    return data;
};

// ─── Global Circuit Breaker Instance ─────────────────────────
const aiBreaker = new CircuitBreaker(executeGeminiFetch, breakerOptions);

aiBreaker.fallback(() => {
    logger.warn("[AI Circuit Breaker] Triggered Fallback. Returning simulated response.");
    return {
        candidates: [{
            content: {
                parts: [{ text: "The AI service is currently experiencing high load. Please use the main menu options to continue your request." }]
            }
        }]
    };
});

aiBreaker.on('open', () => logger.error("[AI Circuit Breaker] Circuit is OPEN! API calls blocked."));
aiBreaker.on('halfOpen', () => logger.warn("[AI Circuit Breaker] Circuit is HALF-OPEN. Testing recovery..."));
aiBreaker.on('close', () => logger.info("[AI Circuit Breaker] Circuit is CLOSED. AI service restored."));


import Redis from "ioredis";
import crypto from "crypto";

// Initialize Redis if configured
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

/**
 * @desc    Proxy to Gemini AI to prevent exposing API key on frontend
 * @route   POST /api/ai/gemini
 * @access  Public (Rate limited)
 */
export const handleGeminiQuery = async (req, res, next) => {
    try {
        const { query, systemPrompt } = req.body;
        if (!query) {
            return fail(res, "Query is required.", 400);
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            logger.warn("[AI Controller] GEMINI_API_KEY is missing. Using simulated response.");
            return success(res, "Simulated response (API Key not configured).", {
                text: `Analyzing your question regarding "${query}"...\n\n(Note: Set GEMINI_API_KEY in backend .env to see real AI). This is a simulated response. Type 'home' to exit.`
            });
        }

        const primaryModel = 'gemini-3.5-flash';
        const fallbackModel = 'gemini-flash-lite-latest';
        const defaultPrompt = `You are AAZHI, a helpful municipal kiosk assistant. Answer the user's question concisely in 2-3 sentences. User question: ${query}`;
        const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${query}` : defaultPrompt;
        
        // Semantic Cache Check
        let cacheKey = null;
        if (redis) {
            const promptHash = crypto.createHash("sha256").update(finalPrompt).digest("hex");
            cacheKey = `aazhi:ai:cache:${promptHash}`;
            try {
                const cachedResponse = await redis.get(cacheKey);
                if (cachedResponse) {
                    logger.info(`[AI Cache] Hit for prompt hash: ${promptHash}`);
                    return success(res, "AI generated successfully (Cached).", { text: cachedResponse });
                }
            } catch (err) {
                logger.warn(`[AI Cache] Redis error: ${err.message}`);
            }
        }

        // Fire the circuit breaker
        const data = await aiBreaker.fire(primaryModel, fallbackModel, API_KEY, finalPrompt);

        let answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response from the AI.";

        // Cache the result for 24 hours
        if (redis && cacheKey) {
            redis.setex(cacheKey, 86400, answerText).catch(() => {});
        }

        return success(res, "AI generated successfully.", { text: answerText });
    } catch (error) {
        logger.error(`[AI Controller] Error: ${error.message}`);
        // Only triggered if Opossum framework completely crashes (fallback normally prevents throws)
        return fail(res, "AI service temporarily unavailable.", 503);
    }
};
