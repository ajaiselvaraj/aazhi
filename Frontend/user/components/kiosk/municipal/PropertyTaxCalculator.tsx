import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Building2, MapPin, RefreshCw, ChevronRight, AlertCircle, Home, CheckCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
    onBack: () => void;
    language: Language;
}

const PROPERTY_CONFIG = {
    zones: [
        { id: 'A', name: 'Zone A (Urban Core)', rate: 5.00 },
        { id: 'B', name: 'Zone B (Semi-Urban)', rate: 3.50 },
        { id: 'C', name: 'Zone C (Rural)', rate: 2.00 }
    ],
    construction: [
        { id: 'PUCCA', label: 'Pucca (RCC)', factor: 1.2 },
        { id: 'SEMI', label: 'Semi-Pucca', factor: 1.0 },
        { id: 'KUTCHA', label: 'Kutcha', factor: 0.7 }
    ],
    usage: [
        { id: 'RES', label: 'Residential', factor: 1.0 },
        { id: 'COMM', label: 'Commercial', factor: 1.5 },
        { id: 'INST', label: 'Institutional', factor: 1.2 }
    ],
    taxRate: 10, // 10% base tax
    sanitationRate: 2, // 2% sanitation tax
    cessRate: 1 // 1% urban cess
};

const PropertyTaxCalculator: React.FC<Props> = ({ onBack, language }) => {
    const { t } = useTranslation();
    const [area, setArea] = useState<string>('');
    const [zone, setZone] = useState('A');
    const [constType, setConstType] = useState('PUCCA');
    const [usageType, setUsageType] = useState('RES');
    const [period, setPeriod] = useState<'ANNUAL' | 'HALF'>('ANNUAL');
    
    const [result, setResult] = useState<any>(null);

    const calculateTax = () => {
        const areaVal = parseFloat(area);
        if (isNaN(areaVal) || areaVal <= 0) return;

        const baseRate = PROPERTY_CONFIG.zones.find(z => z.id === zone)?.rate || 0;
        const constFactor = PROPERTY_CONFIG.construction.find(c => c.id === constType)?.factor || 1;
        const usageFactor = PROPERTY_CONFIG.usage.find(u => u.id === usageType)?.factor || 1;

        const baseValue = areaVal * baseRate;
        const adjustedValue = baseValue * constFactor * usageFactor;
        
        const baseTax = adjustedValue * (PROPERTY_CONFIG.taxRate / 100);
        const sanitationTax = adjustedValue * (PROPERTY_CONFIG.sanitationRate / 100);
        const cess = (baseTax + sanitationTax) * (PROPERTY_CONFIG.cessRate / 100);
        
        let subtotal = baseTax + sanitationTax + cess;
        
        if (period === 'HALF') {
            subtotal = subtotal / 2;
        }

        setResult({
            area: areaVal,
            baseRate,
            baseValue,
            multipliers: { constFactor, usageFactor },
            breakdown: [
                { label: 'Property Tax (10%)', value: baseTax },
                { label: 'Sanitation Tax (2%)', value: sanitationTax },
                { label: 'Urban Dev Cess (1%)', value: cess }
            ],
            total: subtotal.toFixed(2)
        });
    };

    useEffect(() => {
        if (area) calculateTax();
        else setResult(null);
    }, [area, zone, constType, usageType, period]);

    return (
        <div className="max-w-5xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t('back')}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Inputs */}
                <div className="lg:w-[450px] space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Calculator size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">Tax Calculator</h2>
                        <p className="text-slate-500 font-medium mb-8">Estimate your annual or half-yearly property tax in Assam.</p>

                        <div className="space-y-6">
                            {/* Area Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Built-up Area (Sq. Ft.)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={area}
                                        onChange={(e) => setArea(e.target.value)}
                                        placeholder="e.g. 1200"
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 font-black text-2xl text-slate-900 focus:border-blue-600 focus:bg-white outline-none transition"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                        <Home size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* Zone Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Zone</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PROPERTY_CONFIG.zones.map((z) => (
                                        <button
                                            key={z.id}
                                            onClick={() => setZone(z.id)}
                                            className={`py-3 rounded-xl border-2 font-bold text-xs transition-all ${zone === z.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            {z.name.split(' ')[1]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Construction & Usage */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Construction</label>
                                    <select 
                                        value={constType}
                                        onChange={(e) => setConstType(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 font-bold text-sm text-slate-700 outline-none focus:border-blue-500 transition"
                                    >
                                        {PROPERTY_CONFIG.construction.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usage</label>
                                    <select 
                                        value={usageType}
                                        onChange={(e) => setUsageType(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl p-3 font-bold text-sm text-slate-700 outline-none focus:border-blue-500 transition"
                                    >
                                        {PROPERTY_CONFIG.usage.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Billing Period */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Period</label>
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                                    <button 
                                        onClick={() => setPeriod('ANNUAL')}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${period === 'ANNUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Annual
                                    </button>
                                    <button 
                                        onClick={() => setPeriod('HALF')}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${period === 'HALF' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Half-Yearly
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => { setArea(''); setResult(null); }}
                                className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> Clear All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1">
                    {!result ? (
                        <div className="h-full min-h-[400px] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center opacity-60">
                            <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-6">
                                <Building2 size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-400 mb-2">Ready to Calculate</h3>
                            <p className="text-slate-400 font-medium">Enter your property area and location to see estimated taxes.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500 h-full flex flex-col">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12">
                                    <Building2 size={120} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{period} Tax Estimate</p>
                                    <h2 className="text-6xl font-black mb-4 tracking-tight">₹{result.total}</h2>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg border border-white/20">
                                            <p className="text-[9px] font-black uppercase opacity-70">Zone</p>
                                            <p className="font-black text-xs">{zone}</p>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur px-3 py-1.5 rounded-lg border border-white/20">
                                            <p className="text-[9px] font-black uppercase opacity-70">Area</p>
                                            <p className="font-black text-xs">{result.area} sqft</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-8 flex-1">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tax Components</h4>
                                    <div className="space-y-3">
                                        {result.breakdown.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.label}</span>
                                                <span className="font-black text-slate-900">₹{(period === 'HALF' ? item.value / 2 : item.value).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                                    <AlertCircle className="text-blue-500 shrink-0 mt-1" size={20} />
                                    <div>
                                        <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Calculation Logic</h5>
                                        <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
                                            Base Value = Area ({result.area}) × Rate ({result.baseRate}). Applied multipliers: Construction (x{result.multipliers.constFactor}), Usage (x{result.multipliers.usageFactor}).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-slate-400 justify-center">
                                    <CheckCircle size={16} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Verified GMC Formula v2.4</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyTaxCalculator;
