const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log("Checking columns in 'complaints' table...");
    const checkCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'complaints' AND column_name IN ('latitude', 'longitude')
    `);
    
    const existingCols = checkCols.rows.map(r => r.column_name);
    console.log("Existing columns:", existingCols);
    
    if (!existingCols.includes('latitude')) {
      console.log("Adding column 'latitude'...");
      await pool.query('ALTER TABLE complaints ADD COLUMN latitude NUMERIC(9,6)');
    }
    if (!existingCols.includes('longitude')) {
      console.log("Adding column 'longitude'...");
      await pool.query('ALTER TABLE complaints ADD COLUMN longitude NUMERIC(9,6)');
    }
    
    console.log("Database columns migrated successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    pool.end();
  }
}

run();
