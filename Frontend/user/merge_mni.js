const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'locales');
const chunk1 = JSON.parse(fs.readFileSync(path.join(localesDir, 'mni_1.json'), 'utf8'));
const chunk2 = JSON.parse(fs.readFileSync(path.join(localesDir, 'mni_2.json'), 'utf8'));
const chunk3 = JSON.parse(fs.readFileSync(path.join(localesDir, 'mni_3.json'), 'utf8'));

const merged = { ...chunk1, ...chunk2, ...chunk3 };

fs.writeFileSync(path.join(localesDir, 'mni.json'), JSON.stringify(merged, null, 2), 'utf8');

// Cleanup chunks
fs.unlinkSync(path.join(localesDir, 'mni_1.json'));
fs.unlinkSync(path.join(localesDir, 'mni_2.json'));
fs.unlinkSync(path.join(localesDir, 'mni_3.json'));

console.log(`Successfully merged ${Object.keys(merged).length} keys into mni.json`);
