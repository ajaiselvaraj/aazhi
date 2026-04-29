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

  // If we are on production but the env var points to localhost (often due to committed .env),
  // fallback to the production API URL.
  if (isProdSite && envUrl?.includes('localhost')) {
    console.info('🌐 [apiClient] Production environment detected with localhost API URL — falling back to Render API.');
    return 'https://aazhi-9gj2.onrender.com/api';
  }

  let url = envUrl || 'https://aazhi-9gj2.onrender.com/api';
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

const API_BASE_URL = getBaseUrl();

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

    if (status === 401) {
      // Only clear the session if a real token was sent with this request
      // AND the server actively rejected it.
      const sentHeader = error.config?.headers?.['Authorization'] as string | undefined;
      const hadRealToken = !!(sentHeader && sentHeader.startsWith('Bearer '));

      if (hadRealToken) {
        // Double check if the token is still in localStorage (it might have been cleared already)
        const currentToken = localStorage.getItem('aazhi_token');
        if (currentToken && sentHeader.includes(currentToken)) {
          console.warn('🔓 [Auth] Server rejected the current token — clearing session.');
          localStorage.removeItem('aazhi_token');
          localStorage.removeItem('aazhi_user');
        }
      } else {
        // No token was sent — this is an unauthenticated request hitting a protected route.
        console.info(`ℹ️ [Auth] 401 on unauthenticated request to ${error.config?.url}.`);
      }
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
  instance: axiosInstance
};

export default apiClient;

