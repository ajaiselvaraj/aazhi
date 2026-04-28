import React, { useState } from 'react';
import { ArrowLeft, Flame, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    onSelect: (brand: string) => void;
    language: Language;
}

const BRANDS = [
    {
        id: 'indane',
        name: 'Indane Gas',
        company: 'Indian Oil Corporation',
        color: 'orange',
        logoText: 'Indane',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
        textClass: 'text-orange-600',
        accentColor: '#f97316'
    },
    {
        id: 'hp',
        name: 'HP Gas',
        company: 'Hindustan Petroleum',
        color: 'blue',
        logoText: 'HP Gas',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        textClass: 'text-blue-600',
        accentColor: '#2563eb'
    },
    {
        id: 'bharat',
        name: 'Bharat Gas',
        company: 'Bharat Petroleum',
        color: 'yellow',
        logoText: 'Bharat',
        bgClass: 'bg-yellow-50',
        borderClass: 'border-yellow-200',
        textClass: 'text-yellow-700',
        accentColor: '#eab308'
    }
];

const GasBrandSelection: React.FC<Props> = ({ onBack, onSelect, language }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<string | null>(localStorage.getItem('selectedGasBrand'));

    const handleContinue = () => {
        if (selected) {
            localStorage.setItem('selectedGasBrand', selected);
            onSelect(selected);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-8 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-orange-100">
                    <Flame size={40} />
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-3">Select Your Gas Provider</h2>
                <p className="text-slate-500 font-medium max-w-lg mx-auto">
                    Please select your LPG brand to proceed with payment or account services.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {BRANDS.map((brand) => (
                    <button
                        key={brand.id}
                        onClick={() => setSelected(brand.id)}
                        className={`group relative p-8 rounded-[2.5rem] border-4 transition-all duration-300 text-left h-full flex flex-col ${
                            selected === brand.id 
                            ? `${brand.borderClass} ${brand.bgClass} shadow-xl scale-[1.02]` 
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg'
                        }`}
                    >
                        {selected === brand.id && (
                            <div className={`absolute top-6 right-6 ${brand.textClass} animate-in zoom-in duration-300`}>
                                <CheckCircle2 size={28} fill="currentColor" className="text-white" />
                            </div>
                        )}

                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 font-black text-sm uppercase tracking-tighter border-2 ${
                            selected === brand.id ? `bg-white ${brand.borderClass} ${brand.textClass}` : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}>
                            {brand.logoText}
                        </div>

                        <div className="mt-auto">
                            <h3 className={`text-xl font-black mb-1 ${selected === brand.id ? 'text-slate-900' : 'text-slate-500'}`}>
                                {brand.name}
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {brand.company}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex flex-col items-center gap-6">
                <button
                    disabled={!selected}
                    onClick={handleContinue}
                    className={`w-full max-w-sm py-6 rounded-[2rem] font-black text-lg uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                        selected 
                        ? 'bg-slate-900 text-white hover:bg-orange-600 hover:shadow-orange-200 active:scale-95' 
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                >
                    Continue <ChevronRight size={20} />
                </button>

                <div className="flex items-center gap-2 text-slate-400">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Multi-Brand Payment</span>
                </div>
            </div>
        </div>
    );
};

export default GasBrandSelection;
