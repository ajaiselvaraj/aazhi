import React, { useState } from 'react';
import GasLanding from './GasLanding';
import GasConnectionForm from './GasConnectionForm';
import GasComplaints from './GasComplaints';
import GasProfile from './GasProfile';
import GasBills from './GasBills';
import { Language } from '../../../types';

interface Props {
  onBack: () => void;
  language: Language;
}

type GasView = 'HOME' | 'NEW_CONNECTION' | 'COMPLAINTS' | 'PROFILE' | 'BILLS';

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
    </div>
  );
};

export default GasModule;
