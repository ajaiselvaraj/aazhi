import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';
import as from './locales/as.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import ne from './locales/ne.json';
import od from './locales/od.json';
import pa from './locales/pa.json';
import te from './locales/te.json';
import ur from './locales/ur.json';

import { Language } from './types';

const resources = {
    [Language.ENGLISH]: { translation: en },
    [Language.TAMIL]: { translation: ta },
    [Language.HINDI]: { translation: hi },
    [Language.ASSAMESE]: { translation: as },
    [Language.BENGALI]: { translation: bn },
    [Language.GUJARATI]: { translation: gu },
    [Language.KANNADA]: { translation: kn },
    [Language.MALAYALAM]: { translation: ml },
    [Language.MARATHI]: { translation: mr },
    [Language.NEPALI]: { translation: ne },
    [Language.ODIA]: { translation: od },
    [Language.PUNJABI]: { translation: pa },
    [Language.TELUGU]: { translation: te },
    [Language.URDU]: { translation: ur },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: Language.ENGLISH,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;
