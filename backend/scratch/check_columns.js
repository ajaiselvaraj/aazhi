import { pool } from "../config/db.js";

async function main() {
    try {
        const res = await pool.query("SELECT * FROM anonymous_integrity_reports LIMIT 1");
        console.log("COLUMNS:", res.fields.map(f => f.name));
    } catch (err) {
        console.error("ERROR:", err.message);
    }
    process.exit(0);
}
main();
