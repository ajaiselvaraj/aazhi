const fs = require('fs');
const path = require('path');

function scanDirectory(dir, results) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDirectory(fullPath, results);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            let inComment = false;
            lines.forEach((line, index) => {
                // very basic heuristic: looks for >Text<, skipping >{t('...')}
                if (line.match(/>\s*[A-Z][a-z0-9\s]+[^<]*</) && !line.includes('{t(')) {
                    results.push(`${fullPath}:${index + 1}: ${line.trim()}`);
                }
            });
        }
    }
}

const results = [];
scanDirectory(path.join(__dirname, '../components/kiosk'), results);
fs.writeFileSync(path.join(__dirname, 'english_literals.txt'), results.join('\n'));
console.log(`Found ${results.length} possible literals.`);
