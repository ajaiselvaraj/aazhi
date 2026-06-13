const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

async function doTrace() {
  const token = jwt.sign({ id: 'a98aa123-577a-4a49-8822-86452ab550f9', role: 'admin', department: 'Admin' }, '42d9cabfc6fd3471a6c14af3d29e550a6a8081b55eaaedcbe756284872900', { expiresIn: '1h' });
  const pool = new Pool({ connectionString: 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' });

  let ticketNumber;
  try {
    const createRes = await axios.post('http://localhost:5000/api/service-requests/debug', {
      citizen_id: 'a98aa123-577a-4a49-8822-86452ab550f9',
      request_type: 'Live Trace Test',
      department: 'Electricity',
      description: 'Trace'
    });
    ticketNumber = createRes.data.data.ticket_number;
    console.log('NEW_TICKET:', ticketNumber);
  } catch(e) {
    console.error('Create failed', e.response?.data || e.message);
    process.exit(1);
  }

  const dbRes = await pool.query('SELECT ticket_number, status, department FROM service_requests WHERE ticket_number = $1', [ticketNumber]);
  console.log('DB:', dbRes.rows.length > 0 ? 'FOUND' : 'NOT FOUND');

  const apiRes = await axios.get('http://localhost:5000/api/admin/service-requests', {
    params: { page: 1, limit: 50 },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const inApi = apiRes.data.data.some(r => r.ticket_number === ticketNumber);
  console.log('API:', inApi ? 'FOUND' : 'NOT FOUND');
  if (!inApi) {
    console.log('First 3 tickets in API:', apiRes.data.data.slice(0, 3).map(r => r.ticket_number));
  }
  
  process.exit(0);
}
doTrace();
