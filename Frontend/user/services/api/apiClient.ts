import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { callWithRetry } from '../../utils/apiRetry';
import { enqueue } from '../../utils/apiThrottle';

/**
 * Unified API Client for AAZHI using Axios
 * Handles base URL, auth tokens via interceptors, response parsing,
 * automatic retry, and request throttling.
 */

const getBaseUrl = () => {
  const envUrl = (import.meta as any).env.VITE_API_URL;
  const isProdSite = typeof window !== 'undefined' && 
                     window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

  // Trust the provided environment variable in all cases (allows LAN testing)
  // Fall back to local first, then production if needed, but here we just use envUrl.
  let url = envUrl || 'http://localhost:5000/api';

  // If accessing via LAN IP, rewrite localhost to that LAN IP so the mobile device
  // hits the PC's backend instead of its own localhost.
  if (url.includes('localhost') && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    url = url.replace('localhost', window.location.hostname);
  }
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

export const API_BASE_URL = getBaseUrl();

// ── Axios Instance Configuration ──────────────────────────────────────────
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
});

// ── Request Interceptor: Attach Token ─────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('aazhi_token');

    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.set('Authorization', `Bearer ${token}`);
      
      // Log only once per minute to avoid spamming the console
      if (!config.params?._silent) {
          console.log(`🔑 [apiClient] Token attached for ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    // No warning when token is absent — many routes are public or use optional auth

    // Add timestamp to prevent caching for GET requests
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle Errors & 401s ──────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    // The backend returns { data: ... } or the data directly
    return response.data.data ?? response.data;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const data: any = error.response?.data;
    const message = data?.message || error.message || 'Something went wrong';

    if (status === 401 || status === 403) {
      console.warn('🔓 [Auth] Server rejected session (401/403) — clearing session and redirecting.');
      
      const lang = localStorage.getItem('selectedLanguage');
      const appLang = localStorage.getItem('app_lang');

      localStorage.clear();
      sessionStorage.clear();

      if (lang) localStorage.setItem('selectedLanguage', lang);
      if (appLang) localStorage.setItem('app_lang', appLang);

      window.location.href = '/choose-language';
      return Promise.reject(error);
    }

    console.error(`❌ [API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}: ${message}`);

    return Promise.reject({
      message,
      status,
      data: data?.data || data
    });
  }
);

// ── Resilient request: throttled → retried → safe ─────────────────────────
async function request<T>(
  apiCall: () => Promise<T>,
  label: string
): Promise<T> {
  try {
    // Enqueue for concurrency control and wrap with retry logic
    return await enqueue(() =>
      callWithRetry(apiCall, { label })
    );
  } catch (error: any) {
    console.error(`[apiClient] Request failed after retries:`, error?.message || error);
    throw error;
  }
}

// ── Public surface ────────────────────────────────────────────────────────
export const apiClient = {
  get: <T>(endpoint: string, config?: any) =>
    request<T>(() => axiosInstance.get<any, T>(endpoint, config), `GET ${endpoint}`),

  post: <T>(endpoint: string, body?: any, config?: any) =>
    request<T>(() => axiosInstance.post<any, T>(endpoint, body, config), `POST ${endpoint}`),

  put: <T>(endpoint: string, body?: any, config?: any) =>
    request<T>(() => axiosInstance.put<any, T>(endpoint, body, config), `PUT ${endpoint}`),

  patch: <T>(endpoint: string, body?: any, config?: any) =>
    request<T>(() => axiosInstance.patch<any, T>(endpoint, body, config), `PATCH ${endpoint}`),

  delete: <T>(endpoint: string, config?: any) =>
    request<T>(() => axiosInstance.delete<any, T>(endpoint, config), `DELETE ${endpoint}`),
  
  // Expose the raw instance if needed for special cases
  instance: axiosInstance,

  // ── Subscription API (Status Updates) ──────────────────────────────────
  requestSubscription: <T>(body: { complaintId: string; contact: string; channel: 'sms' | 'whatsapp' | 'email' }) =>
    request<T>(() => axiosInstance.post<any, T>('/subscriptions/request', body), `POST /subscriptions/request`),

  verifySubscription: <T>(body: { complaintId: string; contact: string; channel: 'sms' | 'whatsapp' | 'email'; otp: string }) =>
    request<T>(() => axiosInstance.post<any, T>('/subscriptions/verify', body), `POST /subscriptions/verify`),
};

export default apiClient;

