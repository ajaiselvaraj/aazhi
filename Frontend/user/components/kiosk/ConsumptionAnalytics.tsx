import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, Droplets, Flame, Lightbulb, TrendingUp } from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from 'react-i18next';
import { BillingService } from '../../services/civicService';
import { GasService } from '../../services/gasService';
import { useOrientation } from '../../contexts/OrientationContext';

// ── Static demo data (always visible, even without auth) ──────────────────
const DEMO_DATA = [
    { month: 'Jan', power: 240, water: 90, gas: 15 },
    { month: 'Feb', power: 220, water: 110, gas: 14 },
    { month: 'Mar', power: 280, water: 130, gas: 16 },
    { month: 'Apr', power: 350, water: 175, gas: 18 },
    { month: 'May', power: 400, water: 220, gas: 15 },
    { month: 'Jun', power: 380, water: 160, gas: 14 },
];

// ── Fallback bill amounts mapped to demo usage data ───────────────────────
const FALLBACK_BILL_DATA: Record<string, { electricityBill: number; waterBill: number; gasBill: number }> = {
    jan: { electricityBill: 2100, waterBill: 180, gasBill: 600 },
    feb: { electricityBill: 2200, waterBill: 210, gasBill: 580 },
    mar: { electricityBill: 2480, waterBill: 240, gasBill: 620 },
    apr: { electricityBill: 2600, waterBill: 307, gasBill: 650 },
    may: { electricityBill: 3100, waterBill: 375, gasBill: 600 },
    jun: { electricityBill: 2900, waterBill: 285, gasBill: 590 },
};

interface BillDataMap {
    [monthShort: string]: {
        electricityBill: number;
        waterBill: number;
        gasBill: number;
    };
}

const SmartTip = ({ text }: { text: string }) => (
    <div className="flex gap-3 items-start bg-amber-50 p-4 rounded-xl border border-amber-100">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
            <Lightbulb size={16} />
        </div>
        <p className="text-xs font-bold text-amber-800 leading-relaxed">{text}</p>
    </div>
);

