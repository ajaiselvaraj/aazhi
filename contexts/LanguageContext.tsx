import React, { createContext, useState, useEffect, useContext } from 'react';
import { Language } from '../types';
import en from '../locales/en.json';
import ta from '../locales/ta.json';
import hi from '../locales/hi.json';
import as from '../locales/as.json';
import bn from '../locales/bn.json';
import gu from '../locales/gu.json';
import kn from '../locales/kn.json';
import ml from '../locales/ml.json';
import mr from '../locales/mr.json';
import ne from '../locales/ne.json';
import od from '../locales/od.json';
import pa from '../locales/pa.json';
import te from '../locales/te.json';
import ur from '../locales/ur.json';

const LOCALE_MAP: Record<string, any> = {
    [Language.ENGLISH]: en,
    [Language.TAMIL]: ta,
    [Language.HINDI]: hi,
    [Language.ASSAMESE]: as,
    [Language.BENGALI]: bn,
    [Language.GUJARATI]: gu,
    [Language.KANNADA]: kn,
    [Language.MALAYALAM]: ml,
    [Language.MARATHI]: mr,
    [Language.NEPALI]: ne,
    [Language.ODIA]: od,
    [Language.PUNJABI]: pa,
    [Language.TELUGU]: te,
    [Language.URDU]: ur,
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    tForLang: (key: string, lang: Language) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('aazhi_language');
        // Validate that the saved language is a valid Language enum
        return Object.values(Language).includes(saved as Language)
            ? (saved as Language)
            : Language.ENGLISH;
    });

    useEffect(() => {
        localStorage.setItem('aazhi_language', language);
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
    };

    const t = (key: string): string => {
        const currentLocale = LOCALE_MAP[language];
        const fallbackLocale = LOCALE_MAP[Language.ENGLISH];

        // Check if key exists in current locale
        if (currentLocale && currentLocale[key]) {
            return currentLocale[key];
        }

        // Fallback to English
        if (fallbackLocale && fallbackLocale[key]) {
            return fallbackLocale[key];
        }

        // Return key as last resort
        return key;
    };

    const tForLang = (key: string, lang: Language): string => {
        const currentLocale = LOCALE_MAP[lang];
        const fallbackLocale = LOCALE_MAP[Language.ENGLISH];

        if (currentLocale && currentLocale[key]) {
            return currentLocale[key];
        }

        if (fallbackLocale && fallbackLocale[key]) {
            return fallbackLocale[key];
        }

        return key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, tForLang }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
