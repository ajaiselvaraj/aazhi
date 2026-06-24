import fs from 'fs';

const en = JSON.parse(fs.readFileSync('./locales/en.json', 'utf8'));
const as = JSON.parse(fs.readFileSync('./locales/as.json', 'utf8'));

const enKeys = Object.keys(en);
const asKeys = Object.keys(as);

const missing = enKeys.filter(k => !asKeys.includes(k));
const unused = asKeys.filter(k => !enKeys.includes(k));

console.log(`Total English keys: ${enKeys.length}`);
console.log(`Total Assamese keys: ${asKeys.length}`);
console.log(`Missing keys in Assamese: ${missing.length}`);
console.log(`Unused keys in Assamese: ${unused.length}`);
