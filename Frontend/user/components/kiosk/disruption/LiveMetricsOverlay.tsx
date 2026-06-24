import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  activeCount: number;
}

const LiveMetricsOverlay: React.FC<Props> = ({ activeCount }) => {
  const { t } = useTranslation();
  const metrics = [
    {
      label: t('activeIncidents') || 'Active Incidents',
      value: activeCount,
      icon: AlertTriangle,
      color: activeCount > 2 ? 'text-red-500 bg-red-50' : 'text-amber-500 bg-amber-50',
    },
    {
      label: t('resolvedToday') || 'Resolved Today',
      value: 18,
      icon: CheckCircle,
      color: 'text-emerald-500 bg-emerald-50',
    },
    {
      label: t('avgResponse') || 'Avg Response',
      value: '28m',
      icon: Clock,
      color: 'text-blue-500 bg-blue-50',
    },
    {
      label: t('responseTeams') || 'Response Teams',
      value: 6,
      icon: Users,
      color: 'text-purple-500 bg-purple-50',
    }
  ];

  return (
    <div className="flex flex-wrap md:flex-nowrap gap-4 w-full z-10">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <div
            key={idx}
            className="flex-1 min-w-[140px] flex items-center gap-4 px-4 py-3 bg-white border border-slate-100 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${metric.color}`}>
              <Icon size={18} strokeWidth={2.5} />
            </div>
            <div className="text-left flex flex-col justify-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 leading-none mb-1.5">
                {metric.label}
              </p>
              <p className="text-xl font-bold text-slate-800 leading-none mt-1">
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
