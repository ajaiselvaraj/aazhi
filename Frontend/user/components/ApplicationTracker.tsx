import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, AlertCircle, FileText, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { useServiceComplaint, ServiceRequest, Complaint } from '../contexts/ServiceComplaintContext';
import { TrackingStage } from '../types';
import { MOCK_USER_PROFILE } from '../constants';
import { useTranslation } from 'react-i18next';
import { GrievanceService } from '../services/civicService';

type ActivityItem =
    | (ServiceRequest & { type: 'Request' })
    | (Complaint & { type: 'Complaint', serviceType: string, category: string });

const ApplicationTracker: React.FC = () => {
    const { serviceRequests, complaints } = useServiceComplaint();
    const { t, i18n } = useTranslation();
    const language = i18n.language;
    const [searchId, setSearchId] = useState('');
    const [viewMode, setViewMode] = useState<'my-activity' | 'search'>('my-activity');
    const [searchResult, setSearchResult] = useState<ActivityItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    // Get current user from storage for filtering
    const userStr = localStorage.getItem('aazhi_user');
    const token = localStorage.getItem('aazhi_token');
    const currentUser = userStr ? JSON.parse(userStr) : MOCK_USER_PROFILE;

    // Kiosk/Offline Mode Detection: If no real token, we treat all local items as visible
    const isKioskMode = !token || currentUser.id === 'guest_user' || currentUser.id?.startsWith('dev_') || currentUser.id === 'CIT-9921';

    // Normalize data for unified view
    const myActivity: ActivityItem[] = [
        ...serviceRequests
            .filter(r => {
                if (isKioskMode) {
                    // In kiosk/dev mode, show ALL locally stored items to ensure visibility after bypass login
                    return true; 
                }
                return r.phone === currentUser.mobile || r.citizenId === currentUser.id;
            })
            .map(r => ({ ...r, type: 'Request' as const })),
        ...complaints
            .filter(c => {
                if (isKioskMode) {
                    return true;
                }
                return c.phone === currentUser.mobile || c.citizenId === currentUser.id;
            })
            .map(c => ({ ...c, type: 'Complaint' as const, serviceType: c.complaintType }))
    ].sort((a, b) => {
        const dateA = new Date((a as any).createdAt || (a as any).timestamp || 0).getTime();
        const dateB = new Date((b as any).createdAt || (b as any).timestamp || 0).getTime();
        return dateB - dateA;
    });

    const handleSearch = async () => {
        if (!searchId.trim()) return;
        setIsSearching(true);
        setSearchError('');
        setSearchResult([]);

        // 1. Search locally first
        const localRequests = serviceRequests.filter(req =>
            req.id.toLowerCase() === searchId.toLowerCase().trim() ||
            (req.phone && req.phone === searchId.trim())
        ).map(r => ({ ...r, type: 'Request' as const }));

        const localComplaints = complaints.filter(c =>
            c.id.toLowerCase() === searchId.toLowerCase().trim() ||
            c.phone === searchId.trim()
        ).map(c => ({ ...c, type: 'Complaint' as const, serviceType: c.complaintType }));

        const localResults = [...localRequests, ...localComplaints];

        if (localResults.length > 0) {
            setSearchResult(localResults);
            setViewMode('search');
            setIsSearching(false);
            return;
        }

        // 2. Search Backend if not found locally
        try {
            console.log(`🌐 [Tracker] Searching backend for: ${searchId}`);
            
            // Try Request first
            let apiResult: ActivityItem[] = [];
            try {
                const req = await GrievanceService.trackRequest(searchId.trim());
                if (req) apiResult.push({ ...req, type: 'Request' as const });
            } catch (e) {
                // Ignore failure, try complaint
            }

            if (apiResult.length === 0) {
                try {
                    const comp = await GrievanceService.trackComplaint(searchId.trim());
                    if (comp) {
                        apiResult.push({ 
                            ...comp, 
                            type: 'Complaint' as const, 
                            serviceType: comp.request_type || comp.complaintType || comp.category,
                            category: comp.department || comp.category
                        });
                    }
                } catch (e) {
                   // Ignore
                }
            }

            if (apiResult.length > 0) {
                setSearchResult(apiResult);
            } else {
                setSearchError(t('noResultsFound'));
            }
        } catch (error: any) {
            console.error("Tracker search failed", error);
            setSearchError(t('searchError') || "Error searching for application");
        } finally {
            setIsSearching(false);
            setViewMode('search');
        }
    };

    const getStageColor = (item: ActivityItem) => {
        const isResolved = item.status === 'resolved' || item.stage === 'resolved' || item.currentStage === 'Resolved';
        const isRejected = item.status === 'rejected' || item.stage === 'rejected' || item.currentStage === 'Rejected';
        
        if (isResolved) return 'text-green-600 bg-green-50 border-green-200';
        if (isRejected) return 'text-red-600 bg-red-50 border-red-200';
        return 'text-blue-600 bg-blue-50 border-blue-200';
    };

    const getSLA = (item: ActivityItem, derivedStage: string) => {
        if (derivedStage === 'resolved' || derivedStage === 'closed' || derivedStage === 'rejected') return null;
        
        let totalDays = 3; 
        if (item.type === 'Request') totalDays = 15;
        if (item.category?.toLowerCase().includes('electricity')) totalDays = 7;
        
        const createdDate = new Date((item as any).createdAt || (item as any).timestamp || 0);
        const msSinceCreation = Date.now() - createdDate.getTime();
        const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24));
        
        const daysLeft = totalDays - daysSinceCreation;
        if (daysLeft < 0) return { expired: true, text: `Overdue by ${Math.abs(daysLeft)} Days` };
        if (daysLeft === 0) return { expired: false, warning: true, text: `Due Today` };
        return { expired: false, text: `${daysLeft} Days Left` };
    };

    const itemsToDisplay = viewMode === 'my-activity' ? myActivity : searchResult;

    const translateStage = (stage: string): string => {
        if (!stage) return '';
        
        // Normalize snake_case strings typically from DB to Title Case mapping format
        const normalizedInput = stage.includes('_') 
            ? stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            : stage;

        const stageMap: Record<string, string> = {
            'Submitted': t('submitted'),
            'Officer Assigned': t('officerAssigned'),
            'Manager Review': t('managerReview'),
            'Gm Approval': t('gmApproval'), // handles normalized form
            'GM Approval': t('gmApproval'),
            'Resolved': t('resolved'),
            'Completed': t('completed'),
            'Rejected': t('rejected'),
            'Closed': t('closed'),
            'Pending': t('pending'),
            'In Progress': t('inProgress'),
            'Under Review': t('underReview'),
            'Current': t('currentActivity') || 'Current',
        };
        
        return stageMap[normalizedInput] || stageMap[stage] || normalizedInput;
    };

    const translateDynamic = (text: string): string => {
        if (!text) return text;

        // First: if it looks like an i18n key (serv_*, dept_*, issue_*, etc.), translate directly
        if (/^(serv_|dept_|issue_|civic_|comp_|emer_)/.test(text)) {
            const translated = t(text);
            // t() returns the key itself if not found – only use if it's actually different
            if (translated && translated !== text) return translated;
        }

        // Second: map legacy English strings stored before key-based approach was introduced
        const map: Record<string, string> = {
            'Electricity': t('power') || 'Electricity',
            'Electricity Board': t('dept_eb') || 'Electricity Board',
            'Water Supply & Sewage': t('dept_water') || 'Water Supply & Sewage',
            'Water Supply': t('dept_water') || 'Water Supply',
            'Gas Distribution': t('dept_gas') || 'Gas Distribution',
            'Municipal Corp': t('dept_municipal') || 'Municipal Corp',
            'Municipal Corporation': t('dept_municipal') || 'Municipal Corporation',
            'Water': t('water') || 'Water',
            'Gas': t('gas') || 'Gas',
            'Waste Management': t('serv_WasteManagement') || 'Waste Management',
            'New Connection': t('serv_NewConnection') || 'New Connection',
            'Pipeline Leak': t('serv_PipelineLeak') || 'Pipeline Leak',
            'Power Cut': t('powerOutage') || 'Power Cut',
            'Leakage': t('issue_pipelineLeak') || 'Leakage',
            'Gas Leak (Urgent)': t('issue_gasLeak') || 'Gas Leak (Urgent)',
            'Street light not working': t('issue_streetLightNotWorking') || 'Street light not working',
            'Ward 5': t('ward5') || 'Ward 5',
            'Ward 10': t('ward10') || 'Ward 10',
            'RS Puram': t('rsPuram') || 'RS Puram',
            'Gandhipuram, Ward 5': t('gandhipuramWard5') || 'Gandhipuram, Ward 5'
        };

        return map[text] || text;
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

            {/* Search Bar (Only visible in search mode) */}
            {viewMode === 'search' && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 animate-in fade-in slide-in-from-top-4">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">{t('searchByIdOrMobile')}</label>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            placeholder={t('searchPlaceholder') || "e.g. SR-12345 or 9876543210"}
                            className="flex-1 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-xl px-6 py-4 text-lg font-bold outline-none transition text-slate-900 placeholder:text-slate-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            disabled={isSearching}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className={`bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-blue-200 ${isSearching ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSearching ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Search size={20} />
                            )}
                            {isSearching ? t('searching') || 'Searching...' : t('search')}
                        </button>
                    </div>
                    {searchError && (
                        <p className="text-red-500 text-sm font-bold mt-3 flex items-center gap-1 animate-in fade-in">
                            <AlertCircle size={14} /> {searchError}
                        </p>
                    )}
                </div>
            )}

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
                        
                        <div className="flex gap-4 justify-center">
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
                            >
                                <RefreshCw size={18} />
                                REFRESH SYNC
                            </button>
                            {(viewMode === 'my-activity' && complaints.length > 0) && (
                                <button 
                                    onClick={() => {
                                        localStorage.removeItem('aazhi_token'); 
                                        window.location.reload();
                                    }}
                                    className="px-6 py-3 bg-amber-100 text-amber-700 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-amber-200 transition-all"
                                >
                                    FORCE GUEST SYNC
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    itemsToDisplay.map((item) => {
                        const latestUpdate = item.stages && item.stages.length > 0 ? item.stages[item.stages.length - 1] : null;
                        
                        // 1. Implementation of Normalization Function
                        const normalizeStatus = (s: string): string => {
                            if (!s) return 'pending';
                            return s.toLowerCase()
                                    .trim()
                                    .replace(/[\s-]+/g, '_')  // Replace spaces/dashes with underscores
                                    .replace(/inprogress/g, 'in_progress'); // Handle 'inprogress' case
                        };

                        const rawStage = (latestUpdate?.stage || item.stage || item.currentStage || item.status || 'pending');
                        const derivedStage = normalizeStatus(rawStage);
                        
                        const badgeIsRejected = derivedStage === 'rejected' || item.status === 'rejected';
                        
                        console.log(`🔍 [Tracker Debug] Ticket: ${item.id} | Raw: "${rawStage}" | Normalized: "${derivedStage}"`);

                        return (
                            <div key={item.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition group animate-in slide-in-from-bottom-6 duration-500">
                                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start gap-6">
                                    <div className="flex gap-5">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-inner
                                            ${item.type === 'Complaint' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-blue-50 border-blue-100 text-blue-500'}`}>
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
                                            <p className="text-slate-500 font-bold text-sm mt-1">{translateDynamic(item.category)} • <Clock size={12} className="inline mb-0.5" /> {new Date((item as any).createdAt || (item as any).timestamp || 0).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN')}</p>
                                        </div>
                                    </div>

                                    <div className="text-right w-full md:w-auto bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-end">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">{badgeIsRejected ? t('rejectionStatus') || 'Rejection Status' : t('currentStatusLevel')}</p>
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${getStageColor(item)} shadow-sm`}>
                                            <div className="relative flex h-2.5 w-2.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current`}></span>
                                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-current`}></span>
                                            </div>
                                            <span className="text-sm font-black uppercase tracking-wide">
                                                {badgeIsRejected ? t('rejected') : translateStage(derivedStage)}
                                            </span>
                                        </div>
                                        
                                        {(() => {
                                            const sla = getSLA(item, derivedStage);
                                            if (!sla) return null;
                                            return (
                                                <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest shadow-sm
                                                    ${sla.expired ? 'bg-red-50 text-red-600 border-red-200 shadow-red-100' : 
                                                      sla.warning ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                                                `}>
                                                    <Clock size={12} className={sla.expired ? 'animate-pulse' : ''} /> SLA: {sla.text}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Progress Stepper for Context */}
                            <div className="p-8 bg-slate-50">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                                    <User size={14} /> {t('processingHierarchy')}
                                </h4>
                                <div className="relative flex justify-between">
                                    {/* Line */}
                                    <div className="absolute top-[14px] left-0 w-full h-[3px] bg-slate-200 rounded-full -z-0"></div>

                                    {(() => {
                                        const reqStages = ['submitted', 'officer_assigned', 'manager_review', 'gm_approval', 'resolved'];
                                        const compStages = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];

                                        // 2. Implementation of Robust Status Mapping (Safe replacement for indexOf)
                                        const STAGE_INDEX_MAP: Record<string, number> = {
                                            'pending': 0, 'submitted': 0, 'active': 0, 'created': 0,
                                            'assigned': 1, 'officer_assigned': 1,
                                            'in_progress': 2, 'working': 2, 'manager_review': 2,
                                            'resolved': 3, 'completed': 3, 'gm_approval': 3,
                                            'closed': 4
                                        };

                                        const stages = item.type === 'Request' ? reqStages : compStages;
                                        
                                        // 3. Secure Index Calculation with Fallback
                                        let currentIndex = STAGE_INDEX_MAP[derivedStage];
                                        if (currentIndex === undefined) {
                                            console.warn(`⚠️ [Tracker] Unknown status "${derivedStage}", defaulting to index 0`);
                                            currentIndex = 0; 
                                        }

                                        const isResolved = derivedStage === 'resolved' || (item.status as string) === 'resolved';
                                        const isClosed = derivedStage === 'closed' || (item.status as string) === 'closed';
                                        const isRejected = derivedStage === 'rejected' || (item.status as string) === 'rejected';

                                        if (isResolved) currentIndex = item.type === 'Request' ? 4 : 3;
                                        if (isClosed) currentIndex = 4;

                                        const progressPercent = (currentIndex / (stages.length - 1)) * 100;

                                        return (
                                            <>
                                                {/* Active Line */}
                                                <div className={`absolute top-[14px] left-0 h-[3px] rounded-full -z-0 transition-all duration-1000 ${isRejected ? 'bg-red-500' : 'bg-slate-800'}`} style={{ width: `${progressPercent}%` }}></div>

                                                {/* Nodes */}
                                                {stages.map((step, idx) => {
                                                    const isActive = idx <= currentIndex;
                                                    const isCurrent = idx === currentIndex;
                                                    
                                                    // Map keys to display strings for fallback if translation is missing
                                                    const displayMap: Record<string, string> = {
                                                        'submitted': 'Submitted', 'officer_assigned': 'Officer Assigned', 'manager_review': 'Manager Review', 'gm_approval': 'GM Approval', 'resolved': 'Resolved',
                                                        'pending': 'Pending', 'assigned': 'Assigned', 'in_progress': 'In Progress', 'closed': 'Closed'
                                                    };
                                                    const displayStr = displayMap[step] || step;

                                                    return (
                                                        <div key={step} className="relative z-10 flex flex-col items-center gap-2 w-24">
                                                            <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all duration-300
                                                                ${isActive ? (isRejected && isCurrent ? 'bg-red-500 border-red-500 text-white' : 'bg-slate-800 border-slate-800 text-white') : 'bg-white border-slate-300 text-slate-300'}
                                                                ${isCurrent ? (isRejected ? 'ring-4 ring-red-100 scale-110' : 'ring-4 ring-slate-200 scale-110') : ''}
                                                            `}>
                                                                {isActive && (isRejected && isCurrent ? <AlertTriangle size={14} strokeWidth={4} /> : <CheckCircle size={14} strokeWidth={4} />)}
                                                            </div>
                                                            <p className={`text-[9px] font-black uppercase text-center leading-tight transition-colors
                                                                ${isActive ? (isRejected && isCurrent ? 'text-red-500' : 'text-slate-800') : 'text-slate-400'}
                                                            `}>{translateStage(displayStr)}</p>
                                                        </div>
                                                    )
                                                })}
                                            </>
                                        );
                                    })()}
                                </div>
                                {item.status === 'rejected' && item.rejection_reason && (
                                    <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start animate-in zoom-in-95">
                                        <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-xs font-black text-red-600 uppercase tracking-wider mb-1">{t('rejectionReason') || 'Rejection Reason'}</p>
                                            <p className="text-sm font-bold text-red-900 leading-relaxed">{item.rejection_reason}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Detailed History Log (Collapsible if needed, but showing recent for now) */}
                            {item.stages && item.stages.length > 0 && (
                                <div className="px-8 py-6 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">{t('latestUpdates')}</p>
                                    <div className="space-y-4">
                                        {[...item.stages].reverse().slice(0, 3).map((stage, idx) => (
                                            <div key={idx} className="flex gap-4 items-start">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${stage.status === 'Current' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                    {idx !== item.stages.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1"></div>}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{translateStage(stage.stage)}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">
                                                        {stage.updatedAt ? new Date(stage.updatedAt).toLocaleString(language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN') : t('pending')} • {translateStage(stage.status)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ApplicationTracker;
