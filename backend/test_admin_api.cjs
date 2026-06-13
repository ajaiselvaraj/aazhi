const axios = require('axios');
const jwt = require('jsonwebtoken');

const token = jwt.sign({
  id: 'admin_id_here',
  role: 'admin',
  department: 'Admin'
}, '42d9cabfc6fd3471a6c14af3d29e550a6a8081b55eaaedcbe756284872900', { expiresIn: '1h' });

async function checkAdminAPI() {
  const ticketNumber = 'SRQ-20260613-14F3E7D3';
  
  console.log('\n--- 6. Calling Admin API ---');
  try {
    const adminRes = await axios.get('http://localhost:5000/api/admin/service-requests', {
      params: { page: 1, limit: 50 },
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });
    console.log('Status 5000:', adminRes.status);
    if (adminRes.status === 401) {
      console.log('Got 401! Trying other secret...');
      const token2 = jwt.sign({ id: 'admin_id_here', role: 'admin', department: 'Admin' }, 'suvidha_kiosk_secret_2026_top_secret', { expiresIn: '1h' });
      const res2 = await axios.get('http://localhost:5000/api/admin/service-requests', {
        params: { page: 1, limit: 50 },
        headers: { Authorization: `Bearer ${token2}` },
        validateStatus: () => true
      });
      console.log('Status 5000 with second secret:', res2.status);
      console.log('New ticket?:', res2.data?.data?.some(r => r.ticket_number === ticketNumber));
      if (!res2.data?.data?.some(r => r.ticket_number === ticketNumber)) {
        console.log('First 5 tickets:', res2.data?.data?.slice(0, 5).map(r => r.ticket_number));
      }
    } else {
      console.log('New ticket in 5000?:', adminRes.data?.data?.some(r => r.ticket_number === ticketNumber));
      if (!adminRes.data?.data?.some(r => r.ticket_number === ticketNumber)) {
        console.log('First 5 tickets:', adminRes.data?.data?.slice(0, 5).map(r => r.ticket_number));
      }
    }
  } catch(err) {
    console.error('Admin API call 5000 failed:', err.message);
  }
}

checkAdminAPI();
