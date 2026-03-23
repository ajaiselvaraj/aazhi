const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://aazhi-9gj2.onrender.com/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('adminToken');
  const headers: any = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
  return json;
}

export const adminApi = {
  // ── Dashboard ──
  getDashboard: async () => {
    const json = await request('/admin/dashboard');
    return json.data;
  },

  // ── Complaints ──
  getAllComplaints: async (params: { page?: number; limit?: number; status?: string; department?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.department) q.set('department', params.department);
    const json = await request(`/admin/complaints?${q.toString()}`);
    return json;
  },

  updateComplaintStatus: async (id: string, status: string) => {
    const json = await request(`/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return json.data;
  },

  // ── Service Requests ──
  getAllServiceRequests: async (params: { page?: number; limit?: number; status?: string; department?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status) q.set('status', params.status);
    if (params.department) q.set('department', params.department);
    const json = await request(`/admin/service-requests?${q.toString()}`);
    return json;
  },

  updateServiceRequestStatus: async (id: string, status: string) => {
    const json = await request(`/service-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return json.data;
  },

  // ── Analytics ──
  getServiceRequestAnalytics: async (period = 30) => {
    const json = await request(`/admin/analytics/service-requests?period=${period}`);
    return json.data;
  },

  getPaymentStats: async (period = 30) => {
    const json = await request(`/admin/analytics/payments?period=${period}`);
    return json.data;
  },

  // ── Citizens ──
  getAllCitizens: async (params: { page?: number; limit?: number; search?: string } = {}) => {
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