const CustomTooltip = ({ active, payload, label, billData, serviceType }: any) => {
    const { t } = useTranslation();
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
        const bills = (billData && billData[shortLabel]) ? billData[shortLabel] : { electricityBill: 0, waterBill: 0, gasBill: 0 };

        let total = 0;
        if (serviceType === 'all' || serviceType === 'electricity') total += bills.electricityBill;
        if (serviceType === 'all' || serviceType === 'water') total += bills.waterBill;
        if (serviceType === 'all' || serviceType === 'gas') total += bills.gasBill;

        return (
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 min-w-[160px]">
                <p className="text-slate-800 font-black mb-3">{fullMonthName}</p>
                <div className="space-y-2">
                    {(serviceType === 'all' || serviceType === 'electricity') && (
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <Zap size={10} className="text-blue-500" /> {t('powerBill') || 'Power Bill'}
                            </span>
                            <span className="text-sm font-black text-slate-800">₹{bills.electricityBill.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    {(serviceType === 'all' || serviceType === 'water') && (
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <Droplets size={10} className="text-cyan-500" /> {t('waterBill') || 'Water Bill'}
                            </span>
                            <span className="text-sm font-black text-slate-800">₹{bills.waterBill.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    {(serviceType === 'all' || serviceType === 'gas') && (
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                <Flame size={10} className="text-orange-500" /> {t('gasBill') || 'Gas Bill'}
                            </span>
                            <span className="text-sm font-black text-slate-800">₹{bills.gasBill.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    <div className="border-t border-slate-100 pt-2 mt-2">
                        <div className="flex justify-between items-center gap-6">
                            <span className="text-[11px] font-bold text-slate-400">{t('total') || 'Total'}</span>
                            <span className="text-sm font-black text-blue-600">₹{total.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

interface Props {
    language?: Language;
    serviceType?: 'electricity' | 'water' | 'gas' | 'all';
}

const ConsumptionAnalytics: React.FC<Props> = ({ language = Language.ENGLISH, serviceType = 'all' }) => {
    const { t } = useTranslation();
    const { isVertical } = useOrientation();
    const [billData, setBillData] = useState<BillDataMap>(FALLBACK_BILL_DATA);
    const [isDataFromApi, setIsDataFromApi] = useState(false);

    // ── Chart ready-guard: prevent rendering before the DOM element has size ──
    const [chartReady, setChartReady] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) {
            const raf = requestAnimationFrame(() => setChartReady(true));
            return () => cancelAnimationFrame(raf);
        }

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setChartReady(true);
                    observer.disconnect();
                }
            }
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // ── API fetch: only when user is authenticated ────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('aazhi_token');
        const hasValidJwt = !!(token && token.split('.').length === 3 && token.length > 50);

        if (!hasValidJwt) {
            console.log('[ConsumptionAnalytics] No JWT — using demo/fallback bill data.');
            return;
        }

        let cancelled = false;

        const fetchBills = async () => {
            try {
                const electricityPromise = (serviceType === 'all' || serviceType === 'electricity') ? BillingService.getBillsForUser('electricity').catch(() => []) : Promise.resolve([]);
                const waterPromise = (serviceType === 'all' || serviceType === 'water') ? BillingService.getBillsForUser('water').catch(() => []) : Promise.resolve([]);
                const gasPromise = (serviceType === 'all' || serviceType === 'gas') ? GasService.getBills().then(res => res.data).catch(() => []) : Promise.resolve([]);

                const [electricityBills, waterBills, gasBills] = await Promise.all([
                    electricityPromise,
                    waterPromise,
                    gasPromise
                ]);

                if (cancelled) return;

                const newBillData: BillDataMap = {};

                const processBills = (bills: any[], type: 'electricityBill' | 'waterBill' | 'gasBill') => {
                    bills.forEach(bill => {
                        const rawMonth: string = bill.billing_month || bill.month || '';
                        if (rawMonth) {
                            const m = rawMonth.substring(0, 3).toLowerCase();
                            if (!newBillData[m]) {
                                newBillData[m] = { electricityBill: 0, waterBill: 0, gasBill: 0 };
                            }
                            newBillData[m][type] += parseFloat(bill.amount || bill.total_amount || '0');
                        }
                    });
                };

                processBills(electricityBills, 'electricityBill');
                processBills(waterBills, 'waterBill');
                processBills(gasBills, 'gasBill');

                if (Object.keys(newBillData).length > 0) {
                    setBillData(newBillData);
                    setIsDataFromApi(true);
                }
            } catch (error) {
                console.warn('[ConsumptionAnalytics] Bill fetch failed, using demo data:', error);
            }
        };

        fetchBills();
        return () => { cancelled = true; };
    }, [serviceType]);

    const getTitle = () => {
        if (serviceType === 'electricity') return 'Electricity Consumption';
        if (serviceType === 'water') return 'Water Consumption';
        if (serviceType === 'gas') return 'Gas Consumption';
        return t('consumptionTrends') || 'Consumption Trends';
    };

    const getSubtitle = () => {
        if (serviceType === 'electricity') return 'Power Usage History';
        if (serviceType === 'water') return 'Water Usage History';
        if (serviceType === 'gas') return 'Gas Usage History';
        return t('elecWaterUsage') || 'Electricity & Water Usage';
    };

    const getTipText = () => {
        if (serviceType === 'electricity') return 'Switching to 5-Star rated appliances can reduce your power bill by up to 20%.';
        if (serviceType === 'water') return 'Fixing leaky faucets promptly can save up to 10% on your monthly water bill.';
        if (serviceType === 'gas') return 'Regular maintenance of your gas stove and keeping burners clean improves fuel efficiency and lowers bills.';
        return t('tipContent') || 'Your usage peaks in May. Switching to 5-Star rated ACs can save ₹400/month.';
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col mt-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h3 className="text-xl font-black text-slate-800">{getTitle()}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {getSubtitle()}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isDataFromApi && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-green-50 text-green-600 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                            <TrendingUp size={8} /> Live
                        </span>
                    )}
                    <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                        {(serviceType === 'all' || serviceType === 'electricity') && (
                            <span className="flex items-center gap-1 text-blue-600">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                {t('power') || 'Power'}
                            </span>
                        )}
                        {(serviceType === 'all' || serviceType === 'water') && (
                            <span className="flex items-center gap-1 text-cyan-500">
                                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                {t('water') || 'Water'}
                            </span>
                        )}
                        {(serviceType === 'all' || serviceType === 'gas') && (
                            <span className="flex items-center gap-1 text-orange-500">
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                {t('gas') || 'Gas'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart container */}
            <div
                ref={containerRef}
                className="w-full mb-6 shrink-0"
                style={{ minHeight: isVertical ? '320px' : '192px', height: isVertical ? '320px' : '192px' }}
            >
                {chartReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={DEMO_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            />
                            <YAxis hide />
                            <Tooltip
                                content={<CustomTooltip billData={billData} serviceType={serviceType} />}
                                cursor={{ stroke: '#e2e8f0', strokeWidth: 2, fill: 'transparent', strokeDasharray: '4 4' }}
                            />
                            {(serviceType === 'all' || serviceType === 'electricity') && (
                                <Area
                                    type="monotone"
                                    dataKey="power"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorPower)"
                                    animationDuration={800}
                                />
                            )}
                            {(serviceType === 'all' || serviceType === 'water') && (
                                <Area
                                    type="monotone"
                                    dataKey="water"
                                    stroke="#06b6d4"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorWater)"
                                    animationDuration={800}
                                />
                            )}
                            {(serviceType === 'all' || serviceType === 'gas') && (
                                <Area
                                    type="monotone"
                                    dataKey="gas"
                                    stroke="#f97316"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorGas)"
                                    animationDuration={800}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse flex items-end gap-1 px-4 pb-4">
                        {[60, 50, 70, 85, 100, 90].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-slate-200 rounded-t-lg"
                                style={{ height: `${h}%` }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Smart Tips */}
            <div className="space-y-3 shrink-0">
                <SmartTip text={getTipText()} />
            </div>
        </div>
    );
};

export default ConsumptionAnalytics;
