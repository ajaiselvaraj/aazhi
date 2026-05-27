/**
 * AAZHI — Civic Alert Management API Client (ADD-ON)
 * Mirrors the pattern of adminApi.ts — uses the same `request` helper pattern.
 * Connects to: /api/admin/alerts  (protected)  and  /api/alerts/active (public)
 */

const VITE_API_URL = import.meta.env.VITE_API_URL as string;
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = VITE_API_URL || (isLocal ? 'http://localhost:5000/api' : 'https://aazhi-9gj2.onrender.com/api');

// ── Reuse the same request helper pattern as adminApi.ts ─────────────────────
async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('adminToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
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
  const res = await fetch(fullUrl, {
    cache: 'no-store',
    ...options,
    headers,
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    throw new Error(`Invalid JSON response (${res.status})`);
  }

  if (res.status === 401) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('aazhi_admin_session');
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }

  return json;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CivicAlert {
  id: number;
  title: string;
  message: string;
  type: 'Power' | 'Water' | 'Road' | 'Weather' | 'Civic';
  severity: 'Critical' | 'Warning' | 'Info';
  priority: number;
  is_active: boolean;
  ward: string;
  created_by: number | null;
  created_at: string;
  expires_at: string | null;
}

export interface CreateAlertPayload {
  title: string;
  message: string;
  type?: CivicAlert['type'];
  severity?: CivicAlert['severity'];
  priority?: number;
  ward?: string;
  expires_at?: string | null;
}

export interface UpdateAlertPayload extends Partial<CreateAlertPayload> {
  is_active?: boolean;
}

// ── API Methods ───────────────────────────────────────────────────────────────

export const alertApi = {
  /** GET /api/admin/alerts — admin view (all, including inactive) */
  getAll: async (): Promise<CivicAlert[]> => {
    const json = await request('/admin/alerts');
    return json.data ?? [];
  },

  /** POST /api/admin/alerts */
  create: async (payload: CreateAlertPayload): Promise<CivicAlert> => {
    const json = await request('/admin/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return json.data;
  },

  /** PUT /api/admin/alerts/:id */
  update: async (id: number, payload: UpdateAlertPayload): Promise<CivicAlert> => {
    const json = await request(`/admin/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return json.data;
  },

  /** DELETE /api/admin/alerts/:id */
  delete: async (id: number): Promise<void> => {
    await request(`/admin/alerts/${id}`, { method: 'DELETE' });
  },

  /** Toggle is_active without touching other fields */
  toggleActive: async (id: number, is_active: boolean): Promise<CivicAlert> => {
    return alertApi.update(id, { is_active });
  },
};
