import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MOCK_REQUESTS, MOCK_USER_PROFILE } from '../constants';
import { TrackingStage, Kiosk } from '../types';
import { GrievanceService } from '../services/civicService';

// --- TYPE DEFINITIONS ---
export interface ServiceRequest {
    id: string; // Token used as ID
    token?: string;
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
    area: string;
    areaAlert?: boolean;
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

export interface ActivityLogEntry {
    id: string;
    action: string;
    details: string;
    timestamp: string;
}

interface ServiceComplaintContextType {
    serviceRequests: ServiceRequest[];
    complaints: Complaint[];
    areaAlerts: AreaAlert[];
    addServiceRequest: (data: Omit<ServiceRequest, 'id' | 'token' | 'createdAt' | 'status' | 'currentStage' | 'stages'>) => string;
    addComplaint: (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'priority' | 'areaAlert' | 'currentStage' | 'stages'>) => Promise<string>;
    updateServiceStatus: (id: string, status: ServiceRequest['status']) => void;
    updateServiceStage: (id: string, stage: string) => void;
    updateComplaintStatus: (id: string, status: Complaint['status']) => void;
    updateComplaintStage: (id: string, stage: string) => void;
    acknowledgeAlert: (area: string, operator: string) => void;
    getComplaintsByCategory: (category: string) => Complaint[];
    kiosks: Kiosk[];
    addKiosk: (kiosk: Kiosk) => void;
    activityLog: ActivityLogEntry[];
    logActivity: (action: string, details: string) => void;
}

const ServiceComplaintContext = createContext<ServiceComplaintContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
    SERVICES: "aazhi_services",
    COMPLAINTS: "aazhi_complaints",
    ALERTS: "aazhi_area_alerts",
    KIOSKS: "aazhi_kiosks",
    ACTIVITY: "aazhi_activity_log"
};

// --- Seed Kiosks ---
const SEED_KIOSKS: Kiosk[] = [
    { id: 'K-001', location: 'Central Bus Stand', status: 'Online', battery: 85, network: 'Good', userLoad: 'High', lastActive: new Date().toISOString(), todayUsers: 142, complaintsToday: 12 },
    { id: 'K-002', location: 'Gandhi Market', status: 'Online', battery: 45, network: 'Weak', userLoad: 'Medium', lastActive: new Date().toISOString(), todayUsers: 89, complaintsToday: 5 },
    { id: 'K-003', location: 'Railway Station', status: 'Offline', battery: 12, network: 'Disconnected', userLoad: 'Low', lastActive: new Date(Date.now() - 3600000).toISOString(), todayUsers: 34, complaintsToday: 2 }
];

// --- Priority Helper ---
const getPriority = (category: string, complaintType: string): "Critical" | "High" | "Medium" | "Low" => {
    const cat = category.toLowerCase();
    const type = complaintType.toLowerCase();

    if (cat.includes('gas')) {
        if (type.includes('leak')) return "Critical";
        if (type.includes('no gas') || type.includes('supply')) return "High";
        return "Medium";
    }

    if (cat.includes('electricity') || cat.includes('eb')) {
        if (type.includes('spark') || type.includes('fire') || type.includes('hazard')) return "Critical";
        if (type.includes('fail') || type.includes('outage') || type.includes('cut') || type.includes('power')) return "High";
        if (type.includes('meter')) return "Medium";
        return "Low";
    }

    if (cat.includes('water')) {
        if (type.includes('burst') || type.includes('leak') || type.includes('sewage') || type.includes('block')) return "High";
        if (type.includes('no water')) return "Medium";
        return "Low";
    }

    if (cat.includes('municipal') || cat.includes('waste')) {
        if (type.includes('garbage') || type.includes('light')) return "Medium";
        return "Low";
    }

    return "Low";
};

