const fs = require('fs');
const { translate } = require('bing-translate-api');
const targetLangs = ['ks', 'kok', 'mai', 'sa', 'sat', 'sd'];
const text = "Welcome Citizen";

async function testBing() {
    let out = [];
    for (const l of targetLangs) {
        try {
            const res = await translate(text, null, l);
            out.push(`[bing] [${l}] => ${res.translation}`);
        } catch(e) {
            out.push(`[bing] [${l}] Error: ${e.message}`);
        }
    }
    fs.writeFileSync('bing_res.txt', out.join('\n'));
}
testBing();
