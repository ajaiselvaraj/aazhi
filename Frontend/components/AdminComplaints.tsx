import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle, ChevronDown, Globe, Users, AlertTriangle, MessageSquare, Paperclip, Send, Download, X, Upload } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  complaints: any[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  priorityFilter: string;
  setPriorityFilter: (prio: string) => void;
  updateStage: (id: string, stage: string) => void;
  updateStatus: (id: string, status: string) => void;
  searchTerm: string;
}

const AdminComplaints: React.FC<Props> = ({ 
  complaints, 
  selectedCategory, 
  setSelectedCategory, 
  priorityFilter, 
  setPriorityFilter, 
  updateStage, 
  updateStatus, 
  searchTerm 
}) => {
  const [openDropdown, setOpenDropdown] = useState<{ id: string, type: 'status' } | null>(null);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'Active' | 'Resolved'>('Active');
  const { t } = useLanguage();
  
  // Custom mock state for the requested functional additions
  const [complaintNotes, setComplaintNotes] = useState<Record<string, string>>({});
  const [complaintImages, setComplaintImages] = useState<Record<string, string[]>>({});
  const [activeModal, setActiveModal] = useState<{ id: string, type: 'note' | 'upload' } | null>(null);
  const [tempNote, setTempNote] = useState('');

  const filteredComplaints = complaints.filter(c => {
     // Apply view mode filter
     if (viewMode === 'Resolved' && c.status !== 'Resolved') return false;
     if (viewMode === 'Active' && c.status === 'Resolved') return false;
     
     // Apply category filter matches external prop selectedCategory
     // priorityFilter is handled externally in sorting, but we can do secondary checks here if needed.
     return true;
  });

  const getNextStageAction = (stage: string) => {
    switch (stage) {
      case 'Submitted': return { label: t('assignOfficer'), next: 'Manager Review', color: 'bg-blue-600 hover:bg-blue-700 text-white' };
      case 'Manager Review': return { label: t('sendGmApproval'), next: 'GM Approval', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' };
      case 'GM Approval': return { label: t('markResolved'), next: 'Resolved', color: 'bg-purple-600 hover:bg-purple-700 text-white' };
      default: return null;
    }
  };

  const handleBulkStatusChange = (status: string) => {
    if (selectedComplaints.length === 0) return;
    alert(`Changing status of \${selectedComplaints.length} complaints to \${status}`);
    // Simulate updating all
    selectedComplaints.forEach(id => updateStatus(id, status));
    setSelectedComplaints([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedComplaints(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const handleSaveNote = () => {
     if (!activeModal) return;
     setComplaintNotes(prev => ({ ...prev, [activeModal.id]: tempNote }));
     setActiveModal(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!activeModal || !e.target.files?.length) return;
     const newImage = URL.createObjectURL(e.target.files[0]);
     setComplaintImages(prev => ({
        ...prev,
        [activeModal.id]: [...(prev[activeModal.id] || []), newImage]
     }));
     setActiveModal(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Top Controls & Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-transparent md:border-slate-200">
          <button 
             onClick={() => setViewMode('Active')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'Active' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-200'}`}
          >
             Active Cases
          </button>
          <button 
             onClick={() => setViewMode('Resolved')}
             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'Resolved' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-white border border-slate-200'}`}
          >
             Archive
          </button>
          <div className="w-px h-8 bg-slate-300 mx-2 self-center"></div>

          {['All', 'Electricity', 'Water', 'Gas', 'Municipal'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                ${selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
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
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedComplaints.length > 0 && (
         <div className="bg-blue-50 border border-blue-200 p-3 flex justify-between items-center rounded-2xl animate-in zoom-in-95">
            <span className="text-blue-800 font-bold ml-2 text-sm">{selectedComplaints.length} selected</span>
            <div className="flex gap-2">
               <button onClick={() => handleBulkStatusChange('In Progress')} className="bg-white border border-slate-200 hover:bg-blue-100 text-blue-700 px-4 py-1.5 rounded-xl text-xs font-bold transition">Mark In Progress</button>
               <button onClick={() => handleBulkStatusChange('Resolved')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-xl text-shadow-sm text-xs font-bold transition">Mark Resolved</button>
               <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition hover:bg-slate-900"><Download size={14} /> Export CSV</button>
            </div>
         </div>
      )}

      {/* Complaint Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-20 opacity-50 bg-white rounded-3xl border border-slate-100">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <p className="text-xl font-bold">No complaints found</p>
          </div>
        ) : (
          filteredComplaints.map((complaint) => {
            const isBreachingSLA = complaint.priority === 'Critical' && complaint.status === 'Pending';
            
            return (
            <div key={complaint.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition hover:shadow-md outline outline-2 outline-transparent focus-within:outline-blue-500
                ${complaint.priority === 'Critical' ? 'border-l-4 border-l-red-500' :
                complaint.priority === 'High' ? 'border-l-4 border-l-orange-500' : 'border-slate-100'}
                ${complaint.areaAlert ? 'ring-2 ring-red-500 ring-offset-2 bg-red-50/10' : ''}
                ${isBreachingSLA ? 'bg-red-50/20' : ''}
            `}>
              <div className="flex flex-col md:flex-row justify-between gap-4 relative">
                <input 
                   type="checkbox" 
                   className="absolute top-2 right-2 md:hidden w-5 h-5 rounded text-blue-600"
                   checked={selectedComplaints.includes(complaint.id)}
                   onChange={() => toggleSelect(complaint.id)}
                />

                <div className="flex gap-4 flex-1">
                  <div className="hidden md:block pt-1">
                      <input 
                         type="checkbox" 
                         className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                         checked={selectedComplaints.includes(complaint.id)}
                         onChange={() => toggleSelect(complaint.id)}
                      />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2 pr-8 md:pr-0">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase
                        ${complaint.status === 'Pending' ? 'bg-red-50 text-red-600' :
                          complaint.status === 'In Progress' ? 'bg-orange-50 text-orange-600' :
                            'bg-green-50 text-green-600'}`}>
                        {complaint.status}
                      </span>

                      {/* Stage Badge */}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase
                        ${complaint.currentStage === 'GM Approval' ? 'bg-purple-100 text-purple-700' :
                          complaint.currentStage === 'Manager Review' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-blue-50 text-blue-600'}`}>
                        {complaint.currentStage || 'Submitted'}
                      </span>

                      {/* Priority Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                          ${complaint.priority === 'Critical' ? 'bg-red-600 text-white' :
                          complaint.priority === 'High' ? 'bg-orange-500 text-white' :
                            complaint.priority === 'Medium' ? 'bg-blue-500 text-white' :
                              'bg-slate-200 text-slate-500'}
                      `}>
                        {complaint.priority}
                      </span>

                      <span className="text-xs font-bold text-slate-400 ml-2">{complaint.id}</span>
                      <span className="text-xs font-bold text-slate-400">• {new Date(complaint.createdAt).toLocaleDateString()}</span>
                      
                      {complaint.areaAlert && (
                        <span className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider animate-pulse ml-2 border border-red-200">
                          <AlertTriangle size={10} /> Impact Alert
                        </span>
                      )}
                      
                      {isBreachingSLA && (
                          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-amber-200 ml-2">
                             Escalation Warning
                          </span>
                      )}
                    </div>

                    <h4 className="text-lg font-black text-slate-900 mb-1 leading-tight">{complaint.complaintType}</h4>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2 md:line-clamp-none">{complaint.description}</p>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1"><Users size={14} className="text-slate-400"/> {complaint.name} ({complaint.phone})</span>
                      <span className="flex items-center gap-1"><Globe size={14} className="text-slate-400"/> {complaint.category}</span>
                      {complaint.location && <span className="flex items-center gap-1"><AlertCircle size={14} className="text-slate-400"/> {complaint.location}</span>}
                    </div>

                    {/* Interactive Mock Additions */}
                    <div className="flex flex-col md:flex-row gap-4 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-100">
                       <button className="flex items-center gap-1.5 hover:text-blue-600 transition" onClick={() => setActiveModal({ id: complaint.id, type: 'upload' })}>
                          <Paperclip size={12}/> Attachments ({(complaintImages[complaint.id] || []).length})
                       </button>
                       <button className="flex items-center gap-1.5 hover:text-blue-600 transition" onClick={() => { setTempNote(complaintNotes[complaint.id] || ''); setActiveModal({ id: complaint.id, type: 'note' }); }}>
                          <MessageSquare size={12}/> {complaintNotes[complaint.id] ? 'View/Edit Notes' : 'Add Internal Note'}
                       </button>
                       <button className="flex items-center gap-1.5 hover:text-blue-600 transition" onClick={() => alert('Sending SMS to Citizen for Update')}>
                          <Send size={12}/> Notify Citizen
                       </button>
                    </div>

                    {/* Display Images if any exist in local state */}
                    {(complaintImages[complaint.id] || []).length > 0 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                            {complaintImages[complaint.id].map((imgUrl, i) => (
                                <img key={i} src={imgUrl} alt="Complaint Upload" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                            ))}
                        </div>
                    )}
                    
                    {/* Display Resolution Note if it exists */}
                    {complaintNotes[complaint.id] && (
                        <div className="mt-4 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                            <h5 className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><MessageSquare size={10}/> Resolution Note</h5>
                            <p className="text-sm text-slate-700 font-medium">{complaintNotes[complaint.id]}</p>
                        </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[160px]">
                  {/* Auto-progression Action Button */}
                  {(() => {
                    const action = getNextStageAction(complaint.currentStage || 'Submitted');
                    if (action) {
                      return (
                        <button
                          onClick={() => updateStage(complaint.id, action.next)}
                          className={`w-full ${action.color} px-4 py-2.5 text-left md:text-center shadow-sm rounded-xl text-xs font-bold transition-all mb-2 flex items-center justify-center gap-2`}
                        >
                          {action.label} <ArrowRight size={14} />
                        </button>
                      );
                    }
                    return (
                        <div className="w-full bg-slate-50 text-slate-500 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-center mb-2 flex items-center justify-center gap-1">
                            <CheckCircle size={14} /> {complaint.currentStage}
                        </div>
                    );
                  })()}

                  {complaint.currentStage !== 'Resolved' && complaint.currentStage !== 'Closed' && complaint.currentStage !== 'Rejected' && (
                      <button
                          onClick={() => updateStage(complaint.id, 'Rejected')}
                          className="w-full bg-white text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-all flex justify-center items-center mb-2"
                      >
                          Reject Request
                      </button>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown?.id === complaint.id ? null : { id: complaint.id, type: 'status' })}
                      className="w-full bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex justify-between items-center hover:bg-slate-200"
                    >
                      Status <ChevronDown size={14} />
                    </button>
                    {openDropdown?.id === complaint.id && openDropdown?.type === 'status' && (
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 w-40 z-10 animate-in fade-in zoom-in-95 duration-200">
                        {['Pending', 'In Progress', 'Resolved'].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              updateStatus(complaint.id, s);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 hover:text-blue-600 rounded-lg text-slate-700 transition"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )})
        )}
      </div>

      {/* Dynamic Modals */}
      {activeModal?.type === 'note' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="text-blue-600"/> Resolution Note</h2>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
               </div>
               <textarea 
                  className="w-full h-32 bg-slate-50 border border-slate-200 p-4 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Record officer notes or resolution details here..."
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
               />
               <button onClick={handleSaveNote} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md shadow-blue-500/20 active:scale-95">
                  Save Note
               </button>
            </div>
         </div>
      )}

      {activeModal?.type === 'upload' && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Upload className="text-blue-600"/> Upload Evidence</h2>
                  <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
               </div>
               <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 relative hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
                  <Upload size={32} className="text-slate-400 mb-4" />
                  <p className="font-bold text-slate-600 mb-1">Click to Upload Image</p>
                  <p className="text-xs font-medium text-slate-400">JPG, PNG up to 10MB</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default AdminComplaints;
