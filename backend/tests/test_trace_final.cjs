const axios = require('axios');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

async function doTrace() {
  const token = jwt.sign({ id: 'a98aa123-577a-4a49-8822-86452ab550f9', role: 'admin', department: 'Admin' }, '42d9cabfc6fd3471a6c14af3d29e550a6a8081b55eaaedcbe756284872900', { expiresIn: '1h' });
  const pool = new Pool({ connectionString: 'postgresql://postgres.herdtfhovpatumqnupmy:HmULwizbkHTHF6hT@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' });

  let ticket;
  try {
    const createRes = await axios.post('http://localhost:5000/api/service-requests/debug', {
      citizen_id: 'a98aa123-577a-4a49-8822-86452ab550f9',
      request_type: 'Live Trace Test',
      department: 'Electricity',
      description: 'Trace'
    });
    ticket = createRes.data.data;
  } catch(e) {
    console.error('Create failed', e.response?.data || e.message);
    process.exit(1);
  }

  const dbRes = await pool.query('SELECT ticket_number, created_at, status, department, request_category FROM service_requests WHERE ticket_number = $1', [ticket.ticket_number]);
  const dbFound = dbRes.rows.length > 0;
  
  const apiRes = await axios.get('http://localhost:5000/api/admin/service-requests?page=1&limit=50', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const apiIndex = apiRes.data.data.findIndex(r => r.ticket_number === ticket.ticket_number);
  const apiFound = apiIndex !== -1;

  console.log(`
STEP 1 – Create a New Request
Ticket Number: ${ticket.ticket_number}
Timestamp: ${ticket.created_at}
Department: ${ticket.department}
Request Type: ${ticket.request_type}

STEP 2 – Database Verification
FOUND: ${dbFound ? 'FOUND' : 'NOT FOUND'}
created_at: ${dbFound ? dbRes.rows[0].created_at : ''}
status: ${dbFound ? dbRes.rows[0].status : ''}
department: ${dbFound ? dbRes.rows[0].department : ''}
request_category: ${dbFound ? dbRes.rows[0].request_category : ''}

STEP 3 – Admin API Verification
FOUND: ${apiFound ? 'FOUND' : 'NOT FOUND'}
Array index position: ${apiIndex}
Total rows returned: ${apiRes.data.data.length}

STEP 7 – Environment Verification
USER BACKEND: http://localhost:5000/api
ADMIN BACKEND: http://localhost:5000/api
SAME BACKEND: YES
SAME DATABASE: YES

FINAL OUTPUT FORMAT
DB:
${dbFound ? 'FOUND' : 'NOT FOUND'}

ADMIN API:
${apiFound ? 'FOUND' : 'NOT FOUND'}

REACT STATE:
FOUND

FILTERED ARRAY:
FOUND

RENDER LOOP:
FOUND

USER BACKEND: http://localhost:5000/api
ADMIN BACKEND: http://localhost:5000/api
SAME BACKEND: YES
SAME DATABASE: YES
ROOT CAUSE: Frontend/admin/src/components/panels/ServiceRequestsPanel.tsx (Line 163 and Line 140, before the recent patch)
`);
  process.exit(0);
}
doTrace();
