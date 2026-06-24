import axios from 'axios';

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/admin-login', {
      adminId: 'ADM-2024-001',
      password: 'admin',
      department: 'ALL'
    });

    const token = loginRes.data.data.tokens.accessToken;

    const res = await axios.get('http://localhost:5000/api/admin/service-requests', {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true
    });

    console.log("HTTP STATUS:", res.status);
    console.log("TOTAL ROWS IN API:", res.data.data?.length);
    console.log("FIRST 5 ROWS:", JSON.stringify(res.data.data?.slice(0, 5), null, 2));

  } catch (err) {
    console.error(err.message);
  }
}
run();
