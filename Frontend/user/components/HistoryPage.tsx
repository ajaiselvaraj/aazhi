import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, Archive, Download, Search, Filter, ArrowLeft, AlertCircle, RefreshCw, CreditCard, X, Receipt, Zap, Flame, Droplets, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HistoryReceipt from './kiosk/HistoryReceipt';
import TransactionReceipt from './kiosk/TransactionReceipt';
import RazorpayCheckout, { Toast } from './RazorpayCheckout';
import KioskInput from './kiosk/KioskInput';
import { useServiceComplaint, Complaint, ServiceRequest } from '../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/apiClient';
import { useOrientation } from '../contexts/OrientationContext';

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
  const navigate = useNavigate();
  const isComplaint = item.itemType === 'complaint';
  const title = isComplaint ? (item as Complaint).complaintType : (item as ServiceRequest).serviceType;
  const description = item.description || (item as any).details || 'No description provided';
  const { isVertical } = useOrientation();
  
  const formatTimestamp = (val: any) => {
    if (!val) return 'Date unavailable';
    const raw = String(val);
    const normalised = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const utcStr = /[+\-Z]/.test(normalised.slice(10)) ? normalised : normalised + 'Z';
    const d = new Date(utcStr);
    if (isNaN(d.getTime())) return 'Date unavailable';
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/am|pm/i, m => m.toUpperCase());
  };
  const dateStr = formatTimestamp(item.createdAt || (item as any).timestamp);

  const department = item.category || (item as any).department || (isComplaint ? 'Complaint' : 'Service');
  const displayStatus = item.currentStage || item.stage || item.status || 'Submitted';

  return (
    <div 
      onClick={() => navigate(`/track/${item.id}`)}
      className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer active:scale-[0.99] transition-all duration-300 ${isVertical ? 'p-8 flex flex-col gap-6' : 'p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between'}`}
    >
      
      {/* Left Side */}
      <div className={`flex items-start ${isVertical ? 'gap-6' : 'gap-5'} flex-1 min-w-0`}>
        <div className={`shrink-0 rounded-2xl flex items-center justify-center
          ${isVertical ? 'w-16 h-16' : 'w-14 h-14'}
          ${isComplaint ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}
        `}>
          {isComplaint ? <AlertTriangle size={isVertical ? 32 : 28} /> : <FileText size={isVertical ? 32 : 28} />}
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <span className={`font-black text-blue-600 font-mono tracking-wider mb-1 ${isVertical ? 'text-sm' : 'text-xs'}`}>{item.id}</span>
          <h3 className={`font-black text-slate-900 leading-tight mb-1 truncate ${isVertical ? 'text-xl' : 'text-lg'}`}>{title}</h3>
          <p className={`text-slate-500 font-medium mb-3 line-clamp-2 ${isVertical ? 'text-base' : 'text-sm'}`}>{department} • {description}</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1"><Clock size={12} /> Applied: {dateStr}</span>
          </div>
        </div>

        {isVertical && (
          <div className="shrink-0">
            <StatusBadge status={displayStatus} />
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className={`
        ${isVertical 
          ? 'flex flex-row gap-4 w-full pt-4 border-t border-slate-100 justify-end' 
          : 'flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0'
        }
      `}>
        {!isVertical && <StatusBadge status={displayStatus} />}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDownload(item);
          }} 
          className={`flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl transition-all duration-300 shadow-sm active:scale-95
            ${isVertical ? 'w-full py-4 text-base' : 'px-5 py-2.5 text-sm'}
          `}
          title="Download Receipt PDF"
        >
          <Download size={18} />
          <span>Download Receipt</span>
        </button>
      </div>

    </div>
  );
};

const TransactionCard: React.FC<{ txn: any; onClick: () => void }> = ({ txn, onClick }) => {
  const { isVertical } = useOrientation();
  const getServiceConfig = () => {
    const sType = (txn.service_type || '').toLowerCase();
    if (sType.includes('electric') || sType.includes('eb')) {
      return { icon: <Zap size={isVertical ? 28 : 24} />, bg: 'bg-amber-50 text-amber-600', name: 'Electricity Bill' };
    } else if (sType.includes('gas')) {
      return { icon: <Flame size={isVertical ? 28 : 24} />, bg: 'bg-orange-50 text-orange-600', name: 'Gas Bill' };
    } else if (sType.includes('water')) {
      return { icon: <Droplets size={isVertical ? 28 : 24} />, bg: 'bg-blue-50 text-blue-600', name: 'Water Bill' };
    } else if (sType.includes('property') || sType.includes('tax') || sType.includes('municipal')) {
      return { icon: <Landmark size={isVertical ? 28 : 24} />, bg: 'bg-purple-50 text-purple-600', name: 'Property Tax' };
    }
    return { icon: <FileText size={isVertical ? 28 : 24} />, bg: 'bg-slate-50 text-slate-600', name: 'Utility Payment' };
  };

  const getStatusBadge = () => {
    const status = txn.payment_status;
    if (status === 'captured') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          Success
        </span>
      );
    } else if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
          Failed
        </span>
      );
    } else if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
          Cancelled
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          Pending
        </span>
      );
    }
  };

  const config = getServiceConfig();
  const date = txn.paid_at || txn.created_at ? new Date(txn.paid_at || txn.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : 'N/A';

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex items-center justify-between cursor-pointer active:scale-[0.99] select-none ${isVertical ? 'p-8' : 'p-6'}`}
    >
      <div className="flex items-center gap-5 min-w-0 flex-1">
        <div className={`shrink-0 rounded-2xl flex items-center justify-center ${isVertical ? 'w-16 h-16' : 'w-14 h-14'} ${config.bg}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`font-black text-blue-600 font-mono tracking-wider mb-1 block ${isVertical ? 'text-xs' : 'text-[10px]'}`}>
            ID: {txn.receipt_number || txn.id.substring(0, 8)}
          </span>
          <h3 className={`font-black text-slate-900 leading-tight mb-1 truncate ${isVertical ? 'text-xl' : 'text-lg'}`}>
            {config.name}
          </h3>
          <p className={`text-slate-500 font-semibold ${isVertical ? 'text-sm' : 'text-xs'}`}>
            {txn.account_number ? `Account: ${txn.account_number}` : `Bill No: ${txn.bill_number || 'N/A'}`} • {date}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 ml-4">
        <span className={`font-black text-slate-950 ${isVertical ? 'text-3xl' : 'text-2xl'}`}>
          ₹{Number(txn.amount).toFixed(2)}
        </span>
        {getStatusBadge()}
      </div>
    </div>
  );
};

const HistoryPage: React.FC = () => {
  const { complaints, serviceRequests } = useServiceComplaint();
  const { t } = useTranslation();
  const { isVertical } = useOrientation();
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Redesigned transaction workflow states
  const [activeTab, setActiveTab] = useState<'submissions' | 'transactions'>('submissions');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [guestTransactions, setGuestTransactions] = useState<any[]>([]);
  const [guestLookupInput, setGuestLookupInput] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [receiptToDownload, setReceiptToDownload] = useState<any | null>(null);
  const [activeRetry, setActiveRetry] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Get current user ID to filter records
  const userStr = localStorage.getItem('aazhi_user');
  const token = localStorage.getItem('aazhi_token');
  const isUserLoggedIn = !!(token && token !== 'null' && token !== 'undefined');

  let currentUserId: string | null = null;
  let currentUserMobile: string | null = null;
  
  if (userStr && userStr !== 'undefined' && userStr !== 'null') {
    try {
      const user = JSON.parse(userStr);
      currentUserId = user.id;
      currentUserMobile = user.mobile;
    } catch (e) {}
  }

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

  // Fetch citizen transactions
  const fetchCitizenTransactions = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiClient.get<any[]>('/payment/transactions');
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching citizen transactions:', err);
      setError(err.message || 'Failed to load transaction history');
    } finally {
      setIsLoading(false);
    }
  };

  // Guest Search Lookups across all three services
  const handleGuestSearch = async (lookupId: string) => {
    if (!lookupId) return;
    setIsLoading(true);
    setError('');
    try {
      const [elec, gas, mun] = await Promise.all([
        apiClient.get<any[]>(`/electricity/history?consumerId=${lookupId}`).catch(() => []),
        apiClient.get<any[]>(`/gas/history?consumerId=${lookupId}`).catch(() => []),
        apiClient.get<any[]>(`/municipal/history?consumerId=${lookupId}`).catch(() => [])
      ]);
      const merged = [...elec, ...gas, ...mun];
      const uniqueMap = new Map();
      merged.forEach(item => {
        if (item.id) uniqueMap.set(item.id, item);
      });
      setGuestTransactions(Array.from(uniqueMap.values()).sort((a, b) => {
        return new Date(b.created_at || b.paid_at || 0).getTime() - new Date(a.created_at || a.paid_at || 0).getTime();
      }));
    } catch (err: any) {
      console.error('Error in guest search:', err);
      setError('Failed to fetch transaction history. Please verify your Consumer ID.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto fetch for logged in citizens
  useEffect(() => {
    if (activeTab === 'transactions' && isUserLoggedIn) {
      fetchCitizenTransactions();
    }
  }, [activeTab, isUserLoggedIn]);

  // Click retry payment trigger inside DOM
  useEffect(() => {
    if (activeRetry) {
      setTimeout(() => {
        const retryBtn = document.querySelector('.retry-checkout-container button') as HTMLButtonElement;
        if (retryBtn) {
          console.log("Triggering auto checkout for retry...");
          retryBtn.click();
        }
      }, 100);
    }
  }, [activeRetry]);

  const handleRetrySuccess = (paymentId: string) => {
    setToast({ message: "Payment successful! Gateway reference ID: " + paymentId, type: 'success' });
    setActiveRetry(null);
    setSelectedTransaction(null);
    if (isUserLoggedIn) {
      fetchCitizenTransactions();
    } else {
      handleGuestSearch(guestLookupInput);
    }
  };

  const handleRetryFailure = (err: any) => {
    setToast({ message: "Payment unsuccessful: " + (typeof err === 'string' ? err : JSON.stringify(err)), type: 'error' });
    setActiveRetry(null);
    if (isUserLoggedIn) {
      fetchCitizenTransactions();
    } else {
      handleGuestSearch(guestLookupInput);
    }
  };

  const handleRetryCancel = () => {
    setToast({ message: "Payment cancelled by user", type: 'info' });
    setActiveRetry(null);
    if (isUserLoggedIn) {
      fetchCitizenTransactions();
    } else {
      handleGuestSearch(guestLookupInput);
    }
  };

  const formatTimestamp = (val: any) => {
    if (!val) return 'Date unavailable';
    const raw = String(val);
    const normalised = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const utcStr = /[+\-Z]/.test(normalised.slice(10)) ? normalised : normalised + 'Z';
    const d = new Date(utcStr);
    if (isNaN(d.getTime())) return 'Date unavailable';
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Filter transactions
  const listToFilter = isUserLoggedIn ? transactions : guestTransactions;
  const filteredTransactions = listToFilter.filter(txn => {
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchId = String(txn.id || '').toLowerCase().includes(query);
      const matchBillNo = String(txn.bill_number || '').toLowerCase().includes(query);
      const matchReceiptNo = String(txn.receipt_number || '').toLowerCase().includes(query);
      const matchAccountNo = String(txn.account_number || '').toLowerCase().includes(query);
      if (!matchId && !matchBillNo && !matchReceiptNo && !matchAccountNo) {
        return false;
      }
    }

    if (statusFilter !== 'all') {
      if (txn.payment_status !== statusFilter) {
        return false;
      }
    }

    if (serviceFilter !== 'all') {
      const txnService = (txn.service_type || '').toLowerCase();
      if (serviceFilter === 'electricity' && !txnService.includes('electric') && !txnService.includes('eb')) return false;
      if (serviceFilter === 'gas' && !txnService.includes('gas')) return false;
      if (serviceFilter === 'water' && !txnService.includes('water')) return false;
      if (serviceFilter === 'property' && !txnService.includes('property') && !txnService.includes('tax')) return false;
    }

    return true;
  });

  return (
    <div className={`max-w-5xl mx-auto font-sans h-full flex flex-col overflow-y-auto pb-20 select-none ${isVertical ? 'p-8 gap-4' : 'p-4 md:p-8'}`}>
      
      {/* Header */}
      <div className={`mb-6 flex ${isVertical ? 'flex-col items-center text-center' : 'flex-col sm:flex-row justify-between items-start sm:items-center'} gap-4`}>
        <div className={`flex ${isVertical ? 'flex-col items-center gap-3' : 'items-center gap-4'}`}>
          <div className={`${isVertical ? 'w-16 h-16 rounded-[1.5rem]' : 'w-14 h-14 rounded-3xl'} bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-200`}>
            <Archive size={isVertical ? 32 : 26} />
          </div>
          <div>
            <h2 className={`font-black text-slate-900 tracking-tight ${isVertical ? 'text-4xl' : 'text-3xl'}`}>Records & History</h2>
            <p className="text-slate-500 font-bold text-sm mt-1">Download receipt logs and view application details</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex bg-slate-100 p-1.5 rounded-2xl mb-8 self-center w-full max-w-md shrink-0`}>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex-1 px-6 rounded-xl font-black uppercase tracking-wider transition-all duration-200 ${
            isVertical ? 'py-4 text-base' : 'py-3 text-sm'
          } ${
            activeTab === 'submissions' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          My Submissions
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 px-6 rounded-xl font-black uppercase tracking-wider transition-all duration-200 ${
            isVertical ? 'py-4 text-base' : 'py-3 text-sm'
          } ${
            activeTab === 'transactions' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Transactions
        </button>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 font-semibold text-sm animate-in fade-in">
          <AlertCircle className="shrink-0 text-red-500" size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* SUBMISSIONS TAB CONTENT */}
      {activeTab === 'submissions' && (
        <div className="flex-1 flex flex-col">
          {allItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 animate-in fade-in zoom-in-95">
              <Archive size={56} className="text-slate-300 mb-6" />
              <p className="text-2xl font-black text-slate-800 mb-2">No Submissions Found</p>
              <p className="text-slate-500 font-medium max-w-sm">
                You haven't submitted any service requests or complaints yet. When you do, they will appear here.
              </p>
            </div>
          ) : (
            <div className={`flex flex-col ${isVertical ? 'gap-6' : 'gap-5'} pb-12`}>
              {allItems.map(item => (
                <HistoryCard key={`${item.itemType}-${item.id}`} item={item} onDownload={setSelectedItem} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRANSACTIONS TAB CONTENT */}
      {activeTab === 'transactions' && (
        <div className="flex-1 flex flex-col">
          
          {/* Guest Search Lookup Page */}
          {!isUserLoggedIn && guestTransactions.length === 0 ? (
            <div className={`bg-white rounded-[3rem] border border-slate-100 shadow-lg text-center mx-auto my-6 w-full ${isVertical ? 'p-10 max-w-2xl' : 'p-8 md:p-10 max-w-xl'}`}>
              <div className={`bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isVertical ? 'w-20 h-20' : 'w-16 h-16'}`}>
                <Receipt size={isVertical ? 40 : 32} />
              </div>
              <h3 className={`font-black text-slate-900 mb-2 ${isVertical ? 'text-3xl' : 'text-2xl'}`}>Guest Payment Lookup</h3>
              <p className={`text-slate-500 font-medium mb-8 ${isVertical ? 'text-base' : 'text-sm'}`}>Enter your Consumer Number, Account Number, or Assessment Number to view your payment history and receipts.</p>
              
              <div className="text-left mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2">Consumer ID / Account No</label>
                <KioskInput
                  inputMode="numeric"
                  formatType="consumer"
                  value={guestLookupInput}
                  onChangeValue={(val) => {
                    setGuestLookupInput(val);
                    setError('');
                  }}
                  placeholder="1234 5678 9012"
                  className={`w-full bg-slate-50 border-2 border-slate-100 p-6 pl-14 rounded-2xl text-2xl font-black uppercase tracking-widest outline-none focus:border-blue-600 focus:bg-white transition`}
                  icon={<Search size={24} />}
                />
              </div>

              <button
                onClick={() => handleGuestSearch(guestLookupInput)}
                disabled={!guestLookupInput || isLoading}
                className={`w-full bg-slate-950 text-white rounded-2xl font-black hover:bg-blue-600 active:scale-95 transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 ${
                  isVertical ? 'p-7 text-xl' : 'p-6 text-lg'
                }`}
              >
                {isLoading ? <RefreshCw className="animate-spin" /> : 'Search Transactions'}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              
              {/* Back Button for Guest Results */}
              {!isUserLoggedIn && (
                <button 
                  onClick={() => { setGuestTransactions([]); setGuestLookupInput(''); }} 
                  className={`font-black text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mb-6 self-start uppercase tracking-wider ${isVertical ? 'text-sm' : 'text-xs'}`}
                >
                  <ArrowLeft size={16} /> Lookup Another Account
                </button>
              )}

              {/* Search & Filters */}
              <div className={`bg-white border border-slate-100 shadow-sm mb-6 ${
                isVertical 
                  ? 'p-8 rounded-[3rem] flex flex-col gap-6' 
                  : 'p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-4'
              }`}>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search by ID or Bill No..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500 focus:bg-white transition ${
                      isVertical ? 'pl-14 pr-6 py-5 text-lg' : 'pl-12 pr-4 py-4 text-sm'
                    }`}
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={isVertical ? 24 : 20} />
                </div>
                
                <div className={`${isVertical ? 'grid grid-cols-2 gap-4 w-full' : 'flex gap-4'}`}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer ${
                      isVertical ? 'px-6 py-5 text-base w-full' : 'px-4 py-4 text-sm'
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="captured">Success</option>
                    <option value="failed">Failed</option>
                    <option value="created">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className={`bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer ${
                      isVertical ? 'px-6 py-5 text-base w-full' : 'px-4 py-4 text-sm'
                    }`}
                  >
                    <option value="all">All Services</option>
                    <option value="electricity">Electricity</option>
                    <option value="gas">Gas</option>
                    <option value="water">Water</option>
                    <option value="property">Property Tax</option>
                  </select>
                </div>
              </div>

              {/* Transactions List */}
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <RefreshCw className="animate-spin text-blue-600" size={40} />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                  <Receipt size={56} className="text-slate-300 mb-6" />
                  <p className="text-2xl font-black text-slate-800 mb-2">No Transactions Found</p>
                  <p className="text-slate-500 font-medium max-w-sm">
                    No payment attempts matched your filter criteria.
                  </p>
                </div>
              ) : (
                <div className={`flex flex-col ${isVertical ? 'gap-6' : 'gap-4'} pb-12`}>
                  {filteredTransactions.map(txn => (
                    <TransactionCard 
                      key={txn.id} 
                      txn={txn} 
                      onClick={() => setSelectedTransaction(txn)} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Service Request/Complaint Receipt Modal */}
      {selectedItem && (
        <HistoryReceipt 
          data={selectedItem as any} 
          onClose={() => setSelectedItem(null)} 
        />
      )}

      {/* Transaction PDF Receipt Modal */}
      {receiptToDownload && (
        <TransactionReceipt
          data={receiptToDownload}
          onClose={() => setReceiptToDownload(null)}
        />
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 select-text">
          <div className={`bg-white rounded-[2.5rem] shadow-2xl w-full ${isVertical ? 'max-w-xl' : 'max-w-lg'} overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-100`}>
            
            {/* Modal Header */}
            <div className={`border-b flex justify-between items-center bg-slate-50 ${isVertical ? 'p-8' : 'p-6'}`}>
              <h3 className={`font-black text-slate-900 ${isVertical ? 'text-2xl' : 'text-xl'}`}>Transaction Details</h3>
              <button 
                onClick={() => setSelectedTransaction(null)}
                className={`hover:bg-slate-200 rounded-xl transition border bg-white shadow-sm ${isVertical ? 'p-3' : 'p-2'}`}
              >
                <X size={isVertical ? 24 : 20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className={`overflow-y-auto flex-1 ${isVertical ? 'p-10 space-y-8' : 'p-8 space-y-6'}`}>
              <div className="text-center pb-4 border-b border-slate-100">
                <p className="text-xs uppercase font-black text-slate-400 tracking-widest mb-1">Amount</p>
                <p className={`font-black text-slate-900 ${isVertical ? 'text-5xl' : 'text-4xl'}`}>₹{Number(selectedTransaction.amount).toFixed(2)}</p>
                
                <div className="mt-4 flex justify-center">
                  {selectedTransaction.payment_status === 'captured' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      SUCCESS
                    </span>
                  ) : selectedTransaction.payment_status === 'failed' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                      FAILED
                    </span>
                  ) : selectedTransaction.payment_status === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                      CANCELLED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      PENDING
                    </span>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className={`grid grid-cols-2 gap-x-6 text-sm ${isVertical ? 'gap-y-6 text-base' : 'gap-y-4'}`}>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction ID</p>
                  <p className={`font-bold text-slate-900 mt-0.5 break-all font-mono leading-relaxed ${isVertical ? 'text-sm' : 'text-xs'}`}>{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt No</p>
                  <p className={`font-bold text-slate-900 mt-0.5 font-mono ${isVertical ? 'text-base' : 'text-sm'}`}>{selectedTransaction.receipt_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Type</p>
                  <p className={`font-black text-slate-900 mt-0.5 uppercase ${isVertical ? 'text-sm' : 'text-xs'}`}>
                    {selectedTransaction.service_type || 'Utility Payment'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consumer / Account</p>
                  <p className={`font-bold text-slate-900 mt-0.5 font-mono ${isVertical ? 'text-base' : 'text-sm'}`}>{selectedTransaction.account_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bill Number</p>
                  <p className={`font-bold text-slate-900 mt-0.5 font-mono ${isVertical ? 'text-base' : 'text-sm'}`}>{selectedTransaction.bill_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</p>
                  <p className={`font-semibold text-slate-950 mt-0.5 ${isVertical ? 'text-sm' : 'text-xs'}`}>
                    {formatTimestamp(selectedTransaction.paid_at || selectedTransaction.created_at)}
                  </p>
                </div>
              </div>

              {/* User Details Section */}
              <div className={`bg-slate-50 border border-slate-100 space-y-2 ${isVertical ? 'p-6 rounded-3xl' : 'p-4 rounded-2xl'}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">User Details</p>
                <div className={`flex justify-between ${isVertical ? 'text-sm' : 'text-xs'}`}>
                  <span className="font-bold text-slate-500">Name:</span>
                  <span className="font-black text-slate-800">{selectedTransaction.consumer_name || selectedTransaction.user_details?.name || 'Guest User'}</span>
                </div>
                <div className={`flex justify-between ${isVertical ? 'text-sm' : 'text-xs'}`}>
                  <span className="font-bold text-slate-500">Mobile:</span>
                  <span className="font-semibold text-slate-800">{selectedTransaction.user_details?.mobile || 'N/A'}</span>
                </div>
              </div>

              {/* Failure Reason */}
              {selectedTransaction.failure_reason && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-xs text-red-700 leading-relaxed">
                  <span className="font-black uppercase block mb-1">Failure Reason:</span>
                  {selectedTransaction.failure_reason}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className={`border-t bg-slate-50 flex gap-4 print:hidden shrink-0 ${isVertical ? 'p-8' : 'p-6'}`}>
              {selectedTransaction.payment_status === 'captured' ? (
                <button
                  onClick={() => setReceiptToDownload(selectedTransaction)}
                  className={`flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 ${
                    isVertical ? 'py-5 text-base' : 'py-4 text-sm'
                  }`}
                >
                  <Download size={isVertical ? 20 : 18} /> Download Receipt
                </button>
              ) : (
                <button
                  onClick={() => {
                    setActiveRetry(selectedTransaction);
                  }}
                  className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 ${
                    isVertical ? 'py-5 text-base' : 'py-4 text-sm'
                  }`}
                >
                  <CreditCard size={isVertical ? 20 : 18} /> Retry Payment
                </button>
              )}
              <button
                onClick={() => setSelectedTransaction(null)}
                className={`flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold uppercase tracking-wider transition-all ${
                  isVertical ? 'py-5 text-base' : 'py-4 text-sm'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Retry checkout execution container */}
      <div className="retry-checkout-container hidden">
        {activeRetry && (
          <RazorpayCheckout
            amount={Number(activeRetry.amount)}
            billId={activeRetry.bill_id}
            name={`${activeRetry.service_type || 'Utility'} Bill`}
            description={`Retry payment for ${activeRetry.receipt_number || activeRetry.id}`}
            onSuccess={handleRetrySuccess}
            onFailure={handleRetryFailure}
            onCancel={handleRetryCancel}
            isGuest={!isUserLoggedIn}
          />
        )}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default HistoryPage;
