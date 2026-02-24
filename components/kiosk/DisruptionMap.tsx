import React from 'react';
import { CloudRain, AlertTriangle, ZapOff, Hammer, CheckCircle2 } from 'lucide-react';
import { CityAlert, Language } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
    alerts: CityAlert[];
    language?: Language;
}

// A stylized SVG map of a fictional city layout representing Coimbatore Zones
const CityMapSvg = ({ alerts }: { alerts: CityAlert[] }) => {
    // Helper to check if a ward has an issue
    const getZoneStatus = (zoneId: string) => {
        const alert = alerts.find(a => a.ward === zoneId || a.ward === 'Global');
        if (!alert) return { fill: '#f1f5f9', stroke: '#cbd5e1' }; // Neutral
        if (alert.severity === 'Critical') return { fill: '#fee2e2', stroke: '#ef4444', alert };
        if (alert.severity === 'Warning') return { fill: '#ffedd5', stroke: '#f97316', alert };
        return { fill: '#dbeafe', stroke: '#3b82f6', alert };
    };

    const zones = [
        { id: '12', d: "M10,10 L100,10 L90,60 L20,70 Z", cx: 50, cy: 40, label: "Ward 12" }, // North
        { id: '14', d: "M110,10 L200,10 L190,80 L100,50 Z", cx: 150, cy: 40, label: "Ward 14" }, // East
        { id: '11', d: "M20,80 L90,70 L100,150 L10,140 Z", cx: 55, cy: 110, label: "Ward 11" }, // West
        { id: '13', d: "M100,60 L190,90 L200,150 L110,160 Z", cx: 155, cy: 120, label: "Central" } // South
    ];

    return (
        <svg viewBox="0 0 220 180" className="w-full h-full drop-shadow-lg">
            {zones.map(zone => {
                const status = getZoneStatus(zone.id);
                return (
                    <g key={zone.id} className="transition-all hover:opacity-80 cursor-pointer group">
                        <path
                            d={zone.d}
                            fill={status.fill}
                            stroke={status.stroke}
                            strokeWidth="2"
                            className="transition-colors duration-500"
                        />
                        <text x={zone.cx} y={zone.cy} fontSize="8" fontWeight="bold" fill="rgba(0,0,0,0.5)" textAnchor="middle">{zone.label}</text>

                        {status.alert && (
                            <g transform={`translate(${zone.cx - 6}, ${zone.cy + 8})`}>
                                {status.alert.type === 'Power' && <circle cx="6" cy="6" r="8" fill="#ef4444" className="animate-pulse" />}
                                {status.alert.type === 'Water' && <circle cx="6" cy="6" r="8" fill="#3b82f6" className="animate-pulse" />}
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

const DisruptionMap: React.FC<Props> = ({ alerts, language = Language.ENGLISH }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100 h-full relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-xl font-black text-slate-800">{t('liveMap') || 'Live Disruption Map'}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">{t('iotSensor') || 'IoT Sensor Network • Realtime'}</p>
                </div>
                <span className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <ZapOff size={12} /> {t('live') || 'Live'}
                </span>
            </div>

            <div className="flex items-center gap-6 h-64">
                {/* Map Visualization */}
                <div className="flex-1 h-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <CityMapSvg alerts={alerts} />
                </div>

                {/* Legend / List */}
                <div className="w-1/3 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="w-3 h-3 bg-red-200 border border-red-500 rounded-full"></span> {t('powerOutage') || 'Power Outage'}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="w-3 h-3 bg-blue-200 border border-blue-500 rounded-full"></span> {t('waterCut') || 'Water Cut'}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="w-3 h-3 bg-slate-200 border border-slate-400 rounded-full"></span> {t('normal') || 'Normal'}
                    </div>

                    <div className="mt-auto bg-slate-900 text-white p-3 rounded-xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{t('estRestore') || 'Est. Restore'}</p>
                        <p className="text-lg font-black text-green-400 flex items-center justify-center gap-1">
                            <CheckCircle2 size={14} /> 2h 15m
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DisruptionMap;
