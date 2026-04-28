import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Zap, Home, Building2, Factory, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

// Config-driven Tariff Rates for Assam (FY 2026-27)
const TARIFF_CONFIG = {
    DOMESTIC: {
        slabs: [
            { id: 1, limit: 120, rate: 5.25, label: 'First 120 Units' },
            { id: 2, limit: 120, rate: 7.30, label: 'Next 120 Units (121-240)' },
            { id: 3, limit: Infinity, rate: 8.00, label: 'Above 240 Units' }
        ],
        lifelineRate: 4.25, // For units <= 30 if applicable, but we follow user rule
        defaultFixedCharge: 60,
        defaultDutyPercent: 5
    },
    COMMERCIAL: {
        rate: 8.50,
        defaultFixedCharge: 250,
        defaultDutyPercent: 5
    },
    INDUSTRIAL: {
        rate: 7.80,
        defaultFixedCharge: 300,
        defaultDutyPercent: 5
    }
};

interface SlabResult {
    range: string;
    units: number;
    rate: number;
    cost: number;
}

interface CalculationResult {
    total_units: number;
    slab_breakdown: SlabResult[];
    energy_charge: number;
    fixed_charge: number;
    duty_amount: number;
    total_bill: number;
}

const BillCalculator: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();

    // Inputs
    const [units, setUnits] = useState<string>('');
    const [category, setCategory] = useState<'DOMESTIC' | 'COMMERCIAL' | 'INDUSTRIAL'>('DOMESTIC');
    const [fixedCharge, setFixedCharge] = useState<string>('');
    const [dutyPercent, setDutyPercent] = useState<string>('5');
    
    // Results & UI State
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [error, setError] = useState<string>('');

    // Auto-fill defaults based on category
    useEffect(() => {
        if (category === 'DOMESTIC') {
            setFixedCharge(TARIFF_CONFIG.DOMESTIC.defaultFixedCharge.toString());
            setDutyPercent(TARIFF_CONFIG.DOMESTIC.defaultDutyPercent.toString());
        } else if (category === 'COMMERCIAL') {
            setFixedCharge(TARIFF_CONFIG.COMMERCIAL.defaultFixedCharge.toString());
            setDutyPercent(TARIFF_CONFIG.COMMERCIAL.defaultDutyPercent.toString());
        } else if (category === 'INDUSTRIAL') {
            setFixedCharge(TARIFF_CONFIG.INDUSTRIAL.defaultFixedCharge.toString());
            setDutyPercent(TARIFF_CONFIG.INDUSTRIAL.defaultDutyPercent.toString());
        }
    }, [category]);

    const calculateBill = () => {
        setError('');
        const u = parseFloat(units);
        const fc = parseFloat(fixedCharge) || 0;
        const dp = parseFloat(dutyPercent) || 0;

        // Edge Cases & Validation
        if (units === '') {
            setError('Please enter units consumed');
            return;
        }
        if (isNaN(u) || u < 0) {
            setError('Negative units are not allowed');
            setResult(null);
            return;
        }

        let energyCharge = 0;
        const slabBreakdown: SlabResult[] = [];

        if (category === 'DOMESTIC') {
            let remaining = u;
            
            // Slab 1: First 120 Units
            const s1Units = Math.min(remaining, 120);
            if (s1Units > 0 || u === 0) {
                // Subsidy logic: If total units <= 120, rate is 4.25 (User requirement: 4.25 to 5.25)
                const rate = u <= 30 ? 4.25 : 5.25; 
                const cost = s1Units * rate;
                energyCharge += cost;
                slabBreakdown.push({
                    range: '0 - 120 Units',
                    units: s1Units,
                    rate: rate,
                    cost: cost
                });
                remaining -= s1Units;
            }

            // Slab 2: 121 - 240 Units
            if (remaining > 0) {
                const s2Units = Math.min(remaining, 120);
                const cost = s2Units * 7.30;
                energyCharge += cost;
                slabBreakdown.push({
                    range: '121 - 240 Units',
                    units: s2Units,
                    rate: 7.30,
                    cost: cost
                });
                remaining -= s2Units;
            }

            // Slab 3: Above 240 Units
            if (remaining > 0) {
                const s3Units = remaining;
                const cost = s3Units * 8.00;
                energyCharge += cost;
                slabBreakdown.push({
                    range: 'Above 240 Units',
                    units: s3Units,
                    rate: 8.00,
                    cost: cost
                });
            }
        } else {
            // Commercial / Industrial (Flat Rate for simplicity as per requirement focus on Domestic)
            const rate = category === 'COMMERCIAL' ? TARIFF_CONFIG.COMMERCIAL.rate : TARIFF_CONFIG.INDUSTRIAL.rate;
            energyCharge = u * rate;
            slabBreakdown.push({
                range: 'Flat Rate',
                units: u,
                rate: rate,
                cost: energyCharge
            });
        }

        // Step 4: Apply electricity duty
        // duty_amount = (energy charge + fixed charge) × (duty % / 100)
        const dutyAmount = (energyCharge + fc) * (dp / 100);

        // Step 5: Total bill
        const totalBill = energyCharge + fc + dutyAmount;

        setResult({
            total_units: u,
            slab_breakdown: slabBreakdown,
            energy_charge: Number(energyCharge.toFixed(2)),
            fixed_charge: Number(fc.toFixed(2)),
            duty_amount: Number(dutyAmount.toFixed(2)),
            total_bill: Number(totalBill.toFixed(2))
        });
    };

    return (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Input Section */}
                <div className="lg:w-[450px] space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                                <Calculator size={28} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 leading-tight">Bill Calculator</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assam FY 2026-27</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Category */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-3">Consumer Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'DOMESTIC', icon: Home, label: 'Domestic' },
                                        { id: 'COMMERCIAL', icon: Building2, label: 'Commercial' },
                                        { id: 'INDUSTRIAL', icon: Factory, label: 'Industrial' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setCategory(cat.id as any)}
                                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${category === cat.id ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            <cat.icon size={20} />
                                            <span className="text-[9px] font-black uppercase tracking-tight">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Units */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Units Consumed</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={units}
                                        onChange={(e) => setUnits(e.target.value)}
                                        placeholder="e.g. 250"
                                        className={`w-full bg-slate-50 border-2 ${error ? 'border-red-100 focus:border-red-500' : 'border-slate-50 focus:border-blue-600'} p-5 pl-6 rounded-2xl text-xl font-black transition outline-none`}
                                    />
                                    <Zap className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                </div>
                                {error && <p className="text-red-500 text-[10px] font-bold mt-2 ml-2 uppercase tracking-wider flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
                            </div>

                            {/* Advanced Options */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Fixed Charge (₹)</label>
                                    <input
                                        type="number"
                                        value={fixedCharge}
                                        onChange={(e) => setFixedCharge(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-600 p-4 rounded-xl text-lg font-bold transition outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Duty (%)</label>
                                    <input
                                        type="number"
                                        value={dutyPercent}
                                        onChange={(e) => setDutyPercent(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-blue-600 p-4 rounded-xl text-lg font-bold transition outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={calculateBill}
                                className="w-full bg-slate-900 text-white p-6 rounded-[1.5rem] font-black text-lg uppercase tracking-widest hover:bg-blue-600 transition shadow-xl hover:shadow-blue-200 active:scale-95"
                            >
                                Calculate Bill
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4">
                        <div className="bg-blue-100 text-blue-600 p-2 h-fit rounded-lg"><Info size={18} /></div>
                        <p className="text-blue-800 text-[11px] font-medium leading-relaxed">
                            <strong>Subsidy Notice:</strong> Low consumption users (under 30 units) are charged at the life-line rate of ₹4.25/unit.
                        </p>
                    </div>
                </div>

                {/* Output Section */}
                <div className="flex-1">
                    {result ? (
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden h-full flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Bill Amount</p>
                                        <h3 className="text-6xl font-black tracking-tight">₹{result.total_bill.toFixed(2)}</h3>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                                        <p className="text-[10px] font-black uppercase mb-1">Units</p>
                                        <p className="text-2xl font-black">{result.total_units}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-blue-200 text-[10px] font-black uppercase tracking-widest mt-6">
                                    <CheckCircle size={14} className="text-green-400" /> Payment Estimate Generated
                                </div>
                            </div>

                            <div className="p-10 flex-1 space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Slab-wise Breakdown</h4>
                                    <div className="space-y-3">
                                        {result.slab_breakdown.map((slab, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition">
                                                <div>
                                                    <p className="text-xs font-black text-slate-900">{slab.range}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{slab.units} Units × ₹{slab.rate.toFixed(2)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-900">₹{slab.cost.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Energy Charge</span>
                                        <span className="font-black text-slate-900">₹{result.energy_charge.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Fixed Charge</span>
                                        <span className="font-black text-slate-900">₹{result.fixed_charge.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Electricity Duty ({dutyPercent}%)</span>
                                        <span className="font-black text-slate-900">₹{result.duty_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Note: This is an estimated bill. Actual bill may include FPPPA or other minor adjustments.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-12 text-center opacity-60 min-h-[500px]">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                <Zap size={40} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Ready to Calculate</h3>
                            <p className="text-slate-500 font-medium max-w-xs">Enter your consumption units and details to generate a detailed slab-based estimate.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BillCalculator;
