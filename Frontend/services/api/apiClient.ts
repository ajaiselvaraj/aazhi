/**
 * Unified API Client for AAZHI
 * Handles base URL, auth tokens, and response parsing
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class APIError extends Error {
    constructor(public message: string, public status: number, public data?: any) {
        super(message);
        this.name = 'APIError';
    }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('aazhi_token');
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle 401 Unauthorized (expired token)
    if (response.status === 401) {
        localStorage.removeItem('aazhi_token');
        localStorage.removeItem('aazhi_user');
        // Optional: Redirect to login or trigger a logout event
    }

    const result = await response.json();

    if (!response.ok) {
        throw new APIError(result.message || 'Something went wrong', response.status, result.data);
    }

    return result.data;
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestInit) => 
        request<T>(endpoint, { ...options, method: 'GET' }),
    
    post: <T>(endpoint: string, body?: any, options?: RequestInit) => 
        request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    
    put: <T>(endpoint: string, body?: any, options?: RequestInit) => 
        request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    
    patch: <T>(endpoint: string, body?: any, options?: RequestInit) => 
        request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    
    delete: <T>(endpoint: string, options?: RequestInit) => 
        request<T>(endpoint, { ...options, method: 'DELETE' }),
};
