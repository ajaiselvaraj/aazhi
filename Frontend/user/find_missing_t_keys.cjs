const fs = require('fs');
const path = require('path');
const en = JSON.parse(fs.readFileSync('./locales/en.json', 'utf-8'));
const allKeys = new Set(Object.keys(en));

function findTCalls(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) results.push(...findTCalls(fp));
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(fp, 'utf-8');
      const regex = /\bt\(['"]([\w_]+)['"](?:\s*\)|,|\s*\|\|)/g;
      let m;
      while ((m = regex.exec(content)) !== null) {
        const key = m[1];
        if (!allKeys.has(key)) {
          results.push({ file: path.relative('.', fp), key });
        }
      }
    }
  }
  return results;
}

const missing = findTCalls('.');
const unique = [...new Set(missing.map(m => m.key))];
console.log('Missing keys used in t() calls:', unique.length);
unique.forEach(k => {
  const files = missing.filter(m => m.key === k).map(m => m.file).join(', ');
  console.log('  ' + k + '  (' + files + ')');
});
