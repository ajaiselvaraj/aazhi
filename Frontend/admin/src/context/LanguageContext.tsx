import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import enTranslations from '../locales/en.json';
import hiTranslations from '../locales/hi.json';
import asTranslations from '../locales/as.json';

export type Language = 'en' | 'hi' | 'as';

const resources = {
  en: enTranslations,
  hi: hiTranslations,
  as: asTranslations
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (key: string, defaultValue?: string) => string;
  t: (key: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('app_lang');
    return (savedLang as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_lang', lang);
  };

  useEffect(() => {
    if (!localStorage.getItem('app_lang')) {
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang === 'hi') {
        setLanguage('hi');
      } else if (browserLang === 'as') {
        setLanguage('as');
      } else {
        setLanguage('en');
      }
    }
  }, []);

  const t = (path: string, defaultValue?: string): string => {
    const keys = path.split('.');
    let result: any = resources[language];
    for (const key of keys) {
      if (result === undefined) break;
      result = result[key];
    }
    
    // Fallback to English if key entirely not found in current non-en language
    if (result === undefined && language !== 'en') {
      result = resources['en'];
      for (const key of keys) {
        if (result === undefined) break;
        result = result[key];
      }
    }

    // Still missing, attempt flat key mapping inside translations.ts legacy to avoid breaking other files temporarily if missed
    if (result === undefined || typeof result !== 'string') {
       return defaultValue !== undefined ? defaultValue : path;
    }
    
    return result as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate: t, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
