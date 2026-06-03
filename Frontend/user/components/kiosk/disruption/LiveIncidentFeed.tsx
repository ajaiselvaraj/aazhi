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
    if (severity === 'Warning') return '#f59e0b'; // Amber
    return '#3b82f6'; // Blue
  };

  const getStatusBadgeStyles = (status: string) => {
    if (status === 'Critical') {
      return 'bg-red-500/15 text-red-400 border border-red-500/30';
    }
    if (status === 'In Progress') {
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    }
    return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/5 mb-4 shrink-0">
        <div className="text-left">
          <h4 className="text-xs font-black text-white tracking-[0.12em] uppercase">Operations log</h4>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Live IoT Diagnostic telemetry</p>
        </div>
        <span className="flex items-center gap-1.5 bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border border-blue-500/30">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> connected
        </span>
      </div>

      {/* Timeline Feed Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar text-left relative pl-4 border-l border-white/5">
        {incidents.map((incident) => {
          const isSelected = selectedIncidentId === incident.id;
          const severityColor = getSeverityColor(incident.severity);

          return (
            <div key={incident.id} className="relative group">
              {/* Timeline Indicator Node */}
              <div
                className="absolute -left-[21.5px] top-4 w-2.5 h-2.5 rounded-full border border-slate-950 transition duration-300 z-10"
                style={{
                  backgroundColor: isSelected ? severityColor : '#334155',
                  boxShadow: isSelected ? `0 0 8px ${severityColor}` : 'none'
                }}
              />

              {/* Incident Card */}
              <div
                onClick={() => onIncidentClick(incident)}
                className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden select-none ${
                  isSelected
                    ? 'bg-slate-950/70 border-white/20 shadow-lg shadow-black/45'
                    : 'bg-slate-900/35 border-white/5 hover:bg-slate-900/60 hover:border-white/10'
                }`}
                style={{
                  borderLeft: `3px solid ${severityColor}`
                }}
              >
                {/* Header info */}
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black tracking-widest text-slate-400 font-mono">
                    {incident.id}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500">
                    {incident.timestamp}
                  </span>
                </div>

                {/* Primary Message */}
                <h5 className="text-xs font-black text-white group-hover:text-blue-400 transition-colors leading-snug">
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
                      <div className="pt-3 mt-3 border-t border-white/5 space-y-2 text-[9px] text-slate-400 font-bold leading-relaxed">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[8px] uppercase text-slate-500 block">reporter</span>
                            <span className="text-slate-200">{incident.reporter}</span>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase text-slate-500 block">dispatch team</span>
                            <span className="text-slate-200">{incident.responseTeam}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-[8px] uppercase text-slate-500 block">eta restoration</span>
                            <span className="text-slate-200 flex items-center gap-1">
                              <Clock size={8} /> {incident.estimatedRestore}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] uppercase text-slate-500 block">coordinates</span>
                            <span className="text-slate-200 flex items-center gap-1 font-mono">
                              <MapPin size={8} /> {incident.coordinates.join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-white/5">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${getStatusBadgeStyles(incident.status)}`}>
                            {incident.status}
                          </span>
                          
                          <button 
                            className="flex items-center gap-1 text-[8px] font-black bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg transition duration-200 uppercase tracking-widest shadow shadow-blue-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              onIncidentClick(incident);
                            }}
                          >
                            <Navigation size={8} /> Fly to
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
