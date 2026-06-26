import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle, Clock, AlertCircle, FileText, AlertTriangle, ArrowRight, ArrowLeft, User, RefreshCw, Droplets, Building, Settings, CheckSquare, Wrench } from 'lucide-react';
import { useServiceComplaint, ServiceRequest, Complaint } from '../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';
import { GrievanceService } from '../services/civicService';
import { MOCK_USER_PROFILE } from '../constants';
import { useWorkflow } from '../hooks/useWorkflow';
import SLACountdownWidget from './escalation/SLACountdownWidget';
import AccountabilityThread from './escalation/AccountabilityThread';
import RequestEscalationButton from './escalation/RequestEscalationButton';

const getBackendUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl.replace(/\/api$/, '');
    const host = window.location.hostname;
    const isProd = host !== 'localhost' && !host.startsWith('192.168.') && !host.startsWith('10.');
    if (isProd) return 'https://aazhi-9gj2.onrender.com';
    return `http://${host}:5000`;
};
const API_BASE = getBackendUrl();

type ActivityItem =
    | (ServiceRequest & { type: 'Request' })
    | (Complaint & { type: 'Complaint', serviceType: string, category: string });

// ─── HELPERS ─────────────────────────────────────────────
const normalizeStatus = (s: string): string => {
    if (!s) return 'pending';
    return s.toLowerCase()
        .trim()
        .replace(/[\s-]+/g, '_')
        .replace(/inprogress/g, 'in_progress');
};

// NOTE: STAGE_INDEX_MAP is now built dynamically from the fetched workflow.
// This block is kept only as a legacy fallback for older renders.
const LEGACY_STAGE_INDEX_MAP: Record<string, number> = {
    'pending': 0, 'submitted': 0, 'active': 0, 'created': 0,
    'assigned': 1, 'officer_assigned': 1, 'under_review': 1,
    'in_progress': 2, 'working': 2, 'manager_review': 2, 'verification': 2,
    'resolved': 3, 'completed': 3, 'gm_approval': 3, 'approval_pending': 3,
    'closed': 4
};

