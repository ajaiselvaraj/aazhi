import axios from 'axios';

async function test() {
  try {
    // 1. Admin login
    const loginRes = await axios.post('http://localhost:5000/api/auth/admin-login', {
      adminId: 'ADM-2024-001',
      password: 'admin',
      department: 'ALL'
    });

    console.log('Login Success:', loginRes.data.success);
    const token = loginRes.data.data.tokens.accessToken;
    console.log('Token:', token);

    // 2. Fetch service requests
    const res = await axios.get('http://localhost:5000/api/admin/service-requests', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Fetch Success:', res.data.success);
    console.log('Total count in pagination:', res.data.pagination);
    console.log('Number of rows returned:', res.data.data?.length);
    if (res.data.data && res.data.data.length > 0) {
      console.log('First request sample:', JSON.stringify(res.data.data[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err.response?.data || err);
  }
}

test();
