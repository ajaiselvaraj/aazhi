import React from 'react';
import { LayoutGrid, CreditCard, ArrowRight, User, FileText, Smartphone } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import ConsumptionAnalytics from './ConsumptionAnalytics';
import DisruptionMap from './DisruptionMap';
import { CityAlert } from '../../types';

interface Props {
    alerts: CityAlert[];
    onNavigate: (tab: string) => void;
    userName?: string;
}

const DashboardHome: React.FC<Props> = ({ alerts, onNavigate, userName = "Citizen" }) => {
    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-10">
            {/* Greeting Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Namaste, <span className="privacy-sensitive">{userName}</span></h2>
                    <div className="flex gap-2">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1">
                            <Smartphone size={12} /> e-KYC Verified
                        </span>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1">
                            <User size={12} /> Aadhaar: •••• 9821
                        </span>
                    </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">System Online</span>
                </div>
            </div>

            {/* Top Row: Alerts and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-full">
                    <AlertsPanel alerts={alerts} />
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onNavigate('services')}
                        className="group bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-200 hover:bg-blue-700 transition relative overflow-hidden text-left h-full"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition duration-500">
                            <LayoutGrid size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
                                <LayoutGrid size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black mb-1">New Request</h3>
                                <p className="opacity-80 text-xs font-medium mb-4">Connections, Certificates & Civic Services</p>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-3 py-2 rounded-lg">
                                    Start <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => onNavigate('billing')}
                        className="group bg-white text-slate-900 border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-2xl transition relative overflow-hidden text-left h-full"
                    >
                        <div className="absolute top-0 right-0 p-4 text-slate-100 group-hover:text-slate-50 transition duration-500">
                            <CreditCard size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-900">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black mb-1">Pay Bills</h3>
                                <p className="text-slate-500 text-xs font-medium mb-4">Water, Elec, Gas & Property Tax</p>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 w-fit px-3 py-2 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition">
                                    Pay <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Middle Row: Advanced Visuals (Analytics & Map) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConsumptionAnalytics />
                <DisruptionMap alerts={alerts} />
            </div>

            {/* Bottom Row: Zero-Document / DigiLocker Showcase */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 relative overflow-hidden mt-10">
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex gap-6 items-center">
                        <div className="bg-white p-4 rounded-2xl shadow-sm text-indigo-600">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-indigo-900">Zero-Document Vault</h3>
                            <p className="text-indigo-600 font-bold text-sm">DigiLocker Linked • 3 Verified Documents Ready</p>
                        </div>
                    </div>
                    <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition">
                        View Documents
                    </button>
                </div>

                {/* Visual Flair */}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-100 to-transparent"></div>
            </div>

        </div>
    );
};

export default DashboardHome;
