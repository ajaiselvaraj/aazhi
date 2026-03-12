/**
 * Enhanced Language Context with Real-time API Support
 * Supports dynamic language loading and translation
 * Ensures all UI elements (including errors) are displayed in user's preferred language
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import i18n from '../i18n';
import { languageAPIService } from './languageAPIService';
import { Language } from '../types';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    tForLang: (key: string, lang: Language) => string;
    isLoadingTranslations: boolean;
    translationError: string | null;
    reloadTranslations: (language: Language, forceRefresh?: boolean) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

interface LanguageProviderProps {
    children: React.ReactNode;
    enableAPILoading?: boolean;
    preloadLanguages?: Language[];
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
    children,
    enableAPILoading = false,
    preloadLanguages = [],
}) => {
    const [language, setLanguageState] = useState<Language>('en');
    const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);
    const [translationError, setTranslationError] = useState<string | null>(null);

    // Initialize language from localStorage on mount
    useEffect(() => {
        const savedLanguage = localStorage.getItem('selectedLanguage') as Language | null;
        if (savedLanguage && isValidLanguage(savedLanguage)) {
            setLanguageState(savedLanguage);
            i18n.changeLanguage(savedLanguage);
        }

        // Preload languages if specified
        if (enableAPILoading && preloadLanguages.length > 0) {
            languageAPIService.preloadLanguages(preloadLanguages).catch((err) => {
                console.error('Error preloading languages:', err);
            });
        }
    }, [enableAPILoading, preloadLanguages]);

    // Set language with API loading support
    const setLanguage = useCallback(
        async (newLanguage: Language) => {
            if (!isValidLanguage(newLanguage)) {
                console.warn(`Invalid language: ${newLanguage}, falling back to English`);
                newLanguage = 'en';
            }

            setLanguageState(newLanguage);
            localStorage.setItem('selectedLanguage', newLanguage);

            // Change language in i18next
            await i18n.changeLanguage(newLanguage);

            // Load translations from API if enabled
            if (enableAPILoading) {
                await reloadTranslations(newLanguage);
            }

            // Set document language for screen readers and RTL support
            document.documentElement.lang = newLanguage;
            const isRTL = newLanguage === 'ur' || newLanguage === 'ar'; // Add more RTL languages as needed
            document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        },
        [enableAPILoading]
    );

    // Reload translations from API
    const reloadTranslations = useCallback(
        async (lang: Language, forceRefresh: boolean = false) => {
            setIsLoadingTranslations(true);
            setTranslationError(null);

            try {
                const translations = await languageAPIService.fetchLanguageTranslations(
                    lang,
                    forceRefresh
                );

                // Merge with existing translations if API fetch succeeds
                if (Object.keys(translations).length > 0) {
                    i18n.addResourceBundle(lang, 'translation', translations, true, true);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                setTranslationError(errorMsg);
                console.error(`Failed to reload translations for ${lang}:`, error);
            } finally {
                setIsLoadingTranslations(false);
            }
        },
        []
    );

    // Translation function with fallback
    const t = useCallback(
        (key: string): string => {
            const translation = i18n.t(key);
            // If key is not translated, return the key itself
            return translation || key;
        },
        []
    );

    // Translation function for specific language
    const tForLang = useCallback(
        (key: string, lang: Language): string => {
            if (!isValidLanguage(lang)) {
                return key;
            }
            const translation = i18n.t(key, { lng: lang });
            return translation || key;
        },
        []
    );

    const value: LanguageContextType = {
        language,
        setLanguage,
        t,
        tForLang,
        isLoadingTranslations,
        translationError,
        reloadTranslations,
    };

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

/**
 * Validate if language code is supported
 */
function isValidLanguage(lang: any): lang is Language {
    const supportedLanguages = [
        'en',
        'ta',
        'hi',
        'as',
        'bn',
        'gu',
        'kn',
        'ml',
        'mr',
        'od',
        'pa',
        'te',
        'ur',
        'ne',
    ];
    return typeof lang === 'string' && supportedLanguages.includes(lang);
}

export default LanguageContext;
