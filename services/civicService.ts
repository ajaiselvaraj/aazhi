import { Bill, ServiceRequest, UserProfile, SupportContact, IssueCategory } from '../types';
import { MOCK_BILLS, MOCK_REQUESTS, AREA_SUPPORT_CONTACTS, MOCK_USER_PROFILE } from '../constants';

// --- PERSISTENCE LAYER (Simulated) ---
const LOCAL_STORAGE_KEYS = {
    BILLS: 'aazhi_data_bills',
    REQUESTS: 'aazhi_data_requests',
    USER: 'aazhi_data_user'
};

const getStoredData = <T>(key: string, defaultData: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultData;
    } catch (e) {
        return defaultData;
    }
};

const setStoredData = <T>(key: string, data: T) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- BILLING SERVICE ---
export const BillingService = {
    // Get all bills for a specific user (linked by Consumer ID)
    getBillsForUser: (user: UserProfile): Bill[] => {
        const allBills = getStoredData<Bill[]>(LOCAL_STORAGE_KEYS.BILLS, MOCK_BILLS);

        // Filter bills where ConsumerId matches any of the user's linked services
        const userConsumerIds = Object.values(user.consumerIds);
        return allBills.filter(bill => userConsumerIds.includes(bill.consumerId))
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    },

    getUnpaidBills: (user: UserProfile): Bill[] => {
        return BillingService.getBillsForUser(user).filter(b => b.status === 'Pending' || b.status === 'Overdue');
    },

    payBill: (billId: string) => {
        const allBills = getStoredData<Bill[]>(LOCAL_STORAGE_KEYS.BILLS, MOCK_BILLS);
        const updatedBills = allBills.map(b => {
            if (b.id === billId) {
                return { ...b, status: 'Paid', paymentDate: new Date().toISOString() } as Bill;
            }
            return b;
        });
        setStoredData(LOCAL_STORAGE_KEYS.BILLS, updatedBills);
        return true;
    }
};

// --- GRIEVANCE SERVICE ---
export const GrievanceService = {
    // Get requests raised by this specific user
    getUserRequests: (userId: string): ServiceRequest[] => {
        const allRequests = getStoredData<ServiceRequest[]>(LOCAL_STORAGE_KEYS.REQUESTS, MOCK_REQUESTS);
        return allRequests.filter(req => req.citizenId === userId || req.citizenName === MOCK_USER_PROFILE.name) // Fallback to name for mock
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },

    createRequest: (request: Omit<ServiceRequest, 'id' | 'timestamp' | 'status'>): ServiceRequest => {
        const allRequests = getStoredData<ServiceRequest[]>(LOCAL_STORAGE_KEYS.REQUESTS, MOCK_REQUESTS);

        const newRequest: ServiceRequest = {
            ...request,
            id: `AZ-${Math.floor(Math.random() * 10000)}`,
            timestamp: new Date().toLocaleString(),
            status: 'Pending',
            messages: []
        };

        const updatedRequests = [newRequest, ...allRequests];
        setStoredData(LOCAL_STORAGE_KEYS.REQUESTS, updatedRequests);
        return newRequest;
    },

    addMessageToRequest: (requestId: string, text: string, sender: 'Citizen' | 'Authority') => {
        const allRequests = getStoredData<ServiceRequest[]>(LOCAL_STORAGE_KEYS.REQUESTS, MOCK_REQUESTS);
        const updatedRequests = allRequests.map(req => {
            if (req.id === requestId) {
                const newMessage = {
                    id: `MSG-${Date.now()}`,
                    sender,
                    text,
                    timestamp: new Date().toISOString()
                };
                return { ...req, messages: [...(req.messages || []), newMessage] };
            }
            return req;
        });
        setStoredData(LOCAL_STORAGE_KEYS.REQUESTS, updatedRequests);
    }
};

// --- LOCALITY SERVICE ---
export const LocalityService = {
    getSupportContacts: (ward: string): SupportContact[] => {
        return AREA_SUPPORT_CONTACTS.filter(c => c.area === ward || c.area === 'Global');
    }
};
