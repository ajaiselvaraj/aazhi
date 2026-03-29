import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ArrowLeft, Send, MapPin, History, Map, Clock, UserCheck, Settings } from 'lucide-react';
import { useServiceComplaint } from '../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';

interface Props {
  alerts: any[];
  onViewComplaints: (category: string, area: string) => void;
}

const AdminAlerts: React.FC<Props> = ({ alerts, onViewComplaints }) => {
  const { t } = useTranslation();
  const { acknowledgeAlert } = useServiceComplaint();
  const [viewMode, setViewMode] = useState<'Active' | 'History'>('Active');
  
  // Advanced state for the requested functional features
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, { officer: string, time: string }>>({});
  const [manualPriorities, setManualPriorities] = useState<Record<string, 'High' | 'Medium' | 'Low' | 'Critical'>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Tick every minute to update the active duration correctly
  useEffect(() => {
     const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
     return () => clearInterval(timer);
  }, []);

  const handleAcknowledge = (id: string, area: string) => {
    const adminName = "Admin (ID: 963852)";
    setAcknowledgedAlerts(prev => ({ 
       ...prev, 
       [id]: { officer: adminName, time: new Date().toLocaleTimeString() } 
    }));
    acknowledgeAlert(area, adminName);
  };

  const handlePushNotification = (area: string) => {
    alert(`Simulating Push Notification to all users in ${area} regarding the ongoing issue.`);
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
      const priorityA = manualPriorities[`ALERT-${alerts.indexOf(a) + 100}`] || a.level;
      const priorityB = manualPriorities[`ALERT-${alerts.indexOf(b) + 100}`] || b.level;
      return (priorityA === 'Critical' ? 4 : priorityA === 'High' ? 3 : priorityA === 'Medium' ? 2 : 1) <
             (priorityB === 'Critical' ? 4 : priorityB === 'High' ? 3 : priorityB === 'Medium' ? 2 : 1) ? 1 : -1;
  });
  
  const displayAlerts = viewMode === 'Active' ? sortedAlerts : []; // Keep empty for history mock

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Top Banner & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Impact Alerts</h3>
            <p className="text-slate-500 font-medium text-sm">Real-time geo-tagged clustering events requiring attention.</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('Active')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'Active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t('activeCases') || 'Active'} ({alerts.length})
          </button>
          <button 
            onClick={() => setViewMode('History')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'History' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <History size={14} /> {t('archive') || 'History'} (4)
          </button>
        </div>
      </div>

      {viewMode === 'Active' && (
        <>
          {/* Simulated Map Toggle UI */}
          <div className="w-full bg-slate-800 p-4 rounded-2xl flex justify-between items-center text-white">
             <div className="flex items-center gap-3">
                <Map size={20} className="text-blue-400" />
                <span className="font-bold">Live Geography View</span>
             </div>
             <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold transition">
                Toggle Map Overlay
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayAlerts.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-slate-100">
                <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                <p className="text-xl font-bold text-slate-800">No active area alerts</p>
                <p className="text-slate-500 mt-2 text-sm">System is monitoring for incident spikes...</p>
              </div>
            ) : (
              displayAlerts.map((alert, idx) => {
                const globalIdx = alerts.findIndex(a => a.area === alert.area && a.complaintType === alert.complaintType);
                const uniqueId = `ALERT-${globalIdx + 100}`;
                const ackData = acknowledgedAlerts[uniqueId];
                
                // Get manual overridden priority or fallback to the system calculated level
                const currentPriority = manualPriorities[uniqueId] || alert.level;

                // Duration Calculation
                const ageMs = currentTime - new Date(alert.createdAt).getTime();
                const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
                const ageMins = Math.floor((ageMs / (1000 * 60)) % 60);
                const durationString = ageHours > 0 ? `${ageHours}h ${ageMins}m` : `${ageMins}m`;
                
                return (
                <div key={idx} className={`relative overflow-hidden bg-white p-6 rounded-3xl shadow-lg border-2 flex flex-col transition hover:shadow-xl
                        ${currentPriority === 'Critical' ? 'border-red-500 shadow-red-100' : currentPriority === 'High' ? 'border-orange-500 shadow-orange-100' : currentPriority === 'Medium' ? 'border-blue-500 shadow-blue-100' : 'border-slate-300'}`}>

                  {/* Priority Dropdown Override */}
                  <div className={`absolute top-0 right-0 rounded-bl-2xl overflow-hidden font-black text-xs uppercase
                            ${currentPriority === 'Critical' ? 'bg-red-600 animate-pulse' : currentPriority === 'High' ? 'bg-orange-500' : currentPriority === 'Medium' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                    <select 
                       value={currentPriority}
                       onChange={(e) => setManualPriorities(prev => ({ ...prev, [uniqueId]: e.target.value as any }))}
                       className="bg-transparent text-white border-none outline-none font-black uppercase px-4 py-1.5 cursor-pointer appearance-none text-center"
                       style={{ textAlignLast: 'center' }}
                    >
                       <option value="Critical" className="bg-white text-slate-800">{t('severityCritical') || 'Critical'}</option>
                       <option value="High" className="bg-white text-slate-800">{t('severityWarning') || 'High'}</option>
                       <option value="Medium" className="bg-white text-slate-800">{t('severityInfo') || 'Medium'}</option>
                       <option value="Low" className="bg-white text-slate-800">{t('severityLow') || 'Low'}</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={18} className={currentPriority === 'Critical' ? 'text-red-500' : currentPriority === 'High' ? 'text-orange-500' : 'text-blue-500'} />
                    <h4 className="text-2xl font-black text-slate-900 truncate" title={alert.area}>{alert.area}</h4>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-6 pl-7">
                     <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Incident Cluster</p>
                     <p className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">
                        <Clock size={10} className="text-blue-500"/> Active: {durationString}
                     </p>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                       <span className="font-bold text-slate-500 flex items-center gap-2"><AlertTriangle size={14} className="text-orange-500"/> Root Issue</span>
                      <span className="font-black text-slate-900">{alert.complaintType}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-500 flex items-center gap-2"><Settings size={14} className="text-blue-500"/> Responsible Dept</span>
                      <span className="font-black text-slate-900">{alert.category}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2">
                      <span className="font-bold text-slate-700">Affected Citizens</span>
                      <span className="font-black text-2xl text-red-600">{alert.count}</span>
                    </div>
                  </div>
                  
                  {ackData ? (
                      <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm font-bold flex flex-col gap-1 mb-4">
                          <div className="flex items-center gap-2">
                             <UserCheck size={16} className="text-green-600"/> 
                             <span>Ack by: <span className="font-black">{ackData.officer}</span></span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-green-600/70 ml-6 tracking-wider">At {ackData.time}</span>
                      </div>
                  ) : (
                      <button 
                        onClick={() => handleAcknowledge(uniqueId, alert.area)}
                        className="w-full mb-4 bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex justify-center items-center shadow-md shadow-slate-900/20 active:scale-95"
                      >
                         Acknowledge Alert
                      </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handlePushNotification(alert.area)}
                      className="bg-blue-50 text-blue-600 py-3 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-2"
                    >
                      <Send size={14} /> Send Comm
                    </button>
                    <button 
                      onClick={() => onViewComplaints(alert.category, alert.area)} 
                      className="bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2"
                    >
                      View Reports <ArrowLeft className="rotate-180" size={14} />
                    </button>
                  </div>
                </div>
              );
              })
            )}
          </div>
        </>
      )}

      {viewMode === 'History' && (
        <div className="bg-white rounded-3xl shadow-sm border p-8 text-center">
            <History className="mx-auto mb-4 text-slate-300" size={48} />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Historical Alerts Archive</h3>
            <p className="text-slate-500 max-w-md mx-auto">This section typically displays previously resolved impact zones and anomaly records for audit purposes. Currently displaying 4 mock records in system memory.</p>
        </div>
      )}
    </div>
  );
};

export default AdminAlerts;
