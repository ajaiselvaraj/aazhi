import 'dotenv/config';

async function main() {
    try {
        const res = await fetch("http://127.0.0.1:5000/api/health");
        const json = await res.json();
        console.log("HEALTH RESPONSE:", JSON.stringify(json, null, 2));
    } catch (err) {
        console.log("HEALTH ERROR:", err);
    }
}
main();
