const fs = require('fs');
const translate = require('google-translate-api-x');

async function doTranslations() {
    const enObj = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
    let asObj = {};
    if (fs.existsSync('locales/as.json')) {
        asObj = JSON.parse(fs.readFileSync('locales/as.json', 'utf8'));
    }

    const userOverrides = {
        "home": "হোম",
        "history": "ইতিহাস",
        "trackApplication": "আবেদন অনুসৰণ কৰক",
        "newConnection": "নতুন সংযোগ",
        "electricityBoard": "বিদ্যুৎ ব'ৰ্ড",
        "wasteManagement": "আৱৰ্জনা ব্যৱস্থাপনা",
        "municipalCorp": "নগৰ নিগম",
        "submitted": "জমা দিয়া হৈছে",
        "pending": "অপেক্ষমাণ",
        "resolved": "সমাধান কৰা হৈছে",
        "search": "অনুসন্ধান",
        "download": "ডাউনলোড",
        "latestUpdates": "সাম্প্ৰতিক আপডেট",
        "complaint": "অভিযোগ",
        "request": "অনুৰোধ"
    };

    for (const [k, v] of Object.entries(userOverrides)) {
        if (enObj[k]) {
           asObj[k] = v;
        }
    }

    const keysToTranslate = Object.keys(enObj).filter(k => 
        (typeof asObj[k] === 'string' && asObj[k] === enObj[k] && /[a-z]/i.test(asObj[k])) || 
        !asObj.hasOwnProperty(k)
    );

    console.log(`Keys needing translation with google-translate-api-x: ${keysToTranslate.length}`);

    let translatedCount = 0;

    // ── Rate limit tracking ──────────────────────────────────
    const MAX_CALLS_PER_MINUTE = parseInt(process.env.MAX_API_CALLS_PER_MINUTE || '30', 10);
    const MAX_RETRIES = 5;
    const BASE_DELAY_MS = 2000;
    const callTimestamps = [];

    function getCallsThisMinute() {
        const cutoff = Date.now() - 60000;
        while (callTimestamps.length > 0 && callTimestamps[0] < cutoff) {
            callTimestamps.shift();
        }
        return callTimestamps.length;
    }

    async function waitIfNeeded() {
        while (getCallsThisMinute() >= MAX_CALLS_PER_MINUTE) {
            console.log(`[Throttle] Per-minute limit (${MAX_CALLS_PER_MINUTE}) reached — pausing 5s…`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    // gather texts
    const validKeys = [];
    const validTexts = [];
    for (const key of keysToTranslate) {
         if (!userOverrides[key]) {
             validKeys.push(key);
             validTexts.push(enObj[key]);
         }
    }

    const CHUNK_SIZE = 10;
    for (let i = 0; i < validKeys.length; i += CHUNK_SIZE) {
        let chunkKeys = validKeys.slice(i, i + CHUNK_SIZE);
        let chunkTexts = validTexts.slice(i, i + CHUNK_SIZE);

        let success = false;
        let retries = 0;

        while (!success && retries < MAX_RETRIES) {
             try {
                 // Respect per-minute cap before each call
                 await waitIfNeeded();
                 callTimestamps.push(Date.now());

                 const res = await translate(chunkTexts, { to: 'as' });

                 res.forEach((r, idx) => {
                     asObj[chunkKeys[idx]] = r.text;
                 });
                 success = true;
                 translatedCount += chunkKeys.length;
                 console.log(`Translated block up to ${i + CHUNK_SIZE}/${validKeys.length} (API calls this minute: ${getCallsThisMinute()})`);
                 fs.writeFileSync('locales/as.json', JSON.stringify(asObj, null, 4));
             } catch(e) {
                 const is429 = e.message && (e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('quota'));
                 retries++;

                 // Exponential backoff with jitter
                 const exponentialDelay = BASE_DELAY_MS * Math.pow(2, retries - 1);
                 const jitter = Math.round(exponentialDelay * 0.2 * (Math.random() - 0.5));
                 const waitTime = exponentialDelay + jitter;

                 if (is429) {
                     console.warn(`[Rate Limit] 429/RESOURCE_EXHAUSTED — retry ${retries}/${MAX_RETRIES} in ${waitTime}ms`);
                 } else {
                     console.log(`[Retry] Error: ${e.message} — retry ${retries}/${MAX_RETRIES} in ${waitTime}ms`);
                 }

                 if (retries >= MAX_RETRIES) {
                     console.error(`[FATAL] All ${MAX_RETRIES} retries exhausted for chunk at index ${i}. Skipping.`);
                     break;
                 }
                 await new Promise(r => setTimeout(r, waitTime));
             }
        }
    }

    fs.writeFileSync('locales/as.json', JSON.stringify(asObj, null, 4));
    console.log(`All missing translations processed! (${translatedCount} keys translated)`);
}

doTranslations();
