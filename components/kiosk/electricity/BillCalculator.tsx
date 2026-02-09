import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator, Info, Zap, Factory, Home, Building2, Sprout, Landmark, GraduationCap, BatteryCharging, CheckCircle, AlertCircle } from 'lucide-react';
import { Language } from '../../../types';
import { TRANSLATIONS } from '../../../constants';

interface Props {
    onBack: () => void;
    language: Language;
}

// Tariff Constants (FY 2025-26)
const TARIFFS = {
    DOMESTIC: {
        slabs: [
            { limit: 100, rate: 0 },
            { limit: 200, rate: 2.35 },
            { limit: 400, rate: 4.70 },
            { limit: 500, rate: 6.30 },
            { limit: 600, rate: 8.40 },
            { limit: 800, rate: 9.45 },
            { limit: 1000, rate: 10.50 },
            { limit: Infinity, rate: 11.55 }
        ]
    },
    COMMERCIAL_LT: {
        slabs: [
            { limit: 100, rate: 6.45 },
            { limit: Infinity, rate: 10.15 }
        ]
    },
    WORSHIP_LT: {
        slabs: [
            { limit: 120, rate: 3.05 },
            { limit: Infinity, rate: 7.50 }
        ]
    }
};

type Category = 'DOMESTIC' | 'COMMERCIAL' | 'INDUSTRIAL' | 'AGRICULTURE' | 'HUT' | 'POWERLOOM' | 'WORSHIP' | 'EDUCATION' | 'EV';
type Voltage = 'LT' | 'HT';

