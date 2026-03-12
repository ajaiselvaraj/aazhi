import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, AlertCircle, FileText, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { useServiceComplaint, ServiceRequest, Complaint } from '../contexts/ServiceComplaintContext';
import { TrackingStage } from '../types';
import { MOCK_USER_PROFILE } from '../constants';

type ActivityItem =
    | (ServiceRequest & { type: 'Request' })
    | (Complaint & { type: 'Complaint', serviceType: string, category: string });

const ApplicationTracker: React.FC = () => {
    const { serviceRequests, complaints } = useServiceComplaint();
    const [searchId, setSearchId] = useState('');
    const [viewMode, setViewMode] = useState<'my-activity' | 'search'>('my-activity');
    const [searchResult, setSearchResult] = useState<ActivityItem[]>([]);

    // Normalize data for unified view
    const myActivity: ActivityItem[] = [
        ...serviceRequests
            .filter(r => r.phone === MOCK_USER_PROFILE.mobile)
            .map(r => ({ ...r, type: 'Request' as const })),
        ...complaints
            .filter(c => c.phone === MOCK_USER_PROFILE.mobile)
            .map(c => ({ ...c, type: 'Complaint' as const, serviceType: c.complaintType }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

    const getStageColor = (stage: string) => {
        if (['Completed', 'Resolved', 'Closed'].includes(stage)) return 'text-green-600 bg-green-50 border-green-200';
        if (['Rejected'].includes(stage)) return 'text-red-600 bg-red-50 border-red-200';
        if (['GM Approval', 'Manager Review'].includes(stage)) return 'text-purple-600 bg-purple-50 border-purple-200';
        return 'text-blue-600 bg-blue-50 border-blue-200';
    };

    const itemsToDisplay = viewMode === 'my-activity' ? myActivity : searchResult;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans h-full flex flex-col">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Track Status</h2>
                    <p className="text-slate-500 font-medium text-lg">Monitor your requests and complaints in real-time.</p>
                </div>

                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                    <button
                        onClick={() => setViewMode('my-activity')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'my-activity' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        My Activity
                    </button>
                    <button
                        onClick={() => setViewMode('search')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'search' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Search Bar (Only visible in search mode) */}
            {viewMode === 'search' && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 animate-in fade-in slide-in-from-top-4">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Search by ID or Mobile</label>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            placeholder="e.g. SR-12345 or 9876543210"
                            className="flex-1 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-xl px-6 py-4 text-lg font-bold outline-none transition text-slate-900 placeholder:text-slate-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-blue-200"
                        >
                            <Search size={20} /> Search
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
                                <p className="text-xl font-bold text-slate-500">No results found.</p>
                                <p className="text-slate-400 font-medium">Try a different ID or Mobile Number.</p>
                            </>
                        ) : (
                            <>
                                <FileText className="mx-auto mb-4 text-slate-300" size={48} />
                                <p className="text-xl font-bold text-slate-500">No activity yet.</p>
                                <p className="text-slate-400 font-medium">Your requests and complaints will appear here.</p>
                            </>
                        )}
                    </div>
                ) : (
                    itemsToDisplay.map((item) => (
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
                                                {item.type}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 font-mono">{item.id}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900">{item.serviceType}</h3>
                                        <p className="text-slate-500 font-bold text-sm mt-1">{item.category} • <Clock size={12} className="inline mb-0.5" /> {new Date(item.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="text-right w-full md:w-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Current Status / Level</p>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStageColor(item.currentStage)}`}>
                                        <div className="relative flex h-2.5 w-2.5">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current`}></span>
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-current`}></span>
                                        </div>
                                        <span className="text-sm font-black uppercase tracking-wide">
                                            {item.currentStage || 'Submitted'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Stepper for Context */}
                            <div className="p-8 bg-slate-50">
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2">
                                    <User size={14} /> Processing Hierarchy
                                </h4>
                                <div className="relative flex justify-between">
                                    {/* Line */}
                                    <div className="absolute top-[14px] left-0 w-full h-[3px] bg-slate-200 rounded-full -z-0"></div>

                                    {/* Active Line (Calculated mostly visually) */}
                                    <div className={`absolute top-[14px] left-0 h-[3px] bg-slate-800 rounded-full -z-0 transition-all duration-1000
                                        ${item.currentStage === 'Submitted' ? 'w-[0%]' :
                                            item.currentStage === 'Officer Assigned' ? 'w-[25%]' :
                                                item.currentStage === 'Manager Review' ? 'w-[50%]' :
                                                    item.currentStage === 'GM Approval' ? 'w-[75%]' :
                                                        'w-[100%]'}`}></div>

                                    {/* Nodes */}
                                    {['Submitted', 'Officer Assigned', 'Manager Review', 'GM Approval', 'Resolved'].map((step, idx) => {
                                        // Simple logic: if current stage index >= step index, it's active
                                        const stages = ['Submitted', 'Officer Assigned', 'Manager Review', 'GM Approval', 'Resolved'];
                                        const currentIndex = stages.indexOf(item.currentStage) === -1 ? 0 : stages.indexOf(item.currentStage); // Default to 0 if unknown

                                        const isActive = idx <= currentIndex;
                                        const isCurrent = idx === currentIndex;

                                        return (
                                            <div key={step} className="relative z-10 flex flex-col items-center gap-2 w-24">
                                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all duration-300
                                                    ${isActive ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-300'}
                                                    ${isCurrent ? 'ring-4 ring-slate-200 scale-110' : ''}
                                                `}>
                                                    {isActive && <CheckCircle size={14} strokeWidth={4} />}
                                                </div>
                                                <p className={`text-[9px] font-black uppercase text-center leading-tight transition-colors
                                                    ${isActive ? 'text-slate-800' : 'text-slate-400'}
                                                `}>{step}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Detailed History Log (Collapsible if needed, but showing recent for now) */}
                            {item.stages && item.stages.length > 0 && (
                                <div className="px-8 py-6 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Latest Updates</p>
                                    <div className="space-y-4">
                                        {[...item.stages].reverse().slice(0, 3).map((stage, idx) => (
                                            <div key={idx} className="flex gap-4 items-start">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${stage.status === 'Current' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                    {idx !== item.stages.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1"></div>}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">{stage.stage}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">
                                                        {stage.updatedAt ? new Date(stage.updatedAt).toLocaleString() : 'Pending'} • {stage.status}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ApplicationTracker;
