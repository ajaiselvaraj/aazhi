import { Bill, ServiceRequest, UserProfile, SupportContact } from '../types';
import { AREA_SUPPORT_CONTACTS } from '../constants';
import { apiClient } from './api/apiClient';

// --- BILLING SERVICE ---
export const BillingService = {
    // Get all bills for the authenticated user
    getBillsForUser: async (serviceType?: 'electricity' | 'gas' | 'water' | 'property'): Promise<Bill[]> => {
        const endpoint = serviceType ? `/${serviceType}/bills` : '/electricity/bills'; // Default to electricity for now
        return await apiClient.get<Bill[]>(endpoint);
    },

    getUnpaidBills: async (serviceType?: 'electricity' | 'gas' | 'water' | 'property'): Promise<Bill[]> => {
        const bills = await BillingService.getBillsForUser(serviceType);
        return bills.filter(b => b.status === 'Pending' || b.status === 'Overdue' || b.status === 'pending' || b.status === 'overdue');
    },

    payBill: async (billId: string, amount: number) => {
        // First create a razorpay order
        const order = await apiClient.post<any>('/payment/create-order', { bill_id: billId, amount });
        return order;
    },

    verifyPayment: async (paymentData: any) => {
        return await apiClient.post<any>('/payment/verify', paymentData);
    },

    getTransactionHistory: async (serviceType: string, consumerId: string): Promise<any[]> => {
        // We use the service-specific history endpoint
        // If consumerId is provided, we might need a specific query param or public endpoint
        return await apiClient.get<any[]>(`/${serviceType}/history?consumerId=${consumerId}`);
    }
};

// --- GRIEVANCE SERVICE ---
export const GrievanceService = {
    getUserRequests: async (): Promise<ServiceRequest[]> => {
        return await apiClient.get<ServiceRequest[]>('/service-requests');
    },

    getAllRequests: async (): Promise<ServiceRequest[]> => {
        // For admin/staff view if needed
        return await apiClient.get<ServiceRequest[]>('/service-requests');
    },

    getAllRequestsAdmin: async (): Promise<any[]> => {
        const response = await apiClient.get<any[]>('/service-requests/admin');
        return response;
    },

    createRequest: async (request: any): Promise<ServiceRequest> => {
        const lang = localStorage.getItem('app_lang') || 'en';
        const payload = { ...request, language: lang };
        return await apiClient.post<ServiceRequest>('/service-requests', payload);
    },

    getAllComplaintsAdmin: async (): Promise<any[]> => {
        const response = await apiClient.get<any[]>('/complaints/admin');
        return response;
    },

    createComplaint: async (complaint: any): Promise<any> => {
        const lang = localStorage.getItem('app_lang') || 'en';

        // Use the authenticated route only when a real JWT is present.
        // The debug route requires no auth and is safe for offline/kiosk users.
        const token = localStorage.getItem('aazhi_token');
        // A real JWT must have 3 segments and be substantial in length
        const hasRealJwt = !!(token && token.split('.').length === 3 && token.length > 50);
        const endpoint = hasRealJwt ? '/complaints' : '/complaints/debug';

        // For the debug route, attach stored user info so the complaint is attributed correctly
        let extraFields: Record<string, any> = {};
        if (!hasRealJwt) {
            const userRaw = localStorage.getItem('aazhi_user');
            const user = userRaw ? JSON.parse(userRaw) : null;
            if (user) {
                extraFields.citizen_id = user.id;
                extraFields.name = complaint.name || user.name;
                extraFields.phone = complaint.phone || user.mobile;
            }
        }

        const payload = { ...complaint, ...extraFields, language: lang };
        return await apiClient.post<any>(endpoint, payload);
    },

    updateComplaintStatusAdmin: async (id: string, payload: any): Promise<any> => {
        return await apiClient.put<any>(`/complaints/${id}/status`, payload);
    },

    updateRequestStatusAdmin: async (id: string, payload: any): Promise<any> => {
        return await apiClient.put<any>(`/service-requests/${id}/status`, payload);
    },

    trackRequest: async (ticketNumber: string): Promise<ServiceRequest> => {
        return await apiClient.get<ServiceRequest>(`/service-requests/track/${ticketNumber}`);
    },

    trackComplaint: async (ticketNumber: string): Promise<any> => {
        return await apiClient.get<any>(`/complaints/track/${ticketNumber}`);
    },

    addMessageToRequest: async (requestId: string, text: string) => {
        // This endpoint might need to be added to backend or matched with existing
        return await apiClient.post(`/service-requests/${requestId}/messages`, { text });
    }
};

// --- LOCALITY SERVICE ---
export const LocalityService = {
    getSupportContacts: (ward: string): SupportContact[] => {
        return AREA_SUPPORT_CONTACTS.filter(c => c.area === ward || c.area === 'Global');
    }
};

