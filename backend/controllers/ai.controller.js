import { success, fail } from "../utils/response.js";
import logger from "../utils/logger.js";

/**
 * @desc    Proxy to Gemini AI to prevent exposing API key on frontend
 * @route   POST /api/ai/gemini
 * @access  Public (Rate limited)
 */
export const handleGeminiQuery = async (req, res, next) => {
    try {
        const { query } = req.body;
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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `You are SUVIDHA, a helpful municipal kiosk assistant. Answer the user's question concisely in 2-3 sentences. User question: ${query}` }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            logger.error(`[AI Controller] Gemini Error: ${data.error?.message || response.statusText}`);
            return fail(res, `AI Error: ${data.error?.message || "Unknown error"}.`, 502);
        }

        let answerText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response from the AI.";

        return success(res, "AI generated successfully.", { text: answerText });
    } catch (error) {
        logger.error(`[AI Controller] Error: ${error.message}`);
        next(error);
    }
};
