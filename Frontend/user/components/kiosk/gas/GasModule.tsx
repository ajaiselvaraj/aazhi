import React, { useState, useEffect } from 'react';
import GasLanding from './GasLanding'; // Import GasLanding
import GasConnectionForm from './GasConnectionForm';
import GasComplaints from './GasComplaints';
import GasProfile from './GasProfile';
import GasBills from './GasBills';
import GasQuickPay from './GasQuickPay';
import GasLogin from './GasLogin';
import GasTracker from './GasTracker';
import GasTransactions from './GasTransactions';
import GasTariff from './GasTariff';
import GasBillCalculator from './GasBillCalculator';
import GasBrandSelection from './GasBrandSelection';
import { Language } from '../../../types';

interface Props {
  onBack: () => void;
  language: Language;
  onGlobalNavigate?: (tab: string) => void;
  /** Optional: voice-command deep-link into a specific sub-view */
  initialSubView?: GasView;
}

type GasView = 'HOME' | 'NEW_CONNECTION' | 'COMPLAINTS' | 'PROFILE' | 'BILLS' | 'QUICK_PAY' | 'LOGIN' | 'TRACKER' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS' | 'BRAND_SELECTION';

const GasModule: React.FC<Props> = ({ onBack, language, onGlobalNavigate, initialSubView }) => {
  const [view, setView] = useState<GasView>(initialSubView ?? 'HOME');
  const [pendingView, setPendingView] = useState<GasView | null>(null);

  // Apply initialSubView changes driven by voice commands
  useEffect(() => {
    if (initialSubView && initialSubView !== view) {
      setView(initialSubView);
    }
  }, [initialSubView]);

  const handleNavigate = (target: GasView) => {
    if (target === 'TRACKER' && onGlobalNavigate) {
      onGlobalNavigate('tracker');
      return;
    }

    // Intercept Quick Pay and Login for brand selection
    if (target === 'QUICK_PAY' || target === 'LOGIN') {
      const storedBrand = localStorage.getItem('selectedGasBrand');
      if (!storedBrand) {
        setPendingView(target);
        setView('BRAND_SELECTION');
        return;
      }
    }

    setView(target);
  };

  const handleBrandSelect = (brand: string) => {
    if (pendingView) {
      setView(pendingView);
      setPendingView(null);
    } else {
      setView('HOME');
    }
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
      {view === 'TRACKER' && (
        <GasTracker
          onBack={handleInternalBack}
          language={language}
        />
      )}
      {view === 'TRANSACTIONS' && (
        <GasTransactions 
          onBack={handleInternalBack} 
          onNavigate={handleNavigate} 
          language={language} 
        />
      )}
      {view === 'TARIFF' && (
        <GasTariff 
          onBack={handleInternalBack} 
          language={language} 
        />
      )}
      {view === 'CALCULATOR' && (
        <GasBillCalculator 
          onBack={handleInternalBack} 
          language={language} 
        />
      )}
      {view === 'BRAND_SELECTION' && (
        <GasBrandSelection 
          onBack={handleInternalBack} 
          onSelect={handleBrandSelect} 
          language={language} 
        />
      )}
      {([] as string[]).includes(view) && (
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
