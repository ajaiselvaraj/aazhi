import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Search, Filter, Archive } from 'lucide-react';
import { useServiceComplaint, Complaint, ServiceRequest } from '../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';

type HistoryTab = 'all' | 'resolved' | 'rejected';

type HistoryItem = (Complaint & { itemType: 'complaint' }) | (ServiceRequest & { itemType: 'service' });

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle size={12} /> Resolved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
        <XCircle size={12} /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
      <Clock size={12} /> Active
    </span>
  );
};

const STAGES = ['Submitted', 'Officer Assigned', 'Manager Review', 'GM Approval', 'Resolved'];

const MiniTracker: React.FC<{ currentStage: string; isRejected: boolean }> = ({ currentStage, isRejected }) => {
  const stageIndex = STAGES.indexOf(currentStage);

  return (
    <div className="mt-4">
      <div className="relative flex justify-between items-center">
        {/* Background line */}
        <div className="absolute top-[10px] left-0 right-0 h-[2px] bg-slate-200 rounded-full" />
        {/* Active line */}
        <div
          className={`absolute top-[10px] left-0 h-[2px] rounded-full transition-all duration-700 ${isRejected ? 'bg-red-400' : 'bg-emerald-500'}`}
          style={{ width: stageIndex === -1 ? '0%' : `${(stageIndex / (STAGES.length - 1)) * 100}%` }}
        />
        {STAGES.map((step, idx) => {
          const isActive = idx <= stageIndex;
          const isCurrent = idx === stageIndex;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-1">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                ${isActive && isRejected && isCurrent ? 'bg-red-500 border-red-500 text-white ring-2 ring-red-200' :
                  isActive && !isRejected && isCurrent ? 'bg-emerald-500 border-emerald-500 text-white ring-2 ring-emerald-200' :
                  isActive ? 'bg-emerald-500 border-emerald-500 text-white' :
                  'bg-white border-slate-300'}
              `}>
                {isActive && !isCurrent && <CheckCircle size={10} strokeWidth={3} />}
                {isCurrent && isRejected && <XCircle size={10} strokeWidth={3} />}
                {isCurrent && !isRejected && <CheckCircle size={10} strokeWidth={3} />}
              </div>
              <p className={`text-[8px] font-black uppercase text-center leading-tight max-w-[50px]
                ${isActive && isRejected && isCurrent ? 'text-red-600' :
                  isActive ? 'text-emerald-700' : 'text-slate-400'}
              `}>{step.split(' ').map(w => w[0]).join('')}</p>
            </div>
          );
        })}
      </div>
      {isRejected && (
        <p className="text-[10px] font-bold text-red-500 mt-2 flex items-center gap-1">
          <XCircle size={10} /> Rejected at {currentStage}
        </p>
      )}
    </div>
  );
};

const HistoryCard: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const isRejected = item.status === 'rejected';
  const isResolved = item.status === 'resolved';
  const isComplaint = item.itemType === 'complaint';
  const title = isComplaint ? (item as Complaint).complaintType : (item as ServiceRequest).serviceType;
  const description = item.description;
  const date = new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden
      ${isRejected ? 'border-red-100 border-l-4 border-l-red-400' : isResolved ? 'border-emerald-100 border-l-4 border-l-emerald-400' : 'border-slate-100'}
    `}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center
              ${isComplaint ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}
            `}>
              {isComplaint ? <AlertTriangle size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider
                  ${isComplaint ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}
                `}>
                  {isComplaint ? 'Complaint' : 'Service'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
              </div>
              <h3 className="text-base font-black text-slate-800 leading-tight">{title}</h3>
            </div>
          </div>
          <StatusBadge status={item.status || 'active'} />
        </div>

        <p className="text-slate-500 text-sm font-medium mb-3 line-clamp-2">{description}</p>

        <div className="flex items-center gap-4 text-xs text-slate-400 font-bold mb-4">
          <span className="flex items-center gap-1"><Clock size={11} /> {date}</span>
          <span>•</span>
          <span>Stage: <span className="text-slate-600">{item.currentStage}</span></span>
          {'category' in item && (
            <>
              <span>•</span>
              <span>{item.category}</span>
            </>
          )}
        </div>

        <MiniTracker currentStage={item.currentStage} isRejected={isRejected} />

        {/* Rejection reason block */}
        {isRejected && item.rejection_reason && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-red-400 tracking-wider mb-1 flex items-center gap-1">
              <XCircle size={10} /> Rejection Reason
            </p>
            <p className="text-sm font-medium text-red-800">{item.rejection_reason}</p>
          </div>
        )}

        {isResolved && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
            <p className="text-xs font-bold text-emerald-700">This item has been successfully resolved.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryPage: React.FC = () => {
  const { complaints, serviceRequests } = useServiceComplaint();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<HistoryTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'complaint' | 'service'>('all');

  // Filter to only resolved or rejected items for the history view
  const historyComplaints = complaints.filter(c => c.status === 'resolved' || c.status === 'rejected');
  const historyRequests = serviceRequests.filter(r => r.status === 'resolved' || r.status === 'rejected');

  const allItems: HistoryItem[] = [
    ...historyComplaints.map(c => ({ ...c, itemType: 'complaint' as const })),
    ...historyRequests.map(r => ({ ...r, itemType: 'service' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredItems = allItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.status === activeTab;
    const matchesType = typeFilter === 'all' || item.itemType === typeFilter;
    const title = item.itemType === 'complaint' ? (item as Complaint).complaintType : (item as ServiceRequest).serviceType;
    const matchesSearch = !searchTerm || 
      title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesType && matchesSearch;
  });

  const resolvedCount = allItems.filter(i => i.status === 'resolved').length;
  const rejectedCount = allItems.filter(i => i.status === 'rejected').length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center">
            <Archive size={22} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">History</h2>
            <p className="text-slate-500 font-medium text-sm">{t('historyDesc') || 'View all resolved and rejected items'}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Total Archived', value: allItems.length, color: 'bg-slate-50 border-slate-200 text-slate-700' },
            { label: 'Resolved', value: resolvedCount, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { label: 'Rejected', value: rejectedCount, color: 'bg-red-50 border-red-200 text-red-700' },
          ].map(stat => (
            <div key={stat.label} className={`p-4 rounded-2xl border ${stat.color} text-center`}>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-[10px] font-black uppercase tracking-wider mt-0.5 opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Tab Filters */}
        <div className="flex bg-white border border-slate-200 p-1 rounded-2xl gap-1">
          {(['all', 'resolved', 'rejected'] as HistoryTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                ${activeTab === tab
                  ? tab === 'rejected' ? 'bg-red-600 text-white shadow-md' 
                    : tab === 'resolved' ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              {tab === 'resolved' && <CheckCircle size={12} />}
              {tab === 'rejected' && <XCircle size={12} />}
              {tab === 'all' && <Archive size={12} />}
              {tab === 'all' ? `All (${allItems.length})` : tab === 'resolved' ? `Resolved (${resolvedCount})` : `Rejected (${rejectedCount})`}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex bg-white border border-slate-200 p-1 rounded-2xl gap-1">
          <button onClick={() => setTypeFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${typeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>All Types</button>
          <button onClick={() => setTypeFilter('complaint')} className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${typeFilter === 'complaint' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            <AlertTriangle size={10} className="inline mr-1" />Complaints
          </button>
          <button onClick={() => setTypeFilter('service')} className={`px-3 py-2 rounded-xl text-xs font-black transition-all ${typeFilter === 'service' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            <FileText size={10} className="inline mr-1" />Services
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by title, ID, or description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        </div>
      </div>

      {/* History List */}
      {filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <Archive size={48} className="text-slate-300 mb-4" />
          <p className="text-xl font-black text-slate-500">No History Found</p>
          <p className="text-slate-400 font-medium mt-1">
            {activeTab === 'all'
              ? 'Resolved and rejected items will appear here.'
              : `No ${activeTab} items yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
          {filteredItems.map(item => (
            <HistoryCard key={`${item.itemType}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
