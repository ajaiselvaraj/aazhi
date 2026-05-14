import { pool } from "./config/db.js";

async function run() {
    try {
        const res = await pool.query(`SELECT * FROM utility_accounts LIMIT 5;`);
        console.log("ACCOUNTS:", res.rows);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

run();