const BillCalculator: React.FC<Props> = ({ onBack, language }) => {
    const t = TRANSLATIONS[language];

    // State
    const [category, setCategory] = useState<Category>('DOMESTIC');
    const [voltage, setVoltage] = useState<Voltage>('LT');
    const [units, setUnits] = useState<string>('');
    const [unitsPeak, setUnitsPeak] = useState<string>(''); // For EV
    const [unitsOffPeak, setUnitsOffPeak] = useState<string>(''); // For EV
    const [load, setLoad] = useState<string>(''); // kW or kVA depending on category

    // Results
    const [result, setResult] = useState<any>(null);

    // Reset when category changes
    useEffect(() => {
        setUnits('');
        setUnitsPeak('');
        setUnitsOffPeak('');
        setLoad('');
        setResult(null);
        // Default voltage reset
        if (['EDUCATION'].includes(category)) setVoltage('HT');
        else if (['HUT', 'WORSHIP', 'EV', 'POWERLOOM'].includes(category)) setVoltage('LT');
        else setVoltage('LT'); // Default
    }, [category]);

    const calculate = () => {
        let totalBill = 0;
        let energyCharge = 0;
        let fixedCharge = 0;
        let subsidy = false;
        let breakdown: string[] = [];
        const u = parseFloat(units) || 0;

        // 1. DOMESTIC
        if (category === 'DOMESTIC') {
            let remaining = u;
            let currentSlabBottom = 0;

            // TNERC Domestic Logic: 
            if (u <= 100) {
                breakdown.push(`0 - ${u} units @ ₹0.00/unit : ₹0.00`);
            } else {
                if (u > 0) breakdown.push(`0 - 100 units @ ₹0.00/unit : ₹0.00 (Subsidy)`);
            }

            // Calculation loop
            if (u > 100) {
                // 101-200
                const slabUnits = Math.min(u - 100, 100);
                energyCharge += slabUnits * 2.35;
                if (slabUnits > 0) breakdown.push(`101 - ${100 + slabUnits} units @ ₹2.35/unit : ₹${(slabUnits * 2.35).toFixed(2)}`);
            }
            if (u > 200) {
                // 201-400
                const slabUnits = Math.min(u - 200, 200);
                energyCharge += slabUnits * 4.70;
                if (slabUnits > 0) breakdown.push(`201 - ${200 + slabUnits} units @ ₹4.70/unit : ₹${(slabUnits * 4.70).toFixed(2)}`);
            }
            if (u > 400) {
                // 401-500
                const slabUnits = Math.min(u - 400, 100);
                energyCharge += slabUnits * 6.30;
                if (slabUnits > 0) breakdown.push(`401 - ${400 + slabUnits} units @ ₹6.30/unit : ₹${(slabUnits * 6.30).toFixed(2)}`);
            }
            if (u > 500) {
                // 501-600
                const slabUnits = Math.min(u - 500, 100);
                energyCharge += slabUnits * 8.40;
                if (slabUnits > 0) breakdown.push(`501 - ${500 + slabUnits} units @ ₹8.40/unit : ₹${(slabUnits * 8.40).toFixed(2)}`);
            }
            if (u > 600) {
                // 601-800
                const slabUnits = Math.min(u - 600, 200);
                energyCharge += slabUnits * 9.45;
                if (slabUnits > 0) breakdown.push(`601 - ${600 + slabUnits} units @ ₹9.45/unit : ₹${(slabUnits * 9.45).toFixed(2)}`);
            }
            if (u > 800) {
                // 801-1000
                const slabUnits = Math.min(u - 800, 200);
                energyCharge += slabUnits * 10.50;
                if (slabUnits > 0) breakdown.push(`801 - ${800 + slabUnits} units @ ₹10.50/unit : ₹${(slabUnits * 10.50).toFixed(2)}`);
            }
            if (u > 1000) {
                // > 1000
                const slabUnits = u - 1000;
                energyCharge += slabUnits * 11.55;
                if (slabUnits > 0) breakdown.push(`> 1000 units @ ₹11.55/unit : ₹${(slabUnits * 11.55).toFixed(2)}`);
            }

            subsidy = true;
        }

        // 2. HUT
        else if (category === 'HUT') {
            energyCharge = 0;
            breakdown.push(`Flat Rate (Subsidized): ₹0.00`);
            subsidy = true;
        }

        // 3. COMMERCIAL
        else if (category === 'COMMERCIAL') {
            if (voltage === 'LT') {
                // 0-100 @ 6.45, >100 @ 10.15
                if (u <= 100) {
                    energyCharge += u * 6.45;
                    breakdown.push(`0 - ${u} units @ ₹6.45/unit : ₹${(u * 6.45).toFixed(2)}`);
                } else {
                    energyCharge += 100 * 6.45;
                    breakdown.push(`0 - 100 units @ ₹6.45/unit : ₹${(100 * 6.45).toFixed(2)}`);

                    const rem = u - 100;
                    energyCharge += rem * 10.15;
                    breakdown.push(`> 100 units (${rem}) @ ₹10.15/unit : ₹${(rem * 10.15).toFixed(2)}`);
                }
            } else { // HT
                // 9.40 per kWh + 608 per kVA
                let l = parseFloat(load) || 0;
                energyCharge = u * 9.40;
                fixedCharge = l * 608;
                breakdown.push(`${u} units @ ₹9.40/unit : ₹${energyCharge.toFixed(2)}`);
                breakdown.push(`Demand Charge (${l} kVA @ ₹608) : ₹${fixedCharge.toFixed(2)}`);
            }
        }

        // 4. INDUSTRIAL
        else if (category === 'INDUSTRIAL') {
            let l = parseFloat(load) || 0;
            if (voltage === 'LT') {
                // 8.00 per unit + Fixed (162-589). Using 589 as safe max estimate
                energyCharge = u * 8.00;
                fixedCharge = l * 589;
                breakdown.push(`${u} units @ ₹8.00/unit : ₹${energyCharge.toFixed(2)}`);
                breakdown.push(`Fixed Charge (Est. max ₹589/kW for ${l} kW) : ₹${fixedCharge.toFixed(2)}`);
            } else {
                // HT: 7.50 per kWh + 608 per kVA
                energyCharge = u * 7.50;
                fixedCharge = l * 608;
                breakdown.push(`${u} units @ ₹7.50/unit : ₹${energyCharge.toFixed(2)}`);
                breakdown.push(`Demand Charge (${l} kVA @ ₹608) : ₹${fixedCharge.toFixed(2)}`);
            }
        }

        // 5. AGRICULTURE
        else if (category === 'AGRICULTURE') {
            energyCharge = 0;
            breakdown.push('Fully Subsidized : ₹0.00');
            subsidy = true;
        }

        // 6. POWERLOOM
        else if (category === 'POWERLOOM') {
            if (u <= 1000) {
                energyCharge = 0;
                breakdown.push(`0 - ${u} units : Free (Subsidy)`);
                subsidy = true;
            } else {
                energyCharge = (u - 1000) * 8.00;
                breakdown.push(`First 1000 units : Free`);
                breakdown.push(`Excess ${u - 1000} units @ ₹8.00/unit (Industrial Base) : ₹${energyCharge.toFixed(2)}`);
            }
        }

        // 7. WORSHIP
        else if (category === 'WORSHIP') {
            // 0-120 @ 3.05, >120 @ 7.50
            if (u <= 120) {
                energyCharge += u * 3.05;
                breakdown.push(`0 - ${u} units @ ₹3.05/unit : ₹${(u * 3.05).toFixed(2)}`);
            } else {
                energyCharge += 120 * 3.05;
                breakdown.push(`0 - 120 units @ ₹3.05/unit : ₹${(120 * 3.05).toFixed(2)}`);

                const rem = u - 120;
                energyCharge += rem * 7.50;
                breakdown.push(`> 120 units (${rem}) @ ₹7.50/unit : ₹${(rem * 7.50).toFixed(2)}`);
            }
        }

        // 8. EDUCATION (HT)
        else if (category === 'EDUCATION') {
            let l = parseFloat(load) || 0;
            energyCharge = u * 8.00;
            fixedCharge = l * 589;
            breakdown.push(`${u} units @ ₹8.00/unit : ₹${energyCharge.toFixed(2)}`);
            breakdown.push(`Demand Charge (${l} kVA @ ₹589) : ₹${fixedCharge.toFixed(2)}`);
        }

        // 9. EV CHARGING
        else if (category === 'EV') {
            const up = parseFloat(unitsPeak) || 0;
            const uop = parseFloat(unitsOffPeak) || 0;
            const costP = up * 9.45;
            const costOP = uop * 6.30;

            energyCharge = costP + costOP;
            breakdown.push(`Peak Units (${up}) @ ₹9.45 : ₹${costP.toFixed(2)}`);
            breakdown.push(`Off-Peak Units (${uop}) @ ₹6.30 : ₹${costOP.toFixed(2)}`);
        }

        totalBill = energyCharge + fixedCharge;
        setResult({
            total: totalBill,
            energy: energyCharge,
            fixed: fixedCharge,
            subsidy: subsidy,
            breakdown: breakdown
        });
    };

    const categories = [
        { id: 'DOMESTIC', label: t.domestic || 'Domestic', icon: Home },
        { id: 'COMMERCIAL', label: t.commercial || 'Commercial', icon: Building2 },
        { id: 'INDUSTRIAL', label: t.industrial || 'Industrial', icon: Factory },
        { id: 'AGRICULTURE', label: t.agriculture || 'Agriculture', icon: Sprout },
        { id: 'HUT', label: t.hut || 'Hut (Dwelling)', icon: Home },
        { id: 'POWERLOOM', label: t.powerloom || 'Power Loom', icon: Zap },
        { id: 'WORSHIP', label: t.worship || 'Place of Worship', icon: Landmark },
        { id: 'EDUCATION', label: t.education || 'Private Education', icon: GraduationCap },
        { id: 'EV', label: t.ev || 'EV Charging', icon: BatteryCharging },
    ];

    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t.back}
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Input Panel */}
                <div className="flex-[2] bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Calculator size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">{t.calcHeading}</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t.calcSub}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Category Select */}
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">{t.connType}</label>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat.id as Category)}
                                        className={`p-3 rounded-2xl border-2 transition flex flex-col items-center gap-2 ${category === cat.id ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                                    >
                                        <cat.icon size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-center">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Voltage Select for Ind/Comm */}
                        {['COMMERCIAL', 'INDUSTRIAL'].includes(category) && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Supply Level</label>
                                <div className="flex gap-4">
                                    <button onClick={() => setVoltage('LT')} className={`flex-1 p-4 rounded-xl font-black border-2 transition ${voltage === 'LT' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-100'}`}>Low Tension (LT)</button>
                                    <button onClick={() => setVoltage('HT')} className={`flex-1 p-4 rounded-xl font-black border-2 transition ${voltage === 'HT' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-100'}`}>High Tension (HT)</button>
                                </div>
                            </div>
                        )}

                        {/* Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {category !== 'EV' && (
                                <div className="col-span-full">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">{t.unitsConsumed}</label>
                                    <input inputMode="numeric" type="number" value={units} onChange={(e) => setUnits(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-600" placeholder="0" />
                                </div>
                            )}

                            {category === 'EV' && (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Peak Hours Units</label>
                                        <input inputMode="numeric" type="number" value={unitsPeak} onChange={(e) => setUnitsPeak(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-600" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Off-Peak Units</label>
                                        <input inputMode="numeric" type="number" value={unitsOffPeak} onChange={(e) => setUnitsOffPeak(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-600" placeholder="0" />
                                    </div>
                                </>
                            )}

                            {(voltage === 'HT' || category === 'INDUSTRIAL' || category === 'EDUCATION') && (
                                <div className="col-span-full">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Sanctioned Demand ({voltage === 'HT' ? 'kVA' : 'kW'})</label>
                                    <input inputMode="numeric" type="number" value={load} onChange={(e) => setLoad(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-600" placeholder="0" />
                                </div>
                            )}
                        </div>

                        <button onClick={calculate} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg uppercase tracking-wider hover:bg-slate-800 transition shadow-xl mt-6">
                            {t.calculate}
                        </button>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="flex-1 space-y-4">
                    {result ? (
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl animate-in zoom-in-95">
                            <p className="text-indigo-200 font-bold text-xs uppercase tracking-widest mb-2">{t.estCharge}</p>
                            <h3 className="text-5xl font-black mb-6">₹{result.total.toFixed(2)}</h3>

                            <div className="space-y-4 mb-6">
                                {/* Details can be translated if we strictly want, but keeping currency values visible mainly */}
                                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                                    <div className="flex justify-between text-xs font-bold mb-1 opacity-80">
                                        <span>Energy Charges</span>
                                        <span>₹{result.energy.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold opacity-80">
                                        <span>Fixed/Demand Charges</span>
                                        <span>₹{result.fixed.toFixed(2)}</span>
                                    </div>
                                </div>
                                {result.subsidy && (
                                    <div className="flex items-center gap-2 text-green-300 text-xs font-black uppercase tracking-wider">
                                        <CheckCircle size={14} /> Govt. Subsidy Applied
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-white/20 pt-6">
                                <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">Calculation Breakdown</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {result.breakdown.map((line: string, i: number) => (
                                        <p key={i} className="text-xs font-medium opacity-90 border-b border-white/10 pb-2 last:border-0">{line}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col items-center justify-center p-8 text-center opacity-50">
                            <Zap size={48} className="text-slate-300 mb-4" />
                            <p className="font-bold text-slate-400">{t.calcSub}</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
            `}</style>
        </div>
    );
};

export default BillCalculator;
