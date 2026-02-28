import React, { createContext, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    tForLang: (key: string, lang: Language) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t, i18n } = useTranslation();
    const language = i18n.language as Language;

    const setLanguage = (lang: Language) => {
        i18n.changeLanguage(lang);
    };

    const tForLang = (key: string, lang: Language): string => {
        // i18next doesn't natively support translating with a specific language easily without changing global state
        // and changing it back, but we can access the resource bundle directly.
        const resource = i18n.getResourceBundle(lang, 'translation');
        if (resource && resource[key]) {
            return resource[key];
        }
        // Fallback to English
        const enResource = i18n.getResourceBundle(Language.ENGLISH, 'translation');
        if (enResource && enResource[key]) {
            return enResource[key];
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
