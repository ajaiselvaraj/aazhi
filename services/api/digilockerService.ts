import { DigiLockerAuthResponse, DigiLockerDoc } from '../../types/digilocker';

// MOCK CONSTANTS
const MOCK_MODE = true;
const MOCK_DOCS: DigiLockerDoc[] = [
    { id: 'DL-AADHAAR-001', docType: 'Aadhaar Card', issuer: 'UIDAI', date: '2024-01-15', verified: true, referenceId: 'REF-88229' },
    { id: 'DL-PAN-002', docType: 'PAN Card', issuer: 'Income Tax Dept', date: '2023-11-20', verified: true, referenceId: 'REF-99110' },
    { id: 'DL-DL-003', docType: 'Driving License', issuer: 'MoRTH', date: '2024-03-10', verified: true, referenceId: 'REF-77221' }
];

// Backend API Simulation (Phase 3)
export const initiateDigiLockerAuth = async (serviceType: string, userId: string): Promise<DigiLockerAuthResponse> => {
    if (MOCK_MODE) {
        // Mock Response
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    requestId: 'DLK-' + Math.floor(Math.random() * 900000),
                    authUrl: '/mock-digilocker-auth' // This would be handled by the frontend router or modal
                });
            }, 800);
        });
    } else {
        // Real Backend Call
        const response = await fetch('/api/digilocker/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceType, userId })
        });
        return response.json();
    }
};

// Backend Document Fetch (Phase 5)
export const fetchDigiLockerDocuments = async (requestId: string): Promise<DigiLockerDoc[]> => {
    if (MOCK_MODE) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_DOCS);
            }, 1500);
        });
    } else {
        const response = await fetch('/api/digilocker/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
        });
        return response.json();
    }
};
