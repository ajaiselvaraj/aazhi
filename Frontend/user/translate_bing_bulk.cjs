const fs = require('fs');
const { translate } = require('bing-translate-api');

const TARGET_LANGS = ['ks', 'mai', 'sa', 'sd'];
const EN_PATH = 'locales/en.json';
const CHUNK_SIZE = 15; // bing allows smaller chunks
const DELAY = 1000;

function isDummy(text) {
    if (!text) return true;
    const stripped = text.replace(/[\s\d\p{P}]/gu, '');
    if (stripped.length === 0) return false;
    return new Set(stripped).size <= 1;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runBing() {
    console.log(`Loading English keys...`);
    const enObj = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
    const allKeys = Object.keys(enObj);

    for (const lang of TARGET_LANGS) {
        console.log(`\n=== Bing Processing: ${lang} ===`);
        const langPath = `locales/${lang}.json`;
        let currentObj = {};
        if (fs.existsSync(langPath)) {
            try { currentObj = JSON.parse(fs.readFileSync(langPath, 'utf8')); } catch(e) {}
        }
        
        const keysToTranslate = allKeys.filter(k => {
            const val = currentObj[k];
            if (!val) return true;
            if (val === enObj[k] && /[a-z]/i.test(val)) return true;
            if (isDummy(val)) return true;
            return false;
        });

        console.log(`Found ${keysToTranslate.length} keys for ${lang}.`);
        if (keysToTranslate.length === 0) continue;

        let translatedCount = 0;
        for (let i = 0; i < keysToTranslate.length; i += CHUNK_SIZE) {
            let chunkKeys = keysToTranslate.slice(i, i + CHUNK_SIZE);
            let chunkTexts = chunkKeys.map(k => enObj[k]);
            
            let success = false;
            let retries = 0;

            while (!success && retries < 5) {
                 try {
                     // translate one by one in chunk to avoid bing array limits or doing arrays
                     // Actually bing translate api supports string, let's just do Promise.all
                     const promises = chunkTexts.map(t => translate(t, null, lang));
                     const res = await Promise.all(promises);
                     
                     res.forEach((r, idx) => {
                         currentObj[chunkKeys[idx]] = r.translation;
                     });
                     
                     success = true;
                     translatedCount += chunkKeys.length;
                     console.log(`[${lang}] Bing translated ${i + chunkKeys.length}/${keysToTranslate.length}`);
                     fs.writeFileSync(langPath, JSON.stringify(currentObj, null, 2));
                     await sleep(DELAY);
                 } catch(e) {
                     retries++;
                     console.log(`[${lang}] Error ${e.message}, retrying...`);
                     await sleep(3000 * retries);
                 }
            }
        }
        console.log(`Finished ${lang}.`);
    }
}

runBing();
