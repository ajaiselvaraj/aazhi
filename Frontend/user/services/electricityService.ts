/**
 * Electricity Service API — Frontend Service Layer
 * Calls the main backend via API gateway for electricity-specific operations
 * Uses shared /service-requests and /complaints endpoints with department='Electricity'
 */

import { apiClient } from './api/apiClient';

// ── Types ────────────────────────────────────────────────────────────

export interface ElectricityConnectionRequest {
  connection_type: 'New Connection' | 'Load Extension' | 'Load Reduction' | 'Temporary Connection' | 'Name Transfer' | 'Category Change';
  phase_type: 'Single Phase' | 'Three Phase';
  premises_type: 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';
  name: string;
  mobile: string;
  address: string;
  pincode: string;
  load_required: string;
  description: string;
  ward?: string;
  documents?: string[];
}

export interface ElectricityMeterRequest {
  service_type: 'Meter Replacement' | 'Meter Shifting' | 'Meter Testing' | 'Smart Meter Upgrade';
  reason: string;
  priority: 'normal' | 'urgent';
  name: string;
  mobile: string;
  consumer_number: string;
  address: string;
  description: string;
  ward?: string;
  documents?: string[];
}

export interface ElectricityComplaintRequest {
  category: string;
  subject: string;
  description: string;
  consumer_number?: string;
  ward?: string;
  phone?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ElectricityProfileUpdate {
  name?: string;
  mobile?: string;
  email?: string;
  address?: string;
  consumer_number?: string;
}

// ── Electricity Service API ──────────────────────────────────────────

export const ElectricityService = {
  /**
   * Submit new electricity connection or modification request
   */
  submitConnectionRequest: async (data: ElectricityConnectionRequest): Promise<any> => {
    return await apiClient.post('/service-requests/debug', {
      request_type: data.connection_type,
      department: 'Electricity',
      citizen_name: data.name,
      description: data.description,
      ward: data.ward || '',
      phone: data.mobile,
      metadata: {
        phase_type: data.phase_type,
        premises_type: data.premises_type,
        load_required: data.load_required,
        address: data.address,
        pincode: data.pincode,
        documents: data.documents || []
      }
    });
  },

  /**
   * Submit meter service request (replacement, shifting, testing)
   */
  submitMeterRequest: async (data: ElectricityMeterRequest): Promise<any> => {
    return await apiClient.post('/service-requests/debug', {
      request_type: data.service_type,
      department: 'Electricity',
      citizen_name: data.name,
      description: data.description,
      ward: data.ward || '',
      phone: data.mobile,
      metadata: {
        reason: data.reason,
        priority: data.priority,
        consumer_number: data.consumer_number,
        address: data.address,
        documents: data.documents || []
      }
    });
  },

  /**
   * Submit an electricity-specific complaint
   */
  submitComplaint: async (data: ElectricityComplaintRequest): Promise<any> => {
    return await apiClient.post('/complaints/debug', {
      category: data.category,
      department: 'Electricity',
      subject: data.subject,
      description: data.description,
      ward: data.ward || '',
      phone: data.phone || '',
      priority: data.priority || 'medium',
      metadata: {
        consumer_number: data.consumer_number || ''
      }
    });
  },

  /**
   * Update consumer profile (uses auth-service)
   */
  updateProfile: async (updates: ElectricityProfileUpdate): Promise<any> => {
    return await apiClient.put('/users/profile', updates);
  },

  /**
   * Get consumer profile
   */
  getProfile: async (): Promise<any> => {
    return await apiClient.get('/auth/profile');
  }
};
