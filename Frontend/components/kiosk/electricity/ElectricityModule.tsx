import React, { useState } from 'react';
import ElectricityLanding from './ElectricityLanding';
import QuickPay from './QuickPay';
import BillCalculator from './BillCalculator';
import ConsumerLogin from './ConsumerLogin';
import MyTransactions from './MyTransactions';

import { Language } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface Props {
    onBack: () => void;
    language: Language;
}

// Wrapper component to manage state between sub-modules
const ElectricityModule: React.FC<Props> = ({ onBack, language }) => {
    const [view, setView] = useState<'HOME' | 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS'>('HOME');
    const { t } = useLanguage();

    const handleNavigate = (target: 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS') => {
        setView(target);
    };

    const handleInternalBack = () => {
        setView('HOME');
    };

    return (
        <div className="h-full">
            {view === 'HOME' && <ElectricityLanding onNavigate={handleNavigate} onExit={onBack} language={language} />}
            {view === 'QUICK_PAY' && <QuickPay onBack={handleInternalBack} language={language} />}
            {view === 'LOGIN' && <ConsumerLogin onBack={handleInternalBack} language={language} />}
            {view === 'CALCULATOR' && <BillCalculator onBack={handleInternalBack} language={language} />}
            {view === 'TRANSACTIONS' && <MyTransactions onBack={handleInternalBack} onNavigate={handleNavigate} language={language} />}

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
