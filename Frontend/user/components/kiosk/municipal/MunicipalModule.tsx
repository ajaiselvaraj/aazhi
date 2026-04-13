import React, { useState } from 'react';
import { ArrowLeft, Droplet, FileText, AlertCircle, User, ShieldCheck } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import WaterConnectionForm from './WaterConnectionForm';
import MunicipalProfile from './MunicipalProfile';
import { CivicComplaintForm } from '../../municipal/CivicComplaintForm';

interface Props {
  onBack: () => void;
  language: Language;
}

const MunicipalModule: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<'HOME' | 'WATER' | 'COMPLAINTS' | 'PROFILE' | 'TAXES'>('HOME');

  const handleInternalBack = () => {
    setView('HOME');
  };

  if (view === 'WATER') return <WaterConnectionForm onBack={handleInternalBack} language={language} />;
  if (view === 'PROFILE') return <MunicipalProfile onBack={handleInternalBack} language={language} />;
  if (view === 'COMPLAINTS') return <CivicComplaintForm onBack={handleInternalBack} isPrivacyOn={false} language={language} />;
  if (view === 'TAXES') {
      return (
        <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100 text-center">
            <button onClick={handleInternalBack} className="block mb-6 font-bold text-slate-500 hover:text-slate-900">{t('back') || "Back"}</button>
            <h2 className="text-4xl font-black mb-4">Property Tax</h2>
            <p className="text-slate-500 text-lg">Property tax payment integration is coming soon.</p>
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
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100 mb-2">
          <ShieldCheck size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t('officialPortal') || 'Official Portal'}</span>
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight">{t('muniTitle') || 'Municipal Services'}</h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
          {t('muniDesc') || 'Access water connections, property taxes, civil complaints, and more.'}
        </p>
      </div>

      {/* Consumer Services Grid */}
      <h3 className="font-bold text-slate-800 text-lg max-w-4xl mx-auto -mb-4 mt-12">{t('muni_consumerServices') || 'Citizen Services'}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          { id: 'WATER', icon: Droplet, label: 'Water Services', desc: 'New connection & upgrade' },
          { id: 'TAXES', icon: FileText, label: 'Property Tax', desc: 'Pay property & water tax' },
          { id: 'COMPLAINTS', icon: AlertCircle, label: 'Civic Issues', desc: 'Report potholes, garbage' },
          { id: 'PROFILE', icon: User, label: 'My Profile', desc: 'Manage citizen details' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as any)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-300 transition text-left group"
          >
             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
               <item.icon size={20} />
             </div>
             <h3 className="font-bold text-slate-900">{item.label}</h3>
             <p className="text-xs text-slate-400 font-medium truncate">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MunicipalModule;
