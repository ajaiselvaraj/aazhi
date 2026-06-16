import React, { useState } from 'react';
import { Layers, Eye, EyeOff, ShieldCheck, Sun, Moon, CloudSun, Settings, ChevronLeft, ChevronRight, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  is3DMode: boolean;
  setIs3DMode: (val: boolean) => void;
  mapStyle: string;
  setMapStyle: (val: string) => void;
  activeLayers: string[];
  toggleLayer: (layer: string) => void;
  aiRisksEnabled: boolean;
  setAiRisksEnabled: (val: boolean) => void;
  flowLinesEnabled: boolean;
  setFlowLinesEnabled: (val: boolean) => void;
}

const MAP_STYLES = [
  { name: 'Dark City', url: 'mapbox://styles/mapbox/dark-v11', icon: Moon },
  { name: 'Light Map', url: 'mapbox://styles/mapbox/light-v11', icon: Sun },
  { name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12', icon: Map },
  { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12', icon: CloudSun }
];

const LAYERS = [
  { id: 'water', label: 'Water Grid' },
  { id: 'power', label: 'Power Grid' },
  { id: 'incidents', label: 'Incidents' }
];

const SmartCityControls: React.FC<Props> = ({
  is3DMode,
  setIs3DMode,
  mapStyle,
  setMapStyle,
  activeLayers,
  toggleLayer,
  aiRisksEnabled,
  setAiRisksEnabled,
  flowLinesEnabled,
  setFlowLinesEnabled
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden text-left relative z-10 pointer-events-auto flex flex-col max-h-full"
      style={{
        width: isCollapsed ? '48px' : '220px',
      }}
    >
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white transition duration-200"
          title="Open Map Controls"
        >
          <Settings size={18} className="animate-spin-slow" />
        </button>
      ) : (
        <div className="p-4 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5">
              <Settings size={12} className="text-blue-400" /> Map Config
            </h4>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-md hover:bg-white/5 text-slate-400 hover:text-white transition"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4 min-h-0">
            {/* Projection Toggle */}
            <div>
              <h5 className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Projection</h5>
              <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-white/5">
                <button
                  onClick={() => setIs3DMode(false)}
                  className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                    !is3DMode ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2D FLAT
                </button>
                <button
                  onClick={() => setIs3DMode(true)}
                  className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                    is3DMode ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3D TWIN
                </button>
              </div>
            </div>

            {/* Style Base */}
            <div>
              <h5 className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Base Theme</h5>
              <div className="grid grid-cols-2 gap-1">
                {MAP_STYLES.map((style) => {
                  const Icon = style.icon;
                  const isSelected = mapStyle === style.url;
                  return (
                    <button
                      key={style.name}
                      onClick={() => setMapStyle(style.url)}
                      className={`py-1.5 px-1 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500/50 text-blue-400'
                          : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={10} />
                      <span>{style.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data Layers */}
            <div>
              <h5 className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Layers</h5>
              <div className="flex flex-col gap-1">
                {LAYERS.map((layer) => {
                  const isActive = activeLayers.includes(layer.id);
                  return (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                        isActive
                          ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                          : 'bg-slate-900/20 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <span>{layer.label}</span>
                      {isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Features */}
            <div className="pt-2 border-t border-white/5 flex flex-col gap-1">
              <button
                onClick={() => setAiRisksEnabled(!aiRisksEnabled)}
                className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                  aiRisksEnabled
                    ? 'bg-purple-600/10 border-purple-500/30 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                    : 'bg-slate-900/20 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span className="flex items-center gap-1">
                  <ShieldCheck size={10} className="text-purple-400" /> AI Risk Zones
                </span>
                <span className={`w-1 h-1 rounded-full ${aiRisksEnabled ? 'bg-purple-400 animate-ping' : 'bg-slate-500'}`} />
              </button>

              <button
                onClick={() => setFlowLinesEnabled(!flowLinesEnabled)}
                className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                  flowLinesEnabled
                    ? 'bg-cyan-600/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-900/20 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Layers size={10} className="text-cyan-400" /> Grid Flow Lines
                </span>
                <span className={`w-1 h-1 rounded-full ${flowLinesEnabled ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SmartCityControls;
export { SmartCityControls };
