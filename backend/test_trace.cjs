const axios = require('axios');
const { Pool } = require('pg');

async function testTrace() {
  const ticketNumber = 'SRQ-20260613-14F3E7D3';

  const poolUrl = 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const pool = new Pool({ connectionString: poolUrl });

  console.log('\n--- 2. Checking DB ---');
  try {
    const dbRes = await pool.query('SELECT ticket_number, department, status FROM service_requests WHERE ticket_number = $1', [ticketNumber]);
    console.log('Row in DB:', dbRes.rows.length ? JSON.stringify(dbRes.rows[0]) : 'Not found');
  } catch (err) {
    console.log('DB query error:', err.message);
  }

  console.log('\n--- 6. Calling Admin API ---');
  try {
    const adminRes = await axios.get('http://localhost:5000/api/admin/service-requests', {
      params: { page: 1, limit: 50 },
      validateStatus: () => true
    });
    console.log('Status 5000:', adminRes.status);
    console.log('Rows 5000:', adminRes.data?.data?.length);
    console.log('New ticket in 5000?:', adminRes.data?.data?.some(r => r.ticket_number === ticketNumber));
    if (!adminRes.data?.data?.some(r => r.ticket_number === ticketNumber)) {
      console.log('First 5 tickets:', adminRes.data?.data?.slice(0, 5).map(r => r.ticket_number));
    }
  } catch(err) {
    console.error('Admin API call failed:', err.message);
  }
  process.exit(0);
}
testTrace();
