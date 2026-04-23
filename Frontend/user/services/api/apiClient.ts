/**
 * Unified API Client for AAZHI
 * Handles base URL, auth tokens, response parsing,
 * automatic retry on 429, request throttling, and API usage logging.
 */

import { callWithRetry, RateLimitError } from '../../utils/apiRetry';
import { enqueue } from '../../utils/apiThrottle';

const getBaseUrl = () => {
  let url = ((import.meta as any).env.VITE_API_URL || 'https://aazhi-9gj2.onrender.com/api');
  // Remove trailing slash if present to ensure clean concatenation
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

const API_BASE_URL = getBaseUrl();

if (!(import.meta as any).env.VITE_API_URL) {
  console.warn("⚠️ [apiClient] VITE_API_URL is missing! Falling back to Render URL.");
} else {
  console.log("🌐 [apiClient] Connecting to:", API_BASE_URL);
}

// ── Error Class ───────────────────────────────────────────────────────────
export class APIError extends Error {
  constructor(
    public message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// ── Fallback message shown when all retries are exhausted ─────────────────
const FALLBACK_MESSAGE = 'Service temporarily busy. Please try again.';

// ── Core request function (single attempt) ────────────────────────────────
async function singleRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('aazhi_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    cache: 'no-store'
  };

  // Ensure endpoint starts with a slash
  const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${safeEndpoint}`;
  console.log(`📤 [API request start] ${config.method} ${fullUrl}`);

  const response = await fetch(fullUrl, config);

  // Handle 401 Unauthorized (expired token)
  if (response.status === 401) {
    localStorage.removeItem('aazhi_token');
    localStorage.removeItem('aazhi_user');
  }

  // Handle 429 Too Many Requests — throw typed error so retry logic catches it
  if (response.status === 429) {
    const retryAfter = parseInt(
      response.headers.get('Retry-After') || '0',
      10
    );
    throw new RateLimitError(
      'Rate limit exceeded. Too many requests.',
      retryAfter || undefined
    );
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`❌ [API error] ${config.method} ${fullUrl}: ${result.message || response.statusText}`);
    throw new APIError(
      result.message || 'Something went wrong',
      response.status,
      result.data
    );
  }

  console.log(`✅ [API success] ${config.method} ${fullUrl}`);
  return result.data || result;
}

// ── Resilient request: throttled → retried → safe ─────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // 1. Enqueue for concurrency control (throttle)
    // 2. Each attempt is individually retried with exponential backoff
    return await enqueue(() =>
      callWithRetry(() => singleRequest<T>(endpoint, options), {
        label: `${options.method || 'GET'} ${endpoint}`,
      })
    );
  } catch (error: any) {
    // ── NEVER CRASH — catch anything the retry chain didn't absorb ───────
    console.error(
      `[apiClient] Request failed but system continues running:`,
      error?.message || error
    );

    // Return a structured error the UI can present
    throw new APIError(
      error?.message || FALLBACK_MESSAGE,
      error?.status || 0,
      { fallback: true }
    );
  }
}

// ── Public surface ────────────────────────────────────────────────────────
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
