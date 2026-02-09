import React from 'react';
import { Zap, ShieldCheck, User, CreditCard, Calculator, FileText, Smartphone, AlertTriangle, ArrowRight, Lock, ArrowLeft } from 'lucide-react';
import { Language } from '../../../types';
import { TRANSLATIONS } from '../../../constants';

interface Props {
    onNavigate: (view: 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS') => void;
    onExit: () => void;
    language: Language;
}

const ElectricityLanding: React.FC<Props> = ({ onNavigate, onExit, language }) => {
    const t = TRANSLATIONS[language];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 pb-10">

            <button onClick={onExit} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-2 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t.backToUtils}
            </button>

            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-100 mb-2">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t.officialPortal}</span>
                </div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tight">{t.elecServices}</h1>
                <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
                    {language === Language.ENGLISH ? "Secure, instant, and transparent electricity bill payments. Choose your preferred access mode below." : (language === Language.TAMIL ? "பாதுகாப்பான, உடனடி மற்றும் வெளிப்படையான மின்சார கட்டண கொடுப்பனவுகள்." : "तेज, सुरक्षित और पारदर्शी बिजली बिल भुगतान।")}
                </p>
            </div>

            {/* Main Mode Selection - Dual Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

                {/* Quick Pay */}
                <button
                    onClick={() => onNavigate('QUICK_PAY')}
                    className="group relative bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden border-4 border-transparent hover:border-blue-300"
                >
                    <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover:scale-125 transition duration-500">
                        <Zap size={140} />
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                            <Zap size={32} className="text-yellow-300 fill-yellow-300" />
                        </div>

                        <div>
                            <div className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                                {t.recommended || "RECOMMENDED"}
                            </div>
                            <h2 className="text-3xl font-black leading-tight mb-2">{t.quickPay}</h2>
                            <p className="opacity-90 font-medium text-sm leading-relaxed max-w-[80%]">
                                {t.quickPayDesc}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-white/10 w-fit px-4 py-3 rounded-xl group-hover:bg-white group-hover:text-blue-600 transition">
                            {t.startPayment} <ArrowRight size={14} />
                        </div>
                    </div>
                </button>

                {/* Consumer Login */}
                <button
                    onClick={() => onNavigate('LOGIN')}
                    className="group relative bg-white text-slate-900 p-8 rounded-[2.5rem] shadow-lg border border-slate-200 hover:border-blue-500 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden"
                >
                    <div className="absolute right-0 top-0 p-6 text-slate-100 -rotate-12 group-hover:text-slate-50 transition duration-500">
                        <User size={140} />
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                            <Lock size={32} />
                        </div>

                        <div>
                            <div className="inline-block bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                                {t.fullAccess || "FULL ACCESS"}
                            </div>
                            <h2 className="text-3xl font-black leading-tight mb-2">{t.consumerLogin}</h2>
                            <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-[80%]">
                                {t.consumerLoginDesc}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 w-fit px-4 py-3 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition">
                            {t.secureLogin} <ArrowRight size={14} />
                        </div>
                    </div>
                </button>
            </div>

            {/* Secondary Tools */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {[
                    { id: 'CALCULATOR', icon: Calculator, label: t.billCalculator, desc: t.calcSub },
                    { id: 'TARIFF', icon: FileText, label: t.tariffDetails, desc: t.viewRates || 'View rates & slabs' },
                    { id: 'TRANSACTIONS', icon: CreditCard, label: "My Transactions", desc: "View Payment History" },
                    { id: 'APP', icon: Smartphone, label: t.appDownload, desc: t.mobileServices || 'Mobile services' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'CALCULATOR' || item.id === 'TARIFF' || item.id === 'TRANSACTIONS') onNavigate(item.id as any);
                        }}
                        className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition text-left group"
                    >
                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
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
                    <h4 className="font-black text-amber-900 text-sm uppercase tracking-wider mb-1">{t.fraudAlert}</h4>
                    <p className="text-amber-800 text-sm font-medium leading-relaxed">
                        {t.fraudMsg}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ElectricityLanding;
