import React from 'react';
import { AlertCircle, Zap, Droplets, Info } from 'lucide-react';
import { CityAlert, Language } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
    alerts: CityAlert[];
    language?: Language;
}

const AlertsPanel: React.FC<Props> = ({ alerts, language = Language.ENGLISH }) => {
    const { t } = useLanguage();

    return (
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="text-red-500 animate-pulse" size={16} />
                    {t('localAlerts') || "Local Alerts"}
                </h3>
                <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded text-white font-bold animate-pulse">{t('live') || "LIVE"}</span>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {alerts.map((alert) => (
                    <div key={alert.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 items-start gap-3 hover:bg-slate-700 transition flex">
                        <div className={`mt-1 p-2 rounded-full shrink-0 ${alert.type === 'Power' ? 'bg-amber-900 text-amber-500' :
                            alert.type === 'Water' ? 'bg-blue-900 text-blue-500' :
                                'bg-slate-700 text-slate-300'
                            }`}>
                            {alert.type === 'Power' && <Zap size={14} />}
                            {alert.type === 'Water' && <Droplets size={14} />}
                            {alert.type === 'Civic' && <Info size={14} />}
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${alert.severity === 'Critical' ? 'text-red-400' :
                                    alert.severity === 'Warning' ? 'text-amber-400' : 'text-blue-200'
                                    }`}>
                                    {alert.severity} • {alert.ward === 'Global' ? (t('cityWide') || 'City Wide') : `${t('ward') || 'Ward'} ${alert.ward}`}
                                </span>
                            </div>
                            <p className="text-xs font-bold leading-relaxed opacity-90">{alert.message}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertsPanel;
