import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MOCK_REQUESTS, MOCK_USER_PROFILE } from '../constants';
import { TrackingStage, Kiosk } from '../types';

// --- TYPE DEFINITIONS (As requested) ---

export interface ServiceRequest {
    id: string;
    name: string;
    phone: string;
    category: string;
    serviceType: string;
    address: string;
    description: string;
    status: "Submitted" | "Under Review" | "Verification" | "Approval Pending" | "Completed" | "Rejected";
    currentStage: string;
    stages: TrackingStage[];
    createdAt: string;
}

export interface Complaint {
    id: string;
    name: string;
    phone: string;
    category: string;
    complaintType: string;
    location: string;
    description: string;
    priority: "Critical" | "High" | "Medium" | "Low";
    status: "Pending" | "In Progress" | "Resolved" | "Closed";
    area: string; // Added as per requirement
    areaAlert?: boolean; // Flag for impact detection
    currentStage: string;
    stages: TrackingStage[];
    createdAt: string;
}

export interface AreaAlert {
    area: string;
    category: string;
    complaintType: string;
    count: number;
    level: "High" | "Critical";
    createdAt: string;
}

interface ServiceComplaintContextType {
    serviceRequests: ServiceRequest[];
    complaints: Complaint[];
    areaAlerts: AreaAlert[];
    addServiceRequest: (data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'currentStage' | 'stages'>) => void;
    addComplaint: (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'priority' | 'areaAlert' | 'currentStage' | 'stages'>) => string;
    updateServiceStatus: (id: string, status: ServiceRequest['status']) => void;
    updateServiceStage: (id: string, stage: string) => void;
    updateComplaintStatus: (id: string, status: Complaint['status']) => void;
    updateComplaintStage: (id: string, stage: string) => void;
    getComplaintsByCategory: (category: string) => Complaint[];
    kiosks: Kiosk[];
    addKiosk: (kiosk: Kiosk) => void;
}

const ServiceComplaintContext = createContext<ServiceComplaintContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
    SERVICES: "aazhi_services",
    COMPLAINTS: "aazhi_complaints",
    ALERTS: "aazhi_area_alerts",
    KIOSKS: "aazhi_kiosks"
};

const SEED_KIOSKS: Kiosk[] = [
    { id: 'K-001', location: 'Central Bus Stand', status: 'Online', battery: 85, network: 'Good', userLoad: 'High', lastActive: new Date().toISOString(), todayUsers: 142, complaintsToday: 12 },
    { id: 'K-002', location: 'Gandhi Market', status: 'Online', battery: 45, network: 'Weak', userLoad: 'Medium', lastActive: new Date().toISOString(), todayUsers: 89, complaintsToday: 5 },
    { id: 'K-003', location: 'Railway Station', status: 'Offline', battery: 12, network: 'Disconnected', userLoad: 'Low', lastActive: new Date(Date.now() - 3600000).toISOString(), todayUsers: 34, complaintsToday: 2 }
];

// Priority Logic Helper
const getPriority = (category: string, complaintType: string): "Critical" | "High" | "Medium" | "Low" => {
    const cat = category.toLowerCase();
    const type = complaintType.toLowerCase();

    // Gas Category
    if (cat.includes('gas')) {
        if (type.includes('leak')) return "Critical";
        if (type.includes('no gas') || type.includes('supply')) return "High";
        return "Medium"; // Refill Delay / Other
    }

    // Electricity Category
    if (cat.includes('electricity') || cat.includes('eb')) {
        if (type.includes('spark') || type.includes('fire') || type.includes('hazard')) return "Critical";
        if (type.includes('fail') || type.includes('outage') || type.includes('cut') || type.includes('power')) return "High";
        if (type.includes('meter')) return "Medium";
        return "Low"; // Billing / Other
    }

    // Water Category
    if (cat.includes('water')) {
        if (type.includes('burst') || type.includes('leak') || type.includes('sewage') || type.includes('block')) return "High";
        if (type.includes('no water')) return "Medium";
        return "Low"; // Low Pressure / Other
    }

    // Municipal / Waste Category
    if (cat.includes('municipal') || cat.includes('waste')) {
        if (type.includes('garbage') || type.includes('light')) return "Medium";
        return "Low";
    }

    return "Low";
};

