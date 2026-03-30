/**
 * AAZHI Admin API Client (PRODUCTION SAFE)
 */

const VITE_API_URL = import.meta.env.VITE_API_URL as string;
const API_BASE = VITE_API_URL || 'https://aazhi-9gj2.onrender.com/api';

// 🔍 Debug (remove later if needed)
if (!VITE_API_URL) {
  console.warn("⚠️ [adminApi] VITE_API_URL is missing! Falling back to Render URL.");
} else {
  console.log("🌐 [adminApi] Connecting to:", API_BASE);
}

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

  const fullUrl = `${API_BASE}${finalEndpoint}`;
  console.log(`📤 [API request start] ${options.method || 'GET'} ${fullUrl}`);

  const res = await fetch(fullUrl, {
    cache: 'no-store',
    ...options,
    headers,
  });

  // 🔴 401 Unauthorized Handling — Force Logout
  if (res.status === 401) {
    console.error("🔴 [AUTH] 401 Unauthorized. Token expired or invalid.");
    localStorage.removeItem('adminToken');
    localStorage.removeItem('aazhi_admin_session');
    throw new Error('Session expired. Please log in again.');
  }

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    console.error(`❌ [API error] ${options.method || 'GET'} ${fullUrl}: Invalid JSON response (${res.status})`);
    throw new Error(`Invalid JSON response (${res.status})`);
  }

  if (!res.ok) {
    console.error(`❌ [API error] ${options.method || 'GET'} ${fullUrl}: ${(json as any).message || res.statusText}`);
    throw new Error((json as any).message || `Request failed (${res.status})`);
  }

  console.log(`✅ [API success] ${options.method || 'GET'} ${fullUrl}`);
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

  updateComplaintStatus: async (id: string, updates: { current_stage?: string, status?: string, rejection_reason?: string, notes?: string }) => {
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

  updateServiceRequestStatus: async (id: string, updates: { current_stage?: string, status?: string, rejection_reason?: string, notes?: string }) => {
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