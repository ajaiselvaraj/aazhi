/**
 * AAZHI Admin API Client (PRODUCTION SAFE)
 */

const VITE_API_URL = import.meta.env.VITE_API_URL as string;
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Override VITE_API_URL with localhost if we are running locally to avoid CORS and remote DB issues
const API_BASE = VITE_API_URL || (isLocal ? 'http://localhost:8000/api' : 'https://aazhi-9gj2.onrender.com/api');

// 🔍 Debug
if (!VITE_API_URL) {
  console.log(`🌐 [adminApi] No VITE_API_URL set. Using ${isLocal ? 'local' : 'remote'} default:`, API_BASE);
} else {
  console.log("🌐 [adminApi] Connecting to specified URL:", API_BASE);
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
  // ── Smart Fetch ──
  checkUpdates: async (lastFetchedAt?: string) => {
    let url = '/admin/check-updates';
    if (lastFetchedAt) url += `?lastFetchedAt=${encodeURIComponent(lastFetchedAt)}`;
    const json = await request(url);
    return json.data;
  },

  // ── Auth ──
  login: async (credentials: any) => {
    const json = await request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return json.data;
  },

  // ── Dashboard ──
  getDashboard: async (department?: string) => {
    let url = '/admin/dashboard';
    if (department && department !== 'ALL') url += `?department=${encodeURIComponent(department)}`;
    const json = await request(url);
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

  // ── Complaint Analytics ──
  getComplaintAnalytics: async () => {
    const json = await request('/admin/analytics/complaints');
    return json.data;
  },

  // ── Duplicate Clusters ──
  getDuplicateClusters: async () => {
    const json = await request('/admin/duplicate-clusters');
    return json.data;
  },

  // ── Fraud Signals ──
  getFraudSignals: async () => {
    const json = await request('/admin/fraud-signals');
    return json.data;
  },

  // ── ML Innovation ──
  getMLComplaintClusters: async () => {
    const json = await request('/admin/ml/complaint-clusters');
    return json.data;
  },

  getMLForecast: async () => {
    const json = await request('/admin/ml/forecast');
    return json.data;
  },

  getMLSentimentPulse: async () => {
    const json = await request('/admin/ml/sentiment-pulse');
    return json.data;
  },

  getMLDiagnostics: async () => {
    const json = await request('/admin/ml/diagnostics');
    return json.data;
  },
};