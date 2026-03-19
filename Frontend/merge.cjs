const fs = require('fs');

try {
    const c1 = JSON.parse(fs.readFileSync('./locales/mni_1.json', 'utf8'));
    const c2 = JSON.parse(fs.readFileSync('./locales/mni_2.json', 'utf8'));
    const c3 = JSON.parse(fs.readFileSync('./locales/mni_3.json', 'utf8'));

    const merged = { ...c1, ...c2, ...c3 };

    fs.writeFileSync('./locales/mni.json', JSON.stringify(merged, null, 2), 'utf8');

    // Make sure we have the expected keys
    console.log(`Successfully merged ${Object.keys(merged).length} keys into mni.json`);
} catch (e) {
    console.error("Error merging files:", e);
    process.exit(1);
}
