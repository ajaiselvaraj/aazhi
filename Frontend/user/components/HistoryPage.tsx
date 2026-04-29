import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Search, Filter, Archive, Download } from 'lucide-react';
import HistoryReceipt from './kiosk/HistoryReceipt';
import { useServiceComplaint, Complaint, ServiceRequest } from '../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';

type HistoryTab = 'all' | 'active' | 'resolved' | 'rejected';

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



const HistoryCard: React.FC<{ item: HistoryItem; onDownload: (item: HistoryItem) => void }> = ({ item, onDownload }) => {
  const isComplaint = item.itemType === 'complaint';
  const title = isComplaint ? (item as Complaint).complaintType : (item as ServiceRequest).serviceType;
  const description = item.description || (item as any).details || 'No description provided';
  const date = new Date(item.createdAt || (item as any).timestamp || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const department = item.category || (item as any).department || (isComplaint ? 'Complaint' : 'Service');

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
      
      {/* Left Side */}
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center
          ${isComplaint ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}
        `}>
          {isComplaint ? <AlertTriangle size={24} /> : <FileText size={24} />}
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-black text-blue-600 font-mono tracking-wider mb-1">{item.id}</span>
          <h3 className="text-base font-black text-slate-800 leading-tight mb-1 truncate">{title}</h3>
          <p className="text-slate-500 text-sm font-medium mb-2 truncate">{description}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1"><Clock size={12} /> {date}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="truncate">{department}</span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
        <StatusBadge status={item.status || 'active'} />
        <button 
          onClick={() => onDownload(item)} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 font-bold rounded-xl transition-colors duration-200"
          title="Download Receipt PDF"
        >
          <Download size={16} />
          <span className="text-sm">Download</span>
        </button>
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
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Get current user ID to filter records
  const userStr = localStorage.getItem('aazhi_user');
  let currentUserId: string | null = null;
  if (userStr && userStr !== 'undefined' && userStr !== 'null') {
    try {
      const user = JSON.parse(userStr);
      currentUserId = user.id;
    } catch (e) {}
  }

  // Filter to only items belonging to the current user (show all locally if offline/guest mode)
  const historyComplaints = complaints.filter(c => {
    if (!currentUserId) return true;
    return c.citizenId === currentUserId || (c as any).citizen_id === currentUserId;
  });
  const historyRequests = serviceRequests.filter(r => {
    if (!currentUserId) return true;
    return r.citizenId === currentUserId || (r as any).citizen_id === currentUserId;
  });

  const allItems: HistoryItem[] = [
    ...historyComplaints.map(c => ({ ...c, itemType: 'complaint' as const })),
    ...historyRequests.map(r => ({ ...r, itemType: 'service' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredItems = allItems.filter(item => {
    const isItemActive = item.status !== 'resolved' && item.status !== 'rejected';
    const matchesTab = activeTab === 'all' || item.status === activeTab || (activeTab === 'active' && isItemActive);
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
  const activeCount = allItems.length - resolvedCount - rejectedCount;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center">
            <Archive size={22} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Document Archive</h2>
            <p className="text-slate-500 font-medium text-sm">{t('historyDesc') || 'View and download your submitted applications and complaints'}</p>
          </div>
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
        <div className="flex flex-col gap-4 pb-8">
          {filteredItems.map(item => (
            <HistoryCard key={`${item.itemType}-${item.id}`} item={item} onDownload={setSelectedItem} />
          ))}
        </div>
      )}

      {/* PDF Receipt Modal */}
      {selectedItem && (
        <HistoryReceipt 
          data={selectedItem as any} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
};

export default HistoryPage;
