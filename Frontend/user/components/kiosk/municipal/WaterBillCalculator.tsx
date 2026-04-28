import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Droplets, Info, RefreshCw, ChevronRight, Home, Building2, School, Factory, AlertCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

const WATER_CONFIG = {
    DOMESTIC: {
        slabs: [
            { limit: 10, rate: 15.00 },
            { limit: 20, rate: 25.00 },
            { limit: 30, rate: 40.00 },
            { limit: Infinity, rate: 60.00 }
        ],
        fixedCharge: 50,
        meterRent: 20,
        seweragePercent: 20
    },
    COMMERCIAL: {
        rate: 85.00,
        fixedCharge: 250,
        meterRent: 50,
        seweragePercent: 25
    },
    INSTITUTIONAL: {
        rate: 55.00,
        fixedCharge: 150,
        meterRent: 30,
        seweragePercent: 20
    },
    INDUSTRIAL: {
        rate: 110.00,
        fixedCharge: 500,
        meterRent: 100,
        seweragePercent: 30
    }
};

const WaterBillCalculator: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();
    const [consumption, setConsumption] = useState<string>('');
    const [unit, setUnit] = useState<'LITRES' | 'KL'>('KL');
    const [category, setCategory] = useState<'DOMESTIC' | 'COMMERCIAL' | 'INSTITUTIONAL' | 'INDUSTRIAL'>('DOMESTIC');
    const [fixedCharge, setFixedCharge] = useState<string>('');
    const [meterRent, setMeterRent] = useState<string>('');
    const [taxPercent, setTaxPercent] = useState<string>('5');
    const [result, setResult] = useState<any>(null);

    // Auto-fill defaults
    useEffect(() => {
        const config = WATER_CONFIG[category];
        setFixedCharge(config.fixedCharge.toString());
        setMeterRent(((config as any).meterRent || 0).toString());
    }, [category]);

    const calculateBill = () => {
        const value = parseFloat(consumption);
        if (isNaN(value) || value < 0) return;

        const kl = unit === 'LITRES' ? value / 1000 : value;
        const config = WATER_CONFIG[category];
        
        let usageCharge = 0;
        let slabBreakdown: any[] = [];

        if (category === 'DOMESTIC') {
            let remaining = kl;
            let previousLimit = 0;

            for (const slab of config.slabs) {
                const slabCapacity = slab.limit - previousLimit;
                const unitsInSlab = Math.min(remaining, slabCapacity);
                
                if (unitsInSlab > 0) {
                    const cost = unitsInSlab * slab.rate;
                    usageCharge += cost;
                    slabBreakdown.push({
                        range: slab.limit === Infinity ? `Above ${previousLimit} KL` : `${previousLimit} - ${slab.limit} KL`,
                        units: unitsInSlab,
                        rate: slab.rate,
                        cost: cost
                    });
                    remaining -= unitsInSlab;
                }
                previousLimit = slab.limit;
                if (remaining <= 0) break;
            }
        } else {
            usageCharge = kl * (config as any).rate;
            slabBreakdown.push({
                range: 'Flat Rate',
                units: kl,
                rate: (config as any).rate,
                cost: usageCharge
            });
        }

        const fc = parseFloat(fixedCharge) || 0;
        const mr = parseFloat(meterRent) || 0;
        const tp = parseFloat(taxPercent) || 0;
        
        // Sewerage Charge is typically a percentage of water usage charge
        const sewerageCharge = usageCharge * (config.seweragePercent / 100);
        
        // Subtotal before taxes
        const subtotal = usageCharge + fc + mr + sewerageCharge;
        const taxAmount = subtotal * (tp / 100);
        const total = subtotal + taxAmount;

        setResult({
            kl: kl.toFixed(2),
            slabBreakdown,
            usageCharge: usageCharge.toFixed(2),
            fixedCharge: fc.toFixed(2),
            meterRent: mr.toFixed(2),
            sewerageCharge: sewerageCharge.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2)
        });
    };

    useEffect(() => {
        if (consumption) calculateBill();
        else setResult(null);
    }, [consumption, unit, category, fixedCharge, meterRent, taxPercent]);

    return (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Input Panel */}
                <div className="lg:w-[450px] space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Calculator size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Water Bill Calculator</h2>
                        <p className="text-slate-500 font-medium mb-8">Estimate your monthly water bill for Assam urban areas.</p>

                        <div className="space-y-6">
                            {/* Category Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Consumer Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'DOMESTIC', icon: Home, label: 'Domestic' },
                                        { id: 'COMMERCIAL', icon: Building2, label: 'Commercial' },
                                        { id: 'INSTITUTIONAL', icon: School, label: 'Institutional' },
                                        { id: 'INDUSTRIAL', icon: Factory, label: 'Industrial' }
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setCategory(cat.id as any)}
                                            className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${category === cat.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            <cat.icon size={16} />
                                            <span className="font-bold text-[10px] uppercase tracking-widest">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Consumption Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Consumption Amount</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={consumption}
                                            onChange={(e) => setConsumption(e.target.value)}
                                            placeholder="Enter value..."
                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-black text-2xl text-slate-900 focus:border-cyan-500 focus:bg-white outline-none transition"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                            <Droplets size={24} />
                                        </div>
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                                        <button
                                            onClick={() => setUnit('KL')}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${unit === 'KL' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            KL
                                        </button>
                                        <button
                                            onClick={() => setUnit('LITRES')}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${unit === 'LITRES' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            Litres
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Options */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Fixed (₹)</label>
                                    <input
                                        type="number"
                                        value={fixedCharge}
                                        onChange={(e) => setFixedCharge(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-cyan-500 p-3 rounded-xl text-sm font-bold transition outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Meter (₹)</label>
                                    <input
                                        type="number"
                                        value={meterRent}
                                        onChange={(e) => setMeterRent(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-cyan-500 p-3 rounded-xl text-sm font-bold transition outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Tax (%)</label>
                                    <input
                                        type="number"
                                        value={taxPercent}
                                        onChange={(e) => setTaxPercent(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-cyan-500 p-3 rounded-xl text-sm font-bold transition outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => { setConsumption(''); setResult(null); }}
                                className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> Reset Calculator
                            </button>
                        </div>
                    </div>
                </div>

                {/* Result Panel */}
                <div className="flex-1">
                    {!result ? (
                        <div className="h-full min-h-[400px] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center opacity-60">
                            <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-6">
                                <Calculator size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-400 mb-2">Awaiting Input</h3>
                            <p className="text-slate-400 font-medium">Enter consumption details to generate an estimated water bill.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500 h-full flex flex-col">
                            <div className="bg-gradient-to-br from-cyan-600 to-blue-700 p-10 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12">
                                    <Droplets size={120} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Estimated Total Bill</p>
                                    <h2 className="text-6xl font-black mb-4 tracking-tight">₹{result.total}</h2>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg border border-white/20">
                                            <p className="text-[9px] font-black uppercase opacity-70">Consumption</p>
                                            <p className="font-black">{result.kl} KL</p>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg border border-white/20">
                                            <p className="text-[9px] font-black uppercase opacity-70">Category</p>
                                            <p className="font-black text-[10px]">{category}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-8 flex-1">
                                {/* Slab Breakdown */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Slab Breakdown</h4>
                                    <div className="space-y-2">
                                        {result.slabBreakdown.map((s: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition">
                                                <div>
                                                    <p className="text-xs font-black text-slate-700">{s.range}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{s.units.toFixed(2)} KL × ₹{s.rate.toFixed(2)}</p>
                                                </div>
                                                <p className="font-black text-slate-900">₹{s.cost.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary Charges */}
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage Charge</span>
                                        <span className="font-black text-slate-900">₹{result.usageCharge}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fixed + Meter</span>
                                        <span className="font-black text-slate-900">₹{(parseFloat(result.fixedCharge) + parseFloat(result.meterRent)).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sewerage (20%)</span>
                                        <span className="font-black text-slate-900">₹{result.sewerageCharge}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxes ({taxPercent}%)</span>
                                        <span className="font-black text-slate-900">₹{result.taxAmount}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    Note: This is an estimated bill based on Assam Urban Supply norms. Actual bill may vary based on locality and arrears.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WaterBillCalculator;
