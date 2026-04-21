import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, AlertCircle, FileText, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { useServiceComplaint, ServiceRequest, Complaint } from '../contexts/ServiceComplaintContext';
import { TrackingStage } from '../types';
import { MOCK_USER_PROFILE } from '../constants';
import { useTranslation } from 'react-i18next';

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

    // Normalize data for unified view
    const myActivity: ActivityItem[] = [
        ...serviceRequests
            .filter(r => r.phone === MOCK_USER_PROFILE.mobile || !r.phone || r.citizenId === MOCK_USER_PROFILE.id)
            .map(r => ({ ...r, type: 'Request' as const })),
        ...complaints
            .filter(c => c.phone === MOCK_USER_PROFILE.mobile || !c.phone || c.citizenId === MOCK_USER_PROFILE.id)
            .map(c => ({ ...c, type: 'Complaint' as const, serviceType: c.complaintType }))
    ].sort((a, b) => {
        const dateA = new Date((a as any).createdAt || (a as any).timestamp || 0).getTime();
        const dateB = new Date((b as any).createdAt || (b as any).timestamp || 0).getTime();
        return dateB - dateA;
    });

    const handleSearch = () => {
        if (!searchId.trim()) return;

        const foundRequests = serviceRequests.filter(req =>
            req.id.toLowerCase() === searchId.toLowerCase().trim() ||
            (req.phone && req.phone === searchId.trim())
        ).map(r => ({ ...r, type: 'Request' as const }));

        const foundComplaints = complaints.filter(c =>
            c.id.toLowerCase() === searchId.toLowerCase().trim() ||
            c.phone === searchId.trim()
        ).map(c => ({ ...c, type: 'Complaint' as const, serviceType: c.complaintType }));

        setSearchResult([...foundRequests, ...foundComplaints]);
        setViewMode('search');
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
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'my-activity' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {t('myActivity')}
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
                        />
                        <button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-blue-200"
                        >
                            <Search size={20} /> {t('search')}
                        </button>
                    </div>
                </div>
            )}

            {/* List View */}
            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {itemsToDisplay.length === 0 ? (
                    <div className="text-center py-20 opacity-50 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                        {viewMode === 'search' ? (
                            <>
                                <Search className="mx-auto mb-4 text-slate-300" size={48} />
                                <p className="text-xl font-bold text-slate-500">{t('noResultsFound')}</p>
                                <p className="text-slate-400 font-medium">{t('tryDifferentId')}</p>
                            </>
                        ) : (
                            <>
                                <FileText className="mx-auto mb-4 text-slate-300" size={48} />
                                <p className="text-xl font-bold text-slate-500">{t('noActivityYet')}</p>
                                <p className="text-slate-400 font-medium">{t('activityWillAppear')}</p>
                            </>
                        )}
                    </div>
                ) : (
                    itemsToDisplay.map((item) => {
                        const latestUpdate = item.stages && item.stages.length > 0 ? item.stages[item.stages.length - 1] : null;
                        // Root cause fix: Normalize 'In Progress' -> 'in_progress' for array index matching
                        const rawStage = (latestUpdate?.stage || item.stage || item.currentStage || item.status || 'pending').toLowerCase();
                        const derivedStage = rawStage.replace(/\s+/g, '_');
                        const badgeIsRejected = derivedStage === 'rejected' || item.status === 'rejected';

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

                                        const stages = item.type === 'Request' ? reqStages : compStages;
                                        
                                        // currentVal comes from derivedStage established securely before render loop
                                        let currentVal = derivedStage;

                                        let currentIndex = stages.indexOf(currentVal);
                                        if (currentIndex === -1) currentIndex = 0; // fallback
                                        const isResolved = currentVal === 'resolved' || (item.status as string) === 'resolved' || (item.stage as string) === 'resolved' || (typeof item.currentStage === 'string' && item.currentStage.toLowerCase() === 'resolved');
                                        const isClosed = currentVal === 'closed' || (item.status as string) === 'closed' || (item.stage as string) === 'closed' || (typeof item.currentStage === 'string' && item.currentStage.toLowerCase() === 'closed');
                                        const isRejected = currentVal === 'rejected' || (item.status as string) === 'rejected' || (item.stage as string) === 'rejected' || (typeof item.currentStage === 'string' && item.currentStage.toLowerCase() === 'rejected');

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
