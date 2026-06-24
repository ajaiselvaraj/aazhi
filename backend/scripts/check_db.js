import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const complaintsCount = await pool.query("SELECT COUNT(*) FROM complaints");
    const orphanedCount = await pool.query(`
      SELECT COUNT(*) 
      FROM complaints c 
      LEFT JOIN citizens ci ON c.citizen_id = ci.id 
      WHERE ci.id IS NULL
    `);
    const citizensCount = await pool.query("SELECT COUNT(*) FROM citizens");
    const recent = await pool.query(`
        SELECT c.ticket_number, c.status, c.citizen_id, ci.id as match_id
        FROM complaints c
        LEFT JOIN citizens ci ON c.citizen_id = ci.id
        ORDER BY c.created_at DESC
        LIMIT 5
    `);

    console.log(JSON.stringify({
      total_complaints: complaintsCount.rows[0].count,
      orphaned_complaints: orphanedCount.rows[0].count,
      total_citizens: citizensCount.rows[0].count,
      recent_samples: recent.rows
    }, null, 2));

    await pool.end();
  } catch (err) {
    console.error("Database check failed:", err.message);
    process.exit(1);
  }
}

run();
