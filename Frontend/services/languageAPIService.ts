/**
 * Dynamic Language Loading API Service
 * Supports real-time language loading from server
 * Enables efficient, lightweight translation fetching
 */

import { Language } from './types'; // adjust path as needed

export interface TranslationResponse {
    success: boolean;
    language: Language;
    translations: Record<string, string>;
    version?: string;
    lastUpdated?: string;
}

export interface LanguageAPIConfig {
    baseURL?: string;
    cacheLanguages?: boolean;
    cacheTTL?: number; // in milliseconds
}

class LanguageAPIService {
    private baseURL: string = '/api/languages'; // Default API endpoint
    private cache: Map<Language, { data: Record<string, string>; timestamp: number }> = new Map();
    private cacheTTL: number = 3600000; // 1 hour default cache

    constructor(config?: LanguageAPIConfig) {
        if (config?.baseURL) {
            this.baseURL = config.baseURL;
        }
        if (config?.cacheTTL) {
            this.cacheTTL = config.cacheTTL;
        }
    }

    /**
     * Fetch translations for a specific language
     * @param language - Language code
     * @param forceRefresh - Force fetch from server, ignore cache
     * @returns Translation object
     */
    async fetchLanguageTranslations(
        language: Language,
        forceRefresh: boolean = false
    ): Promise<Record<string, string>> {
        // Check cache first
        if (!forceRefresh && this.isCached(language)) {
            return this.getFromCache(language);
        }

        try {
            const response = await fetch(`${this.baseURL}/${language}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': language,
                },
                timeout: 5000,
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch translations for ${language}`);
            }

            const data: TranslationResponse = await response.json();

            if (!data.success) {
                throw new Error(`Server returned error for ${language}`);
            }

            // Cache the translations
            this.cacheTranslations(language, data.translations);

            return data.translations;
        } catch (error) {
            console.error(`Error fetching translations for ${language}:`, error);
            // Return empty object on error - components will fallback to default translations
            return {};
        }
    }

    /**
     * Fetch all available language metadata
     * @returns Array of available languages
     */
    async fetchAvailableLanguages(): Promise<
        Array<{
            code: Language;
            label: string;
            nativeName: string;
        }>
    > {
        try {
            const response = await fetch(`${this.baseURL}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch available languages');
            }

            const data = await response.json();
            return data.languages || [];
        } catch (error) {
            console.error('Error fetching available languages:', error);
            return [];
        }
    }

    /**
     * Cache translations for a language
     */
    private cacheTranslations(
        language: Language,
        translations: Record<string, string>
    ): void {
        this.cache.set(language, {
            data: translations,
            timestamp: Date.now(),
        });
    }

    /**
     * Check if language translations are cached and not expired
     */
    private isCached(language: Language): boolean {
        const cached = this.cache.get(language);
        if (!cached) return false;

        const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
        return !isExpired;
    }

    /**
     * Get translations from cache
     */
    private getFromCache(language: Language): Record<string, string> {
        const cached = this.cache.get(language);
        return cached?.data || {};
    }

    /**
     * Clear cache for a language or all languages
     */
    clearCache(language?: Language): void {
        if (language) {
            this.cache.delete(language);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Preload translations for multiple languages
     * Useful for improving UX by loading common languages upfront
     */
    async preloadLanguages(languages: Language[]): Promise<void> {
        await Promise.all(languages.map((lang) => this.fetchLanguageTranslations(lang)));
    }
}

// Export singleton instance
export const languageAPIService = new LanguageAPIService({
    baseURL: process.env.REACT_APP_LANGUAGE_API_URL || '/api/languages',
    cacheLanguages: true,
    cacheTTL: 3600000, // 1 hour
});

export default LanguageAPIService;
