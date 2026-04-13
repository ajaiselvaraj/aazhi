/**
 * Gas Service API — Frontend Service Layer
 * Calls the gas-service microservice via API gateway
 * Endpoints: /gas/book, /gas/bills, /gas/status, /gas/account
 */

import { apiClient } from './api/apiClient';

// ── Types ────────────────────────────────────────────────────────────
export interface GasAccount {
  id: string;
  citizen_id: string;
  service_type: 'gas';
  account_number: string;
  meter_number: string | null;
  connection_date: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'disconnected';
  metadata: Record<string, any>;
  name: string;
  mobile: string;
  aadhaar_masked: string;
  ward: string;
  created_at: string;
  updated_at: string;
}

export interface GasBill {
  id: string;
  account_id: string;
  citizen_id: string;
  service_type: 'gas';
  bill_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  units_consumed: number | null;
  reading_current: number | null;
  reading_previous: number | null;
  billing_month: string;
  billing_year: string;
  billing_cycle: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'waived';
  paid_at: string | null;
  account_number: string;
  created_at: string;
}

export interface GasServiceRequest {
  id: string;
  ticket_number: string;
  citizen_id: string;
  citizen_name: string;
  request_type: string;
  department: 'Gas';
  description: string;
  ward: string | null;
  phone: string | null;
  status: string;
  current_stage: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GasPaymentRecord {
  id: string;
  bill_id: string;
  citizen_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';
  receipt_number: string;
  bill_number: string;
  bill_amount: number;
  billing_month: string;
  billing_year: string;
  paid_at: string;
  created_at: string;
}

export interface CylinderBookingRequest {
  description?: string;
  ward?: string;
  phone?: string;
}

export interface GasConnectionRequest {
  request_type: 'New Connection' | 'Meter Installation' | 'Reconnection' | 'Disconnection' | 'Postpaid to Prepaid' | 'Pipeline Inspection' | 'Maintenance';
  name: string;
  mobile: string;
  address: string;
  description: string;
  ward?: string;
  documents?: string[];
}

export interface GasComplaintRequest {
  category: string;
  subject: string;
  description: string;
  ward?: string;
  phone?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// ── Gas Service API ──────────────────────────────────────────────────

export const GasService = {
  /**
   * Get gas account details for the authenticated user
   */
  getAccount: async (): Promise<GasAccount> => {
    return await apiClient.get<GasAccount>('/gas/account');
  },

  /**
   * View gas bills with optional status filter and pagination
   */
  getBills: async (status?: string, page = 1, limit = 10): Promise<{ data: GasBill[]; total: number }> => {
    let endpoint = `/gas/bills?page=${page}&limit=${limit}`;
    if (status) {
      endpoint += `&status=${status}`;
    }
    return await apiClient.get<{ data: GasBill[]; total: number }>(endpoint);
  },

  /**
   * Get unpaid gas bills
   */
  getUnpaidBills: async (): Promise<GasBill[]> => {
    const result = await GasService.getBills('pending');
    return Array.isArray(result) ? result : (result.data || []);
  },

  /**
   * Get unauthenticated quick pay bill using consumer id
   */
  getQuickPayBill: async (consumerId: string): Promise<GasBill> => {
    return await apiClient.get<GasBill>(`/gas/quick-pay/${consumerId}`);
  },

  /**
   * Book a cylinder (existing endpoint)
   */
  bookCylinder: async (data: CylinderBookingRequest): Promise<GasServiceRequest> => {
    return await apiClient.post<GasServiceRequest>('/gas/book', data);
  },

  /**
   * Get gas payment status / history
   */
  getPaymentStatus: async (): Promise<GasPaymentRecord[]> => {
    return await apiClient.get<GasPaymentRecord[]>('/gas/status');
  },

  /**
   * Submit new gas connection or service change request
   * Uses the shared service-requests endpoint via main backend
   */
  submitConnectionRequest: async (data: GasConnectionRequest): Promise<any> => {
    return await apiClient.post('/service-requests/debug', {
      request_type: data.request_type,
      department: 'Gas',
      citizen_name: data.name,
      description: data.description,
      ward: data.ward || '',
      phone: data.mobile,
      metadata: {
        address: data.address,
        documents: data.documents || []
      }
    });
  },

  /**
   * Submit a gas complaint
   * Uses the shared complaints endpoint via main backend
   */
  submitComplaint: async (data: GasComplaintRequest): Promise<any> => {
    return await apiClient.post('/complaints/debug', {
      category: data.category,
      department: 'Gas',
      subject: data.subject,
      description: data.description,
      ward: data.ward || '',
      phone: data.phone || '',
      priority: data.priority || 'medium'
    });
  },

  /**
   * Update consumer profile (uses auth-service)
   */
  updateProfile: async (updates: { mobile?: string; name?: string; address?: string }): Promise<any> => {
    return await apiClient.put('/users/profile', updates);
  }
};
