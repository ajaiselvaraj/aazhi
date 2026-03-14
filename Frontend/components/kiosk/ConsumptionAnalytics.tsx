import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Droplets, Lightbulb } from 'lucide-react';
import { Language } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

const DATA = [
    { month: 'Jan', power: 240, water: 150 },
    { month: 'Feb', power: 220, water: 150 },
    { month: 'Mar', power: 280, water: 150 },
    { month: 'Apr', power: 350, water: 150 },
    { month: 'May', power: 400, water: 150 },
    { month: 'Jun', power: 380, water: 150 },
];

const SmartTip = ({ text }: { text: string }) => (
    <div className="flex gap-3 items-start bg-amber-50 p-4 rounded-xl border border-amber-100">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
            <Lightbulb size={16} />
        </div>
        <p className="text-xs font-bold text-amber-800 leading-relaxed">{text}</p>
    </div>
);

interface Props {
    language?: Language
}

const ConsumptionAnalytics: React.FC<Props> = ({ language = Language.ENGLISH }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-black text-slate-800">{t('consumptionTrends') || 'Consumption Trends'}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('elecWaterUsage') || 'Electricity & Water Usage'}</p>
                </div>
                <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600"></span> {t('power') || 'Power'}</span>
                    <span className="flex items-center gap-1 text-cyan-500"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> {t('water') || 'Water'}</span>
                </div>
            </div>

            <div className="h-48 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={DATA}>
                        <defs>
                            <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="power" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorPower)" />
                        <Area type="monotone" dataKey="water" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorWater)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-3">
                <SmartTip text={t('tipContent') || "Your usage peaks in May. Switching to 5-Star rated ACs can save ₹400/month."} />
            </div>
        </div>
    );
};

export default ConsumptionAnalytics;
