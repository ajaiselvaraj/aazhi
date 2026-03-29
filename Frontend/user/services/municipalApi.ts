import { Complaint, Priority, Status, GeoCluster, Application, Certificate, Payment, EmergencyReport } from '../types/municipal';
import { apiClient } from './api/apiClient';

// Municipal API — Connected to Backend
export const MunicipalAPI = {
    // ---- 1. Civic Complaints Module ----

    async submitComplaint(data: any): Promise<Complaint> {
        return await apiClient.post<Complaint>('/complaints', data);
    },

    async getAllComplaints(): Promise<Complaint[]> {
        return await apiClient.get<Complaint[]>('/complaints');
    },

    async getComplaintsByStatus(status: string): Promise<Complaint[]> {
        const complaints = await this.getAllComplaints();
        return complaints.filter(c => c.status.toLowerCase() === status.toLowerCase());
    },

    async trackComplaint(id: string): Promise<Complaint | null> {
        // Most ticket numbers are ticket_number in backend
        return await apiClient.get<Complaint>(`/complaints/track/${id}`);
    },

    // ---- 2. Admin Analytics / Suvidha Value Add ----

    async getGeoClusters(): Promise<GeoCluster[]> {
        // Backend might have a specific endpoint for this now
        return await apiClient.get<GeoCluster[]>('/admin/analytics/geo-clusters');
    },

    // ---- 3. Documents & Certificates ----

    async getCertificatesForUser(): Promise<Certificate[]> {
        return await apiClient.get<Certificate[]>('/municipal/certificates');
    },

    async downloadCertificate(id: string) {
        return await apiClient.get(`/municipal/certificates/${id}/download`);
    }
};

