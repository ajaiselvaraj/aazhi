import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, AlertCircle, FileText, AlertTriangle, ArrowRight, User, RefreshCw } from 'lucide-react';
import { useServiceComplaint, ServiceRequest, Complaint } from '../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';
import { GrievanceService } from '../services/civicService';
import { MOCK_USER_PROFILE } from '../constants';

type ActivityItem =
    | (ServiceRequest & { type: 'Request' })
    | (Complaint & { type: 'Complaint', serviceType: string, category: string });

// ─── HELPERS ─────────────────────────────────────────────
const normalizeStatus = (s: string): string => {
    if (!s) return 'pending';
    return s.toLowerCase()
            .trim()
            .replace(/[\s-]+/g, '_')  // Replace spaces/dashes with underscores
            .replace(/inprogress/g, 'in_progress'); // Handle 'inprogress' case
};

const STAGE_INDEX_MAP: Record<string, number> = {
    'pending': 0, 'submitted': 0, 'active': 0, 'created': 0,
    'assigned': 1, 'officer_assigned': 1, 'under_review': 1,
    'in_progress': 2, 'working': 2, 'manager_review': 2, 'verification': 2,
    'resolved': 3, 'completed': 3, 'gm_approval': 3, 'approval_pending': 3,
    'closed': 4
};

