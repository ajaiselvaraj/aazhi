/**
 * AAZHI Admin — API Service Layer
 * Connects admin dashboard panels to the real backend endpoints.
 * Mirrors the pattern used in Frontend/services/api/apiClient.ts
 */

const API_BASE_URL =
  (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api'

function getToken(): string | null {
  return localStorage.getItem('adminToken')
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.message || `API Error ${res.status}`)
  }
  return json.data ?? json
}

// ── Public API Surface ─────────────────────────────────────

export const adminApi = {
  // ── Dashboard Overview ──────────────────────────────────
  getDashboardStats: () =>
    request<any>('/admin/dashboard'),

  // ── Complaints ──────────────────────────────────────────
  getAllComplaints: (params?: { status?: string; department?: string; priority?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.department) q.set('department', params.department)
    if (params?.priority) q.set('priority', params.priority)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return request<any>(`/admin/complaints${qs ? '?' + qs : ''}`)
  },

  updateComplaintStatus: (id: string, status: string, notes?: string) =>
    request<any>(`/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    }),

  // ── Service Requests ────────────────────────────────────
  getAllServiceRequests: (params?: { status?: string; department?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.department) q.set('department', params.department)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return request<any>(`/admin/service-requests${qs ? '?' + qs : ''}`)
  },

  updateServiceRequestStatus: (id: string, status: string, notes?: string) =>
    request<any>(`/service-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    }),

  // ── Analytics ───────────────────────────────────────────
  getServiceRequestAnalytics: (period = 30) =>
    request<any>(`/admin/analytics/service-requests?period=${period}`),

  getPaymentStats: (period = 30) =>
    request<any>(`/admin/analytics/payments?period=${period}`),

  // ── Interaction Logs ────────────────────────────────────
  getInteractionLogs: (params?: { page?: number; limit?: number; module?: string }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.module) q.set('module', params.module)
    const qs = q.toString()
    return request<any>(`/admin/logs${qs ? '?' + qs : ''}`)
  },

  // ── Citizens ────────────────────────────────────────────
  getAllCitizens: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.search) q.set('search', params.search)
    const qs = q.toString()
    return request<any>(`/admin/citizens${qs ? '?' + qs : ''}`)
  },

  // ── Service Config ──────────────────────────────────────
  getServiceConfig: () =>
    request<any>('/admin/config'),

  updateServiceConfig: (serviceName: string, is_enabled: boolean, description?: string) =>
    request<any>(`/admin/config/${serviceName}`, {
      method: 'PUT',
      body: JSON.stringify({ is_enabled, description }),
    }),
}
