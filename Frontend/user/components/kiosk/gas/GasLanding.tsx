import React from 'react';
import { Flame, ShieldCheck, CreditCard, AlertTriangle, ArrowRight, ArrowLeft, FileText, User, UserCog, Calculator, Smartphone, Lock, SearchCode } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
  onNavigate: (view: 'NEW_CONNECTION' | 'COMPLAINTS' | 'PROFILE' | 'BILLS' | 'QUICK_PAY' | 'LOGIN' | 'TRACKER' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS') => void;
  onExit: () => void;
  language: Language;
}

const GasLanding: React.FC<Props> = ({ onNavigate, onExit }) => {
  const { t } = useTranslation();



  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 pb-10">

      <button onClick={onExit} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-2 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
      </button>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full border border-orange-100 mb-2">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('officialPortal') || 'Official Gas Portal'}</span>
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
          <Flame className="text-orange-500" size={48} />
          {t('gas_services') || 'Gas Services'}
        </h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
          {t('gas_landingDesc') || 'Access gas connections, book cylinders, manage bills, and resolve issues securely.'}
        </p>
      </div>

      {/* Main Mode Selection - Dual Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Quick Pay / Booking */}
          <button
              onClick={() => onNavigate('QUICK_PAY')}
              className="group relative bg-gradient-to-br from-orange-500 to-red-600 text-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden border-4 border-transparent hover:border-orange-300"
          >
              <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover:scale-125 transition duration-500">
                  <Flame size={140} />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                      <CreditCard size={32} className="text-white fill-white/20" />
                  </div>

                  <div>
                      <div className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                          {t('recommended') || "RECOMMENDED"}
                      </div>
                      <h2 className="text-3xl font-black leading-tight mb-2">{t('quickPay') || 'Quick Pay'}</h2>
                      <p className="opacity-90 font-medium text-sm leading-relaxed max-w-[80%]">
                          Pay your gas bills instantly with your Customer ID. No password required.
                      </p>
                  </div>

                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-white/10 w-fit px-4 py-3 rounded-xl group-hover:bg-white group-hover:text-orange-600 transition">
                      {t('startPayment') || 'START PAYMENT'} <ArrowRight size={14} />
                  </div>
              </div>
          </button>

          {/* Consumer Login */}
          <button
              onClick={() => onNavigate('LOGIN')}
              className="group relative bg-white text-slate-900 p-8 rounded-[2.5rem] shadow-lg border border-slate-200 hover:border-orange-500 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden"
          >
              <div className="absolute right-0 top-0 p-6 text-slate-100 -rotate-12 group-hover:text-slate-50 transition duration-500">
                  <User size={140} />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 group-hover:bg-orange-50 group-hover:text-orange-600 transition">
                      <Lock size={32} />
                  </div>

                  <div>
                      <div className="inline-block bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 group-hover:bg-orange-50 group-hover:text-orange-600 transition">
                          {t('fullAccess') || "FULL ACCESS"}
                      </div>
                      <h2 className="text-3xl font-black leading-tight mb-2">{t('consumerLogin') || 'Consumer Login'}</h2>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-[80%]">
                          Log in to manage connections, view billing history, download invoices, and update profile natively.
                      </p>
                  </div>

                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 w-fit px-4 py-3 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition">
                      {t('secureLogin') || 'SECURE LOGIN'} <ArrowRight size={14} />
                  </div>
              </div>
          </button>
      </div>

      {/* Consumer Services Grid */}
      <h3 className="font-bold text-slate-800 text-lg max-w-4xl mx-auto -mb-4 mt-6">{t('gas_consumerServices') || 'Consumer Services'}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          { id: 'NEW_CONNECTION', icon: Flame, label: 'Gas Services', desc: 'New connection / meter' },
          { id: 'BILLS', icon: FileText, label: 'Manage Bills', desc: 'Check / View bills' },
          { id: 'COMPLAINTS', icon: AlertTriangle, label: 'Complaints', desc: 'Report gas issue' },
          { id: 'PROFILE', icon: UserCog, label: 'My Profile', desc: 'Update details' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as any)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-300 transition text-left group"
          >
             <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-600 group-hover:text-white transition">
               <item.icon size={20} />
             </div>
             <h3 className="font-bold text-slate-900">{item.label}</h3>
             <p className="text-xs text-slate-400 font-medium truncate">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Secondary Tools */}
      <h3 className="font-bold text-slate-800 text-lg max-w-4xl mx-auto -mb-4 mt-6">{t('gas_otherTools') || 'Other Tools'}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          { id: 'TRACKER', icon: SearchCode, label: 'Track Request', desc: 'Trace status' },
          { id: 'CALCULATOR', icon: Calculator, label: 'Bill Calculator', desc: 'Estimate usage' },
          { id: 'TARIFF', icon: FileText, label: 'Tariff Details', desc: 'View gas charge slabs' },
          { id: 'TRANSACTIONS', icon: CreditCard, label: 'My Transactions', desc: 'View payment history' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as any)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-300 transition text-left group"
          >
             <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-slate-200 transition">
               <item.icon size={20} />
             </div>
             <h3 className="font-bold text-slate-900">{item.label}</h3>
             <p className="text-xs text-slate-400 font-medium truncate">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Safety Warning */}
      <div className="max-w-5xl mx-auto bg-red-50 border border-red-100 rounded-3xl p-6 flex items-start gap-4">
        <div className="bg-red-100 text-red-600 p-3 rounded-xl shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h4 className="font-black text-red-900 text-sm uppercase tracking-wider mb-1">
            {t('gas_safetyTitle') || 'Gas Safety Notice'}
          </h4>
          <p className="text-red-800 text-sm font-medium leading-relaxed">
            {t('gas_safetyMsg') || 'If you smell gas or suspect a gas leak, immediately evacuate the area and call the emergency helpline. Do NOT use any electrical switches, matches, or phones near the leak. Your safety is our top priority.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GasLanding;
