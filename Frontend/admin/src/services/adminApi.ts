/**
 * AAZHI Admin API Client (PRODUCTION SAFE)
 */

const API_BASE: string = import.meta.env.VITE_API_URL as string;

// 🔍 Debug (remove later if needed)
console.log("✅ API_BASE:", API_BASE);

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('adminToken');

  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  let finalEndpoint = endpoint;
  if (!options.method || options.method.toUpperCase() === 'GET') {
    const separator = finalEndpoint.includes('?') ? '&' : '?';
    finalEndpoint += `${separator}_t=${Date.now()}`;
  }

  const res = await fetch(`${API_BASE}${finalEndpoint}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  // 🔴 401 Unauthorized Handling — Force Logout
  if (res.status === 401) {
    console.error("🔴 [AUTH] 401 Unauthorized. Token expired or invalid.");
    localStorage.removeItem('adminToken');
    localStorage.removeItem('aazhi_admin_session');
    // Using root instead of /login to avoid 404 in production state-transitioning SPA.
    window.location.href = '/'; 
    throw new Error('Session expired. Please log in again.');
  }

  // 🔴 Handle non-JSON safely
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Invalid JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}

export const adminApi = {
  // ── Auth ──
  login: async (credentials: any) => {
    const json = await request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return json.data;
  },

  // ── Dashboard ──
  getDashboard: async () => {
    const json = await request('/admin/dashboard');
    return json.data;
  },

  // ── Complaints ──
  getAllComplaints: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    department?: string;
    priority?: string;
  } = {}) => {
    const q = new URLSearchParams();

    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.department) q.set('department', params.department);
    if (params.priority) q.set('priority', params.priority);

    const json = await request(`/admin/complaints?${q.toString()}`);
    console.log(`📥 [API] getAllComplaints received ${json.data?.length || 0} items`);
    return json;
  },

  updateComplaintStatus: async (id: string, updates: { stage?: string, status?: string, rejection_reason?: string, notes?: string }) => {
    const json = await request(`/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return json.data;
  },

  // ── Service Requests ──
  getAllServiceRequests: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    department?: string;
  } = {}) => {
    const q = new URLSearchParams();

    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.department) q.set('department', params.department);

    const json = await request(`/admin/service-requests?${q.toString()}`);
    console.log(`📥 [API] getAllServiceRequests received ${json.data?.length || 0} items`);
    return json;
  },

  updateServiceRequestStatus: async (id: string, updates: { stage?: string, status?: string, rejection_reason?: string, notes?: string }) => {
    const json = await request(`/service-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return json.data;
  },

  // ── Analytics ──
  getServiceRequestAnalytics: async (period = 30) => {
    const json = await request(
      `/admin/analytics/service-requests?period=${period}`
    );
    return json.data;
  },

  getPaymentStats: async (period = 30) => {
    const json = await request(
      `/admin/analytics/payments?period=${period}`
    );
    return json.data;
  },

  // ── Citizens ──
  getAllCitizens: async (params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) => {
    const q = new URLSearchParams();

    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);

    const json = await request(`/admin/citizens?${q.toString()}`);
    return json;
  },

  // ── Service Config ──
  getServiceConfig: async () => {
    const json = await request('/admin/config');
    return json.data;
  },

  toggleService: async (serviceName: string, isEnabled: boolean) => {
    const json = await request(`/admin/config/${serviceName}`, {
      method: 'PUT',
      body: JSON.stringify({ is_enabled: isEnabled }),
    });
    return json.data;
  },
};