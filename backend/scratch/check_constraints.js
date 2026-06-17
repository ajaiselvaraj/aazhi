import { pool } from "../config/db.js";

async function main() {
    try {
        const res = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid) 
            FROM pg_constraint c 
            JOIN pg_namespace n ON n.oid = c.connamespace 
            WHERE conrelid = 'complaints'::regclass;
        `);
        console.log("CONSTRAINTS ON complaints:");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error("ERROR:", err.message);
    }
    process.exit(0);
}
main();
