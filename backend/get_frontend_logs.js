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
      headers: { Authorization: `Bearer ${token}` }
    });

    const requests = res.data.data;
    
    // Frontend Filter Logic
    const ACTIVE_STATUSES = ['pending', 'submitted', 'in_progress'];
    const statusFilter = 'All';
    const search = '';
    
    const filteredRequests = requests.filter(r => {
      const matchesStatus = statusFilter === 'All'
         ? ACTIVE_STATUSES.includes(r.status)
         : r.status === statusFilter;

      const tkt = (r.ticket_number || '').toLowerCase();
      const name = (r.citizen_name || '').toLowerCase();
      const type = (r.request_type || '').toLowerCase();
      const s = search.toLowerCase();

      return matchesStatus && (tkt.includes(s) || name.includes(s) || type.includes(s));
    });

    console.log("=== filteredRequests.length ===");
    console.log(filteredRequests.length);

    console.log("=== filteredRequests[0] ===");
    console.log(JSON.stringify(filteredRequests[0], null, 2));

    console.log("=== filteredRequests.find(...) ===");
    const found = filteredRequests.find(r => r.ticket_number === "SRQ-20260611-5D5BA2CA");
    console.log(JSON.stringify(found, null, 2));

  } catch (err) {
    console.error(err.message);
  }
}
run();
