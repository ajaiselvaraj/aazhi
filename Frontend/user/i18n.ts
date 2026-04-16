import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';
import as from './locales/as.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import or from './locales/or.json';
import pa from './locales/pa.json';
import te from './locales/te.json';
import ur from './locales/ur.json';
import mni from './locales/mni.json';
import brx from './locales/brx.json';
import doi from './locales/doi.json';
import ks from './locales/ks.json';
import kok from './locales/kok.json';
import mai from './locales/mai.json';
import sa from './locales/sa.json';
import sat from './locales/sat.json';
import sd from './locales/sd.json';

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
    [Language.ODIA]: { translation: or },
    [Language.PUNJABI]: { translation: pa },
    [Language.TELUGU]: { translation: te },
    [Language.URDU]: { translation: ur },
    [Language.MANIPURI]: { translation: mni },
    [Language.BODO]: { translation: brx },
    [Language.DOGRI]: { translation: doi },
    [Language.KASHMIRI]: { translation: ks },
    [Language.KONKANI]: { translation: kok },
    [Language.MAITHILI]: { translation: mai },
    [Language.SANSKRIT]: { translation: sa },
    [Language.SANTALI]: { translation: sat },
    [Language.SINDHI]: { translation: sd },
};

const lang = localStorage.getItem("app_lang") || Language.ENGLISH;

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: lang,
        fallbackLng: Language.ENGLISH,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
