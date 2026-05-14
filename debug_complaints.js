const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  try {
    // 1. Check if citizen_mobile column exists
    const colCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'complaints' AND column_name = 'citizen_mobile'
    `);
    console.log("=== citizen_mobile COLUMN EXISTS? ===");
    console.log(colCheck.rows.length > 0 ? "YES: " + JSON.stringify(colCheck.rows[0]) : "NO - COLUMN IS MISSING!");

    // 2. Show last 5 complaints raw data
    const res = await pool.query(`
      SELECT ticket_number, citizen_name, citizen_mobile, citizen_id, category, created_at
      FROM complaints
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log("\n=== LAST 5 COMPLAINTS (RAW) ===");
    res.rows.forEach((r, i) => {
      console.log(`${i+1}. ${r.ticket_number} | name="${r.citizen_name}" | mobile="${r.citizen_mobile}" | cat=${r.category}`);
    });

    // 3. Show citizens table
    const cit = await pool.query(`SELECT id, name, mobile FROM citizens LIMIT 5`);
    console.log("\n=== CITIZENS TABLE ===");
    cit.rows.forEach(c => console.log(`  ${c.id} -> name="${c.name}", mobile="${c.mobile}"`));

  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

run();
