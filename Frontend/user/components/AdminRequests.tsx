import React, { useState } from 'react';
import { Eye, ArrowRight, CheckCircle, Search, Download, MessageSquare, Users, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  requests: any[];
  updateStage: (id: string, stage: string) => void;
}

const AdminRequests: React.FC<Props> = ({ requests = [], updateStage }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const translateDynamic = (text: string) => {
    if (!text) return text;
    const key = text.toLowerCase().replace(/[\s-]+/g, '');
    const map: Record<string, string> = {
      'pending': t('pending') || 'Pending',
      'in_progress': t('inProgress') || 'In Progress',
      'resolved': t('resolved') || 'Resolved',
      'rejected': t('rejected') || 'Rejected',
      'completed': t('completed') || 'Completed',
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

  const filteredRequests = requests.filter(req => {
    if (!req) return false;
    const id = String(req.id || '').toLowerCase();
    const name = String(req.name || '').toLowerCase();
    const category = String(req.category || '').toLowerCase();
    const searchLower = (searchTerm || '').toLowerCase();

    const matchesCategory = selectedCategory === 'All' || category.includes(selectedCategory.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || req.priority === priorityFilter;
    const matchesSearch = id.includes(searchLower) || name.includes(searchLower);
    
    return matchesCategory && matchesSearch && matchesPriority;
  });

  const getNextStageAction = (stage: string) => {
    if (!stage) return null;
    const normalized = stage.toLowerCase();
    switch (normalized) {
      case 'submitted': 
      case 'created':
        return { label: t('assignOfficer') || 'Assign Officer', next: 'Officer Assigned', color: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200' };
      case 'officer_assigned': 
      case 'assigned':
        return { label: t('escalateManager') || 'Submit Response', next: 'Manager Review', color: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200' };
      case 'manager_review': 
      case 'under_review':
        return { label: t('sendGmApproval') || 'Manager Approve', next: 'GM Approval', color: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200' };
      case 'gm_approval': 
        return { label: t('markResolved') || 'Final Approval', next: 'Resolved', color: 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200' };
      default: return null;
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedRequests(prev => prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(r => r.id).filter(id => !!id));
    }
  };

  const handleBulkAction = () => {
    selectedRequests.forEach(id => {
       const req = requests.find(r => r.id === id);
       if (req && (req.currentStage === 'Submitted' || req.currentStage === 'created' || req.stage === 'submitted')) {
          updateStage(id, 'Officer Assigned');
       }
    });
    setSelectedRequests([]);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="p-8 border-b border-slate-50 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
               <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('requestPipeline') || 'Service Request Pipeline'}</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-0.5">{filteredRequests.length} active applications</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedRequests.length > 0 && (
              <button onClick={handleBulkAction} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 animate-in fade-in">
                Auto-Assign Selected ({selectedRequests.length})
              </button>
            )}
            <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <div className="flex gap-1 overflow-x-auto w-full md:w-auto">
            {['All', 'Electricity', 'Water', 'Gas', 'Municipal'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                  ${selectedCategory === cat
                    ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                    : 'text-slate-500 hover:bg-white/50'}`}
              >
                {translateDynamic(cat)}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by ID, Name or Phone..."
              className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>
      </div>

      <div className="divide-y overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-6 py-4 w-12 text-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={filteredRequests.length > 0 && selectedRequests.length === filteredRequests.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-4">Application Details</th>
              <th className="px-4 py-4">Submission Aging</th>
              <th className="px-4 py-4">Stage Progress</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center opacity-30">
                    <Search size={48} className="mb-4" />
                    <p className="text-xl font-black">No requests found matching filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRequests.map((req, idx) => {
                const isOverdue = idx === 0 && (req.currentStage === 'Submitted' || req.currentStage === 'created');
                const rawDate = req.createdAt || req.timestamp;
                let dateStr = 'Date unavailable';
                if (rawDate) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                        dateStr = d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).replace(/am|pm/i, m => m.toUpperCase());
                    }
                }
                
                return (
                <tr key={req.id || idx} className={`group hover:bg-blue-50/30 transition-colors ${isOverdue ? 'bg-red-50/10' : ''}`}>
                  <td className="px-6 py-6 border-l-4 border-transparent" style={{ borderLeftColor: isOverdue ? '#ef4444' : 'transparent' }}>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedRequests.includes(req.id)}
                        onChange={() => toggleSelect(req.id)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-6">
                    <p className="font-bold text-blue-600 text-xs mb-1">{req.id}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-black">
                        {(req.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 block">{req.name || 'Anonymous User'}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{req.category || 'General'}</span>
                           <span className="text-[10px] text-slate-300">•</span>
                           <span className="text-[10px] font-bold text-slate-900 truncate max-w-[200px]" title={req.serviceType}>{req.serviceType || 'Standard Service'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6">
                    {(() => {
                       if (!rawDate || isNaN(new Date(rawDate).getTime())) {
                           return (
                             <div>
                               <div className="text-[10px] font-bold px-2 py-0.5 mt-1 rounded inline-block whitespace-nowrap bg-slate-100 text-slate-500">
                                  Unknown Age
                               </div>
                               <p className="text-[9px] text-slate-400 font-bold mt-1.5 flex items-center gap-1 uppercase tracking-tighter">
                                 <Clock size={10} /> {dateStr}
                               </p>
                             </div>
                           );
                       }
                       const ageMs = Date.now() - new Date(rawDate).getTime();
                       const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                       const hours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                       
                       let agingStr = 'Just now';
                       let isOld = days > 0;
                       
                       if (days > 0) agingStr = `${days}d ${hours}h ago`;
                       else if (hours > 0) agingStr = `${hours}h ago`;
                       
                       return (
                         <div>
                           <div className={`text-[10px] font-bold px-2 py-0.5 mt-1 rounded inline-block whitespace-nowrap ${isOld ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {isOld ? `Age: ${agingStr}` : `${agingStr}`}
                           </div>
                           <p className="text-[9px] text-slate-400 font-bold mt-1.5 flex items-center gap-1 uppercase tracking-tighter">
                             <Clock size={10} /> {dateStr}
                           </p>
                         </div>
                       );
                    })()}
                  </td>
                  <td className="px-4 py-6">
                    <div className="w-48">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">
                           <span className={['Officer Assigned', 'Manager Review', 'GM Approval', 'Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'text-blue-500' : 'text-slate-300'}>Assg</span>
                           <span className={['Manager Review', 'GM Approval', 'Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'text-blue-500' : 'text-slate-300'}>Rev</span>
                           <span className={['GM Approval', 'Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'text-blue-500' : 'text-slate-300'}>GM</span>
                           <span className={['Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'text-green-500' : 'text-slate-300'}>Done</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                           <div className={`h-full transition-all duration-500 ${['Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'w-full bg-green-500' : ['GM Approval'].includes(req.currentStage) ? 'w-[75%] bg-blue-500' : ['Manager Review'].includes(req.currentStage) ? 'w-[50%] bg-blue-500' : ['Officer Assigned'].includes(req.currentStage) ? 'w-[25%] bg-blue-500' : 'w-[5%] bg-slate-400'}`}></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors">
                        {translateDynamic(req.currentStage || 'Submitted')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      <button className="p-2 hover:bg-blue-50 rounded-xl border border-slate-200 transition text-gray-500 hover:text-blue-600 bg-white shadow-sm" title="Internal Notes">
                        <MessageSquare size={16} />
                      </button>
                      <button className="p-2 hover:bg-blue-50 rounded-xl border border-slate-200 transition text-gray-500 hover:text-blue-600 bg-white shadow-sm" title="View Details">
                        <Eye size={16} />
                      </button>

                      {(() => {
                        const action = getNextStageAction(req.currentStage || 'Submitted');
                        if (action) {
                          return (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateStage(req.id, 'Rejected')}
                                className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white text-red-600 hover:bg-red-50 border border-red-200 shadow-sm"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => updateStage(req.id, action.next)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${action.color}`}
                              >
                                {action.label} <ArrowRight size={14} />
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 flex items-center gap-1 border border-slate-200">
                            <CheckCircle size={14} /> {translateDynamic('Completed')}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRequests;
