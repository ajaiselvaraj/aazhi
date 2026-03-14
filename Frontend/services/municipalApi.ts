import { Complaint, Priority, Status, GeoCluster, Application, Certificate, Payment, EmergencyReport } from '../types/municipal';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const COMPLAINTS_KEY = 'aazhi_municipal_complaints';

// Simple Local Storage Utility for Offline Kiosks or Mock Server
export const MunicipalAPI = {
    // ---- 1. Civic Complaints Module ----

    async submitComplaint(data: Omit<Complaint, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Complaint> {
        await delay(800); // Simulate network

        const complaints = await this.getAllComplaints();
        const newComplaint: Complaint = {
            ...data,
            id: `CMP-${Date.now()}`,
            status: 'Submitted',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        complaints.push(newComplaint);
        localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));

        return newComplaint;
    },

    async getAllComplaints(): Promise<Complaint[]> {
        await delay(300); // Simulate network
        const data = localStorage.getItem(COMPLAINTS_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data) as Complaint[];
        } catch (e) {
            console.error("Failed to parsed stored complaints.", e);
            return [];
        }
    },

    async getComplaintsByStatus(status: Status): Promise<Complaint[]> {
        const complaints = await this.getAllComplaints();
        return complaints.filter(c => c.status === status);
    },

    async trackComplaint(id: string): Promise<Complaint | null> {
        await delay(500);
        const complaints = await this.getAllComplaints();
        return complaints.find(c => c.id === id) || null;
    },

    // ---- Admin Analytics / Suvidha Value Add ----

    // Simple clustering logic: group by first 4 characters of address (simulating neighborhoods)
    async getGeoClusters(): Promise<GeoCluster[]> {
        const complaints = await this.getAllComplaints();
        const clusters: Record<string, GeoCluster> = {};

        complaints.forEach((c) => {
            const area = c.location.address?.substring(0, 10) || 'Unknown Area'; // simplified neighborhood
            if (!clusters[area]) {
                clusters[area] = {
                    areaName: area,
                    centerCoordinates: c.location,
                    complaintCount: 0,
                    criticalCount: 0,
                    dominantCategory: '', // calculate properly in robust backend
                };
            }
            clusters[area].complaintCount++;
            if (c.priority === 'Critical') {
                clusters[area].criticalCount++;
            }
            // Simply use the category of the last seen (simplification)
            clusters[area].dominantCategory = c.category;
        });

        return Object.values(clusters).sort((a, b) => b.criticalCount - a.criticalCount);
    },

    // ---- 3. Documents & Certificates Mock ----

    async getCertificatesForUser(aadhaar: string): Promise<Certificate[]> {
        await delay(1000);
        return [
            {
                id: 'BR-2022-45A9',
                type: 'Birth Certificate',
                issuedTo: 'Test Subject',
                issueDate: '2022-01-15',
                qrCodeData: `https://verify.aazhi.gov.in/cert/BR-2022-45A9`,
                downloadUrl: '#',
                isVerified: true
            }
        ];
    }
};
