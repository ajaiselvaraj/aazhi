import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, 'locales');
const enPath = path.join(localesDir, 'en.json');
const enContent = fs.readFileSync(enPath, 'utf8');

const codes = [
    'as', 'bn', 'brx', 'doi', 'gu', 'hi',
    'kn', 'kok', 'ks', 'mai', 'ml', 'mni',
    'mr', 'ne', 'od', 'pa', 'sa', 'sat',
    'ta', 'te', 'ur'
];

if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
}

codes.forEach(code => {
    const filePath = path.join(localesDir, `${code}.json`);
    if (!fs.existsSync(filePath)) {
        console.log(`Creating ${code}.json`);
        fs.writeFileSync(filePath, enContent);
    } else {
        // If it exists but is empty or invalid, or we want to overwrite, we can.
        // But for now, I'll only create if not exists to avoid overwriting existing
        // if subsequent steps had manually edited them. However, since the user 
        // wants a clean slate and strict requirement, I will overwrite (but wait, I might have just written en.json).
        // Let's overwrite to be sure we have the full structure.
        console.log(`Overwriting ${code}.json`);
        fs.writeFileSync(filePath, enContent);
    }
});

console.log('All locale files created/reset to English base.');