const ApplicationTracker: React.FC = () => {
    const { serviceRequests, complaints } = useServiceComplaint();
    const { t, i18n } = useTranslation();
    const language = i18n.language;
    const [searchId, setSearchId] = useState('');
    const [viewMode, setViewMode] = useState<'my-activity' | 'search'>('my-activity');
    const [searchResult, setSearchResult] = useState<ActivityItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [realTimeData, setRealTimeData] = useState<Record<string, { stages: any[], status: string }>>({});
    
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
        const key = normalizeStatus(stageName);
        const map: any = {
            'pending': t('pending'),
            'submitted': t('submitted'),
            'assigned': t('assigned'),
            'officer_assigned': t('assigned'),
            'in_progress': t('inProgress'),
            'working': t('inProgress'),
            'resolved': t('resolved'),
            'completed': t('resolved'),
            'closed': t('closed'),
            'rejected': t('rejected'),
            'under_review': t('underReview'),
            'verification': t('verification'),
            'approval_pending': t('approvalPending')
        };
        return map[key] || stageName;
    };

    const getStageColor = (item: ActivityItem) => {
        const liveData = realTimeData[item.id];
        const status = (liveData?.status || item.status || '').toLowerCase();
        
        if (status === 'resolved' || status === 'closed' || status === 'completed') return 'bg-green-50 text-green-600 border-green-100';
        if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-100';
        if (status === 'active' || status === 'pending' || status === 'submitted') return 'bg-blue-50 text-blue-600 border-blue-100';
        return 'bg-amber-50 text-amber-600 border-amber-100';
    };

    // Get current user from storage for filtering
    const userStr = localStorage.getItem('aazhi_user');
    const token = localStorage.getItem('aazhi_token');
    
    let currentUser: any = MOCK_USER_PROFILE;
    try {
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
            currentUser = JSON.parse(userStr);
        }
    } catch (e) {
        console.error("Failed to parse user profile", e);
    }

    const isKioskMode = !token || currentUser?.id === 'guest_user' || currentUser?.id?.startsWith('dev_') || currentUser?.id === 'CIT-9921';

    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string>('');

    const safeServiceRequests = Array.isArray(serviceRequests) ? serviceRequests : [];
    const safeComplaints = Array.isArray(complaints) ? complaints : [];

    const myActivity = React.useMemo(() => {
        return [
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
                .map(c => ({ ...c, type: 'Complaint' as const, serviceType: c.complaintType }))
        ].sort((a, b) => {
            const dateA = new Date((a as any).createdAt || (a as any).timestamp || 0).getTime();
            const dateB = new Date((b as any).createdAt || (b as any).timestamp || 0).getTime();
            return dateB - dateA;
        });
    }, [safeServiceRequests, safeComplaints, isKioskMode, currentUser?.mobile, currentUser?.id]);

    const itemsToDisplay = viewMode === 'my-activity' ? myActivity : searchResult;

    useEffect(() => {
        let isMounted = true;
        let pollTimer: any = null;

        const fetchLatest = async () => {
            if (!itemsToDisplay.length) return;
            setIsSyncing(true);
            try {
                const results = await Promise.all(
                    itemsToDisplay.map(async (item) => {
                        if (!item.id) return null;
                        try {
                            const fresh = item.type === 'Complaint' 
                                ? await GrievanceService.trackComplaint(item.id)
                                : await GrievanceService.trackRequest(item.id);
                            return { id: item.id, stages: fresh.stages, status: fresh.status };
                        } catch {
                            return null;
                        }
                    })
                );

                if (isMounted) {
                    const newData: Record<string, { stages: any[], status: string }> = {};
                    results.forEach(res => { if (res) newData[res.id] = { stages: res.stages, status: res.status }; });
                    setRealTimeData(prev => ({ ...prev, ...newData }));
                    setLastSyncTime(new Date().toLocaleTimeString());
                }
            } finally {
                if (isMounted) setIsSyncing(false);
            }
        };
        
        fetchLatest();
        pollTimer = setInterval(fetchLatest, 5000);
        return () => { isMounted = false; if (pollTimer) clearInterval(pollTimer); };
    }, [itemsToDisplay.length]);

    const handleSearch = async () => {
        if (!searchId.trim()) return;
        setIsSearching(true);
        setSearchError('');
        try {
            const data = await GrievanceService.trackComplaint(searchId.trim());
            if (data) {
                setSearchResult([{ ...data, type: 'Complaint', serviceType: data.complaintType, category: data.category }]);
                setViewMode('search');
            } else {
                setSearchError(t('ticketNotFound') || 'Ticket not found.');
            }
        } catch (e) {
            setSearchError(t('searchError') || 'Search failed.');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans h-full flex flex-col">
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
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('trackTitle') || 'Recent Activity'}</h2>
                        <p className="text-slate-500 font-bold">{t('trackSubtitle') || 'Live application status tracking'}</p>
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
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                        <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                        {t('refresh')}
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {itemsToDisplay.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95">
                        <div className="relative inline-block">
                            {viewMode === 'search' ? <Search className="mx-auto mb-4 text-slate-300" size={48} /> : <FileText className="mx-auto mb-4 text-slate-300" size={48} />}
                            {viewMode === 'my-activity' && complaints.length > 0 && (
                                <div className="absolute -top-4 -right-8 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce shadow-lg whitespace-nowrap">
                                    {complaints.length} ITEMS FOUND BUT HIDDEN
                                </div>
                            )}
                        </div>
                        
                        <p className="text-xl font-black text-slate-800 mb-2">{viewMode === 'search' ? t('noResultsFound') : t('noActivityYet')}</p>
                        <p className="text-slate-400 font-medium mb-8 max-w-xs mx-auto">{viewMode === 'search' ? t('tryDifferentId') : t('activityWillAppear')}</p>
                    </div>
                ) : itemsToDisplay.map((item) => {
                    const liveData = realTimeData[item.id];
                    const activeStages = liveData?.stages || item.stages;
                    const activeStatus = liveData?.status || item.status;
                    
                    // Find the currently active stage, or fallback to the last completed one, or just the last one
                    const latestUpdate = activeStages && activeStages.length > 0 
                        ? (activeStages.find(s => s.status?.toLowerCase() === 'current') 
                           || [...activeStages].reverse().find(s => s.status?.toLowerCase() === 'completed')
                           || [...activeStages].reverse()[0])
                        : null;

                    const rawStage = (activeStatus || latestUpdate?.stage || item.stage || 'pending');
                    const derivedStage = normalizeStatus(rawStage);
                    
                    return (
                        <div key={item.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition animate-in slide-in-from-bottom-6 duration-500">
                            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start gap-6">
                                <div className="flex gap-5">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-inner ${item.type === 'Complaint' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-blue-50 border-blue-100 text-blue-500'}`}>
                                        {item.type === 'Complaint' ? <AlertTriangle size={28} /> : <FileText size={28} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${item.type === 'Complaint' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {item.type === 'Complaint' ? t('complaint') : t('request')}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 font-mono">{item.id}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900">{translateDynamic(item.serviceType)}</h3>
                                        <p className="text-slate-500 font-bold text-sm mt-1">{translateDynamic(item.category)}</p>
                                    </div>
                                </div>

                                <div className="text-right flex flex-col items-end">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${getStageColor(item)} shadow-sm`}>
                                        <span className="text-sm font-black uppercase tracking-wide">{translateStage(derivedStage)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><User size={14} /> {t('processingHierarchy')}</h4>
                                <div className="relative flex justify-between">
                                    <div className="absolute top-[14px] left-0 w-full h-[3px] bg-slate-200 rounded-full"></div>
                                    {(() => {
                                        const reqStages = ['submitted', 'officer_assigned', 'manager_review', 'gm_approval', 'resolved'];
                                        const compStages = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
                                        const stages = item.type === 'Request' ? reqStages : compStages;
                                        
                                        let currentIndex = STAGE_INDEX_MAP[derivedStage] || 0;
                                        const isResolved = derivedStage === 'resolved' || derivedStage === 'completed' || derivedStage === 'closed';
                                        if (isResolved) currentIndex = stages.length - 1;

                                        return stages.map((step, idx) => (
                                            <div key={idx} className="relative z-10 flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all 
                                                    ${idx <= currentIndex ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-200 text-slate-300'}`}>
                                                    {idx < currentIndex ? <CheckCircle size={16} /> : <span className="text-xs font-black">{idx + 1}</span>}
                                                </div>
                                                <span className={`absolute -bottom-6 whitespace-nowrap text-[9px] font-black uppercase tracking-tighter ${idx <= currentIndex ? 'text-slate-900' : 'text-slate-300'}`}>
                                                    {translateStage(step)}
                                                </span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {activeStages && activeStages.length > 0 && (
                                <div className="px-8 py-6 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">{t('latestUpdates')}</p>
                                    <div className="space-y-4">
                                        {[...activeStages].filter(s => s.status?.toLowerCase() !== 'pending').reverse().slice(0, 3).map((stage, idx) => (
                                            <div key={idx} className="flex gap-4 items-start">
                                                <div className="w-2 h-2 rounded-full mt-1.5 bg-blue-500"></div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{translateStage(stage.stage)}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">{translateStage(stage.status)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
