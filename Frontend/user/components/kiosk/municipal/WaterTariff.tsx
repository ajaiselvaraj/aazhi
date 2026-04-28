import React, { useState } from 'react';
import { ArrowLeft, FileText, Droplets, Info, Calendar, MapPin, CheckCircle, ChevronRight, Home, Building2, School, Factory } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

const WATER_TARIFF_DATA = {
    effectiveDate: "April 1, 2026",
    region: "Assam (Urban Water Supply)",
    status: "Revised Slab Structure",
    categories: [
        {
            id: 'DOMESTIC',
            name: 'Domestic (Household)',
            icon: Home,
            color: 'cyan',
            slabs: [
                { range: '0 - 10 KL (Base)', rate: 15.00, type: 'Subsidized' },
                { range: '10 - 20 KL', rate: 25.00, type: 'Standard' },
                { range: '20 - 30 KL', rate: 40.00, type: 'High' },
                { range: 'Above 30 KL', rate: 60.00, type: 'Highest' }
            ],
            fixedCharges: [
                { label: 'Monthly Fixed Charge', value: '₹50 / Month' },
                { label: 'Meter Rent', value: '₹20 / Month' }
            ]
        },
        {
            id: 'COMMERCIAL',
            name: 'Commercial (Businesses)',
            icon: Building2,
            color: 'blue',
            slabs: [
                { range: 'Flat Rate (per KL)', rate: 85.00, type: 'Commercial' }
            ],
            fixedCharges: [
                { label: 'Fixed Charge', value: '₹250 / Month' },
                { label: 'Meter Rent', value: '₹50 / Month' }
            ]
        },
        {
            id: 'INSTITUTIONAL',
            name: 'Institutional / Gov',
            icon: School,
            color: 'indigo',
            slabs: [
                { range: 'Flat Rate (per KL)', rate: 55.00, type: 'Institutional' }
            ],
            fixedCharges: [
                { label: 'Fixed Charge', value: '₹150 / Month' }
            ]
        },
        {
            id: 'INDUSTRIAL',
            name: 'Industrial (Bulk)',
            icon: Factory,
            color: 'slate',
            slabs: [
                { range: 'Bulk Rate (per KL)', rate: 110.00, type: 'Industrial' }
            ],
            fixedCharges: [
                { label: 'Service Charge', value: '₹500 / Month' }
            ]
        }
    ],
    additional: [
        { label: 'Sewerage Charge', value: '20% of Water Charge' },
        { label: 'Green Cess', value: '₹10 / Month' },
        { label: 'GST', value: 'As applicable (Exempt for Domestic)' }
    ]
};

const WaterTariff: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(WATER_TARIFF_DATA.categories[0].id);

    const category = WATER_TARIFF_DATA.categories.find(c => c.id === selectedCategory) || WATER_TARIFF_DATA.categories[0];

    return (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Info */}
                <div className="lg:w-1/3 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Droplets size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Water Tariff</h2>
                        <p className="text-slate-500 font-medium leading-relaxed mb-6">
                            Assam Urban Water Supply rates for FY 2026-27. Rates are calculated based on monthly consumption in Kilolitres (KL).
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <Calendar className="text-cyan-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Effective Date</p>
                                    <p className="text-sm font-bold text-slate-700">{WATER_TARIFF_DATA.effectiveDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <MapPin className="text-cyan-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Region</p>
                                    <p className="text-sm font-bold text-slate-700">{WATER_TARIFF_DATA.region}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                <CheckCircle className="text-green-600" size={18} />
                                <p className="text-xs font-black text-green-700 uppercase tracking-tight">{WATER_TARIFF_DATA.status}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-700 mb-3">
                            <Info size={18} />
                            <h4 className="font-black text-xs uppercase tracking-widest">Calculation Note</h4>
                        </div>
                        <p className="text-amber-800 text-xs font-medium leading-relaxed">
                            1 KL = 1000 Litres. Domestic consumers with consumption below 10 KL are eligible for a subsidized base rate.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:w-2/3 space-y-6">
                    {/* Category Switcher */}
                    <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-3xl">
                        {WATER_TARIFF_DATA.categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedCategory === cat.id ? 'bg-white text-slate-900 shadow-md scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                <cat.icon size={14} />
                                <span className="hidden sm:inline">{cat.name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Slab Details Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        <div className={`bg-${category.color === 'cyan' ? 'cyan-600' : category.color === 'blue' ? 'blue-600' : category.color === 'indigo' ? 'indigo-600' : 'slate-600'} p-8 text-white flex justify-between items-center`}>
                            <div>
                                <h3 className="text-2xl font-black mb-1">{category.name}</h3>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Usage Slabs (Monthly)</p>
                            </div>
                            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                                <category.icon size={28} />
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100">
                                    <div className="col-span-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Consumption Range (KL)</div>
                                    <div className="col-span-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (₹/KL)</div>
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
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Fixed Charges</h4>
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
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Other Levies</h4>
                                    <div className="space-y-3">
                                        {WATER_TARIFF_DATA.additional.map((add, idx) => (
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

                    <div className="bg-cyan-600 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-lg shadow-cyan-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Droplets size={24} className="text-white" />
                            </div>
                            <div>
                                <h4 className="font-black text-lg">Save Water, Pay Less</h4>
                                <p className="text-white/70 text-sm font-medium">Consumption above 30 KL triggers the highest tariff slab.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaterTariff;
