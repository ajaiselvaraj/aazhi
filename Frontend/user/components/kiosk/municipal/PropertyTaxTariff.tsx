import React from 'react';
import { ArrowLeft, Home, Building2, MapPin, Info, Calendar, CheckCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

const PROPERTY_TAX_CONFIG = {
    region: "Assam (GMC / Municipal Boards)",
    effectiveDate: "April 1, 2026",
    zones: [
        { id: 'A', name: 'Zone A', desc: 'Main Commercial / Urban Core', rate: 5.00 },
        { id: 'B', name: 'Zone B', desc: 'Semi-Urban / Residential Hubs', rate: 3.50 },
        { id: 'C', name: 'Zone C', desc: 'Rural / Outskirts', rate: 2.00 }
    ],
    multipliers: [
        { category: 'Construction Type', items: [
            { label: 'Pucca (RCC)', factor: 1.2 },
            { label: 'Semi-Pucca', factor: 1.0 },
            { label: 'Kutcha', factor: 0.7 }
        ]},
        { category: 'Usage Type', items: [
            { label: 'Commercial', factor: 1.5 },
            { label: 'Residential', factor: 1.0 },
            { label: 'Institutional', factor: 1.2 }
        ]}
    ],
    additional: [
        { label: 'General Tax', value: '10% of Annual Value' },
        { label: 'Sanitation Tax', value: '2% of Annual Value' },
        { label: 'Water Tax', value: 'Included in Municipal' },
        { label: 'Urban Dev Cess', value: '1% of Subtotal' }
    ]
};

const PropertyTaxTariff: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();

    return (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Info */}
                <div className="lg:w-1/3 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Building2 size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Property Tax</h2>
                        <p className="text-slate-500 font-medium leading-relaxed mb-6">
                            Assam Municipal Property Tax is calculated based on the Unit Area Value (UAV) system.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <Calendar className="text-blue-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Updated</p>
                                    <p className="text-sm font-bold text-slate-700">{PROPERTY_TAX_CONFIG.effectiveDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <MapPin className="text-blue-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Region</p>
                                    <p className="text-sm font-bold text-slate-700">{PROPERTY_TAX_CONFIG.region}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                <CheckCircle className="text-green-600" size={18} />
                                <p className="text-xs font-black text-green-700 uppercase tracking-tight">Active Slabs</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-700 mb-3">
                            <Info size={18} />
                            <h4 className="font-black text-xs uppercase tracking-widest">How it's calculated</h4>
                        </div>
                        <p className="text-blue-800 text-xs font-medium leading-relaxed">
                            Tax = (Area × Base Rate × Multipliers) × Tax %. Rates vary significantly between Urban Core and Outskirts.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:w-2/3 space-y-6">
                    {/* Zone Rates */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                        <div className="bg-blue-600 p-8 text-white">
                            <h3 className="text-2xl font-black mb-1">Base Rates (By Zone)</h3>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Rate per Sq. Ft. of Built-up Area</p>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {PROPERTY_TAX_CONFIG.zones.map((zone) => (
                                    <div key={zone.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 transition">
                                        <h4 className="text-2xl font-black text-slate-900 mb-1">{zone.name}</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{zone.desc}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-blue-600">₹{zone.rate}</span>
                                            <span className="text-xs font-bold text-slate-400">/ sqft</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Multipliers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {PROPERTY_TAX_CONFIG.multipliers.map((mult, idx) => (
                            <div key={idx} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{mult.category}</h4>
                                <div className="space-y-4">
                                    {mult.items.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                            <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                            <span className="font-black text-blue-600">x{item.factor}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tax Breakdown */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Tax Percentage Breakdown</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {PROPERTY_TAX_CONFIG.additional.map((tax, i) => (
                                <div key={i} className="space-y-1">
                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-tight">{tax.label}</p>
                                    <p className="text-lg font-black text-white">{tax.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyTaxTariff;
