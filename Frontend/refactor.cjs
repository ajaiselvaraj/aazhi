const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, 'components');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      filelist = walkSync(filePath, filelist);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      filelist.push(filePath);
    }
  });
  return filelist;
};

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Replace Import
  if (content.includes("from '../contexts/LanguageContext'") || content.includes("from '../../contexts/LanguageContext'") || content.includes("from '../../../contexts/LanguageContext'")) {
    content = content.replace(/import\s+\{\s*useLanguage\s*\}\s+from\s+['"](?:\.\.\/)+contexts\/LanguageContext['"];/g, 
                             "import { useTranslation } from 'react-i18next';");
    changed = true;
  }

  // 2. Replace const { t } = useLanguage();
  if (content.includes("useLanguage()")) {
    content = content.replace(/const\s+\{\s*t\s*\}\s*=\s*useLanguage\(\);/g, 
                             "const { t } = useTranslation();");
    
    // Support combinations like const { language, t } = useLanguage();
    content = content.replace(/const\s+\{\s*language\s*,\s*t\s*\}\s*=\s*useLanguage\(\);/g, 
                             "const { t, i18n } = useTranslation();\n    const language = i18n.language as any;");

    content = content.replace(/const\s+\{\s*language\s*,\s*setLanguage\s*,\s*tForLang\s*\}\s*=\s*useLanguage\(\);/g, 
                             "const { i18n } = useTranslation();\n    const language = i18n.language;\n    const setLanguage = (lang: string) => i18n.changeLanguage(lang);\n    const tForLang = (key: string, lang: string) => { const r = i18n.getResourceBundle(lang, 'translation'); return r && r[key] ? r[key] : key; };");

    changed = true;
  }

  // Fallback for tricky tForLang uses or setLanguage without t
  if (content.match(/useLanguage\(\)/)) {
     console.log(`Warning: Unhandled useLanguage in ${filePath}`);
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath.replace(__dirname, '')}`);
  }
};

const files = walkSync(COMPONENTS_DIR);
console.log(`Found ${files.length} ts/tsx files in components/`);

let updatedCount = 0;
files.forEach(file => {
  try {
     replaceInFile(file);
     updatedCount++;
  } catch(e) {
     console.error(`Error processing ${file}: ${e.message}`);
  }
});

console.log(`\nCompleted. Processed ${updatedCount} files.`);
