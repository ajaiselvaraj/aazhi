const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'locales', 'bn.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Fix remaining English-only values
const fixes = {
  receiptHeader: 'তামিলনাড়ু বিদ্যুৎ উৎপাদন ও বিতরণ কর্পোরেশন লিমিটেড',
  eReceipt: 'ই-রসিদ',
  receiptDisclaimer: 'TANGEDCO-এর ব্যাংক অ্যাকাউন্টে অনলাইন পেমেন্টের ক্রেডিট নিশ্চিতের সাপেক্ষে রসিদ জারি হয়েছে।',
};

Object.entries(fixes).forEach(([key, val]) => {
  data[key] = val;
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
console.log('bn.json receipt keys fixed successfully!');
console.log('Current values:');
Object.keys(fixes).forEach(k => console.log(`  ${k}: ${data[k]}`));
