import React, { useState, useEffect } from 'react';
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
import CitizenProfile from './CitizenProfile';

import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';


type ElectricityView = 'HOME' | 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TRANSACTIONS' | 'NEW_CONNECTION' | 'METER_SERVICE' | 'COMPLAINTS' | 'PROFILE' | 'TRACK_REQUEST' | 'TARIFF' | 'CONSUMER_DASHBOARD';

interface Props {
    onBack: () => void;
    language: Language;
    onGlobalNavigate?: (tab: string) => void;
    /** Optional: pre-navigate to a specific sub-view on mount */
    initialSubView?: ElectricityView;
}

// Wrapper component to manage state between sub-modules
const ElectricityModule: React.FC<Props> = ({ onBack, language, onGlobalNavigate, initialSubView }) => {
    const [view, setView] = useState<ElectricityView>(initialSubView ?? 'HOME');
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Apply initialSubView changes (e.g. voice command sets it from outside)
    useEffect(() => {
        if (initialSubView && initialSubView !== view) {
            setView(initialSubView);
        }
    }, [initialSubView]);

    const handleNavigate = (target: ElectricityView) => {
        if (target === 'TRACK_REQUEST' && onGlobalNavigate) {
            onGlobalNavigate('power-tracker');
            return;
        }
        setView(target);
    };

    const handleInternalBack = () => {
        setView('HOME');
    };

    return (
        <div className="h-full">
            {view === 'HOME' && <ElectricityLanding onNavigate={handleNavigate} onExit={onBack} language={language} />}
            {view === 'QUICK_PAY' && <QuickPay onBack={handleInternalBack} language={language} />}
            {view === 'LOGIN' && <ElectricityLogin onBack={handleInternalBack} onLoginSuccess={() => {
                if (sessionStorage.getItem('elderlyMode') === 'true') {
                    handleNavigate('CONSUMER_DASHBOARD');
                } else {
                    localStorage.setItem('aazhi_selected_department', 'eb');
                    if (onGlobalNavigate) onGlobalNavigate('billing');
                    navigate('/pay-bills');
                }
            }} language={language} />}
            {view === 'CALCULATOR' && <BillCalculator onBack={handleInternalBack} language={language} />}
            {view === 'TRANSACTIONS' && <MyTransactions onBack={handleInternalBack} onNavigate={handleNavigate} language={language} />}
            
            {view === 'NEW_CONNECTION' && <ElectricityNewConnectionForm onBack={handleInternalBack} language={language} />}
            {view === 'METER_SERVICE' && <ElectricityMeterServiceForm onBack={handleInternalBack} language={language} />}
            {view === 'COMPLAINTS' && <ElectricityComplaints onBack={handleInternalBack} language={language} />}
            {view === 'PROFILE' && <CitizenProfile onBack={handleInternalBack} language={language} />}
            {view === 'CONSUMER_DASHBOARD' && <ElectricityProfile onBack={handleInternalBack} language={language} />}
            {view === 'TRACK_REQUEST' && <ElectricityTracker onBack={handleInternalBack} language={language} />}

            {view === 'TARIFF' && <TariffDetails onBack={handleInternalBack} language={language} />}
        </div>
    );
};

export default ElectricityModule;
