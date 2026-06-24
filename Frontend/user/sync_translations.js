import fs from 'fs';
import { translate } from 'bing-translate-api';

async function syncTranslations() {
    console.log('Loading English and Assamese JSON files...');
    const en = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));
    let asObj = {};
    try {
        asObj = JSON.parse(fs.readFileSync('./locales/as.json', 'utf8'));
    } catch (e) {
        console.log('No existing as.json found, creating new one.');
    }

    const enKeys = Object.keys(en);
    const asKeys = Object.keys(asObj);

    const missing = enKeys.filter(k => !asKeys.includes(k));
    console.log(`Found ${missing.length} missing keys to translate to Assamese.`);

    for (let i = 0; i < missing.length; i++) {
        const key = missing[i];
        const textToTranslate = en[key];
        
        // Skip placeholders like {amount} if possible, but Google Translate handles them somewhat.
        // It's better to just translate directly.
        try {
            console.log(`[${i+1}/${missing.length}] Translating: "${textToTranslate}"`);
            const res = await translate(textToTranslate, null, 'as');
            asObj[key] = res.translation;
            
            // Sleep slightly to avoid rate limiting
            await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
            console.error(`Failed to translate key: ${key}. Error:`, error.message);
            // In case @vitalets fails, we might need to fallback to google-translate-api-x
        }
        
        // Save incrementally
        if (i % 10 === 0) {
            fs.writeFileSync('./locales/as.json', JSON.stringify(asObj, null, 4));
        }
    }
    
    fs.writeFileSync('./locales/as.json', JSON.stringify(asObj, null, 4));
    console.log('Translation sync complete!');
}

syncTranslations();
