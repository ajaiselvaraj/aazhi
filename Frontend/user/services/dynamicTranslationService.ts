/**
 * SUVIDHA — Dynamic Translation Service (ADD-ON)
 *
 * Utilizes the backend Gemini API to translate dynamic text on the fly.
 * Uses aggressive client-side caching to prevent repeated identical API calls.
 */

const CACHE_PREFIX = 'aazhi_translation_cache_v2_';

export const dynamicTranslationService = {
  /**
   * Translates the given text into the target language using Gemini.
   * Caches the result in localStorage.
   *
   * @param text The string to translate
   * @param targetLang The language code (e.g., 'en', 'hi', 'ta', 'te')
   * @returns The translated string
   */
  translate: async (text: string, targetLang: string): Promise<string> => {
    if (!text || !text.trim()) return text;
    if (!targetLang || targetLang === 'en') return text; // Base text is assumed to be English

    // Normalize
    const cleanText = text.trim();
    const hash = btoa(encodeURIComponent(cleanText)).slice(0, 32); // Simple fast hash
    const cacheKey = `${CACHE_PREFIX}${targetLang}_${hash}`;

    // 1. Check Cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Map language code to full name for LLM clarity
    const langMap: Record<string, string> = {
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'bn': 'Bengali',
      'as': 'Assamese',
      'or': 'Odia',
      'pa': 'Punjabi',
      'ur': 'Urdu',
    };
    
    const fullLangName = langMap[targetLang] || targetLang;

    // 3. Prompt construction
    const systemPrompt = `You are a professional translator for an Indian Civic Application. Translate the following civic alert message precisely into ${fullLangName}. Output ONLY the translated text without any explanation, markdown, or quotes. Preserve the original meaning exactly. If you cannot translate it, return the original text.`;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE}/ai/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanText, systemPrompt })
      });

      const data = await response.json();
      if (!data.success || !data.data?.text) {
        console.warn(`[TranslationService] AI translation failed for ${targetLang}. Using fallback.`);
        return cleanText;
      }

      let translatedText = data.data.text.trim();

      // Guard against system debug responses (when no GEMINI_API_KEY is present)
      const debugMarkers = [
        'GEMINI_API_KEY',
        'simulated response',
        'Analyzing your question regarding',
        'return the original text' // parts of our prompt leaked
      ];
      
      const isDebugResponse = debugMarkers.some(marker => translatedText.includes(marker));

      if (isDebugResponse) {
        console.warn(`[TranslationService] Received debug/system response. Falling back to original text.`);
        return cleanText;
      }

      // Remove accidental quotes from LLM
      if (translatedText.startsWith('"') && translatedText.endsWith('"')) {
        translatedText = translatedText.slice(1, -1).trim();
      }

      // 4. Cache and return
      localStorage.setItem(cacheKey, translatedText);
      return translatedText;
    } catch (e) {
      console.error(`[TranslationService] Network error during translation to ${targetLang}:`, e);
      return cleanText;
    }
  },

  /**
   * Helper to clear the translation cache if needed.
   */
  clearCache: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
