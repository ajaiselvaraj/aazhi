import React from 'react';
import { Flame, ShieldCheck, CreditCard, AlertTriangle, ArrowRight, ArrowLeft, FileText, User, Search, PlusCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
  onNavigate: (view: 'NEW_CONNECTION' | 'COMPLAINTS' | 'PROFILE' | 'BILLS') => void;
  onExit: () => void;
  language: Language;
}

const GasLanding: React.FC<Props> = ({ onNavigate, onExit }) => {
  const { t } = useTranslation();

  const services = [
    {
      id: 'NEW_CONNECTION',
      icon: PlusCircle,
      label: t('gas_newConnection') || 'New Connection / Change Request',
      desc: t('gas_newConnectionDesc') || 'Apply for new gas connection, meter installation, reconnection, or conversion',
      color: 'orange',
      bgGradient: 'from-orange-600 to-amber-600',
      recommended: true
    },
    {
      id: 'BILLS',
      icon: CreditCard,
      label: t('gas_viewBills') || 'Check / View Bills',
      desc: t('gas_viewBillsDesc') || 'View your gas billing history and payment status',
      color: 'blue',
      bgGradient: 'from-blue-600 to-cyan-600',
      recommended: false
    },
    {
      id: 'COMPLAINTS',
      icon: AlertTriangle,
      label: t('gas_registerComplaint') || 'Register Complaint',
      desc: t('gas_registerComplaintDesc') || 'Report gas-related issues with text or voice input',
      color: 'red',
      bgGradient: 'from-red-600 to-rose-600',
      recommended: false
    },
    {
      id: 'PROFILE',
      icon: User,
      label: t('gas_editProfile') || 'Edit Credentials / Profile',
      desc: t('gas_editProfileDesc') || 'Update your contact details and personal information',
      color: 'purple',
      bgGradient: 'from-purple-600 to-indigo-600',
      recommended: false
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 pb-10">

      <button onClick={onExit} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-2 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back to Services'}
      </button>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full border border-orange-100 mb-2">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('officialPortal') || 'Official Portal'}</span>
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3">
          <Flame className="text-orange-500" size={48} />
          {t('gas_services') || 'Assam Gas Department'}
        </h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
          {t('gas_landingDesc') || 'Access gas connection services, cylinder bookings, bill management, and complaint registration — all from one place.'}
        </p>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onNavigate(service.id as any)}
            className="group relative bg-white text-slate-900 p-8 rounded-[2.5rem] shadow-lg border border-slate-200 hover:border-orange-400 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden"
          >
            {/* Background icon */}
            <div className="absolute right-0 top-0 p-6 text-slate-100 -rotate-12 group-hover:text-slate-50 transition duration-500">
              <service.icon size={140} />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div className={`w-16 h-16 bg-${service.color}-50 text-${service.color}-600 rounded-2xl flex items-center justify-center border border-${service.color}-200 group-hover:bg-${service.color}-600 group-hover:text-white transition`}>
                <service.icon size={32} />
              </div>

              <div>
                {service.recommended && (
                  <div className="inline-block bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 border border-orange-100">
                    {t('recommended') || 'RECOMMENDED'}
                  </div>
                )}
                <h2 className="text-2xl font-black leading-tight mb-2">{service.label}</h2>
                <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-[85%]">
                  {service.desc}
                </p>
              </div>

              <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 w-fit px-4 py-3 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition">
                {t('getStarted') || 'Get Started'} <ArrowRight size={14} />
              </div>
            </div>
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
