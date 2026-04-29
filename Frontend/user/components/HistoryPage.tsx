import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Archive, Download } from 'lucide-react';
import HistoryReceipt from './kiosk/HistoryReceipt';
import { useServiceComplaint, Complaint, ServiceRequest } from '../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';

type HistoryItem = (Complaint & { itemType: 'complaint' }) | (ServiceRequest & { itemType: 'service' });

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = (status || '').toLowerCase();
  
  if (normalized.includes('resolv') || normalized.includes('approv') || normalized.includes('complet')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle size={12} /> {status}
      </span>
    );
  }
  if (normalized.includes('reject')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
        <XCircle size={12} /> {status}
      </span>
    );
  }
  if (normalized.includes('submit') || normalized.includes('pend')) {
     return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={12} /> {status}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
      <Clock size={12} /> {status}
    </span>
  );
};

const HistoryCard: React.FC<{ item: HistoryItem; onDownload: (item: HistoryItem) => void }> = ({ item, onDownload }) => {
  const isComplaint = item.itemType === 'complaint';
  const title = isComplaint ? (item as Complaint).complaintType : (item as ServiceRequest).serviceType;
  const description = item.description || (item as any).details || 'No description provided';
  
  let dateStr = 'Unknown Date';
  try {
      const d = new Date(item.createdAt || (item as any).timestamp || Date.now());
      if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
  } catch (e) {}

  const department = item.category || (item as any).department || (isComplaint ? 'Complaint' : 'Service');
  const displayStatus = item.currentStage || item.stage || item.status || 'Submitted';

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
      
      {/* Left Side */}
      <div className="flex items-start gap-5 flex-1 min-w-0">
        <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center
          ${isComplaint ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}
        `}>
          {isComplaint ? <AlertTriangle size={28} /> : <FileText size={28} />}
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-black text-blue-600 font-mono tracking-wider mb-1">{item.id}</span>
          <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 truncate">{title}</h3>
          <p className="text-slate-500 text-sm font-medium mb-3 line-clamp-2">{department} • {description}</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1"><Clock size={12} /> Applied: {dateStr}</span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
        <StatusBadge status={displayStatus} />
        <button 
          onClick={() => onDownload(item)} 
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl transition-all duration-300 shadow-sm active:scale-95"
          title="Download Receipt PDF"
        >
          <Download size={16} />
          <span className="text-sm">Download Receipt</span>
        </button>
      </div>

    </div>
  );
};

const HistoryPage: React.FC = () => {
  const { complaints, serviceRequests } = useServiceComplaint();
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Get current user ID to filter records
  const userStr = localStorage.getItem('aazhi_user');
  let currentUserId: string | null = null;
  let currentUserMobile: string | null = null;
  
  if (userStr && userStr !== 'undefined' && userStr !== 'null') {
    try {
      const user = JSON.parse(userStr);
      currentUserId = user.id;
      currentUserMobile = user.mobile;
    } catch (e) {}
  }

  // Filter ONLY items belonging to the current user (by ID or mobile for safety)
  const isGuest = !currentUserId || currentUserId === 'guest_user' || currentUserId.startsWith('dev_');

  const historyComplaints = complaints.filter(c => {
    if (isGuest) return true; // If it's a shared kiosk session, show local recent items.
    return c.citizenId === currentUserId || (c as any).citizen_id === currentUserId || c.phone === currentUserMobile;
  });
  
  const historyRequests = serviceRequests.filter(r => {
    if (isGuest) return true;
    return r.citizenId === currentUserId || (r as any).citizen_id === currentUserId || r.phone === currentUserMobile;
  });

  const allItems: HistoryItem[] = [
    ...historyComplaints.map(c => ({ ...c, itemType: 'complaint' as const })),
    ...historyRequests.map(r => ({ ...r, itemType: 'service' as const }))
  ].sort((a, b) => {
      const timeA = new Date(a.createdAt || (a as any).timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || (b as any).timestamp || 0).getTime();
      return timeB - timeA;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-sans h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-slate-800 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-slate-200">
            <Archive size={26} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">My Submitted Records</h2>
            <p className="text-slate-500 font-bold text-sm mt-1">{t('historyDesc') || 'Downloadable archive of all your applications and complaints'}</p>
          </div>
        </div>
      </div>

      {/* History List */}
      {allItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95">
          <Archive size={56} className="text-slate-300 mb-6" />
          <p className="text-2xl font-black text-slate-800 mb-2">No Submissions Found</p>
          <p className="text-slate-500 font-medium max-w-sm">
            You haven't submitted any service requests or complaints yet. When you do, they will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-12">
          {allItems.map(item => (
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
