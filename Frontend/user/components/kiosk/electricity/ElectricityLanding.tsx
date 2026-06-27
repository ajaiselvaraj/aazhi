import React from 'react';
import { Zap, ShieldCheck, User, CreditCard, Calculator, FileText, Smartphone, AlertTriangle, ArrowRight, Lock, ArrowLeft, Bolt, Gauge, AlertCircle, UserCog } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useOrientation } from '../../../contexts/OrientationContext';
import ConsumptionAnalytics from '../ConsumptionAnalytics';

interface Props {
    onNavigate: (view: 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS' | 'NEW_CONNECTION' | 'METER_SERVICE' | 'COMPLAINTS' | 'PROFILE' | 'TRACK_REQUEST') => void;
    onExit: () => void;
    language: Language;
}

const ElectricityLanding: React.FC<Props> = ({ onNavigate, onExit, language }) => {
    const { t } = useTranslation();
    const { isVertical } = useOrientation();

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 pb-10">

            <button onClick={onExit} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-2 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('backToUtils')}
            </button>

            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-100 mb-2">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('officialPortal')}</span>
                </div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tight">{t('elecServices')}</h1>
                <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
                    {t('') || "Secure, instant, and transparent electricity bill payments. Choose your preferred access mode below."}
                </p>
            </div>

            {/* Main Feature - Quick Pay */}
            <div className="max-w-4xl mx-auto">
                {/* Quick Pay */}
                <button
                    onClick={() => onNavigate('QUICK_PAY')}
                    className="w-full group relative bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 text-left overflow-hidden border-4 border-transparent hover:border-blue-300"
                >
                    <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover:scale-125 transition duration-500">
                        <Zap size={140} />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-start gap-6">
                            <div className="w-16 h-16 shrink-0 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                                <Zap size={32} className="text-yellow-300 fill-yellow-300" />
                            </div>

                            <div>
                                <div className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                                    {t('recommended') || "RECOMMENDED"}
                                </div>
                                <h2 className="text-3xl font-black leading-tight mb-2">{t('quickPay')}</h2>
                                <p className="opacity-90 font-medium text-sm leading-relaxed max-w-xl">
                                    {t('quickPayDesc')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-white/10 shrink-0 px-6 py-4 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition">
                            {t('startPayment')} <ArrowRight size={14} />
                        </div>
                    </div>
                </button>
            </div>

            <div className="max-w-4xl mx-auto mt-8">
                <ConsumptionAnalytics language={language} serviceType="electricity" />
            </div>

            {/* Consumer Services */}
            <h3 className="font-bold text-slate-800 text-lg max-w-4xl mx-auto -mb-4">{t('Consumer Services')}</h3>
            <div className={`grid ${isVertical ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-4 max-w-4xl mx-auto`}>
                {[
                    { id: 'NEW_CONNECTION', icon: Bolt, label: t('newConnection') || 'New Connection', desc: 'Apply for connection' },
                    { id: 'METER_SERVICE', icon: Gauge, label: t('meterServices') || 'Meter Services', desc: 'Replace or shift meter' },
                    { id: 'COMPLAINTS', icon: AlertCircle, label: t('complaints') || 'Complaints', desc: 'Report an issue' },
                    { id: 'PROFILE', icon: UserCog, label: t('myProfile') || 'My Profile', desc: 'Manage credentials' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id as any)}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition text-left group"
                    >
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                            <item.icon size={20} />
                        </div>
                        <h3 className="font-bold text-slate-900">{item.label}</h3>
                        <p className="text-xs text-slate-400 font-medium truncate">{item.desc}</p>
                    </button>
                ))}
            </div>

            {/* Secondary Tools */}
            <h3 className="font-bold text-slate-800 text-lg max-w-4xl mx-auto -mb-4">{t('Other Tools')}</h3>
            <div className={`grid ${isVertical ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-4 max-w-4xl mx-auto`}>
                {[
                    { id: 'CALCULATOR', icon: Calculator, label: t('billCalculator') || 'Bill Calculator', desc: t('calcSub') || 'Estimate bill' },
                    { id: 'TARIFF', icon: FileText, label: t('tariffDetails') || 'Tariff Details', desc: t('viewRates') || 'View rates & slabs' },
                    { id: 'TRANSACTIONS', icon: CreditCard, label: t('myTransactions') || "My Transactions", desc: "View Payment History" },
                    { id: 'TRACK_REQUEST', icon: Smartphone, label: t('trackRequest') || "Track Request", desc: "Status & Timelines" },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'CALCULATOR' || item.id === 'TARIFF' || item.id === 'TRANSACTIONS' || item.id === 'TRACK_REQUEST') onNavigate(item.id as any);
                        }}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition text-left group"
                    >
                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-slate-200 transition">
                            <item.icon size={20} />
                        </div>
                        <h3 className="font-bold text-slate-900">{item.label}</h3>
                        <p className="text-xs text-slate-400 font-medium truncate">{item.desc}</p>
                    </button>
                ))}
            </div>

            {/* Security Awareness Footer */}
            <div className="max-w-4xl mx-auto bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
                <div className="bg-amber-100 text-amber-600 p-3 rounded-xl shrink-0">
                    <AlertTriangle size={24} />
                </div>
                <div>
                    <h4 className="font-black text-amber-900 text-sm uppercase tracking-wider mb-1">{t('fraudAlert')}</h4>
                    <p className="text-amber-800 text-sm font-medium leading-relaxed">
                        {t('fraudMsg')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ElectricityLanding;
