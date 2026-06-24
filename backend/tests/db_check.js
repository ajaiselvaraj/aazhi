import { pool } from "./config/db.js";
async function run() {
  try {
    const res = await pool.query(`
SELECT ticket_number,
status,
department,
request_category,
citizen_id,
created_at
FROM service_requests
ORDER BY created_at DESC
LIMIT 10;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
