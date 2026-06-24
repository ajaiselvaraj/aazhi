import fs from 'fs';
import path from 'path';

function walk(dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist') {
                filelist = walk(filepath, filelist);
            }
        } else {
            if (filepath.endsWith('.tsx') || filepath.endsWith('.jsx')) {
                filelist.push(filepath);
            }
        }
    });
    return filelist;
}

const files = walk('.');

let totalFound = 0;
const results = [];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Simple regex to find text between tags that has at least one letter and no { or }
    // Like: >Some Text<
    const regex = />([^<>{]+)</g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        const text = match[1].trim();
        // Ignore very short strings, numbers, or just punctuation
        if (text.length > 1 && /[A-Za-z]/.test(text)) {
            // Also ignore if it looks like a component import or a simple variable assignment
            // This is just a heuristic
            results.push({
                file: file,
                text: text
            });
        }
    }
    
    // We should also look for string literals in placeholders, e.g. placeholder="Enter details"
    const attrRegex = /placeholder="([^"]+)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(content)) !== null) {
        const text = attrMatch[1].trim();
        if (text.length > 1 && /[A-Za-z]/.test(text)) {
            results.push({
                file: file,
                text: `[placeholder] ${text}`
            });
        }
    }
});

// Group by file
const grouped = {};
results.forEach(r => {
    if (!grouped[r.file]) grouped[r.file] = [];
    grouped[r.file].push(r.text);
});

console.log('--- HARDCODED TEXT SCAN RESULTS ---');
for (const file in grouped) {
    console.log(`\nFile: ${file}`);
    grouped[file].forEach(t => console.log(`  - ${t}`));
}
console.log(`\nTotal occurrences found (approx): ${results.length}`);
