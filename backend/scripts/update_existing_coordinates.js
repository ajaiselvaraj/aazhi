import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: {
    rejectUnauthorized: false
  }
});

const WARD_COORDS = {
  'Ward 1': [26.182, 91.745],
  'Ward 2': [26.195, 91.758],
  'Ward 3': [26.171, 91.762],
  'Ward 4': [26.208, 91.731],
  'Ward 5': [26.164, 91.776],
  'Ward 6': [26.212, 91.724],
  'Ward 7': [26.155, 91.749],
  'Ward 8': [26.226, 91.768],
  'Ward 9': [26.141, 91.735],
  'Ward 10': [26.234, 91.752],
};

async function run() {
  try {
    console.log("Fetching complaints with missing coordinates...");
    const result = await pool.query("SELECT id, ward FROM complaints WHERE latitude IS NULL OR longitude IS NULL");
    console.log(`Found ${result.rows.length} complaints to update.`);
    
    for (const row of result.rows) {
      const ward = row.ward;
      const baseCoords = WARD_COORDS[ward] || [26.180, 91.740];
      const latJitter = (Math.random() - 0.5) * 0.006;
      const lngJitter = (Math.random() - 0.5) * 0.006;
      const finalLat = parseFloat((baseCoords[0] + latJitter).toFixed(6));
      const finalLng = parseFloat((baseCoords[1] + lngJitter).toFixed(6));
      
      await pool.query(
        "UPDATE complaints SET latitude = $1, longitude = $2 WHERE id = $3",
        [finalLat, finalLng, row.id]
      );
    }
    
    console.log("Database coordinate migration completed!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    pool.end();
  }
}

run();
