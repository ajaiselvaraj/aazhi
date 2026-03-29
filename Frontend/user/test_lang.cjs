const translate = require('google-translate-api-x');

const langs = ['kn', 'ml', 'mr', 'or', 'pa', 'doi', 'ks', 'kok', 'mai', 'sa', 'sat', 'sd'];
const text = "Welcome Citizen";

async function test() {
  for(const l of langs) {
     try {
       const res = await translate(text, {to: l === 'kok' ? 'gom' : l});
       console.log(`[${l}] => ${res.text}`);
     } catch (e) {
       console.log(`[${l}] Error: ${e.message}`);
     }
  }
}
test();
