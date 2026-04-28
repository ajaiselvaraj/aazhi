import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Flame, Info, RefreshCw, ChevronRight, Home, Building2, Car, AlertCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

const GAS_CONFIG = {
    LPG: {
        types: [
            { id: 'DOM_14_2', label: 'Domestic (14.2 kg)', rate: 962.00, unit: 'Cylinder' },
            { id: 'DOM_5', label: 'Small (5 kg)', rate: 334.00, unit: 'Cylinder' },
            { id: 'COMM_19', label: 'Commercial (19 kg)', rate: 2300.00, unit: 'Cylinder' }
        ],
        taxPercent: 5
    },
    PNG: {
        rate: 45.00,
        fixedCharge: 50,
        pipelineCharge: 30,
        taxPercent: 12
    },
    CNG: {
        rate: 98.00,
        taxPercent: 18
    }
};

const GasBillCalculator: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();
    const [gasType, setGasType] = useState<'LPG' | 'PNG' | 'CNG'>('LPG');
    const [consumption, setConsumption] = useState<string>('');
    const [lpgSubtype, setLpgSubtype] = useState<string>('DOM_14_2');
    
    // Advanced inputs
    const [customRate, setCustomRate] = useState<string>('');
    const [taxPercent, setTaxPercent] = useState<string>('');
    
    const [result, setResult] = useState<any>(null);

    // Auto-fill defaults
    useEffect(() => {
        const config = GAS_CONFIG[gasType];
        if (gasType === 'LPG') {
            const type = config.types.find(t => t.id === lpgSubtype);
            setCustomRate(type?.rate.toString() || '');
        } else {
            setCustomRate(config.rate?.toString() || '');
        }
        setTaxPercent(config.taxPercent.toString());
    }, [gasType, lpgSubtype]);

    const calculateBill = () => {
        const value = parseFloat(consumption);
        if (isNaN(value) || value < 0) return;

        const rate = parseFloat(customRate) || 0;
        const tax = parseFloat(taxPercent) || 0;
        
        let usageCharge = 0;
        let additionalCharges = 0;
        let breakdown: any[] = [];

        if (gasType === 'LPG') {
            usageCharge = value * rate;
            breakdown.push({ label: 'Cylinder Cost', value: usageCharge });
        } else if (gasType === 'PNG') {
            usageCharge = value * rate;
            const config = GAS_CONFIG.PNG;
            additionalCharges = config.fixedCharge + config.pipelineCharge;
            breakdown.push({ label: 'Gas Usage Charge', value: usageCharge });
            breakdown.push({ label: 'Fixed Monthly Charge', value: config.fixedCharge });
            breakdown.push({ label: 'Pipeline/Transport', value: config.pipelineCharge });
        } else {
            usageCharge = value * rate;
            breakdown.push({ label: 'CNG Cost', value: usageCharge });
        }

        const subtotal = usageCharge + additionalCharges;
        const taxAmount = subtotal * (tax / 100);
        const total = subtotal + taxAmount;

        setResult({
            consumption: value,
            unit: gasType === 'LPG' ? 'Cylinders' : gasType === 'PNG' ? 'SCM' : 'Kg',
            rate,
            usageCharge,
            additionalCharges,
            taxAmount,
            total: total.toFixed(2),
            breakdown
        });
    };

    useEffect(() => {
        if (consumption) calculateBill();
        else setResult(null);
    }, [consumption, gasType, lpgSubtype, customRate, taxPercent]);

    return (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Input Panel */}
                <div className="lg:w-[450px] space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Calculator size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Gas Bill Calculator</h2>
                        <p className="text-slate-500 font-medium mb-8">Calculate estimated costs for LPG, PNG, or CNG services in Assam.</p>

                        <div className="space-y-6">
                            {/* Gas Type Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'LPG', icon: Flame, label: 'LPG' },
                                        { id: 'PNG', icon: Home, label: 'PNG' },
                                        { id: 'CNG', icon: Car, label: 'CNG' }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setGasType(type.id as any)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${gasType === type.id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            <type.icon size={20} />
                                            <span className="font-bold text-[10px] uppercase tracking-tight">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* LPG Specific Subtype */}
                            {gasType === 'LPG' && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cylinder Type</label>
                                    <select 
                                        value={lpgSubtype}
                                        onChange={(e) => setLpgSubtype(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-bold text-slate-700 focus:border-orange-500 outline-none transition"
                                    >
                                        {GAS_CONFIG.LPG.types.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Consumption Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Quantity ({gasType === 'LPG' ? 'Cylinders' : gasType === 'PNG' ? 'SCM' : 'Kg'})
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={consumption}
                                        onChange={(e) => setConsumption(e.target.value)}
                                        placeholder="Enter amount..."
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-black text-2xl text-slate-900 focus:border-orange-500 focus:bg-white outline-none transition"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                        <Flame size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Options */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Rate (₹)</label>
                                    <input
                                        type="number"
                                        value={customRate}
                                        onChange={(e) => setCustomRate(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-orange-500 p-4 rounded-xl text-lg font-bold transition outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Tax (%)</label>
                                    <input
                                        type="number"
                                        value={taxPercent}
                                        onChange={(e) => setTaxPercent(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 focus:border-orange-500 p-4 rounded-xl text-lg font-bold transition outline-none"
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
                            <h3 className="text-xl font-black text-slate-400 mb-2">Ready to Calculate</h3>
                            <p className="text-slate-400 font-medium">Select your gas type and quantity to generate an estimate.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500 h-full flex flex-col">
                            <div className="bg-gradient-to-br from-orange-600 to-red-700 p-10 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12">
                                    <Flame size={120} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Estimated Amount</p>
                                    <h2 className="text-6xl font-black mb-4 tracking-tight">₹{result.total}</h2>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg border border-white/20">
                                            <p className="text-[9px] font-black uppercase opacity-70">Consumption</p>
                                            <p className="font-black text-xs">{result.consumption} {result.unit}</p>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg border border-white/20">
                                            <p className="text-[9px] font-black uppercase opacity-70">Gas Type</p>
                                            <p className="font-black text-xs">{gasType}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-8 flex-1">
                                {/* Bill Breakdown */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detailed Breakdown</h4>
                                    <div className="space-y-3">
                                        {result.breakdown.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.label}</span>
                                                <span className="font-black text-slate-900">₹{item.value.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Usage Charge</span>
                                        <span className="font-black text-slate-900">₹{result.usageCharge.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Charges</span>
                                        <span className="font-black text-slate-900">₹{result.additionalCharges.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax ({taxPercent}%)</span>
                                        <span className="font-black text-slate-900">₹{result.taxAmount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex items-start gap-4">
                                    <AlertCircle className="text-orange-500 shrink-0 mt-1" size={20} />
                                    <div>
                                        <h5 className="text-[10px] font-black text-orange-900 uppercase tracking-widest mb-1">Billing Note</h5>
                                        <p className="text-[11px] font-medium text-orange-800 leading-relaxed">
                                            For PNG users, SCM consumption is metered monthly. LPG prices are subject to daily/monthly market adjustments. Taxes vary by gas category.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GasBillCalculator;
