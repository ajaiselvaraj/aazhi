
import { TRANSLATIONS, LANGUAGES_CONFIG } from './constants';
import { Language } from './types';

console.log("Testing TRANSLATIONS integrity...");

try {
    const en = TRANSLATIONS[Language.ENGLISH];
    const ta = TRANSLATIONS[Language.TAMIL];
    const hi = TRANSLATIONS[Language.HINDI];

    console.log("English keys:", Object.keys(en).length);
    console.log("Tamil keys:", Object.keys(ta).length);
    console.log("Hindi keys:", Object.keys(hi).length);

    if (!en.secureAuth) console.error("Missing secureAuth in English");
    if (!ta.secureAuth) console.error("Missing secureAuth in Tamil");
    if (!hi.secureAuth) console.error("Missing secureAuth in Hindi"); // Should exist via spread

    console.log("Testing App.tsx t access...");
    const t = TRANSLATIONS['en' as Language];
    console.log("Secure Auth:", t.secureAuth);
    console.log("Govt:", t.govtOfIndia);

    console.log("SUCCESS: Constants seem valid.");
} catch (e) {
    console.error("CRITICAL ERROR:", e);
}
