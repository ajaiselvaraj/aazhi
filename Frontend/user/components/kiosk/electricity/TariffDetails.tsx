import React, { useState } from 'react';
import { ArrowLeft, FileText, Zap, Info, Calendar, MapPin, CheckCircle, ChevronRight, Home, Building2, Factory } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

const TARIFF_DATA = {
    effectiveDate: "April 1, 2026",
    region: "Assam (APDCL)",
    status: "No change from FY 2025-26",
    categories: [
        {
            id: 'DOMESTIC',
            name: 'Domestic (Life-line & Regular)',
            icon: Home,
            color: 'blue',
            slabs: [
                { range: '0 - 30 Units (Life-line)', rate: 4.25, type: 'Life-line' },
                { range: '31 - 120 Units', rate: 5.25, type: 'Regular' },
                { range: '121 - 240 Units', rate: 7.30, type: 'Regular' },
                { range: 'Above 240 Units', rate: 8.00, type: 'Regular' }
            ],
            fixedCharges: [
                { label: 'Single Phase (upto 5kW)', value: '₹60 / Month' },
                { label: 'Three Phase', value: '₹150 / Month' }
            ]
        },
        {
            id: 'COMMERCIAL',
            name: 'Commercial (General Purpose)',
            icon: Building2,
            color: 'amber',
            slabs: [
                { range: '0 - 100 Units', rate: 8.50, type: 'LT' },
                { range: 'Above 100 Units', rate: 9.10, type: 'LT' }
            ],
            fixedCharges: [
                { label: 'Fixed Charge', value: '₹250 / kW / Month' }
            ]
        },
        {
            id: 'INDUSTRIAL',
            name: 'Industrial (Small & Medium)',
            icon: Factory,
            color: 'indigo',
            slabs: [
                { range: 'Flat Rate (Energy Charge)', rate: 7.80, type: 'LT' }
            ],
            fixedCharges: [
                { label: 'Demand Charge', value: '₹300 / kVA / Month' }
            ]
        }
    ],
    additional: [
        { label: 'Electricity Duty', value: '5% of Energy Charges' },
        { label: 'FPPPA Charges', value: 'As applicable (Quarterly)' },
        { label: 'Meter Rent', value: '₹30 - ₹150 based on meter type' }
    ]
};

const TariffDetails: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(TARIFF_DATA.categories[0].id);

    const category = TARIFF_DATA.categories.find(c => c.id === selectedCategory) || TARIFF_DATA.categories[0];

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
                            <FileText size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">{t('tariffDetails')}</h2>
                        <p className="text-slate-500 font-medium leading-relaxed mb-6">
                            Review the electricity consumption rates and slab structures effective for the current billing cycle in your region.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <Calendar className="text-blue-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Effective Date</p>
                                    <p className="text-sm font-bold text-slate-700">{TARIFF_DATA.effectiveDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <MapPin className="text-blue-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Region</p>
                                    <p className="text-sm font-bold text-slate-700">{TARIFF_DATA.region}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                <CheckCircle className="text-green-600" size={18} />
                                <p className="text-xs font-black text-green-700 uppercase tracking-tight">{TARIFF_DATA.status}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-700 mb-3">
                            <Info size={18} />
                            <h4 className="font-black text-xs uppercase tracking-widest">Note</h4>
                        </div>
                        <p className="text-amber-800 text-xs font-medium leading-relaxed">
                            Rates mentioned are subject to government subsidies and periodic revisions. Fixed charges vary based on sanctioned load and connection type.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:w-2/3 space-y-6">
                    {/* Category Switcher */}
                    <div className="flex gap-2 p-2 bg-slate-100 rounded-3xl">
                        {TARIFF_DATA.categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedCategory === cat.id ? 'bg-white text-slate-900 shadow-md scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                <cat.icon size={16} />
                                <span className="hidden sm:inline">{cat.name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Slab Details Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        <div className={`bg-${category.color}-600 p-8 text-white flex justify-between items-center`}>
                            <div>
                                <h3 className="text-2xl font-black mb-1">{category.name}</h3>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Current Slab Rates</p>
                            </div>
                            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                                <category.icon size={28} />
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100">
                                    <div className="col-span-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumption Range</div>
                                    <div className="col-span-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (₹/Unit)</div>
                                </div>
                                
                                {category.slabs.map((slab, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 items-center py-4 px-4 hover:bg-slate-50 rounded-2xl transition group">
                                        <div className="col-span-7">
                                            <p className="font-bold text-slate-800">{slab.range}</p>
                                            {slab.type && <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">{slab.type}</span>}
                                        </div>
                                        <div className="col-span-5 text-right flex items-center justify-end gap-2">
                                            <span className="text-2xl font-black text-slate-900">₹{slab.rate.toFixed(2)}</span>
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 transition" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Fixed Monthly Charges</h4>
                                    <div className="space-y-3">
                                        {category.fixedCharges.map((fc, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-600">{fc.label}</span>
                                                <span className="text-sm font-black text-slate-900">{fc.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Additional Levies</h4>
                                    <div className="space-y-3">
                                        {TARIFF_DATA.additional.map((add, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-600">{add.label}</span>
                                                <span className="text-sm font-black text-slate-900">{add.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro-tip */}
                    <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-lg shadow-blue-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Zap size={24} className="text-yellow-300 fill-yellow-300" />
                            </div>
                            <div>
                                <h4 className="font-black text-lg">Save Energy, Save Money</h4>
                                <p className="text-white/70 text-sm font-medium">Staying below 120 units qualifies you for subsidized rates.</p>
                            </div>
                        </div>
                        <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition hidden md:block">
                            Tips
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TariffDetails;
