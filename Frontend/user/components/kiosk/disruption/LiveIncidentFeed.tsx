import React from 'react';
import { Incident } from './mockIncidentData';
import { AlertCircle, Clock, CheckCircle2, Navigation, Eye, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  incidents: Incident[];
  onIncidentClick: (incident: Incident) => void;
  selectedIncidentId: string | null;
}

const LiveIncidentFeed: React.FC<Props> = ({
  incidents,
  onIncidentClick,
  selectedIncidentId
}) => {
  const getSeverityColor = (severity: string) => {
    if (severity === 'Critical') return '#ef4444'; // Red
    if (severity === 'Warning') return '#f97316'; // Orange
    if (severity === 'Service') return '#3b82f6'; // Blue
    return '#10b981'; // Green for Resolved
  };

  const getStatusBadgeStylesLight = (status: string) => {
    if (status === 'Critical') {
      return 'bg-red-50 text-red-600 border border-red-200';
    }
    if (status === 'In Progress') {
      return 'bg-amber-50 text-amber-600 border border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-xl border border-white/5 rounded-3xl p-5 overflow-hidden shadow-2xl">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-4 mb-2 shrink-0 border-b border-white/5">
        <div className="text-left">
          <h4 className="text-sm font-black text-white tracking-wide uppercase">Operations log</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Live IoT Diagnostic telemetry</p>
        </div>
        <span className="flex items-center gap-1.5 bg-blue-500/15 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-blue-500/30">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> connected
        </span>
      </div>

      {/* Timeline Feed Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar text-left relative pt-2">
        {incidents.map((incident) => {
          const isSelected = selectedIncidentId === incident.id;
          const severityColor = getSeverityColor(incident.severity);

          return (
            <div key={incident.id} className="relative group">
              {/* Incident Card */}
              <div
                onClick={() => onIncidentClick(incident)}
                className={`bg-white rounded-xl shadow-sm transition-all duration-300 cursor-pointer overflow-hidden ${
                  isSelected ? 'ring-2 ring-blue-400 shadow-md scale-[1.02]' : 'hover:shadow-md'
                }`}
              >
                <div className="flex h-full">
                  {/* Left color bar */}
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: severityColor }} />
                  
                  {/* Content */}
                  <div className="flex-1 p-4">
                    {/* Header info */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: severityColor }}>
                        {incident.id} • {incident.severity}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {incident.timestamp}
                      </span>
                    </div>

                    {/* Primary Message */}
                    <h5 className="text-sm font-medium text-slate-700 leading-snug">
                      {incident.message}
                    </h5>

                    {/* Expanded Details Panel */}
                    <AnimatePresence initial={false}>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 mt-3 border-t border-slate-100 space-y-2 text-[10px] text-slate-500 font-medium leading-relaxed">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 font-bold block mb-0.5">reporter</span>
                                <span className="text-slate-700">{incident.reporter}</span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 font-bold block mb-0.5">dispatch team</span>
                                <span className="text-slate-700">{incident.responseTeam}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 font-bold block mb-0.5">eta restoration</span>
                                <span className="text-slate-700 flex items-center gap-1">
                                  <Clock size={10} /> {incident.estimatedRestore}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase text-slate-400 font-bold block mb-0.5">coordinates</span>
                                <span className="text-slate-700 flex items-center gap-1 font-mono">
                                  <MapPin size={10} /> {incident.coordinates.join(', ')}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-100">
                              <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusBadgeStylesLight(incident.status)}`}>
                                {incident.status}
                              </span>
                              
                              <button 
                                className="flex items-center gap-1.5 text-[9px] font-black bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition duration-200 uppercase tracking-widest shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onIncidentClick(incident);
                                }}
                              >
                                <Navigation size={10} /> Fly to
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveIncidentFeed;
export { LiveIncidentFeed };
