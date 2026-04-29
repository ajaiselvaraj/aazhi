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

import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { resolveSubAction } from '../../../utils/VoiceHierarchyRouter';
import type { ElectricityView } from '../../../utils/VoiceHierarchyRouter';

interface Props {
    onBack: () => void;
    language: Language;
    onGlobalNavigate?: (tab: string) => void;
    /** Voice command passthrough from global handler */
    onVoiceCommand?: (command: string) => void;
    /** Optional: pre-navigate to a specific sub-view on mount */
    initialSubView?: ElectricityView;
}

// Wrapper component to manage state between sub-modules
const ElectricityModule: React.FC<Props> = ({ onBack, language, onGlobalNavigate, initialSubView }) => {
    const [view, setView] = useState<ElectricityView>(initialSubView ?? 'HOME');
    const { t } = useTranslation();

    // Apply initialSubView changes (e.g. voice command sets it from outside)
    useEffect(() => {
        if (initialSubView && initialSubView !== view) {
            setView(initialSubView);
        }
    }, [initialSubView]);

    const handleNavigate = (target: ElectricityView) => {
        if (target === 'TRACK_REQUEST' && onGlobalNavigate) {
            onGlobalNavigate('tracker');
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
