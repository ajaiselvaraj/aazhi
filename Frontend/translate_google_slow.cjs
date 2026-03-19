const fs = require('fs');
const translate = require('google-translate-api-x');

const TARGET_LANGS = ['kok', 'sat'];
const EN_PATH = 'locales/en.json';
const CHUNK_SIZE = 15; 
const DELAY_BETWEEN_CHUNKS = 5000; 

function isDummy(text) {
    if (!text) return true;
    const stripped = text.replace(/[\s\d\p{P}]/gu, '');
    if (stripped.length === 0) return false;
    return new Set(stripped).size <= 1;
}

function getGoogleLangCode(code) {
    if (code === 'kok') return 'gom'; // Goan Konkani
    return code;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runGeno() {
    console.log(`Loading English keys from ${EN_PATH}...`);
    const enObj = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
    const allKeys = Object.keys(enObj);

    for (const lang of TARGET_LANGS) {
        console.log(`\n================ Processing Language: ${lang.toUpperCase()} ================`);
        
        const langPath = `locales/${lang}.json`;
        let currentObj = {};
        if (fs.existsSync(langPath)) {
            try {
                currentObj = JSON.parse(fs.readFileSync(langPath, 'utf8'));
            } catch(e) { }
        }
        
        const keysToTranslate = allKeys.filter(k => {
            const val = currentObj[k];
            if (!val) return true;
            if (val === enObj[k] && /[a-z]/i.test(val)) return true; 
            if (isDummy(val)) return true;
            return false;
        });

        console.log(`Found ${keysToTranslate.length} keys needing translation for ${lang}.`);
        if (keysToTranslate.length === 0) continue;

        const validTexts = keysToTranslate.map(k => enObj[k]);

        for (let i = 0; i < keysToTranslate.length; i += CHUNK_SIZE) {
            let chunkKeys = keysToTranslate.slice(i, i + CHUNK_SIZE);
            let chunkTexts = validTexts.slice(i, i + CHUNK_SIZE);
            
            let success = false;
            let retries = 0;

            while (!success && retries < 5) {
                 try {
                     const res = await translate(chunkTexts, { to: getGoogleLangCode(lang) });
                     res.forEach((r, idx) => { currentObj[chunkKeys[idx]] = r.text; });
                     success = true;
                     console.log(`[${lang}] Translated ${i + chunkKeys.length}/${keysToTranslate.length} strings`);
                     fs.writeFileSync(langPath, JSON.stringify(currentObj, null, 2));
                     await sleep(DELAY_BETWEEN_CHUNKS);
                 } catch(e) {
                     retries++;
                     const waitTime = retries >= 3 ? 15000 : 5000 * retries;
                     console.log(`[${lang}] Try ${retries} failed. Retrying in ${waitTime/1000}s...`);
                     await sleep(waitTime);
                 }
            }
        }
        console.log(`✅ Finished translating ${lang}.`);
    }
}

runGeno();
