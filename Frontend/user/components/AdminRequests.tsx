import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, ArrowRight, CheckCircle, ChevronDown, Globe, Users, 
  AlertTriangle, MessageSquare, Paperclip, Send, Download, X, Upload, 
  Calendar, UserCheck, Clock, Search, Info 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../services/api/apiClient';

interface Props {
  requests: any[];
  updateStage: (id: string, stage: string, extraPayload?: any) => void;
  updateStatus: (id: string, status: string, extraPayload?: any) => void;
}

const AdminRequests: React.FC<Props> = ({ 
  requests = [], 
  updateStage, 
  updateStatus 
}) => {
  const { t } = useTranslation();
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'Active' | 'Resolved'>('Active');
  
  // Custom states for modals & assignments
  const [openDropdown, setOpenDropdown] = useState<{ id: string, type: 'status' } | null>(null);
  const [activeModal, setActiveModal] = useState<{ id: string, type: 'note' | 'upload' | 'schedule' | 'assign' | 'reject' } | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [tempDate, setTempDate] = useState('');
  const [tempStaffId, setTempStaffId] = useState('');
  const [tempRejection, setTempRejection] = useState('');
  
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  // Fetch staff list from citizens table for technicians dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const citizens = await apiClient.get<any[]>('/admin/citizens');
        if (Array.isArray(citizens)) {
          const staff = citizens.filter((c: any) => c.role === 'staff' || c.role === 'admin');
          setStaffList(staff.map(s => ({ id: s.id, name: s.name || s.mobile })));
        }
      } catch (e) {
        console.warn("[AdminRequests] Failed to fetch staff list, using fallbacks:", e);
        setStaffList([
          { id: 'tech1', name: 'Technician Ramesh' },
          { id: 'tech2', name: 'Technician Anita' },
          { id: 'tech3', name: 'Technician Vijay' },
          { id: 'tech4', name: 'Technician Priya' }
        ]);
      }
    };
    fetchStaff();
  }, []);

  const translateDynamic = (text: string) => {
    if (!text) return text;
    const key = text.toLowerCase().replace(/[\s-]+/g, '');
    const map: Record<string, string> = {
      'pending': t('pending') || 'Pending',
      'assigned': t('assigned') || 'Assigned',
      'in_progress': t('inProgress') || 'In Progress',
      'on_hold': t('onHold') || 'On Hold',
      'completed': t('completed') || 'Completed',
      'cancelled': t('cancelled') || 'Cancelled',
      'resolved': t('resolved') || 'Resolved',
      'rejected': t('rejected') || 'Rejected',
      'closed': t('closed') || 'Closed',
      'submitted': t('submitted') || 'Submitted',
      'officer_assigned': t('officerAssigned') || 'Officer Assigned',
      'manager_review': t('managerReview') || 'Manager Review',
      'gm_approval': t('gmApproval') || 'GM Approval',
      'critical': t('severityCritical') || 'Critical',
      'high': t('severityWarning') || 'High',
      'medium': t('severityInfo') || 'Medium',
      'low': t('severityLow') || 'Low',
      'electricity': t('power') || 'Electricity',
      'water': t('water') || 'Water',
      'gas': t('gas') || 'Gas',
      'municipal': t('municipalCorp') || 'Municipal',
      'all': t('all') || 'All'
    };
    return map[key] || text;
  };

  // Filter requests based on views and selections
  const filteredRequests = requests.filter(req => {
    if (!req) return false;

    // View Mode Filter
    const isFinished = req.status === 'completed' || req.status === 'resolved' || req.status === 'cancelled';
    if (viewMode === 'Resolved' && !isFinished) return false;
    if (viewMode === 'Active' && isFinished) return false;

    const id = String(req.id || req.token || '').toLowerCase();
    const name = String(req.name || '').toLowerCase();
    const phone = String(req.phone || '').toLowerCase();
    const category = String(req.category || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();

    const matchesCategory = selectedCategory === 'All' || category.includes(selectedCategory.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || req.priority?.toLowerCase() === priorityFilter.toLowerCase();
    const matchesSearch = id.includes(searchLower) || name.includes(searchLower) || phone.includes(searchLower);
    
    return matchesCategory && matchesSearch && matchesPriority;
  });

  const getNextStageAction = (req: any) => {
    const stage = req.currentStage || req.stage || 'created';
    const status = req.status || 'pending';

    switch (stage.toLowerCase()) {
      case 'created':
      case 'submitted':
        return { label: 'Assign Technician', nextStage: 'assigned', nextStatus: 'assigned', color: 'bg-blue-600 hover:bg-blue-700 text-white' };
      case 'assigned':
        return { label: 'Start Service', nextStage: 'working', nextStatus: 'in_progress', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' };
      case 'working':
      case 'in_progress':
        return { label: 'Complete Service', nextStage: 'completed', nextStatus: 'completed', color: 'bg-green-600 hover:bg-green-700 text-white' };
      default: return null;
    }
  };

  const handleActionClick = (req: any) => {
    const action = getNextStageAction(req);
    if (!action) return;

    if (action.nextStage === 'assigned') {
      // Open Technician selection modal
      setTempStaffId(req.assigned_to || '');
      setActiveModal({ id: req.id, type: 'assign' });
    } else {
      updateStage(req.id, action.nextStage, { status: action.nextStatus });
    }
  };

  const handleBulkStatusChange = (status: string) => {
    if (selectedRequests.length === 0) return;
    selectedRequests.forEach(id => updateStatus(id, status));
    setSelectedRequests([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedRequests(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(r => r.id).filter(id => !!id));
    }
  };

  const handleSaveNote = () => {
    if (!activeModal) return;
    updateStatus(activeModal.id, requests.find(r => r.id === activeModal.id)?.status || 'pending', { resolution_note: tempNote });
    setActiveModal(null);
  };

  const handleSaveSchedule = () => {
    if (!activeModal) return;
    updateStatus(activeModal.id, requests.find(r => r.id === activeModal.id)?.status || 'pending', { scheduled_at: tempDate });
    setActiveModal(null);
  };

  const handleSaveAssignment = () => {
    if (!activeModal) return;
    const selectedStaff = staffList.find(s => s.id === tempStaffId);
    updateStage(activeModal.id, 'assigned', { 
      status: 'assigned',
      assigned_to: tempStaffId,
      notes: `Assigned to ${selectedStaff?.name || 'Technician'}`
    });
    setActiveModal(null);
  };

  const handleSaveRejection = () => {
    if (!activeModal) return;
    updateStage(activeModal.id, 'cancelled', {
      status: 'cancelled',
      rejection_reason: tempRejection
    });
    setActiveModal(null);
  };

  // Status Badge configurations
  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:     { label: 'Pending',     color: 'text-amber-700 border-amber-200', bg: 'bg-amber-50', icon: <Clock size={12} /> },
    assigned:    { label: 'Assigned',    color: 'text-blue-700 border-blue-200', bg: 'bg-blue-50', icon: <UserCheck size={12} /> },
    in_progress: { label: 'In Progress', color: 'text-cyan-700 border-cyan-200', bg: 'bg-cyan-50', icon: <Clock size={12} /> },
    on_hold:     { label: 'On Hold',     color: 'text-orange-700 border-orange-200', bg: 'bg-orange-50', icon: <AlertTriangle size={12} /> },
    completed:   { label: 'Completed',   color: 'text-green-700 border-green-200', bg: 'bg-green-50', icon: <CheckCircle size={12} /> },
    resolved:    { label: 'Completed',   color: 'text-green-700 border-green-200', bg: 'bg-green-50', icon: <CheckCircle size={12} /> },
    cancelled:   { label: 'Cancelled',   color: 'text-red-700 border-red-200', bg: 'bg-red-50', icon: <X size={12} /> },
    rejected:    { label: 'Cancelled',   color: 'text-red-700 border-red-200', bg: 'bg-red-50', icon: <X size={12} /> }
  };

  const getStatusBadge = (status: string) =>
    STATUS_CFG[status?.toLowerCase()] ?? { label: status, color: 'text-slate-500 border-slate-200', bg: 'bg-slate-50', icon: <Info size={12} /> };

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-600 text-white border-transparent'
  };

  const fmt = (iso?: string) => {
    if (!iso) return 'Not scheduled';
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Top Filter Buttons & Header */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 w-full xl:w-auto">
          <button 
             onClick={() => setViewMode('Active')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'Active' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-200'}`}
          >
             Active Requests
          </button>
          <button 
             onClick={() => setViewMode('Resolved')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'Resolved' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-200'}`}
          >
             Archive
          </button>
          <div className="w-px h-8 bg-slate-300 mx-2 self-center hidden sm:block"></div>

          {['All', 'Electricity', 'Water', 'Gas', 'Municipal'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                ${selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
            >
              {translateDynamic(cat)}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shrink-0 w-full xl:w-auto overflow-x-auto">
          <span className="text-[10px] font-black uppercase text-slate-400 pl-3">Priority</span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${priorityFilter === p
                  ? (p === 'Critical' ? 'bg-red-100 text-red-700' :
                    p === 'High' ? 'bg-orange-100 text-orange-700' :
                      p === 'Medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-800 text-white')
                  : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              {translateDynamic(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Global Search and Bulk Selection Control */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            checked={filteredRequests.length > 0 && selectedRequests.length === filteredRequests.length}
            onChange={toggleSelectAll}
          />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select All</span>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by ID, Name or Phone..."
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedRequests.length > 0 && (
         <div className="bg-blue-50 border border-blue-200 p-4 flex flex-col sm:flex-row gap-3 justify-between items-center rounded-3xl animate-in zoom-in-95">
            <span className="text-blue-800 font-black text-sm ml-1">{selectedRequests.length} selected</span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
               <button onClick={() => handleBulkStatusChange('In Progress')} className="bg-white border border-slate-200 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-none">Mark In Progress</button>
               <button onClick={() => handleBulkStatusChange('Completed')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex-1 sm:flex-none">Mark Completed</button>
               <button className="flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition hover:bg-slate-900 flex-1 sm:flex-none"><Download size={14} /> Export CSV</button>
            </div>
         </div>
      )}

      {/* Grid of Request Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-20 opacity-50 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
            <AlertCircle className="mb-4 text-slate-400" size={48} />
            <p className="text-xl font-bold text-slate-700">No service requests found</p>
          </div>
        ) : (
          filteredRequests.map((req, idx) => {
            const isCriticalActive = req.priority?.toLowerCase() === 'critical' && req.status?.toLowerCase() === 'pending';
            const statusCfg = getStatusBadge(req.status);
            
            let dateStr = 'Date unavailable';
            if (req.createdAt || req.timestamp) {
                const d = new Date(req.createdAt || req.timestamp);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                }
            }
            
            return (
            <div key={req.id || idx} className={`bg-white p-6 rounded-[2rem] shadow-sm border transition hover:shadow-md outline outline-2 outline-transparent focus-within:outline-blue-500 relative
                ${req.priority?.toLowerCase() === 'critical' ? 'border-l-4 border-l-red-500' :
                req.priority?.toLowerCase() === 'high' ? 'border-l-4 border-l-orange-500' : 'border-slate-100'}
                ${isCriticalActive ? 'bg-red-50/10' : ''}
            `}>
              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                {/* Checkbox and Card Details */}
                <div className="flex gap-4 flex-1">
                  <div className="pt-1 select-none">
                      <input 
                         type="checkbox" 
                         className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                         checked={selectedRequests.includes(req.id)}
                         onChange={() => toggleSelect(req.id)}
                      />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center flex-wrap gap-2 pr-8 md:pr-0">
                      {/* Status Badge */}
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusCfg.color} ${statusCfg.bg}`}>
                        {statusCfg.icon}
                        {translateDynamic(statusCfg.label)}
                      </span>

                      {/* Current Stage Badge */}
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                        {translateDynamic(req.currentStage || 'Submitted')}
                      </span>

                      {/* Priority Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${priorityColors[req.priority?.toLowerCase() || 'medium']}`}>
                        {translateDynamic(req.priority || 'Medium')}
                      </span>

                      <span className="text-xs font-black text-slate-400 ml-2">{req.id}</span>
                      <span className="text-xs font-bold text-slate-400">• {dateStr}</span>
                    </div>

                    <h4 className="text-lg font-black text-slate-900 leading-tight">
                      {req.serviceType || 'General Service Request'}
                    </h4>
                    
                    <p className="text-slate-600 text-sm font-medium">{req.description}</p>

                    {/* Metadata Grid */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-400"/> {req.name || 'Anonymous citizen'} ({req.phone || 'N/A'})</span>
                      <span className="flex items-center gap-1.5"><Globe size={14} className="text-slate-400"/> {req.category}</span>
                      {req.address && <span className="flex items-center gap-1.5"><AlertCircle size={14} className="text-slate-400"/> {req.address}</span>}
                    </div>

                    {/* Tech & Schedule Status Displays */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                      <div className="bg-slate-50 p-2.5 rounded-xl flex items-center gap-2.5 border border-slate-100">
                        <Users size={16} className="text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assigned Technician</span>
                          <span className="text-xs font-bold text-slate-700">{req.assigned_to_name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl flex items-center gap-2.5 border border-slate-100">
                        <Calendar size={16} className="text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Scheduled Date & Time</span>
                          <span className="text-xs font-bold text-slate-700">{fmt(req.scheduled_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Sub-actions */}
                    <div className="flex flex-wrap gap-4 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-3">
                       <button className="flex items-center gap-1.5 hover:text-blue-600 transition" onClick={() => { setTempNote(req.resolution_note || ''); setActiveModal({ id: req.id, type: 'note' }); }}>
                          <MessageSquare size={12}/> {req.resolution_note ? 'View/Edit Note' : 'Add Note'}
                       </button>
                       <button className="flex items-center gap-1.5 hover:text-blue-600 transition" onClick={() => { setTempDate(req.scheduled_at?.substring(0, 16) || ''); setActiveModal({ id: req.id, type: 'schedule' }); }}>
                          <Calendar size={12}/> Schedule Service
                       </button>
                       <button className="flex items-center gap-1.5 hover:text-blue-600 transition" onClick={() => alert('Sending notification update to citizen via SMS.')}>
                          <Send size={12}/> Notify Citizen
                       </button>
                    </div>

                    {/* resolution note bubble */}
                    {req.resolution_note && (
                        <div className="mt-4 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                            <h5 className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1"><MessageSquare size={10}/> Internal Resolution Note</h5>
                            <p className="text-sm text-slate-700 font-medium">{req.resolution_note}</p>
                        </div>
                    )}

                    {/* rejection reason bubble */}
                    {req.rejection_reason && (
                        <div className="mt-4 bg-red-50/50 border border-red-100 p-3 rounded-2xl">
                            <h5 className="text-[9px] font-black uppercase text-red-500 mb-1 flex items-center gap-1"><X size={10}/> Cancellation Reason</h5>
                            <p className="text-sm text-red-700 font-medium">{req.rejection_reason}</p>
                        </div>
                    )}
                  </div>
                </div>

                {/* Right Action buttons panel */}
                <div className="flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-50 pt-4 md:pt-0 md:pl-6 min-w-[180px]">
                  
                  {/* Next Stage Auto Progression */}
                  {(() => {
                    const action = getNextStageAction(req);
                    if (action) {
                      return (
                        <button
                          onClick={() => handleActionClick(req)}
                          className={`w-full ${action.color} px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm`}
                        >
                          {action.label} <ArrowRight size={14} />
                        </button>
                      );
                    }
                    return (
                        <div className="w-full bg-slate-50 text-slate-500 border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-1">
                            <CheckCircle size={14} /> {translateDynamic(req.currentStage || 'Completed')}
                        </div>
                    );
                  })()}

                  {req.status?.toLowerCase() !== 'completed' && req.status?.toLowerCase() !== 'cancelled' && req.status?.toLowerCase() !== 'rejected' && (
                      <button
                          onClick={() => { setTempRejection(req.rejection_reason || ''); setActiveModal({ id: req.id, type: 'reject' }); }}
                          className="w-full bg-white text-red-600 border border-red-100 hover:border-red-200 hover:bg-red-50 px-4 py-2 rounded-2xl text-xs font-bold transition flex justify-center items-center"
                      >
                          Cancel Request
                      </button>
                  )}

                  {/* Manual Status Transition Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown?.id === req.id ? null : { id: req.id, type: 'status' })}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-2xl text-xs font-bold flex justify-between items-center transition"
                    >
                      Status <ChevronDown size={14} />
                    </button>
                    {openDropdown?.id === req.id && openDropdown?.type === 'status' && (
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-1 w-44 z-10 animate-in fade-in zoom-in-95 duration-200">
                        {['Pending', 'Assigned', 'In Progress', 'On Hold', 'Completed'].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              updateStatus(req.id, s.toLowerCase().replace(' ', '_'));
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 hover:text-blue-600 rounded-xl text-slate-700 transition"
                          >
                            {translateDynamic(s)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assign Technician directly */}
                  <button 
                    onClick={() => { setTempStaffId(req.assigned_to || ''); setActiveModal({ id: req.id, type: 'assign' }); }}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    Assign Technician
                  </button>

                </div>
              </div>
            </div>
          )})
        )}
      </div>

      {/* NOTES MODAL */}
      {activeModal?.type === 'note' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="text-blue-600"/> Internal Note</h2>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
               </div>
               <textarea 
                  className="w-full h-32 bg-slate-50 border border-slate-200 p-4 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Record internal notes or resolution details here..."
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
               />
               <button onClick={handleSaveNote} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md shadow-blue-500/20 active:scale-95">
                  Save Note
               </button>
            </div>
         </div>
      )}

      {/* SCHEDULE SERVICE DATE MODAL */}
      {activeModal?.type === 'schedule' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Calendar className="text-blue-600"/> Schedule Date &amp; Time</h2>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
               </div>
               <input 
                  type="datetime-local"
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
               />
               <button onClick={handleSaveSchedule} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md shadow-blue-500/20 active:scale-95">
                  Save Schedule
               </button>
            </div>
         </div>
      )}

      {/* ASSIGN STAFF MODAL */}
      {activeModal?.type === 'assign' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><UserCheck className="text-blue-600"/> Assign Technician</h2>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
               </div>
               
               <select
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-semibold outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  value={tempStaffId}
                  onChange={(e) => setTempStaffId(e.target.value)}
               >
                  <option value="">-- Select Technician / Staff member --</option>
                  {staffList.map(staff => (
                     <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
               </select>

               <button onClick={handleSaveAssignment} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md shadow-blue-500/20 active:scale-95">
                  Confirm Assignment
               </button>
            </div>
         </div>
      )}

      {/* REJECTION / CANCELLATION MODAL */}
      {activeModal?.type === 'reject' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-red-600 flex items-center gap-2"><AlertTriangle /> Cancel Service Request</h2>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
               </div>
               <textarea 
                  className="w-full h-32 bg-slate-50 border border-slate-200 p-4 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-red-500 mb-4"
                  placeholder="Enter cancellation reason for citizen..."
                  value={tempRejection}
                  onChange={(e) => setTempRejection(e.target.value)}
               />
               <button onClick={handleSaveRejection} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md shadow-red-500/20 active:scale-95">
                  Confirm Cancellation
               </button>
            </div>
         </div>
      )}

    </div>
  );
};

export default AdminRequests;