// --- Seed Requests ---
const SEED_REQUESTS: ServiceRequest[] = MOCK_REQUESTS.map(req => {
    // Support both old English values and new i18n keys
    const isResolved = req.status === 'Resolved' || req.status === 'resolved' || req.status === 'Completed' || req.status === 'completed';
    const isInProgress = req.status === 'In Progress' || req.status === 'inProgress' || req.status === 'Under Review';
    const status: ServiceRequest['status'] = isResolved ? 'Completed' : isInProgress ? 'Under Review' : 'Submitted';
    const currentStage = isResolved ? 'Completed' : isInProgress ? 'Under Review' : 'Submitted';

    return {
        id: req.id,
        token: req.id,
        name: req.citizenName,
        phone: MOCK_USER_PROFILE.mobile,
        category: req.department,
        serviceType: req.type,
        address: `Ward ${req.ward}`,
        description: req.details,
        status,
        currentStage,
        stages: [
            { stage: "Submitted", status: "Completed", updatedAt: new Date(req.timestamp).toISOString() },
            { stage: currentStage, status: "Current", updatedAt: new Date().toISOString() }
        ],
        createdAt: new Date(req.timestamp).toISOString()
    };
});

// --- Seed Complaints ---
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
        stages: [{ stage: 'Submitted', status: 'Current', updatedAt: new Date(Date.now() - 86400000).toISOString() }],
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

