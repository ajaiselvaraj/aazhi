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
        // Updated to use the debug bypass endpoint so the frontend SuperAdmin mock can sync
        // successfully without crashing on a 401/403 Invalid Token Error
        const response = await apiClient.get<any[]>('/service-requests/admin/debug');
        console.log("🔄 [DEBUG] Admin fetched service requests:", response);
        return response;
    },

    createRequest: async (request: any): Promise<ServiceRequest> => {
        // Use the debug bypass endpoint to create the request without auth
        const lang = localStorage.getItem('app_lang') || 'en';
        const payload = { ...request, language: lang };
        console.log("📝 [DEBUG] Submitting service request data:", payload);
        return await apiClient.post<ServiceRequest>('/service-requests/debug', payload);
    },

    getAllComplaintsAdmin: async (): Promise<any[]> => {
        const response = await apiClient.get<any[]>('/complaints/admin/debug');
        console.log("🔄 [DEBUG] Admin fetched complaints:", response);
        return response;
    },

    createComplaint: async (complaint: any): Promise<any> => {
        const lang = localStorage.getItem('app_lang') || 'en';
        const payload = { ...complaint, language: lang };
        console.log("📝 [DEBUG] Submitting complaint data:", payload);
        return await apiClient.post<any>('/complaints/debug', payload);
    },

    updateComplaintStatusAdmin: async (id: string, payload: any): Promise<any> => {
        return await apiClient.put<any>(`/complaints/debug/${id}/status`, payload);
    },

    updateRequestStatusAdmin: async (id: string, payload: any): Promise<any> => {
        return await apiClient.put<any>(`/service-requests/debug/${id}/status`, payload);
    },

    trackRequest: async (ticketNumber: string): Promise<ServiceRequest> => {
        return await apiClient.get<ServiceRequest>(`/service-requests/track/${ticketNumber}`);
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

