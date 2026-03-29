export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Status = 'Submitted' | 'In Progress' | 'Action Taken' | 'Completed' | 'Rejected';

// 1. Civic Complaint & Infrastructure Model
export interface Complaint {
    id: string;
    category: string; // e.g., 'Garbage', 'Pothole', 'Drainage', 'Noise'
    description: string;
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    priority: Priority;
    photoUrl?: string; // Base64 or URL
    status: Status;
    citizenAadhaar?: string;
    createdAt: string;
    updatedAt: string;
}

// 2. Building, Property & Business Service Application Model
export interface Application {
    id: string;
    type: string; // e.g., 'Building Plan', 'Trade License', 'Vendor License'
    applicantName: string;
    applicantAadhaar: string;
    documents: string[]; // URLs or document IDs
    status: Status;
    submissionDate: string;
    estimatedCompletionDate?: string;
    remarks?: string;
}

// 3. Certificate & Document Model
export interface Certificate {
    id: string; // Certificate Number
    type: string; // e.g., 'Birth', 'Death', 'Marriage'
    issuedTo: string;
    issueDate: string;
    qrCodeData: string; // Data string for QR generation
    downloadUrl: string; // Link to PDF
    isVerified: boolean;
}

// 4. Tax & Payment Model
export interface Payment {
    transactionId: string;
    payerId: string; // Aadhaar or Property ID
    amount: number;
    type: string; // e.g., 'Property Tax', 'Water Tax', 'Parking Fine'
    date: string;
    status: 'Pending' | 'Success' | 'Failed';
    receiptUrl?: string;
}

// 5. Disaster & Emergency Report Model
export interface EmergencyReport {
    id: string;
    type: string; // e.g., 'Flood', 'Fire', 'Medical'
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    reporterPhone: string;
    casualties?: number;
    status: 'Reported' | 'Dispatched' | 'Resolved';
    timestamp: string;
}

// Geo-clustering helper interface (Admin Dashboard)
export interface GeoCluster {
    areaName: string;
    centerCoordinates: { lat: number; lng: number };
    complaintCount: number;
    criticalCount: number;
    dominantCategory: string;
}