// --- CONTEXT PROVIDER ---
export const ServiceComplaintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [areaAlerts, setAreaAlerts] = useState<AreaAlert[]>([]);
    const [kiosks, setKiosks] = useState<Kiosk[]>([]);
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

    // Load data from localStorage
    useEffect(() => {
        const loadDataFromStorage = () => {
            try {
                const services = localStorage.getItem(LOCAL_STORAGE_KEYS.SERVICES);
                const complaintsData = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLAINTS);
                const alertsData = localStorage.getItem(LOCAL_STORAGE_KEYS.ALERTS);
                const kiosksData = localStorage.getItem(LOCAL_STORAGE_KEYS.KIOSKS);
                const logData = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVITY);

                setServiceRequests(services ? JSON.parse(services) : SEED_REQUESTS);
                setComplaints(complaintsData ? JSON.parse(complaintsData) : SEED_COMPLAINTS);
                setAreaAlerts(alertsData ? JSON.parse(alertsData) : []);
                setKiosks(kiosksData ? JSON.parse(kiosksData) : SEED_KIOSKS);
                setActivityLog(logData ? JSON.parse(logData) : [{ id: '1', action: 'System Init', details: 'Dashboard boot sequence complete.', timestamp: new Date().toISOString() }]);
            } catch (error) {
                console.error("Failed to load data from localStorage", error);
            }
        };

        loadDataFromStorage();

        // Poll every 5 seconds: sync localStorage AND pull new records from the backend API
        const pollInterval = setInterval(async () => {
            loadDataFromStorage(); // Keep localStorage in sync (same-browser tab)

            // Fetch backend records and merge any new ones into state (cross-device sync)
            try {
                const apiRequests = await GrievanceService.getAllRequestsAdmin();
                if (Array.isArray(apiRequests) && apiRequests.length > 0) {
                    
                    // Segregate into Service Requests and Complaints
                    const incomingServiceReqs = apiRequests.filter(r => r.metadata?.type !== 'complaint');
                    const incomingComplaints = apiRequests.filter(r => r.metadata?.type === 'complaint');

                    if (incomingServiceReqs.length > 0) {
                        setServiceRequests(prev => {
                            const existingIds = new Set(prev.map(r => r.id));
                            const newFromApi: ServiceRequest[] = incomingServiceReqs
                                .filter((r: any) => !existingIds.has(r.id) && !existingIds.has(r.ticket_number))
                                .map((r: any): ServiceRequest => ({
                                    id: r.ticket_number || r.id,
                                    token: r.ticket_number || r.id,
                                    name: r.citizen_name || r.name || 'Citizen',
                                    phone: r.phone || '',
                                    category: r.department || r.category || '',
                                    serviceType: r.request_type || r.serviceType || '',
                                    address: r.metadata?.address || r.address || '',
                                    description: r.description || '',
                                    status: 'Submitted',
                                    currentStage: r.current_stage || 'Submitted',
                                    stages: [{ stage: 'Submitted', status: 'Current', updatedAt: r.created_at || new Date().toISOString() }],
                                    createdAt: r.created_at || new Date().toISOString(),
                                }));

                            if (newFromApi.length === 0) return prev;
                            const merged = [...newFromApi, ...prev];
                            persistData(LOCAL_STORAGE_KEYS.SERVICES, merged);
                            return merged;
                        });
                    }

                    if (incomingComplaints.length > 0) {
                        setComplaints(prev => {
                            const existingIds = new Set(prev.map(c => c.id));
                            const newFromApi: Complaint[] = incomingComplaints
                                .filter((r: any) => !existingIds.has(r.id) && !existingIds.has(r.ticket_number))
                                .map((r: any): Complaint => ({
                                    id: r.ticket_number || r.id,
                                    name: r.citizen_name || r.name || 'Citizen',
                                    phone: r.phone || '',
                                    category: r.department || r.category || '',
                                    complaintType: r.request_type || r.complaintType || '',
                                    location: r.metadata?.location || r.address || '',
                                    area: r.ward || 'Unknown',
                                    description: r.description || '',
                                    priority: 'Medium',
                                    status: 'Pending',
                                    currentStage: r.current_stage || 'Submitted',
                                    stages: [{ stage: 'Submitted', status: 'Current', updatedAt: r.created_at || new Date().toISOString() }],
                                    createdAt: r.created_at || new Date().toISOString(),
                                }));

                            if (newFromApi.length === 0) return prev;
                            const merged = [...newFromApi, ...prev];
                            persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, merged);
                            return merged;
                        });
                    }
                }
            } catch {
                // API unavailable — localStorage data is shown as fallback
            }
        }, 5000);

        const handleStorageChange = (e: StorageEvent) => {
            if (!e.key) return;
            const keys = Object.values(LOCAL_STORAGE_KEYS);
            if (keys.includes(e.key)) loadDataFromStorage();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const persistData = (key: string, data: any) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    // --- CRUD FUNCTIONS ---
    const addKiosk = (kiosk: Kiosk) => { setKiosks(prev => { const updated = [...prev, kiosk]; persistData(LOCAL_STORAGE_KEYS.KIOSKS, updated); return updated; }); };
    
    const addServiceRequest = (data: Omit<ServiceRequest, 'id' | 'token' | 'createdAt' | 'status' | 'currentStage' | 'stages'>): string => {
        const token = `TKT-${new Date().toISOString().split('T')[0].replace(/-/g,'')}-${Math.floor(1000 + Math.random()*9000)}`;
        const newReq: ServiceRequest = { ...data, id: token, token, status: "Submitted", currentStage: "Submitted", stages: [{ stage: "Submitted", status: "Current", updatedAt: new Date().toISOString() }], createdAt: new Date().toISOString() };
        setServiceRequests(prev => { const updated = [newReq, ...prev]; persistData(LOCAL_STORAGE_KEYS.SERVICES, updated); return updated; });
        logActivity("Request Submitted", `New service request ${token} submitted for ${data.category}.`);

        // Mirror to backend for cross-device sync (fire-and-forget; localStorage is the primary store)
        GrievanceService.createRequest({
            request_type: data.serviceType,
            department: data.category,
            description: data.description || `Service request for ${data.serviceType}`,
            ward: undefined,
            phone: data.phone,
            metadata: { token, name: data.name, address: data.address }
        }).catch(() => { /* silently ignore — localStorage already saved it */ });

        return token;
    };

    const addComplaint = async (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'priority' | 'areaAlert' | 'currentStage' | 'stages'>): Promise<string> => {
        let priority = getPriority(data.category, data.complaintType);
        let areaAlert = false;
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        const recentSimilar = complaints.filter(c => c.category === data.category && c.complaintType === data.complaintType && c.area === data.area && (now - new Date(c.createdAt).getTime()) < ONE_DAY_MS);
        const count = recentSimilar.length + 1;
        if (count >= 5) { priority = "Critical"; areaAlert = true; } 
        else if (count >= 3 && priority !== "Critical") { priority = "High"; areaAlert = true; }

        if (areaAlert) {
            const alert: AreaAlert = { area: data.area, category: data.category, complaintType: data.complaintType, count, level: count >= 5 ? "Critical" : "High", createdAt: new Date().toISOString() };
            setAreaAlerts(prev => { const idx = prev.findIndex(a => a.area===alert.area && a.category===alert.category && a.complaintType===alert.complaintType); const updated = [...prev]; if(idx>=0) updated[idx]=alert; else updated.unshift(alert); persistData(LOCAL_STORAGE_KEYS.ALERTS, updated); return updated; });
        }

        let finalId: string | null = null;

        // HYBRID: Try API first, fallback to offline ID
        try {
            const apiRes = await GrievanceService.createRequest({
                request_type: data.complaintType,
                department: data.category,
                description: data.description || `Complaint regarding ${data.complaintType}`,
                ward: data.area !== 'Unknown' ? data.area : undefined,
                phone: data.phone,
                metadata: { location: data.location, name: data.name, type: 'complaint' }
            });
            // Capture DB assigned ticket number
            finalId = (apiRes as any).ticket_number || apiRes.id;
        } catch (error) {
            console.warn("API submission failed, falling back to offline/localStorage", error);
        }

        finalId = finalId || `CMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;

        const newComplaint: Complaint = { ...data, id: finalId, priority, status: "Pending", areaAlert, currentStage: "Submitted", stages: [{ stage: "Submitted", status: "Current", updatedAt: new Date().toISOString() }], createdAt: new Date().toISOString() };
        setComplaints(prev => { const updated = [newComplaint, ...prev]; persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updated); return updated; });
        return finalId;
    };

    const updateServiceStatus = (id: string, status: ServiceRequest['status']) => { setServiceRequests(prev => { const updated = prev.map(r => r.id===id ? {...r, status} : r); persistData(LOCAL_STORAGE_KEYS.SERVICES, updated); return updated; }); logActivity("Request Updated", `Service request ${id} status changed to ${status}.`); };

    const updateServiceStage = (id: string, stage: string) => {
        setServiceRequests(prev => {
            const updated = prev.map(r => {
                if(r.id !== id) return r;
                const now = new Date().toISOString();
                const stages = r.stages.map(s => s.status==="Current" ? {...s, status:"Completed", updatedAt: now} : s);
                stages.push({ stage, status: "Current", updatedAt: now });
                return { ...r, currentStage: stage, status: stage as ServiceRequest['status'], stages };
            });
            persistData(LOCAL_STORAGE_KEYS.SERVICES, updated);
            return updated;
        });
        logActivity("Request Stage Advanced", `Service request ${id} stage advanced to ${stage}.`);
    };

    const updateComplaintStatus = (id: string, status: Complaint['status']) => { setComplaints(prev => { const updated = prev.map(c => c.id===id ? {...c, status} : c); persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updated); return updated; }); logActivity("Complaint Updated", `Complaint ${id} flagged as ${status}.`); };

    const updateComplaintStage = (id: string, stage: string) => {
        setComplaints(prev => {
            const updated = prev.map(c => {
                if(c.id!==id) return c;
                const now = new Date().toISOString();
                const stages = c.stages.map(s => s.stage===c.currentStage ? {...s, status:"Completed", updatedAt:now} : s);
                if(c.currentStage!==stage) stages.push({ stage, status:"Current", updatedAt:now });
                return { ...c, currentStage: stage, stages };
            });
            persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updated);
            return updated;
        });
        logActivity("Complaint Stage Advanced", `Complaint ${id} workflow moved to ${stage}.`);
    };

    const acknowledgeAlert = (area: string, operator: string) => { logActivity("Area Alert Acknowledged", `Priority alert for ${area} acknowledged by ${operator}. Team dispatched.`); };

    const logActivity = (action: string, details: string) => {
        const newLog: ActivityLogEntry = { id: `ACT-${Date.now()}`, action, details, timestamp: new Date().toISOString() };
        setActivityLog(prev => { const updated = [newLog, ...prev].slice(0,50); persistData(LOCAL_STORAGE_KEYS.ACTIVITY, updated); return updated; });
    };

    const getComplaintsByCategory = (category: string) => category==='All' ? complaints : complaints.filter(c => c.category===category);

    return (
<ServiceComplaintContext.Provider
  value={{
    serviceRequests,
    complaints,
    areaAlerts,
    addServiceRequest,
    addComplaint,
    updateServiceStatus,
    updateServiceStage,
    updateComplaintStatus,
    updateComplaintStage,
    acknowledgeAlert,
    getComplaintsByCategory,
    kiosks,
    addKiosk,
    activityLog,
    logActivity,
  }}
>
    {children}
  </ServiceComplaintContext.Provider>
);
};

export const useServiceComplaint = () => {
    const context = useContext(ServiceComplaintContext);
    if(!context) throw new Error('useServiceComplaint must be used within a ServiceComplaintProvider');
    return context;
};