import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Droplets, Lightbulb } from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from 'react-i18next';
import { BillingService } from '../../services/civicService';

const DATA = [
    { month: 'Jan', power: 240, water: 90 },
    { month: 'Feb', power: 220, water: 110 },
    { month: 'Mar', power: 280, water: 130 },
    { month: 'Apr', power: 350, water: 175 },
    { month: 'May', power: 400, water: 220 },
    { month: 'Jun', power: 380, water: 160 },
];

interface BillDataMap {
    [monthShort: string]: {
        electricityBill: number;
        waterBill: number;
    }
}

const SmartTip = ({ text }: { text: string }) => (
    <div className="flex gap-3 items-start bg-amber-50 p-4 rounded-xl border border-amber-100">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
            <Lightbulb size={16} />
        </div>
        <p className="text-xs font-bold text-amber-800 leading-relaxed">{text}</p>
    </div>
);

const CustomTooltip = ({ active, payload, label, billData }: any) => {
    if (active && payload && payload.length) {
        const fullMonthName = (() => {
            const map: Record<string, string> = {
                'Jan': 'January', 'Feb': 'February', 'Mar': 'March',
                'Apr': 'April', 'May': 'May', 'Jun': 'June',
                'Jul': 'July', 'Aug': 'August', 'Sep': 'September',
                'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
            };
            return map[label] || label;
        })();

        const shortLabel = label ? label.substring(0, 3).toLowerCase() : '';
        
        let electricityBill = 0;
        let waterBill = 0;

        if (billData && billData[shortLabel]) {
            electricityBill = billData[shortLabel].electricityBill;
            waterBill = billData[shortLabel].waterBill;
        }

        return (
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 min-w-[160px] transition-all duration-300">
                <p className="text-slate-800 font-black mb-3">{fullMonthName}</p>
                <div className="space-y-2">
                    <div className="flex justify-between items-center gap-6">
                        <span className="text-[11px] font-bold text-slate-500">Power Bill</span>
                        <span className="text-sm font-black text-slate-800">₹{electricityBill.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center gap-6">
                        <span className="text-[11px] font-bold text-slate-500">Water Bill</span>
                        <span className="text-sm font-black text-slate-800">₹{waterBill.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

interface Props {
    language?: Language
}

const ConsumptionAnalytics: React.FC<Props> = ({ language = Language.ENGLISH }) => {
    const { t } = useTranslation();
    const [billData, setBillData] = useState<BillDataMap>({});

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const [electricityBills, waterBills] = await Promise.all([
                    BillingService.getBillsForUser('electricity').catch(() => []),
                    BillingService.getBillsForUser('water').catch(() => [])
                ]);

                const newBillData: BillDataMap = {};

                const processBills = (bills: any[], type: 'electricityBill' | 'waterBill') => {
                    bills.forEach(bill => {
                        if (bill.month) {
                            const m = bill.month.substring(0, 3).toLowerCase();
                            if (!newBillData[m]) {
                                newBillData[m] = { electricityBill: 0, waterBill: 0 };
                            }
                            newBillData[m][type] += (bill.amount || bill.total_amount || 0);
                        }
                    });
                };

                processBills(electricityBills, 'electricityBill');
                processBills(waterBills, 'waterBill');

                // Fallback to example data if API returns no data for testing
                if (Object.keys(newBillData).length === 0) {
                    const baseCharge = 45; // Base fixed charge
                    const ratePerLiter = 1.5; // Multiplier per unit of usage

                    DATA.forEach(d => {
                        const m = d.month.substring(0, 3).toLowerCase();
                        
                        const elecFallback: Record<string, number> = {
                            jan: 2100, feb: 2200, mar: 2480, apr: 2600, may: 3100, jun: 2900
                        };

                        // Add slight randomness (±5% to ±15%)
                        const sign = Math.random() > 0.5 ? 1 : -1;
                        const randomFluctuation = 1 + (sign * (0.05 + Math.random() * 0.1));

                        // waterBill = baseCharge + (waterUsage * ratePerLiter)
                        let waterBill = baseCharge + (d.water * ratePerLiter);
                        waterBill = Math.round((waterBill * randomFluctuation) / 10) * 10;

                        newBillData[m] = {
                            electricityBill: elecFallback[m] || Math.round(d.power * 8),
                            waterBill: waterBill
                        };
                    });
                }

                setBillData(newBillData);
            } catch (error) {
                console.error('Failed to fetch bills for tooltip', error);
            }
        };

        fetchBills();
    }, []);

    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-black text-slate-800">{t('consumptionTrends') || 'Consumption Trends'}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('elecWaterUsage') || 'Electricity & Water Usage'}</p>
                </div>
                <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600"></span> {t('power') || 'Power'}</span>
                    <span className="flex items-center gap-1 text-cyan-500"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> {t('water') || 'Water'}</span>
                </div>
            </div>

            <div className="h-48 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={DATA}>
                        <defs>
                            <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                        <YAxis hide />
                        <Tooltip
                            content={<CustomTooltip billData={billData} />}
                            cursor={{ stroke: '#e2e8f0', strokeWidth: 2, fill: 'transparent', strokeDasharray: '4 4' }}
                        />
                        <Area type="monotone" dataKey="power" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorPower)" />
                        <Area type="monotone" dataKey="water" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorWater)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-3">
                <SmartTip text={t('tipContent') || "Your usage peaks in May. Switching to 5-Star rated ACs can save ₹400/month."} />
            </div>
        </div>
    );
};

export default ConsumptionAnalytics;
