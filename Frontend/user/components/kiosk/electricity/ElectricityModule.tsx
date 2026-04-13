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

import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

// Wrapper component to manage state between sub-modules
const ElectricityModule: React.FC<Props> = ({ onBack, language }) => {
    const [view, setView] = useState<'HOME' | 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS' | 'NEW_CONNECTION' | 'METER_SERVICE' | 'COMPLAINTS' | 'PROFILE'>('HOME');
    const { t } = useTranslation();

    const handleNavigate = (target: 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS' | 'NEW_CONNECTION' | 'METER_SERVICE' | 'COMPLAINTS' | 'PROFILE') => {
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

            {/* Placeholder for Tariff */}
            {view === 'TARIFF' && (
                <div className="max-w-4xl mx-auto p-8 bg-white rounded-[2rem] shadow-xl border border-slate-100">
                    <button onClick={handleInternalBack} className="mb-6 font-bold text-slate-500 hover:text-slate-900">{t('back') || "Back"}</button>
                    <h2 className="text-3xl font-black mb-4">{t('tariffDetails') || "Tariff Details"}</h2>
                    <p>{t('upcoming') || "Coming Soon..."}</p>
                </div>
            )}
        </div>
    );
};

export default ElectricityModule;
