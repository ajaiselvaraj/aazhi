import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  try {
    const complaints = await pool.query('SELECT COUNT(*) FROM complaints');
    const requests = await pool.query('SELECT COUNT(*) FROM service_requests');
    console.log('Complaints count:', complaints.rows[0].count);
    console.log('Service Requests count:', requests.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
