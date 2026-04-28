import React, { useState } from 'react';
import { ArrowLeft, Flame, Info, Calendar, MapPin, CheckCircle, ChevronRight, Home, Building2, Car } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

const GAS_TARIFF_DATA = {
    effectiveDate: "April 1, 2026",
    region: "Assam (AOCL / AGCL / GGL)",
    status: "Monthly Price Update",
    categories: [
        {
            id: 'LPG',
            name: 'LPG (Cylinder)',
            icon: Flame,
            color: 'orange',
            subcategories: [
                { label: 'Domestic Cylinder (14.2 kg)', rate: 962.00, unit: 'Cylinder' },
                { label: 'Small Cylinder (5 kg)', rate: 334.00, unit: 'Cylinder' },
                { label: 'Commercial Cylinder (19 kg)', rate: 2300.00, unit: 'Cylinder' }
            ],
            notes: "Prices vary monthly based on international crude rates."
        },
        {
            id: 'PNG',
            name: 'PNG (Piped Gas)',
            icon: Home,
            color: 'red',
            slabs: [
                { range: 'Domestic Usage', rate: 45.00, unit: 'SCM' },
                { range: 'Commercial Usage', rate: 65.00, unit: 'SCM' }
            ],
            fixedCharges: [
                { label: 'Monthly Fixed Charge', value: '₹50 / Month' },
                { label: 'Pipeline/Transport', value: '₹30 / Month' }
            ],
            notes: "SCM = Standard Cubic Meter"
        },
        {
            id: 'CNG',
            name: 'CNG (Vehicle)',
            icon: Car,
            color: 'emerald',
            slabs: [
                { range: 'Retail Rate', rate: 98.00, unit: 'Kg' }
            ],
            notes: "Available at designated city gas stations."
        }
    ],
    additional: [
        { label: 'GST (LPG/CNG)', value: '5% - 18% as applicable' },
        { label: 'Home Delivery', value: 'Included in LPG price' },
        { label: 'Safety Check', value: '₹200 (Once in 2 years)' }
    ]
};

const GasTariff: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(GAS_TARIFF_DATA.categories[0].id);

    const category = GAS_TARIFF_DATA.categories.find(c => c.id === selectedCategory) || GAS_TARIFF_DATA.categories[0];

    return (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Info */}
                <div className="lg:w-1/3 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Flame size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Gas Tariff</h2>
                        <p className="text-slate-500 font-medium leading-relaxed mb-6">
                            Review current rates for LPG, PNG, and CNG services in Assam. Prices are subject to monthly revisions.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <Calendar className="text-orange-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Updated</p>
                                    <p className="text-sm font-bold text-slate-700">{GAS_TARIFF_DATA.effectiveDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <MapPin className="text-orange-600" size={18} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Region</p>
                                    <p className="text-sm font-bold text-slate-700">{GAS_TARIFF_DATA.region}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                                <CheckCircle className="text-green-600" size={18} />
                                <p className="text-xs font-black text-green-700 uppercase tracking-tight">{GAS_TARIFF_DATA.status}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                        <div className="flex items-center gap-2 text-amber-700 mb-3">
                            <Info size={18} />
                            <h4 className="font-black text-xs uppercase tracking-widest">Pricing Note</h4>
                        </div>
                        <p className="text-amber-800 text-xs font-medium leading-relaxed">
                            {category.notes} Commercial rates are typically higher due to lower subsidies compared to domestic use.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:w-2/3 space-y-6">
                    {/* Category Switcher */}
                    <div className="flex gap-2 p-2 bg-slate-100 rounded-3xl">
                        {GAS_TARIFF_DATA.categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedCategory === cat.id ? 'bg-white text-slate-900 shadow-md scale-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                <cat.icon size={16} />
                                <span className="hidden sm:inline">{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Rates Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        <div className={`bg-${category.color === 'orange' ? 'orange-600' : category.color === 'red' ? 'red-600' : 'emerald-600'} p-8 text-white flex justify-between items-center`}>
                            <div>
                                <h3 className="text-2xl font-black mb-1">{category.name} Rates</h3>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Current Market Price</p>
                            </div>
                            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                                <category.icon size={28} />
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-slate-100">
                                    <div className="col-span-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Category</div>
                                    <div className="col-span-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (₹)</div>
                                </div>
                                
                                {category.subcategories ? (
                                    category.subcategories.map((sub, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-4 items-center py-4 px-4 hover:bg-slate-50 rounded-2xl transition group">
                                            <div className="col-span-7">
                                                <p className="font-bold text-slate-800">{sub.label}</p>
                                                <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">Per {sub.unit}</span>
                                            </div>
                                            <div className="col-span-5 text-right flex items-center justify-end gap-2">
                                                <span className="text-2xl font-black text-slate-900">₹{sub.rate.toFixed(2)}</span>
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 transition" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    category.slabs?.map((slab, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-4 items-center py-4 px-4 hover:bg-slate-50 rounded-2xl transition group">
                                            <div className="col-span-7">
                                                <p className="font-bold text-slate-800">{slab.range}</p>
                                                <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase tracking-wider">Per {slab.unit}</span>
                                            </div>
                                            <div className="col-span-5 text-right flex items-center justify-end gap-2">
                                                <span className="text-2xl font-black text-slate-900">₹{slab.rate.toFixed(2)}</span>
                                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 transition" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Additional Charges</h4>
                                    <div className="space-y-3">
                                        {category.fixedCharges ? (
                                            category.fixedCharges.map((fc, idx) => (
                                                <div key={idx} className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-600">{fc.label}</span>
                                                    <span className="text-sm font-black text-slate-900">{fc.value}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-600">Admin Fee</span>
                                                <span className="text-sm font-black text-slate-900">₹0.00</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Statutory Levies</h4>
                                    <div className="space-y-3">
                                        {GAS_TARIFF_DATA.additional.map((add, idx) => (
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

                    <div className="bg-orange-600 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-lg shadow-orange-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <Flame size={24} className="text-white" />
                            </div>
                            <div>
                                <h4 className="font-black text-lg">Safe Gas, Safe Home</h4>
                                <p className="text-white/70 text-sm font-medium">Always check the cylinder seal and expiry date upon delivery.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GasTariff;
