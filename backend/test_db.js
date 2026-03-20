import { pool } from "./config/db.js";

async function run() {
    try {
        // Insert a citizen
        const citizenRes = await pool.query(`
            INSERT INTO citizens (name, mobile, role)
            VALUES ('Demo Citizen', '9999999999', 'citizen')
            ON CONFLICT (mobile) DO UPDATE SET name = 'Demo Citizen'
            RETURNING id;
        `);
        console.log("CITIZEN_ID:", citizenRes.rows[0].id);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

run();
