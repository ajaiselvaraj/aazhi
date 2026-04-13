import React, { useState } from 'react';
import GasLanding from './GasLanding'; // Import GasLanding
import GasConnectionForm from './GasConnectionForm';
import GasComplaints from './GasComplaints';
import GasProfile from './GasProfile';
import GasBills from './GasBills';
import GasQuickPay from './GasQuickPay';
import GasLogin from './GasLogin';
import { Language } from '../../../types';

interface Props {
  onBack: () => void;
  language: Language;
}

type GasView = 'HOME' | 'NEW_CONNECTION' | 'COMPLAINTS' | 'PROFILE' | 'BILLS' | 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS';

const GasModule: React.FC<Props> = ({ onBack, language }) => {
  const [view, setView] = useState<GasView>('HOME');

  const handleNavigate = (target: GasView) => {
    setView(target);
  };

  const handleInternalBack = () => {
    setView('HOME');
  };

  return (
    <div className="h-full">
      {view === 'HOME' && (
        <GasLanding
          onNavigate={handleNavigate}
          onExit={onBack}
          language={language}
        />
      )}
      {view === 'NEW_CONNECTION' && (
        <GasConnectionForm
          onBack={handleInternalBack}
          language={language}
        />
      )}
      {view === 'COMPLAINTS' && (
        <GasComplaints
          onBack={handleInternalBack}
          language={language}
        />
      )}
      {view === 'PROFILE' && (
        <GasProfile
          onBack={handleInternalBack}
          language={language}
        />
      )}
      {view === 'BILLS' && (
        <GasBills
          onBack={handleInternalBack}
          language={language}
        />
      )}
      {view === 'QUICK_PAY' && (
        <GasQuickPay 
          onBack={handleInternalBack}
          language={language}
        />
      )}
      {view === 'LOGIN' && (
        <GasLogin 
          onBack={handleInternalBack}
          onLoginSuccess={() => handleNavigate('BILLS')}
          language={language}
        />
      )}
      {(['CALCULATOR', 'TARIFF', 'TRANSACTIONS'] as string[]).includes(view) && (
        <div className="max-w-4xl mx-auto p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100 text-center relative top-20">
            <button onClick={handleInternalBack} className="block mb-6 font-bold text-slate-500 hover:text-slate-900">Back</button>
            <h2 className="text-4xl font-black mb-4 capitalize">{view.replace('_', ' ')}</h2>
            <p className="text-slate-500 text-lg">Integration for {view.replace('_', ' ')} is coming soon.</p>
        </div>
      )}
    </div>
  );
};

export default GasModule;
