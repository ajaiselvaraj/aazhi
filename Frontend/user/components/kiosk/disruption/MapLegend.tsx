import React from 'react';

const MapLegend: React.FC = () => {
  const legendItems = [
    { label: 'Critical Outage', color: 'bg-red-500 shadow-red-500/50' },
    { label: 'Warning Area', color: 'bg-amber-400 shadow-amber-400/50' },
    { label: 'Normal / Resolved', color: 'bg-emerald-500 shadow-emerald-500/50' },
    { label: 'AI Predicted Risk', color: 'bg-purple-500 shadow-purple-500/50' }
  ];

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl border border-white/10 text-left min-w-[140px] pointer-events-none">
      <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-2 border-b border-white/5 pb-1">
        Command Legend
      </div>
      <div className="space-y-1.5 text-[9px] font-bold text-slate-300">
        {legendItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${item.color}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapLegend;
