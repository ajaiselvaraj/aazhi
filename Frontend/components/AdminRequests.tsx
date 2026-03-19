import React, { useState } from 'react';
import { Filter, Eye, ArrowRight, CheckCircle, Search, Download, Paperclip, Mail, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  requests: any[];
  updateStage: (id: string, stage: string) => void;
}

const AdminRequests: React.FC<Props> = ({ requests, updateStage }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  const translateDynamic = (text: string) => {
    if (!text) return text;
    const keyMap: Record<string, string> = {
        'Pending': t('pending') || 'Pending',
        'In Progress': t('inProgress') || 'In Progress',
        'Resolved': t('resolved') || 'Resolved',
        'Completed': t('completed') || 'Completed',
        'Rejected': t('rejected') || 'Rejected',
        'Closed': t('closed') || 'Closed',
        'Submitted': t('submitted') || 'Submitted',
        'Officer Assigned': t('officerAssigned') || 'Officer Assigned',
        'Manager Review': t('managerReview') || 'Manager Review',
        'GM Approval': t('gmApproval') || 'GM Approval',
        'Critical': t('severityCritical') || 'Critical',
        'High': t('severityWarning') || 'High',
        'Medium': t('severityInfo') || 'Medium',
        'Low': t('severityLow') || 'Low',
        'Electricity': t('power') || 'Electricity',
        'Water': t('water') || 'Water',
        'Gas': t('gas') || 'Gas',
        'Municipal': t('municipalCorp') || 'Municipal',
        'All': t('all') || 'All'
    };
    return keyMap[text] || text;
  };

  const filteredRequests = requests.filter(req => {
    const matchesCategory = selectedCategory === 'All' || req.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || req.priority === priorityFilter;
    const matchesSearch = req.id.toLowerCase().includes(searchTerm.toLowerCase()) || req.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && matchesPriority;
  });

  const getNextStageAction = (stage: string) => {
    switch (stage) {
      case 'Submitted': return { label: t('assignOfficer'), next: 'Officer Assigned', color: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200' };
      case 'Officer Assigned': return { label: t('escalateManager'), next: 'Manager Review', color: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200' };
      case 'Manager Review': return { label: t('sendGmApproval'), next: 'GM Approval', color: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200' };
      case 'GM Approval': return { label: t('markResolved'), next: 'Resolved', color: 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200' };
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
      setSelectedRequests(filteredRequests.map(r => r.id));
    }
  };

  const handleBulkAction = () => {
    selectedRequests.forEach(id => {
       const req = requests.find(r => r.id === id);
       // Only assign if it's currently at Submitted
       if (req && req.currentStage === 'Submitted') {
          updateStage(id, 'Officer Assigned');
       }
    });
    setSelectedRequests([]);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="p-6 border-b flex flex-col gap-4 bg-gray-50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h3 className="font-bold text-lg">Citizen Requests Management</h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search citizen or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-slate-200 bg-white px-3 py-2 rounded-xl text-sm font-bold outline-none"
            >
              <option value="All">{t('all') || 'All Priorities'}</option>
              <option value="Critical">{translateDynamic('Critical')}</option>
              <option value="High">{translateDynamic('High')}</option>
              <option value="Low">{translateDynamic('Low')}</option>
            </select>

            <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition">
              <Download size={16} /> Export CSV
            </button>
            
            {selectedRequests.length > 0 && (
              <button onClick={handleBulkAction} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-200 hover:bg-blue-700 animate-in fade-in">
                Auto-Assign Selected ({selectedRequests.length})
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['All', 'Electricity', 'Water', 'Gas', 'Municipal'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap
                    ${selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
            >
              {translateDynamic(cat)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="divide-y overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
            <tr>
              <th className="px-6 py-4">
                <input 
                  type="checkbox" 
                  className="rounded text-blue-600 focus:ring-blue-500" 
                  checked={selectedRequests.length > 0 && selectedRequests.length === filteredRequests.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-4">Ref ID / Aging</th>
              <th className="px-4 py-4">Citizen Details</th>
              <th className="px-4 py-4">Service Details</th>
              <th className="px-4 py-4">Priority & Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 font-bold">
                  No requests found matching criteria.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req, idx) => {
                const isOverdue = idx === 0 && req.currentStage === 'Submitted'; // Simulation of aging
                return (
                <tr key={req.id} className={`hover:bg-blue-50/30 transition ${selectedRequests.includes(req.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-6 py-6 border-l-4 border-transparent" style={{ borderLeftColor: isOverdue ? '#ef4444' : 'transparent' }}>
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={selectedRequests.includes(req.id)}
                      onChange={() => toggleSelect(req.id)}
                    />
                  </td>
                  <td className="px-4 py-6">
                    <p className="font-bold text-blue-600">{req.id}</p>
                    {(() => {
                       const ageMs = Date.now() - new Date(req.createdAt).getTime();
                       const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                       const hours = Math.floor((ageMs / (1000 * 60 * 60)) % 24);
                       const isOld = days >= 2;
                       let agingStr = "Just now";
                       if (days > 0) agingStr = `${days}d ${hours}h ago`;
                       else if (hours > 0) agingStr = `${hours}h ago`;

                       return (
                          <div className={`text-[10px] font-bold px-2 py-0.5 mt-1 rounded inline-block whitespace-nowrap ${isOld ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                             {isOld ? `Age: ${agingStr}` : `${agingStr}`}
                          </div>
                       );
                    })()}
                  </td>
                  <td className="px-4 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{req.name}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Mail size={12} className="text-slate-400" />
                        Notify Citizen
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-6">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 truncate max-w-[200px]" title={req.serviceType}>{req.serviceType}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{req.category}</span>
                        {req.id === 'REQ-2024-001' && ( // Simulated attachment presence
                            <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold cursor-pointer hover:bg-slate-200">
                                <Paperclip size={10} /> 1 file
                            </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 min-w-[200px]">
                    <div className="flex flex-col gap-2 items-start w-full">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                          ${req.priority === 'Critical' ? 'bg-red-600 text-white' :
                          req.priority === 'High' ? 'bg-orange-500 text-white' :
                            req.priority === 'Medium' ? 'bg-blue-500 text-white' :
                              'bg-slate-200 text-slate-500'}`}>
                        {translateDynamic(req.priority || 'Medium')}
                      </span>
                      
                      {/* Interactive Stage Timeline */}
                      <div className="w-full mt-1">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400 mb-1">
                          <span className={req.currentStage !== 'Submitted' ? 'text-blue-500' : 'text-slate-400'}>Sub</span>
                          <span className={['Manager Review', 'GM Approval', 'Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'text-blue-500' : 'text-slate-300'}>Assg</span>
                          <span className={['GM Approval', 'Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'text-blue-500' : 'text-slate-300'}>Rev</span>
                          <span className={['Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'text-green-500' : 'text-slate-300'}>Done</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                           <div className={`h-full transition-all duration-500 ${['Resolved', 'Approved', 'Completed'].includes(req.currentStage) ? 'w-full bg-green-500' : ['GM Approval'].includes(req.currentStage) ? 'w-[75%] bg-blue-500' : ['Manager Review'].includes(req.currentStage) ? 'w-[50%] bg-blue-500' : ['Officer Assigned'].includes(req.currentStage) ? 'w-[25%] bg-blue-500' : 'w-[5%] bg-slate-400'}`}></div>
                        </div>
                      </div>

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
                            <button
                              onClick={() => updateStage(req.id, action.next)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${action.color}`}
                            >
                              {action.label} <ArrowRight size={14} />
                            </button>
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
