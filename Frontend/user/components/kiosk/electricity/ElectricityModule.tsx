import React, { useState } from 'react';
import ElectricityLanding from './ElectricityLanding';
import QuickPay from './QuickPay';
import BillCalculator from './BillCalculator';
import ElectricityLogin from './ElectricityLogin';
import MyTransactions from './MyTransactions';
import ElectricityNewConnectionForm from './ElectricityNewConnectionForm';
import ElectricityMeterServiceForm from './ElectricityMeterServiceForm';
import ElectricityComplaints from './ElectricityComplaints';
import ElectricityProfile from './ElectricityProfile';
import ElectricityTracker from './ElectricityTracker';
import TariffDetails from './TariffDetails';

import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

// Wrapper component to manage state between sub-modules
const ElectricityModule: React.FC<Props> = ({ onBack, language }) => {
    const [view, setView] = useState<'HOME' | 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS' | 'NEW_CONNECTION' | 'METER_SERVICE' | 'COMPLAINTS' | 'PROFILE' | 'TRACK_REQUEST'>('HOME');
    const { t } = useTranslation();

    const handleNavigate = (target: 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS' | 'NEW_CONNECTION' | 'METER_SERVICE' | 'COMPLAINTS' | 'PROFILE' | 'TRACK_REQUEST') => {
        setView(target);
    };

    const handleInternalBack = () => {
        setView('HOME');
    };

    return (
        <div className="h-full">
            {view === 'HOME' && <ElectricityLanding onNavigate={handleNavigate} onExit={onBack} language={language} />}
            {view === 'QUICK_PAY' && <QuickPay onBack={handleInternalBack} language={language} />}
            {view === 'LOGIN' && <ElectricityLogin onBack={handleInternalBack} onLoginSuccess={() => handleNavigate('PROFILE')} language={language} />}
            {view === 'CALCULATOR' && <BillCalculator onBack={handleInternalBack} language={language} />}
            {view === 'TRANSACTIONS' && <MyTransactions onBack={handleInternalBack} onNavigate={handleNavigate} language={language} />}
            
            {view === 'NEW_CONNECTION' && <ElectricityNewConnectionForm onBack={handleInternalBack} language={language} />}
            {view === 'METER_SERVICE' && <ElectricityMeterServiceForm onBack={handleInternalBack} language={language} />}
            {view === 'COMPLAINTS' && <ElectricityComplaints onBack={handleInternalBack} language={language} />}
            {view === 'PROFILE' && <ElectricityProfile onBack={handleInternalBack} language={language} />}
            {view === 'TRACK_REQUEST' && <ElectricityTracker onBack={handleInternalBack} language={language} />}

            {view === 'TARIFF' && <TariffDetails onBack={handleInternalBack} language={language} />}
        </div>
    );
};

export default ElectricityModule;
