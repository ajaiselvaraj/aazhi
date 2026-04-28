import React, { useState } from 'react';
import { ArrowLeft, Droplet, FileText, AlertCircle, User, ShieldCheck, CreditCard, Lock, ArrowRight, UserCog, Calculator, Smartphone, AlertTriangle, SearchCode, Building2 } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import WaterConnectionForm from './WaterConnectionForm';
import MunicipalProfile from './MunicipalProfile';
import { CivicComplaintForm } from '../../municipal/CivicComplaintForm';
import MunicipalTracker from './MunicipalTracker';
import MunicipalQuickPay from './MunicipalQuickPay';
import WaterLogin from './WaterLogin';
import MunicipalTransactions from './MunicipalTransactions';
import WaterTariff from './WaterTariff';
import WaterBillCalculator from './WaterBillCalculator';
import PropertyTaxTariff from './PropertyTaxTariff';
import PropertyTaxCalculator from './PropertyTaxCalculator';

interface Props {
  onBack: () => void;
  language: Language;
  onGlobalNavigate?: (tab: string) => void;
}

const MunicipalModule: React.FC<Props> = ({ onBack, language, onGlobalNavigate }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<'HOME' | 'WATER' | 'COMPLAINTS' | 'PROFILE' | 'TAXES' | 'QUICK_PAY' | 'LOGIN' | 'TRACKER' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS' | 'PT_TARIFF' | 'PT_CALCULATOR'>('HOME');

  const handleInternalBack = () => {
    setView('HOME');
  };

  const handleNavigate = (newView: any) => {
    if (newView === 'TRACKER' && onGlobalNavigate) {
      onGlobalNavigate('tracker');
      return;
    }
    setView(newView);
  };

  if (view === 'WATER') return <WaterConnectionForm onBack={handleInternalBack} language={language} />;
  if (view === 'PROFILE') return <MunicipalProfile onBack={handleInternalBack} language={language} />;
  if (view === 'COMPLAINTS') return <CivicComplaintForm onBack={handleInternalBack} isPrivacyOn={false} language={language} />;
  if (view === 'TRACKER') return <MunicipalTracker onBack={handleInternalBack} language={language} />;
  if (view === 'QUICK_PAY') return <MunicipalQuickPay onBack={handleInternalBack} language={language} />;
  if (view === 'TRANSACTIONS') return <MunicipalTransactions onBack={handleInternalBack} onNavigate={handleNavigate} language={language} />;
  if (view === 'TARIFF') return <WaterTariff onBack={handleInternalBack} language={language} />;
  if (view === 'CALCULATOR') return <WaterBillCalculator onBack={handleInternalBack} language={language} />;
  if (view === 'PT_TARIFF') return <PropertyTaxTariff onBack={handleInternalBack} language={language} />;
  if (view === 'PT_CALCULATOR') return <PropertyTaxCalculator onBack={handleInternalBack} language={language} />;
  if (view === 'LOGIN') return <WaterLogin onBack={handleInternalBack} onLoginSuccess={() => handleNavigate('PROFILE')} language={language} />;
  if (view === 'TAXES') {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 pb-10">
            <button onClick={handleInternalBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-2 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> Back
            </button>
            
            <div className="text-center space-y-4 mb-12">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
                    <Building2 size={40} />
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-2">Property Tax Services</h2>
                <p className="text-slate-500 font-medium max-w-lg mx-auto">
                    Manage your municipal property taxes, calculate yearly estimates, and view current tax rates.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <button
                    onClick={() => handleNavigate('QUICK_PAY')}
                    className="group bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 hover:border-blue-500 transition text-left"
                >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition">
                        <CreditCard size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Quick Pay</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">Pay your property tax instantly using your holding number.</p>
                </button>

                <button
                    onClick={() => setView('PT_CALCULATOR')}
                    className="group bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 hover:border-blue-500 transition text-left"
                >
                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition">
                        <Calculator size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Tax Calculator</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">Estimate your property tax based on unit area value.</p>
                </button>

                <button
                    onClick={() => setView('PT_TARIFF')}
                    className="group bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 hover:border-blue-500 transition text-left"
                >
                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Tax Tariffs</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">View current tax rates and multipliers for different zones.</p>
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 pb-10">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-2 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
      </button>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full border border-cyan-100 mb-2">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('officialPortal') || 'OFFICIAL MUNICIPAL CORPORATION PORTAL'}</span>
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight">{t('water') || 'WATER'}</h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
          {t('') || 'Access water connections, property taxes, civil complaints, and secure bill payments.'}
        </p>
      </div>

      {/* Main Mode Selection - Dual Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Quick Pay */}
          <button
              onClick={() => handleNavigate('QUICK_PAY')}
              className="group relative bg-gradient-to-br from-cyan-600 to-blue-600 text-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden border-4 border-transparent hover:border-cyan-300"
          >
              <div className="absolute right-0 top-0 p-6 opacity-10 rotate-12 group-hover:scale-125 transition duration-500">
                  <Droplet size={140} />
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
                          Pay your property tax and water bills instantly with just your Assessment Number. No password required.
                      </p>
                  </div>

                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-white/10 w-fit px-4 py-3 rounded-xl group-hover:bg-white group-hover:text-cyan-700 transition">
                      {t('startPayment') || 'START PAYMENT'} <ArrowRight size={14} />
                  </div>
              </div>
          </button>

          {/* Consumer Login */}
          <button
              onClick={() => handleNavigate('LOGIN')}
              className="group relative bg-white text-slate-900 p-8 rounded-[2.5rem] shadow-lg border border-slate-200 hover:border-cyan-500 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden"
          >
              <div className="absolute right-0 top-0 p-6 text-slate-100 -rotate-12 group-hover:text-slate-50 transition duration-500">
                  <User size={140} />
              </div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition">
                      <Lock size={32} />
                  </div>

                  <div>
                      <div className="inline-block bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition">
                          {t('fullAccess') || "FULL ACCESS"}
                      </div>
                      <h2 className="text-3xl font-black leading-tight mb-2">{t('citizenLogin') || 'Citizen Login'}</h2>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-[80%]">
                          Log in to manage connections, view bill history, download receipts, and update your profile securely.
                      </p>
                  </div>

                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600 w-fit px-4 py-3 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition">
                      {t('secureLogin') || 'SECURE LOGIN'} <ArrowRight size={14} />
                  </div>
              </div>
          </button>
      </div>

      {/* Consumer Services Grid */}
      <h3 className="font-bold text-slate-800 text-lg max-w-4xl mx-auto -mb-4 mt-6">{t('Consumer Services')}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          { id: 'WATER', icon: Droplet, label: 'Water Services', desc: 'New connection / Upgrade' },
          { id: 'TAXES', icon: FileText, label: 'Property Tax', desc: 'Pay property tax' },
          { id: 'COMPLAINTS', icon: AlertCircle, label: 'Grievances', desc: 'Report civic issues' },
          { id: 'PROFILE', icon: UserCog, label: 'My Profile', desc: 'Update details' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-cyan-300 transition text-left group"
          >
             <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-cyan-600 group-hover:text-white transition">
               <item.icon size={20} />
             </div>
             <h3 className="font-bold text-slate-900">{item.label}</h3>
             <p className="text-xs text-slate-400 font-medium truncate">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Secondary Tools */}
      <h3 className="font-bold text-slate-800 text-lg max-w-4xl mx-auto -mb-4 mt-6">{t('Other Tools')}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          { id: 'TRACKER', icon: SearchCode, label: 'Track Request', desc: 'Trace application status' },
          { id: 'TRANSACTIONS', icon: CreditCard, label: 'My Transactions', desc: 'View payment history' },
          { id: 'CALCULATOR', icon: Calculator, label: 'Water Calculator', desc: 'Estimate water charges' },
          { id: 'TARIFF', icon: FileText, label: 'Water Tariffs', desc: 'View water charge slabs' },
          { id: 'PT_CALCULATOR', icon: Calculator, label: 'Tax Calculator', desc: 'Estimate property tax' },
          { id: 'PT_TARIFF', icon: FileText, label: 'Tax Tariffs', desc: 'View property tax rates' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-cyan-300 transition text-left group"
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
              <h4 className="font-black text-amber-900 text-sm uppercase tracking-wider mb-1">{t('fraudAlert') || 'FRAUD AWARENESS ALERT'}</h4>
              <p className="text-amber-800 text-sm font-medium leading-relaxed">
                  {t('fraudMsgMuni') || 'Municipal Corporation never asks for OTPs via SMS/WhatsApp. Never share your citizen profile credentials with anyone.'}
              </p>
          </div>
      </div>
    </div>
  );
};

export default MunicipalModule;