// Seed Data
const SEED_REQUESTS: ServiceRequest[] = MOCK_REQUESTS.map(req => {
    let currentStage = "Submitted";
    if (req.status === 'Resolved' || req.status === 'Completed') currentStage = "Completed";
    if (req.status === 'In Progress') currentStage = "Under Review";

    return {
        id: req.id,
        name: req.citizenName,
        phone: MOCK_USER_PROFILE.mobile,
        category: req.department,
        serviceType: req.type,
        address: `Ward ${req.ward}`,
        description: req.details,
        status: (req.status === 'Resolved' ? 'Completed' : req.status === 'In Progress' ? 'Under Review' : 'Submitted') as any,
        currentStage: currentStage,
        stages: [
            { stage: "Submitted", status: "Completed", updatedAt: new Date(req.timestamp).toISOString() },
            { stage: currentStage, status: "Current", updatedAt: new Date().toISOString() }
        ],
        createdAt: new Date(req.timestamp).toISOString()
    };
});

const SEED_COMPLAINTS: Complaint[] = [
    {
        id: 'CMP-2024-001',
        name: 'Rajesh Kumar',
        phone: '9876543210',
        category: 'Electricity',
        complaintType: 'Power Cut',
        description: 'Frequent power cuts in the evening.',
        location: 'Gandhipuram, Ward 5',
        area: 'Ward 5',
        priority: 'High',
        status: 'Pending',
        currentStage: 'Submitted',
        stages: [
            { stage: 'Submitted', status: 'Current', updatedAt: new Date(Date.now() - 86400000).toISOString() }
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'CMP-2024-002',
        name: 'Priya S',
        phone: '9876543211',
        category: 'Water',
        complaintType: 'Leakage',
        description: 'Main pipe leaking near the park.',
        location: 'RS Puram',
        area: 'RS Puram',
        priority: 'High',
        status: 'In Progress',
        currentStage: 'Manager Review',
        stages: [
            { stage: 'Submitted', status: 'Completed', updatedAt: new Date(Date.now() - 172800000).toISOString() },
            { stage: 'Officer Assigned', status: 'Completed', updatedAt: new Date(Date.now() - 86400000).toISOString() },
            { stage: 'Manager Review', status: 'Current', updatedAt: new Date().toISOString() }
        ],
        createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
        id: 'CMP-2024-003',
        name: 'Suresh M',
        phone: '9876543212',
        category: 'Gas',
        complaintType: 'Gas Leak (Urgent)',
        description: 'Smell of gas in kitchen area.',
        location: 'Ward 10',
        area: 'Ward 10',
        priority: 'Critical',
        status: 'Pending',
        currentStage: 'Officer Assigned',
        stages: [
            { stage: 'Submitted', status: 'Completed', updatedAt: new Date(Date.now() - 3600000).toISOString() },
            { stage: 'Officer Assigned', status: 'Current', updatedAt: new Date().toISOString() }
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString()
    }
];

export const ServiceComplaintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [areaAlerts, setAreaAlerts] = useState<AreaAlert[]>([]);
    const [kiosks, setKiosks] = useState<Kiosk[]>([]);

    // 1. Load data from LocalStorage on mount
    useEffect(() => {
        const loadDatFromStorage = () => {
            try {
                const services = localStorage.getItem(LOCAL_STORAGE_KEYS.SERVICES);
                const complaintsData = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLAINTS);
                const alertsData = localStorage.getItem(LOCAL_STORAGE_KEYS.ALERTS);

                if (services) {
                    setServiceRequests(JSON.parse(services));
                } else {
                    setServiceRequests(SEED_REQUESTS);
                    localStorage.setItem(LOCAL_STORAGE_KEYS.SERVICES, JSON.stringify(SEED_REQUESTS));
                }

                if (complaintsData) {
                    setComplaints(JSON.parse(complaintsData));
                } else {
                    setComplaints(SEED_COMPLAINTS);
                    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPLAINTS, JSON.stringify(SEED_COMPLAINTS));
                }

                if (alertsData) {
                    setAreaAlerts(JSON.parse(alertsData));
                }

                const kiosksData = localStorage.getItem(LOCAL_STORAGE_KEYS.KIOSKS);
                if (kiosksData) {
                    setKiosks(JSON.parse(kiosksData));
                } else {
                    setKiosks(SEED_KIOSKS);
                    localStorage.setItem(LOCAL_STORAGE_KEYS.KIOSKS, JSON.stringify(SEED_KIOSKS));
                }
            } catch (error) {
                console.error("Failed to load data from localStorage", error);
            }
        };

        loadDatFromStorage();

        // 2. Real-time Sync across tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === LOCAL_STORAGE_KEYS.SERVICES || e.key === LOCAL_STORAGE_KEYS.COMPLAINTS || e.key === LOCAL_STORAGE_KEYS.ALERTS || e.key === LOCAL_STORAGE_KEYS.KIOSKS) {
                // Read directly from storage to update state
                const services = localStorage.getItem(LOCAL_STORAGE_KEYS.SERVICES);
                const complaintsData = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLAINTS);
                const alertsData = localStorage.getItem(LOCAL_STORAGE_KEYS.ALERTS);
                const kiosksData = localStorage.getItem(LOCAL_STORAGE_KEYS.KIOSKS);

                if (services) setServiceRequests(JSON.parse(services));
                if (complaintsData) setComplaints(JSON.parse(complaintsData));
                if (alertsData) setAreaAlerts(JSON.parse(alertsData));
                if (kiosksData) setKiosks(JSON.parse(kiosksData));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Helper to persist data
    const persistData = (key: string, data: any) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save data to localStorage", error);
        }
    };

    const addKiosk = (kiosk: Kiosk) => {
        const updatedKiosks = [...kiosks, kiosk];
        setKiosks(updatedKiosks);
        persistData(LOCAL_STORAGE_KEYS.KIOSKS, updatedKiosks);
    };

    const addServiceRequest = (data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'currentStage' | 'stages'>) => {
        const newRequest: ServiceRequest = {
            ...data,
            id: `SR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            status: "Submitted",
            currentStage: "Submitted",
            stages: [
                { stage: "Submitted", status: "Current", updatedAt: new Date().toISOString() }
            ],
            createdAt: new Date().toISOString()
        };

        const updatedRequests = [newRequest, ...serviceRequests];
        setServiceRequests(updatedRequests);
        persistData(LOCAL_STORAGE_KEYS.SERVICES, updatedRequests);
    };

    const addComplaint = (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'priority' | 'areaAlert' | 'currentStage' | 'stages'>): string => {
        let priority = getPriority(data.category, data.complaintType);
        let isAreaAlert = false;

        // --- IMPACT DETECTION LOGIC ---
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        // Find similar complaints in last 24h
        const recentSimilarComplaints = complaints.filter(c =>
            c.category === data.category &&
            c.complaintType === data.complaintType &&
            c.area === data.area &&
            (now - new Date(c.createdAt).getTime()) < ONE_DAY_MS
        );

        const count = recentSimilarComplaints.length + 1; // Including this new one

        // Escalation Rules
        if (count >= 5) {
            priority = "Critical";
            isAreaAlert = true;
        } else if (count >= 3) {
            if (priority !== "Critical") {
                priority = "High";
            }
            isAreaAlert = true;
        }

        // Generate Area Alert if needed
        if (isAreaAlert) {
            const newAlert: AreaAlert = {
                area: data.area,
                category: data.category,
                complaintType: data.complaintType,
                count: count,
                level: count >= 5 ? "Critical" : "High",
                createdAt: new Date().toISOString()
            };

            // Check if alert already exists for this area/type to update it instead of duplicate
            const existingAlertIndex = areaAlerts.findIndex(a =>
                a.area === newAlert.area &&
                a.category === newAlert.category &&
                a.complaintType === newAlert.complaintType
            );

            let updatedAlerts = [...areaAlerts];
            if (existingAlertIndex >= 0) {
                updatedAlerts[existingAlertIndex] = newAlert;
            } else {
                updatedAlerts = [newAlert, ...areaAlerts];
            }

            setAreaAlerts(updatedAlerts);
            persistData(LOCAL_STORAGE_KEYS.ALERTS, updatedAlerts);
        }

        const newComplaint: Complaint = {
            ...data,
            id: `CMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            priority,
            status: "Pending",
            areaAlert: isAreaAlert,
            currentStage: "Submitted",
            stages: [
                { stage: "Submitted", status: "Current", updatedAt: new Date().toISOString() }
            ],
            createdAt: new Date().toISOString()
        };

        console.log("Priority:", newComplaint.priority);

        const updatedComplaints = [newComplaint, ...complaints];
        setComplaints(updatedComplaints);
        persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updatedComplaints);
        return newComplaint.id;
    };

    const updateServiceStatus = (id: string, status: ServiceRequest['status']) => {
        const updatedRequests = serviceRequests.map(req =>
            req.id === id ? { ...req, status } : req
        );
        setServiceRequests(updatedRequests);
        persistData(LOCAL_STORAGE_KEYS.SERVICES, updatedRequests);
    };

    const updateServiceStage = (id: string, stage: string) => {
        const updatedRequests = serviceRequests.map(req => {
            if (req.id !== id) return req;

            const now = new Date().toISOString();

            // Mark current stage as completed
            const updatedStages = req.stages.map(s =>
                s.status === "Current" ? { ...s, status: "Completed" as const, updatedAt: now } : s
            );

            // Add new stage
            updatedStages.push({
                stage: stage,
                status: "Current",
                updatedAt: now
            });

            return {
                ...req,
                currentStage: stage,
                status: stage as any,
                stages: updatedStages
            };
        });
        setServiceRequests(updatedRequests);
        persistData(LOCAL_STORAGE_KEYS.SERVICES, updatedRequests);
    };

    const updateComplaintStatus = (id: string, status: Complaint['status']) => {
        const updatedComplaints = complaints.map(cmp =>
            cmp.id === id ? { ...cmp, status } : cmp
        );
        setComplaints(updatedComplaints);
        persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updatedComplaints);
    };

    const updateComplaintStage = (id: string, stage: string) => {
        const updatedComplaints = complaints.map(cmp => {
            if (cmp.id !== id) return cmp;

            const now = new Date().toISOString();

            // Mark current stage as completed
            const updatedStages = cmp.stages.map(s =>
                s.stage === cmp.currentStage ? { ...s, status: "Completed" as const, updatedAt: now } : s
            );

            // Add new stage
            // Prevent duplicate adjacent stages if clicked multiple times
            if (cmp.currentStage !== stage) {
                updatedStages.push({
                    stage: stage,
                    status: "Current",
                    updatedAt: now
                });
            }

            return {
                ...cmp,
                currentStage: stage,
                stages: updatedStages
            };
        });
        setComplaints(updatedComplaints);
        persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updatedComplaints);
    };

    // Legacy support for helper function used in Admin
    const getComplaintsByCategory = (category: string) => {
        if (category === 'All') return complaints;
        return complaints.filter(c => c.category === category);
    };

    return (
        <ServiceComplaintContext.Provider value={{
            serviceRequests,
            complaints,
            areaAlerts,
            addServiceRequest,
            addComplaint,
            updateServiceStatus,
            updateServiceStage,
            updateComplaintStatus,
            updateComplaintStage,
            getComplaintsByCategory,
            kiosks,
            addKiosk
        }}>
            {children}
        </ServiceComplaintContext.Provider>
    );
};

export const useServiceComplaint = () => {
    const context = useContext(ServiceComplaintContext);
    if (!context) {
        throw new Error('useServiceComplaint must be used within a ServiceComplaintProvider');
    }
    return context;
};
