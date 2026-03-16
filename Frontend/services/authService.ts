import { apiClient } from './api/apiClient';

export interface User {
    id: string;
    name: string;
    mobile: string;
    role: string;
    aadhaar_masked?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export const authService = {
    login: async (mobile: string, password: string): Promise<AuthResponse> => {
        const data = await apiClient.post<AuthResponse>('/auth/login', { mobile, password });
        localStorage.setItem('aazhi_token', data.accessToken);
        localStorage.setItem('aazhi_user', JSON.stringify(data.user));
        return data;
    },

    firebaseLogin: async (firebaseToken: string): Promise<AuthResponse> => {
        const data = await apiClient.post<AuthResponse>('/auth/firebase-login', { firebaseToken });
        localStorage.setItem('aazhi_token', data.accessToken);
        localStorage.setItem('aazhi_user', JSON.stringify(data.user));
        return data;
    },

    register: async (userData: any): Promise<AuthResponse> => {
        const data = await apiClient.post<AuthResponse>('/auth/register', userData);
        localStorage.setItem('aazhi_token', data.accessToken);
        localStorage.setItem('aazhi_user', JSON.stringify(data.user));
        return data;
    },

    getProfile: async (): Promise<User> => {
        return await apiClient.get<User>('/auth/profile');
    },

    logout: async () => {
        try {
            await apiClient.post('/auth/logout');
        } finally {
            localStorage.removeItem('aazhi_token');
            localStorage.removeItem('aazhi_user');
            window.location.reload();
        }
    },

    getCurrentUser: (): User | null => {
        const user = localStorage.getItem('aazhi_user');
        return user ? JSON.parse(user) : null;
    }
};
