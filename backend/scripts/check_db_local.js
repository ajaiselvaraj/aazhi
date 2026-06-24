import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT 
        id, 
        ticket_number, 
        status, 
        department, 
        request_type, 
        citizen_id, 
        request_category,
        created_at 
      FROM service_requests 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    console.log("DB_RESULTS:", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
