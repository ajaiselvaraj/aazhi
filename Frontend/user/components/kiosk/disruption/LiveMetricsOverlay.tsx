import React from 'react';
import { ShieldAlert, CheckCircle, Clock, Users } from 'lucide-react';

interface Props {
  activeCount: number;
}

const LiveMetricsOverlay: React.FC<Props> = ({ activeCount }) => {
  const metrics = [
    {
      label: 'Active Incidents',
      value: activeCount,
      icon: ShieldAlert,
      color: activeCount > 2 ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      glow: activeCount > 2 ? 'shadow-[0_0_10px_rgba(239,68,68,0.25)]' : 'shadow-[0_0_10px_rgba(245,158,11,0.2)]'
    },
    {
      label: 'Resolved Today',
      value: 18,
      icon: CheckCircle,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      glow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]'
    },
    {
      label: 'Avg Response Time',
      value: '28m',
      icon: Clock,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      glow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]'
    },
    {
      label: 'Response Teams Active',
      value: 6,
      icon: Users,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      glow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]'
    }
  ];

  return (
    <div className="flex flex-wrap md:flex-nowrap gap-3 w-full z-10">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <div
            key={idx}
            className={`flex-1 min-w-[140px] flex items-center gap-3.5 px-4 py-2.5 bg-slate-950/45 backdrop-blur-xl border border-white/5 rounded-2xl transition-all duration-300 hover:border-white/15 hover:-translate-y-0.5 group ${metric.glow}`}
          >
            <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 ${metric.color}`}>
              <Icon size={14} className="group-hover:scale-110 transition duration-300" />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 leading-none">
                {metric.label}
              </p>
              <p className="text-sm font-black text-white mt-1 leading-none font-mono">
                {metric.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveMetricsOverlay;