interface ApplicationTrackerProps {
    category?: 'civic' | 'power' | 'gas' | 'municipal';
    onBack?: () => void;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ category = 'civic', onBack }) => {
    const { serviceRequests, complaints } = useServiceComplaint();
    const { t, i18n } = useTranslation();
    const language = i18n.language;
    const [searchId, setSearchId] = useState('');
    const [viewMode, setViewMode] = useState<'my-activity' | 'search'>('my-activity');
    const [searchResult, setSearchResult] = useState<ActivityItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [realTimeData, setRealTimeData] = useState<Record<string, { stages: any[], status: string }>>({});
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [errorCount, setErrorCount] = useState(0);

    // ─── Dynamic Workflow from DB (Single Source of Truth) ───
    const { stages: requestWorkflow, stageIndexMap: requestIndexMap } = useWorkflow('service_request');
    const { stages: complaintWorkflow, stageIndexMap: complaintIndexMap } = useWorkflow('complaint');
    // ─────────────────────────────────────────────────────────

    const currentUser = MOCK_USER_PROFILE;
    const isKioskMode = true;

    const safeServiceRequests = Array.isArray(serviceRequests) ? serviceRequests : [];
    const safeComplaints = Array.isArray(complaints) ? complaints : [];

    // --- LOCAL HELPERS ---
    const translateDynamic = (text: string) => {
        if (!text) return text;
        const key = text.toLowerCase().replace(/[\s-]+/g, '');
        const map: any = {
            'watersupply': t('waterSupply'),
            'electricity': t('electricity'),
            'wastemanagement': t('wasteManagement'),
            'roads': t('roads'),
            'streetlights': t('streetLights'),
            'sewerage': t('sewerage'),
            'garbage': t('garbageCollection'),
            'potholes': t('potholeRepair'),
            'leakage': t('leakageRepair'),
            'billing': t('billingIssue')
        };
        return map[key] || text;
    };

    const translateStage = (stageName: string) => {
        if (!stageName) return '';
        const key = stageName.toLowerCase().replace(/[\s_]+/g, '');
        const map: any = {
            'pending': t('pending'),
            'submitted': t('submitted'),
            'assigned': t('assigned'),
            'officerassigned': t('officerAssigned'),
            'underreview': t('underReview'),
            'inprogress': t('inProgress'),
            'verification': t('verification'),
            'resolved': t('resolved'),
            'completed': t('completed'),
            'closed': t('closed'),
            'rejected': t('rejected')
        };
        return map[key] || stageName;
    };

    const getStageColor = (item: ActivityItem) => {
        const liveData = realTimeData[item.id];
        const status = (liveData?.status || item.status || 'pending').toLowerCase();

        if (['resolved', 'completed', 'closed'].includes(status)) return 'bg-green-50 border-green-200 text-green-700';
        if (['rejected', 'failed', 'cancelled'].includes(status)) return 'bg-red-50 border-red-200 text-red-700';
        if (['in_progress', 'working', 'under_review'].includes(status)) return 'bg-blue-50 border-blue-200 text-blue-700';
        return 'bg-slate-50 border-slate-200 text-slate-600';
    };

    const myActivity = useMemo<ActivityItem[]>(() => {
        const items = [
            ...safeServiceRequests
                .filter(r => {
                    if (isKioskMode) return true;
                    return r.phone === currentUser?.mobile || r.citizenId === currentUser?.id;
                })
                .map(r => ({ ...r, type: 'Request' as const })),
            ...safeComplaints
                .filter(c => {
                    if (isKioskMode) return true;
                    return c.phone === currentUser?.mobile || c.citizenId === currentUser?.id;
                })
                .map(c => ({ ...c, type: 'Complaint' as const, serviceType: c.complaintType, category: c.category || 'General' }))
        ];

        return items
            .filter(item => (item.request_category || 'civic') === category)
            .sort((a, b) => {
                const dateA = new Date((a as any).createdAt || (a as any).timestamp || 0).getTime();
                const dateB = new Date((b as any).createdAt || (b as any).timestamp || 0).getTime();
                return dateB - dateA;
            }) as ActivityItem[];
    }, [safeServiceRequests, safeComplaints, isKioskMode, currentUser, category]);

    const itemsToDisplay = viewMode === 'my-activity' ? myActivity : searchResult;

    useEffect(() => {
        let isMounted = true;
        let pollTimer: any = null;

        const fetchLatest = async () => {
            // Only poll for items that aren't already in a final/terminal state
            const activeItems = itemsToDisplay.filter(item => {
                const status = (realTimeData[item.id]?.status || item.status || '').toLowerCase();
                return !['resolved', 'closed', 'completed', 'rejected'].includes(status);
            });

            if (!activeItems.length || errorCount > 3) {
                if (isMounted) setIsSyncing(false);
                return;
            }

            setIsSyncing(true);

            try {
                const results = [];
                for (const item of activeItems) {
                    if (!isMounted) break;
                    try {
                        const fresh = item.type === 'Complaint'
                            ? await GrievanceService.trackComplaint((item as any).ticket_number || item.id)
                            : await GrievanceService.trackRequest((item as any).ticket_number || item.id);

                        if (fresh) {
                            console.log(`🌐 [Tracker] Sync success for ${item.id}:`, fresh.current_stage || fresh.status);
                            results.push({
                                id: item.id,
                                stages: fresh.stages || [],
                                status: fresh.current_stage || fresh.status
                            });
                        }
                    } catch (err) {
                        console.warn(`⚠️ [Tracker] Sync failed for ${item.id}`);
                    }
                    // Sequential delay
                    await new Promise(r => setTimeout(r, 300));
                }

                if (isMounted && results.length > 0) {
                    setRealTimeData(prev => {
                        const next = { ...prev };
                        results.forEach(r => { next[r.id] = { stages: r.stages, status: r.status }; });
                        return next;
                    });
                    setLastSyncTime(new Date().toLocaleTimeString());
                    setErrorCount(0);
                }
            } catch (error) {
                console.error('❌ [Tracker] Poll cycle failed:', error);
                setErrorCount(prev => prev + 1);
            } finally {
                if (isMounted) setIsSyncing(false);
            }
        };

        fetchLatest();

        const intervalTime = errorCount > 0 ? 30000 : 20000;
        if (errorCount <= 5) {
            pollTimer = setInterval(fetchLatest, intervalTime);
        }

        return () => {
            isMounted = false;
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [itemsToDisplay.length, errorCount, realTimeData, itemsToDisplay]);

    const handleSearch = async () => {
        if (!searchId.trim()) return;
        setIsSearching(true);
        setSearchError('');
        try {
            let data: any = null;
            let type: 'Complaint' | 'Request' = 'Complaint';
            const tid = searchId.trim();

            if (tid.startsWith('TKT-')) {
                try {
                    data = await GrievanceService.trackRequest(tid);
                    type = 'Request';
                } catch (e) {
                    // Ignore and try complaint
                }
                if (!data) {
                    try {
                        data = await GrievanceService.trackComplaint(tid);
                        type = 'Complaint';
                    } catch (e) {}
                }
            } else {
                try {
                    data = await GrievanceService.trackComplaint(tid);
                    type = 'Complaint';
                } catch (e) {
                    // Ignore and try request
                }
                if (!data) {
                    try {
                        data = await GrievanceService.trackRequest(tid);
                        type = 'Request';
                    } catch (e) {}
                }
            }

            if (data) {
                const itemCategory = data.request_category || 'civic';
                if (itemCategory !== category) {
                    setSearchError(t('ticketNotFound') || 'Ticket not found.');
                    setSearchResult([]);
                } else {
                    if (type === 'Complaint') {
                        setSearchResult([{ ...data, type: 'Complaint', serviceType: data.complaintType, category: data.category || 'General' }]);
                    } else {
                        setSearchResult([{ ...data, type: 'Request' }]);
                    }
                    setViewMode('search');
                }
            } else {
                setSearchError(t('ticketNotFound') || 'Ticket not found.');
                setSearchResult([]);
            }
        } catch (e) {
            setSearchError(t('ticketNotFound') || 'Ticket not found.');
            setSearchResult([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans h-full flex flex-col">
            {onBack && (
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 self-start hover:text-slate-900 transition print:hidden">
                    <ArrowLeft size={16} />
                    {t('goBack') || "Go Back"}
                </button>
            )}
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{t('trackApplication')}</h2>
                    <p className="text-slate-500 font-medium text-lg">{t('trackApplicationDesc')}</p>
                </div>

                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                        onClick={() => setViewMode('my-activity')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'my-activity' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {t('myActivity')}
                        {myActivity.length > 0 && <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{myActivity.length}</span>}
                    </button>
                    <button
                        onClick={() => setViewMode('search')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'search' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {t('search')}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            {viewMode === 'search' && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 animate-in fade-in slide-in-from-top-4">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">{t('searchByIdOrMobile')}</label>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            placeholder={t('searchPlaceholder') || "e.g. SR-12345"}
                            className="flex-1 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-xl px-6 py-4 text-lg font-bold outline-none transition text-slate-900"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-blue-200"
                        >
                            {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Search size={20} />}
                            {t('search')}
                        </button>
                    </div>
                    {searchError && <p className="text-red-500 text-sm font-bold mt-3"><AlertCircle size={14} className="inline mr-1" /> {searchError}</p>}
                </div>
            )}

            {/* Live Sync Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-800 text-white rounded-3xl shadow-lg shadow-slate-200">
                        <Search size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('trackTitle') || 'Track Title'}</h2>
                        <p className="text-slate-500 font-bold">{t('trackSubtitle') || 'Track Subtitle'}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className={`px-4 py-2 rounded-2xl border transition-all duration-500 flex items-center gap-3 shadow-sm ${isSyncing ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                        <div className="relative flex h-2.5 w-2.5">
                            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? 'animate-ping bg-blue-400' : 'bg-green-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSyncing ? 'bg-blue-600' : 'bg-green-600'}`}></span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Live Sync'}</span>
                            {lastSyncTime && <span className="text-[9px] font-bold opacity-70">Updated {lastSyncTime}</span>}
                        </div>
                    </div>
                    <button onClick={() => { setRealTimeData({}); setErrorCount(0); }} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                        <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                        {t('refresh')}
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {itemsToDisplay.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95">
                        <Search className="mx-auto mb-4 text-slate-300" size={48} />
                        <p className="text-xl font-black text-slate-800 mb-2">{viewMode === 'search' ? t('noResultsFound') : t('noActivityYet')}</p>
                        <p className="text-slate-400 font-medium mb-8 max-w-xs mx-auto">{viewMode === 'search' ? t('tryDifferentId') : t('activityWillAppear')}</p>
                    </div>
                ) : itemsToDisplay.map((item) => {
                    const liveData = realTimeData[item.id];
                    const activeStages = liveData?.stages || item.stages;
                    const activeStatus = liveData?.status || item.status;

                    const latestUpdate = activeStages && activeStages.length > 0
                        ? (activeStages.find((s: any) => s.status?.toLowerCase() === 'current')
                            || [...activeStages].reverse().find((s: any) => s.status?.toLowerCase() === 'completed')
                            || [...activeStages].reverse()[0])
                        : null;

                    const rawStage = (activeStatus || latestUpdate?.stage || item.stage || 'pending');
                    const derivedStage = normalizeStatus(rawStage);

                    const isAlert = ['rejected', 'failed', 'cancelled', 'action_required'].includes(derivedStage) || (item.type === 'Complaint' && derivedStage === 'submitted' && item.id.endsWith('0')); // mocking action required deterministically based on ID
                    const isCompleted = ['resolved', 'completed', 'closed'].includes(derivedStage);
                    const isInProgress = ['in_progress', 'working', 'under_review'].includes(derivedStage);

                    const fmt = (iso?: string) => {
                        if (!iso) return '—';
                        return new Date(iso).toLocaleString('en-IN', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' -');
                    };

                    const getLeftIcon = () => {
                        if (item.serviceType?.toLowerCase().includes('water')) return <Droplets size={24} className="text-white" />;
                        return <Building size={24} className="text-white" />;
                    };
                    const getIconBg = () => {
                        if (item.serviceType?.toLowerCase().includes('water')) return 'bg-[#3b82f6]';
                        return 'bg-[#334155]';
                    };

                    const getStatusPill = () => {
                        if (isAlert) return <div className="inline-flex items-center gap-2 bg-[#fee2e2] text-[#ef4444] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-[#fca5a5] shadow-sm"><AlertCircle size={14} /> ACTION REQUIRED</div>;
                        if (isCompleted) return <div className="inline-flex items-center gap-2 bg-[#dcfce7] text-[#16a34a] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-[#bbf7d0] shadow-sm"><CheckCircle size={14} /> COMPLETED</div>;
                        if (isInProgress) return <div className="inline-flex items-center gap-2 bg-[#e0e7ff] text-[#4f46e5] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-[#c7d2fe] shadow-sm"><RefreshCw size={14} /> IN PROGRESS</div>;
                        return <div className="inline-flex items-center gap-2 bg-[#f1f5f9] text-[#64748b] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border border-[#e2e8f0] shadow-sm"><Clock size={14} /> PENDING</div>;
                    };

                    // DYNAMIC WORKFLOW
                    const workflow = item.type === 'Request' ? requestWorkflow : complaintWorkflow;
                    const indexMap = item.type === 'Request' ? requestIndexMap : complaintIndexMap;

                    let currentIndex = indexMap[derivedStage] ?? LEGACY_STAGE_INDEX_MAP[derivedStage] ?? 0;
                    if (isCompleted) currentIndex = workflow.length - 1;
                    if (isAlert && currentIndex > 0) currentIndex = 0; // force alert to beginning for mockup styling if needed, or leave it.

                    return (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition animate-in slide-in-from-bottom-6 duration-500">
                            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start gap-4 border-b border-slate-100">
                                <div className="flex gap-4 items-center">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm ${getIconBg()}`}>
                                        {getLeftIcon()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{translateDynamic(item.serviceType) || t('serviceRequest') || 'Service Request'}</h3>
                                        <p className="text-slate-500 font-medium text-sm mt-1">ID: {item.id} • {translateDynamic(item.category)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {getStatusPill()}
                                </div>
                            </div>

                            <div className="p-6 md:p-10 pb-4">
                                <div className="relative max-w-4xl mx-auto flex justify-between items-center px-4">
                                    {/* Progress Line */}
                                    <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-slate-200 rounded-full -translate-y-1/2 z-0" />
                                    <div className="absolute top-1/2 left-4 h-1.5 bg-[#16a34a] shadow-[0_0_10px_rgba(22,163,74,0.3)] rounded-full -translate-y-1/2 z-0 transition-all duration-700" style={{ width: `calc(${(currentIndex / (workflow.length - 1 || 1)) * 100}% - ${(currentIndex / (workflow.length - 1 || 1)) * 32}px)` }} />

                                    {workflow.map((step, idx) => {
                                        const isStepCompleted = idx < currentIndex || (isCompleted && idx === currentIndex);
                                        const isStepCurrent = idx === currentIndex && !isCompleted;

                                        let nodeContent;
                                        let nodeClasses = "w-12 h-12 rounded-[14px] flex items-center justify-center z-10 relative transition-all duration-300 ";

                                        let defaultIcon;
                                        if (idx === 1) defaultIcon = <User size={18} />;
                                        else if (idx === 2) defaultIcon = <Wrench size={18} />;
                                        else if (idx === 3) defaultIcon = <CheckCircle size={18} />;
                                        else if (idx === 4) defaultIcon = <Building size={18} />;
                                        else defaultIcon = <Clock size={18} />;

                                        if (isStepCompleted) {
                                            nodeClasses += "bg-[#16a34a] shadow-[0_0_15px_rgba(22,163,74,0.5)] ring-2 ring-green-100 border-2 border-[#16a34a] text-white";
                                            nodeContent = defaultIcon;
                                        } else if (isStepCurrent) {
                                            if (isAlert) {
                                                nodeClasses += "bg-red-50 border-2 border-red-500 text-red-600 ring-4 ring-red-100/50 shadow-sm";
                                                nodeContent = <span className="text-2xl font-black">!</span>;
                                            } else {
                                                nodeClasses += "bg-white border-2 border-blue-400 text-blue-600 ring-4 ring-blue-50 shadow-sm";
                                                nodeContent = <Settings size={22} className="animate-[spin_4s_linear_infinite]" />;
                                            }
                                        } else {
                                            nodeClasses += "bg-[#f1f5f9] border-2 border-[#e2e8f0] text-slate-400";
                                            nodeContent = defaultIcon;
                                        }

                                        return (
                                            <div key={idx} className="flex flex-col items-center">
                                                <div className={nodeClasses}>
                                                    {nodeContent}
                                                </div>
                                                <span className={`absolute mt-14 text-xs font-bold ${isStepCurrent && isAlert ? 'text-red-500' : isStepCurrent ? 'text-slate-800' : 'text-slate-500'}`}>
                                                    {translateStage(step.key)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="p-6 md:p-8 pt-6">
                                {isAlert ? (
                                    <div className="bg-[#fff5f5] rounded-2xl p-6 border border-red-100">
                                        <h4 className="flex items-center gap-2 text-[#dc2626] text-sm font-bold mb-3">
                                            <AlertTriangle size={18} /> Attention Needed
                                        </h4>
                                        <p className="text-sm text-slate-700 mb-5 leading-relaxed">
                                            Additional documentation (Site Plan B) is required before processing can begin. Please upload the missing files.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-[#1e293b] rounded-2xl p-6 text-white">
                                        <h4 className="font-bold mb-4">{t('operationsLog') || 'Operation Log'}</h4>
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center mt-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-white ring-4 ring-[#334155]"></div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 mb-1">{latestUpdate ? fmt(latestUpdate.updated_at) : 'Oct 24, 2024 - 10:30 AM'}</p>
                                                <p className="text-sm font-bold text-white">{latestUpdate ? translateStage(latestUpdate.stage) : 'Technician Dispatched'}</p>
                                                <p className="text-sm text-slate-300 mt-1">{latestUpdate?.notes || 'A field technician has been assigned and is en route to the location.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ⭐ ADD-ON: SLA & Accountability Section */}
                            {item.type === 'Complaint' && !['resolved', 'closed', 'rejected'].includes(derivedStage) && (
                                <div className="p-6 md:p-8 pt-0 border-t border-slate-100">
                                    <div className="flex items-center gap-4 mb-6 mt-6">
                                        <div className="flex-1 h-px bg-slate-200" />
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
                                            📋 {t('accountabilityEscalation') || 'SLA & Accountability'}
                                        </span>
                                        <div className="flex-1 h-px bg-slate-200" />
                                    </div>
                                    <SLACountdownWidget
                                        complaintId={item.id}
                                        apiBase={API_BASE}
                                        token={localStorage.getItem('aazhi_token') || undefined}
                                    />
                                    <AccountabilityThread
                                        complaintId={item.id}
                                        apiBase={API_BASE}
                                        token={localStorage.getItem('aazhi_token') || undefined}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ApplicationTracker;
