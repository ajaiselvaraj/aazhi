import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TrackingStage, Kiosk } from '../types';
import { GrievanceService } from '../services/civicService';
import { MOCK_USER_PROFILE } from '../constants';

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
    citizenId?: string;
    status: "active" | "resolved" | "rejected";
    currentStage: string;
    stage: string;
    rejection_reason?: string;
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
    citizenId?: string;
    priority: "Critical" | "High" | "Medium" | "Low";
    status: "active" | "resolved" | "rejected";
    area: string;
    areaAlert?: boolean;
    stage: string;
    rejection_reason?: string;
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
    addServiceRequest: (data: Omit<ServiceRequest, 'id' | 'token' | 'createdAt' | 'status' | 'currentStage' | 'stage' | 'stages' | 'rejection_reason'>) => string;
    addComplaint: (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'priority' | 'areaAlert' | 'currentStage' | 'stage' | 'stages' | 'rejection_reason'>) => Promise<string>;
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

                // Clear any leftover mock data from previous sessions ONLY if it contains legacy specific names
                if (services && (services.includes('REQ-2024') || (services.includes('Rajesh') && !services.includes('dev_')))) {
                     localStorage.removeItem(LOCAL_STORAGE_KEYS.SERVICES);
                     localStorage.removeItem(LOCAL_STORAGE_KEYS.COMPLAINTS);
                     localStorage.removeItem(LOCAL_STORAGE_KEYS.ALERTS);
                     localStorage.removeItem(LOCAL_STORAGE_KEYS.KIOSKS);
                     localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVITY);
                     window.location.reload();
                     return;
                }

                const safeParse = (data: string | null) => {
                    if (!data || data === 'undefined') return [];
                    try { return JSON.parse(data); } catch (e) { return []; }
                };

                setServiceRequests(safeParse(services));
                setComplaints(safeParse(complaintsData));
                setAreaAlerts(safeParse(alertsData));
                setKiosks(safeParse(kiosksData));
                setActivityLog(logData ? safeParse(logData) : [{ id: '1', action: 'System Init', details: 'Dashboard boot sequence complete.', timestamp: new Date().toISOString() }]);
            } catch (error) {
                console.error("Failed to load data from localStorage", error);
            }
        };

        loadDataFromStorage();

        // Poll every 10 seconds: sync localStorage AND pull status updates from the backend API
        const pollInterval = setInterval(async () => {
            loadDataFromStorage(); // Keep localStorage in sync (same-browser tab)

            try {
                const userStr = localStorage.getItem('aazhi_user');
                let user: any = null;
                try {
                    if (userStr && userStr !== 'undefined' && userStr !== 'null') {
                        user = JSON.parse(userStr);
                    }
                } catch (e) {
                    return; // Corrupted user data — skip safely
                }

                const isStaff = user?.role === 'staff' || user?.role === 'admin';

                // ── PATH A: Staff/Admin — Pull full admin lists ──────────────
                if (isStaff) {
                    const apiRequests = await GrievanceService.getAllRequestsAdmin();
                    const apiComplaints = await GrievanceService.getAllComplaintsAdmin();

                    const mapApiRequest = (r: any): ServiceRequest => {
                        let rawStage = r.stage || r.current_stage || r.status || 'submitted';
                        const stageMap: Record<string, string> = {
                            'created': 'Submitted', 'submitted': 'Submitted',
                            'officer_assigned': 'Officer Assigned', 'manager_review': 'Manager Review',
                            'gm_approval': 'GM Approval', 'resolved': 'Resolved'
                        };
                        const normalizedStage = stageMap[rawStage] || (rawStage.charAt(0).toUpperCase() + rawStage.slice(1));
                        return {
                            id: r.ticket_number || r.id, token: r.ticket_number || r.id,
                            name: r.citizen_name || r.name, phone: r.citizen_mobile || r.phone || r.citizen_phone,
                            category: r.department || r.category || '', serviceType: r.request_type || r.serviceType || '',
                            address: r.metadata?.address || r.address || '', description: r.description || '',
                            status: r.status || 'active', currentStage: normalizedStage, stage: rawStage,
                            rejection_reason: r.rejection_reason,
                            stages: r.stages || [{ stage: normalizedStage, status: 'Current', updatedAt: r.updated_at || r.created_at || new Date().toISOString() }],
                            createdAt: r.created_at || new Date().toISOString(),
                        };
                    };

                    const mapApiComplaint = (r: any): Complaint => {
                        let rawStage = r.stage || r.current_stage || r.status || 'submitted';
                        const stageMap: Record<string, string> = {
                            'created': 'Pending', 'submitted': 'Pending', 'pending': 'Pending',
                            'assigned': 'Assigned', 'in_progress': 'In Progress',
                            'officer_assigned': 'Assigned', 'manager_review': 'In Progress',
                            'gm_approval': 'In Progress', 'resolved': 'Resolved', 'closed': 'Closed'
                        };
                        const normalizedStage = stageMap[rawStage] || (rawStage.charAt(0).toUpperCase() + rawStage.slice(1));
                        return {
                            id: r.ticket_number || r.id, name: r.citizen_name || r.name,
                            phone: r.citizen_mobile || r.phone || r.citizen_phone,
                            category: r.department || r.category || '',
                            complaintType: r.request_type || r.complaintType || '',
                            location: r.metadata?.location || r.address || '', area: r.ward || 'Unknown',
                            description: r.description || '', priority: r.priority || 'Medium',
                            status: r.status || 'active', currentStage: normalizedStage, stage: rawStage,
                            rejection_reason: r.rejection_reason,
                            stages: r.stages || [{ stage: normalizedStage, status: 'Current', updatedAt: r.updated_at || r.created_at || new Date().toISOString() }],
                            createdAt: r.created_at || new Date().toISOString(),
                        };
                    };

                    const mergeIntoState = <T extends { id: string; currentStage: string; status: string; stage: string; stages: any[] }>(
                        newFromApi: T[], setFn: React.Dispatch<React.SetStateAction<T[]>>, storageKey: string
                    ) => {
                        if (!newFromApi.length) return;
                        setFn(prev => {
                            const mergedMap = new Map<string, T>();
                            prev.forEach(p => mergedMap.set(p.id, p));
                            let updated = false;
                            newFromApi.forEach(n => {
                                if (mergedMap.has(n.id)) {
                                    const existing = mergedMap.get(n.id)!;
                                    if (existing.currentStage !== n.currentStage || existing.status !== n.status || existing.stage !== n.stage) {
                                        mergedMap.set(n.id, { ...existing, currentStage: n.currentStage, status: n.status, stage: n.stage, stages: n.stages });
                                        updated = true;
                                    }
                                } else {
                                    mergedMap.set(n.id, n);
                                    updated = true;
                                }
                            });
                            if (!updated) return prev;
                            const merged = Array.from(mergedMap.values()).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                            persistData(storageKey, merged);
                            return merged;
                        });
                    };

                    if (Array.isArray(apiRequests) && apiRequests.length > 0) {
                        mergeIntoState(apiRequests.map(mapApiRequest), setServiceRequests, LOCAL_STORAGE_KEYS.SERVICES);
                    }
                    if (Array.isArray(apiComplaints) && apiComplaints.length > 0) {
                        mergeIntoState(apiComplaints.map(mapApiComplaint), setComplaints, LOCAL_STORAGE_KEYS.COMPLAINTS);
                    }
                    return;
                }

                // ── PATH B: Citizen/Kiosk — Per-ticket track polling ─────────
                // Read locally stored tickets and refresh their status from the
                // public /track endpoints so admin hierarchy updates appear in real-time.
                const storedServicesRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.SERVICES);
                const storedComplaintsRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPLAINTS);
                const storedServices: ServiceRequest[] = storedServicesRaw ? JSON.parse(storedServicesRaw) : [];
                const storedComplaints: Complaint[] = storedComplaintsRaw ? JSON.parse(storedComplaintsRaw) : [];

                // Only track tickets with real backend IDs (SRQ-*, TKT-*, CMP-*)
                const realRequestTickets = storedServices.filter(r =>
                    r.id && (r.id.startsWith('SRQ-') || r.id.startsWith('TKT-'))
                );
                const realComplaintTickets = storedComplaints.filter(c =>
                    c.id && c.id.startsWith('CMP-')
                );

                if (realRequestTickets.length === 0 && realComplaintTickets.length === 0) return;

                // ── Helper: Direct fetch bypasses apiThrottle/retry queue ──────
                // The apiClient uses MAX_CONCURRENT=2 and per-minute throttling.
                // Background polls should NEVER compete with user-facing requests.
                const API_URL = (() => {
                    const envUrl = (import.meta as any).env?.VITE_API_URL;
                    const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                    if (isProd && envUrl?.includes('localhost')) return 'https://aazhi-9gj2.onrender.com/api';
                    return envUrl || 'https://aazhi-9gj2.onrender.com/api';
                })();

                // Use apiClient but with a silent flag to avoid loading spinners
                const directTrack = async (endpoint: string): Promise<any> => {
                    const { apiClient } = await import('../services/api/apiClient');
                    return await apiClient.get(endpoint, { params: { _silent: true } });
                };

                // Fetch updates in parallel (max 5 at a time to avoid flooding)
                const reqUpdates = await Promise.allSettled(
                    realRequestTickets.slice(0, 5).map(async (r) => {
                        const fresh = await directTrack(`/service-requests/track/${encodeURIComponent(r.id)}`);
                        return { localId: r.id, fresh };
                    })
                );
                const compUpdates = await Promise.allSettled(
                    realComplaintTickets.slice(0, 5).map(async (c) => {
                        const fresh = await directTrack(`/complaints/track/${encodeURIComponent(c.id)}`);
                        return { localId: c.id, fresh };
                    })
                );

                // Apply service request updates
                const successfulReqUpdates = reqUpdates
                    .filter(r => r.status === 'fulfilled' && r.value?.fresh)
                    .map(r => (r as PromiseFulfilledResult<any>).value);

                if (successfulReqUpdates.length > 0) {
                    setServiceRequests(prev => {
                        let changed = false;
                        const updated = prev.map(existing => {
                            const match = successfulReqUpdates.find(u => u.localId === existing.id);
                            if (!match) return existing;
                            const fresh = match.fresh;

                            // Service requests have current_stage column in the DB
                            const newStage = fresh.current_stage || fresh.stage || existing.stage;
                            // Normalize status: backend stores 'pending','resolved' etc; local uses 'active','resolved','rejected'
                            const rawStatus = fresh.status || existing.status;
                            const newStatus = rawStatus === 'pending' || rawStatus === 'submitted' || rawStatus === 'active' || rawStatus === 'working' || rawStatus === 'assigned' || rawStatus === 'officer_assigned' || rawStatus === 'manager_review' || rawStatus === 'gm_approval'
                                ? (rawStatus === 'resolved' || rawStatus === 'completed' ? 'resolved' : 'active')
                                : rawStatus;
                            const newStages = fresh.stages || existing.stages;

                            const stagesChanged = JSON.stringify(existing.stages) !== JSON.stringify(newStages);
                            if (existing.stage === newStage && existing.status === newStatus && !stagesChanged) return existing;
                            changed = true;
                            const stageMap: Record<string, string> = {
                                'created': 'Submitted', 'submitted': 'Submitted',
                                'officer_assigned': 'Officer Assigned', 'manager_review': 'Manager Review',
                                'gm_approval': 'GM Approval', 'resolved': 'Resolved',
                                'working': 'Working', 'assigned': 'Assigned', 'completed': 'Resolved'
                            };
                            const normalizedStage = stageMap[newStage] || (newStage.charAt(0).toUpperCase() + newStage.slice(1));
                            console.log(`🔄 [Sync] Request ${existing.id}: "${existing.stage}" → "${newStage}"`);
                            return { ...existing, stage: newStage, currentStage: normalizedStage, status: newStatus, stages: newStages };
                        });
                        if (!changed) return prev;
                        persistData(LOCAL_STORAGE_KEYS.SERVICES, updated);
                        return updated;
                    });
                }

                // Apply complaint updates
                const successfulCompUpdates = compUpdates
                    .filter(r => r.status === 'fulfilled' && r.value?.fresh)
                    .map(r => (r as PromiseFulfilledResult<any>).value);

                if (successfulCompUpdates.length > 0) {
                    setComplaints(prev => {
                        let changed = false;
                        const updated = prev.map(existing => {
                            const match = successfulCompUpdates.find(u => u.localId === existing.id);
                            if (!match) return existing;
                            const fresh = match.fresh;

                            // ⚠️ KEY FIX: Complaints table has NO current_stage/stage column.
                            // The current stage must be extracted from the complaint_stages
                            // join table, returned as fresh.stages[].  Find the 'current' entry.
                            const currentStageEntry = Array.isArray(fresh.stages)
                                ? fresh.stages.find((s: any) =>
                                    s.status === 'current' || s.status === 'Current'
                                  )
                                : null;
                            const newStage = currentStageEntry?.stage   // e.g. 'assigned', 'in_progress'
                                || fresh.status                           // fallback: complaint status IS the stage
                                || existing.stage;

                            // Map backend status to local status enum (active/resolved/rejected)
                            const rawStatus = fresh.status || existing.status;
                            let newStatus: 'active' | 'resolved' | 'rejected';
                            if (rawStatus === 'resolved' || rawStatus === 'closed') {
                                newStatus = 'resolved';
                            } else if (rawStatus === 'rejected') {
                                newStatus = 'rejected';
                            } else {
                                newStatus = 'active'; // pending, assigned, in_progress → still active
                            }

                            const newStages = fresh.stages || existing.stages;

                            // Force update if EITHER stage, status, or any stage data changed
                            const stageChanged = existing.stage !== newStage;
                            const statusChanged = existing.status !== newStatus;
                            const stagesChanged = JSON.stringify(existing.stages) !== JSON.stringify(newStages);
                            if (!stageChanged && !statusChanged && !stagesChanged) return existing;

                            changed = true;
                            const stageMap: Record<string, string> = {
                                'created': 'Pending', 'submitted': 'Pending', 'pending': 'Pending',
                                'assigned': 'Assigned', 'in_progress': 'In Progress',
                                'officer_assigned': 'Assigned', 'manager_review': 'In Progress',
                                'gm_approval': 'In Progress', 'resolved': 'Resolved', 'closed': 'Closed'
                            };
                            const normalizedStage = stageMap[newStage] || (newStage.charAt(0).toUpperCase() + newStage.slice(1));
                            console.log(`🔄 [Sync] Complaint ${existing.id}: "${existing.stage}" → "${newStage}" | status: "${existing.status}" → "${newStatus}"`);
                            return { ...existing, stage: newStage, currentStage: normalizedStage, status: newStatus, stages: newStages };
                        });
                        if (!changed) return prev;
                        persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updated);
                        return updated;
                    });
                }

            } catch {
                // API unavailable — localStorage data shown as fallback
            }
        }, 10000); // Poll every 10 seconds

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
    
    const addServiceRequest = (data: Omit<ServiceRequest, 'id' | 'token' | 'createdAt' | 'status' | 'currentStage' | 'stage' | 'stages' | 'rejection_reason'>): string => {
        const token = `TKT-${new Date().toISOString().split('T')[0].replace(/-/g,'')}-${Math.floor(1000 + Math.random()*9000)}`;
        const userStr = localStorage.getItem('aazhi_user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        const newReq: ServiceRequest = { 
            ...data, 
            citizenId: user?.id, 
            name: data.name || user?.name,
            phone: data.phone || user?.mobile,
            id: token, 
            token, 
            status: "active", 
            currentStage: "Submitted", 
            stage: "submitted", 
            stages: [{ stage: "Submitted", status: "Current", updatedAt: new Date().toISOString() }], 
            createdAt: new Date().toISOString() 
        };
        setServiceRequests(prev => { const updated = [newReq, ...prev]; persistData(LOCAL_STORAGE_KEYS.SERVICES, updated); return updated; });
        logActivity("Request Submitted", `New service request ${token} submitted for ${data.category}.`);

        // Mirror to backend for cross-device sync (fire-and-forget; localStorage is the primary store)
        // Log for investigation
        console.log("📤 [API] Attempting to mirror service request to backend...");

        // Fire-and-forget but with proper error logging
        (async () => { // Wrap in an async IIFE to use await
            try {
                const res = await GrievanceService.createRequest({
                    request_type: data.serviceType,
                    department: data.category,
                    description: data.description || `Service request for ${data.serviceType}`,
                    ward: undefined,
                    phone: data.phone || user?.mobile,
                    name: data.name || user?.name,
                    metadata: { token, name: data.name || user?.name, address: data.address }
                });
                console.log("✅ [API] Backend mirrored successfully:", res);
            } catch (err: any) { 
                console.error("❌ [API] Failed to mirror service request to backend:", err.message || err);
                // We keep localStorage data but at least the developer knows it failed
            }
        })();

        return token;
    };

    const addComplaint = async (data: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'priority' | 'areaAlert' | 'currentStage' | 'stage' | 'stages' | 'rejection_reason'>): Promise<string> => {
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
            const apiRes = await GrievanceService.createComplaint({
                category: data.complaintType || 'General',
                department: data.category || 'General',
                subject: `Complaint regarding ${data.complaintType}`,
                description: data.description || `Complaint regarding ${data.complaintType}`,
                ward: data.area !== 'Unknown' ? data.area : undefined,
                priority: priority.toLowerCase(),
                name: data.name,
                phone: data.phone
            });
            // Capture DB assigned ticket number
            finalId = (apiRes as any).ticket_number || apiRes.id;
        } catch (error) {
            console.warn("API submission failed, falling back to offline/localStorage", error);
        }

        finalId = finalId || `CMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;

        const userStr = localStorage.getItem('aazhi_user');
        const user = userStr ? JSON.parse(userStr) : null;

        const newComplaint: Complaint = { 
            ...data, 
            citizenId: user?.id, 
            name: data.name || user?.name,
            phone: data.phone || user?.mobile, 
            id: finalId, 
            priority: priority as "Critical" | "High" | "Medium" | "Low", 
            status: "active", 
            areaAlert, 
            currentStage: "Submitted", 
            stage: "submitted", 
            stages: [{ stage: "Submitted", status: "Current", updatedAt: new Date().toISOString() }], 
            createdAt: new Date().toISOString() 
        };
        setComplaints(prev => { const updated = [newComplaint, ...prev]; persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updated); return updated; });
        return finalId;
    };

    const updateServiceStatus = (id: string, status: ServiceRequest['status']) => { 
        setServiceRequests(prev => { const updated = prev.map(r => r.id===id ? {...r, status} : r); persistData(LOCAL_STORAGE_KEYS.SERVICES, updated); return updated; }); 
        logActivity("Request Updated", `Service request ${id} status changed to ${status}.`); 
        GrievanceService.updateRequestStatusAdmin(id, { status }).catch(e => console.error("Failed to update status on server", e));
    };

    const updateServiceStage = (id: string, stage: string) => {
        setServiceRequests(prev => {
            const updated = prev.map(r => {
                if(r.id !== id) return r;
                const now = new Date().toISOString();
                const stages: TrackingStage[] = r.stages.map(s => s.status==="Current" ? ({...s, status:"Completed" as const, updatedAt: now}) : s);
                stages.push({ stage, status: "Current" as const, updatedAt: now });
                const status = stage === 'Resolved' || stage.toLowerCase() === 'resolved' ? 'resolved' : 'active';
                return { ...r, currentStage: stage, status: status as any, stage: stage.toLowerCase(), stages };
            });
            persistData(LOCAL_STORAGE_KEYS.SERVICES, updated);
            return updated;
        });
        logActivity("Request Stage Advanced", `Service request ${id} stage advanced to ${stage}.`);
        
        let apiStage = stage; // Send the human-readable stage, backend handles it
        let apiStatus = (stage.toLowerCase() === 'resolved' || stage.toLowerCase() === 'completed') ? 'resolved' : 'pending';
        
        if (apiStage.toLowerCase() === 'rejected') apiStatus = 'rejected';

        const payload: any = { 
            status: apiStatus,
            current_stage: apiStage
        };
        
        if (apiStage.toLowerCase() === 'rejected') {
            payload.rejection_reason = "Rejected in admin dashboard";
        }

        GrievanceService.updateRequestStatusAdmin(id, payload).catch(e => console.error("Failed to update stage on server", e));
    };

    const updateComplaintStatus = (id: string, status: Complaint['status']) => { 
        setComplaints(prev => { const updated = prev.map(c => c.id===id ? {...c, status} : c); persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updated); return updated; }); 
        logActivity("Complaint Updated", `Complaint ${id} flagged as ${status}.`); 
        GrievanceService.updateComplaintStatusAdmin(id, { status }).catch(e => console.error("Failed to update status on server", e));
    };

    const updateComplaintStage = (id: string, stage: string) => {
        setComplaints(prev => {
            const updated = prev.map(c => {
                if(c.id!==id) return c;
                const now = new Date().toISOString();
                // Map the frontend currentStage explicitly
                const stages: TrackingStage[] = c.stages.map(s => s.stage===c.currentStage ? ({...s, status:"Completed" as const, updatedAt:now}) : s);
                if(c.currentStage!==stage) stages.push({ stage, status:"Current" as const, updatedAt:now });
                const status = stage === 'Resolved' || stage.toLowerCase() === 'resolved' ? 'resolved' : 'active';
                return { ...c, currentStage: stage, status: status as any, stage: stage.toLowerCase(), stages };
            });
            persistData(LOCAL_STORAGE_KEYS.COMPLAINTS, updated);
            return updated;
        });
        logActivity("Complaint Stage Advanced", `Complaint ${id} workflow moved to ${stage}.`);
        
        let apiStage = stage; // Human readable stage
        let apiStatus = (stage.toLowerCase() === 'resolved' || stage.toLowerCase() === 'closed') ? 'resolved' : 'pending';
        
        if (apiStage.toLowerCase() === 'rejected') apiStatus = 'rejected';

        const payload: any = { 
            status: apiStatus
        };
        
        if (apiStage.toLowerCase() === 'rejected') {
            payload.rejection_reason = "Rejected in admin dashboard";
        }
    
        GrievanceService.updateComplaintStatusAdmin(id, payload).catch(e => console.error("Failed to update stage on server", e));
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