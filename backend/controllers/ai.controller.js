import { success, fail } from "../utils/response.js";
import logger from "../utils/logger.js";

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

        // Model Selection & Fallback Logic
        const primaryModel = 'gemini-3.5-flash';
        const fallbackModel = 'gemini-flash-lite-latest';
        
        const fetchGemini = async (modelName) => {
            const defaultPrompt = `You are AAZHI, a helpful municipal kiosk assistant. Answer the user's question concisely in 2-3 sentences. User question: ${query}`;
            const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${query}` : defaultPrompt;
            
            return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }]
                })
            });
        };

        let response = await fetchGemini(primaryModel);
        let data = await response.json();

        // If primary model fails due to high demand (503) or not found (404), fallback
        if (!response.ok && (response.status === 503 || response.status === 404)) {
            logger.warn(`[AI Controller] Primary model ${primaryModel} failed (${response.status}). Falling back to ${fallbackModel}.`);
            response = await fetchGemini(fallbackModel);
            data = await response.json();
        }
        
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
