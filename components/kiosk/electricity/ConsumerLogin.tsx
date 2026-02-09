import React, { useState } from 'react';
import { ArrowLeft, User, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, History, Download, FileText, AlertCircle, LogOut } from 'lucide-react';
import { MOCK_USER_PROFILE, TRANSLATIONS } from '../../../constants';
import { Language } from '../../../types';

interface Props {
    onBack: () => void;
    language: Language;
}

const ConsumerLogin: React.FC<Props> = ({ onBack, language }) => {
    const t = TRANSLATIONS[language];
    const [view, setView] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');
    const [username, setUsername] = useState('04-100-2458');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = () => {
        setIsLoading(true);
        setTimeout(() => {
            setView('DASHBOARD');
            setIsLoading(false);
        }, 1000);
    };

    if (view === 'LOGIN') {
        return (
            <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-10 hover:text-slate-900 transition">
                    <ArrowLeft size={16} /> {t.cancel || "Cancel"}
                </button>

                <h2 className="text-3xl font-black text-slate-900 mb-2">{t.loginHeading || "Consumer Login"}</h2>
                <p className="text-slate-500 font-medium text-sm mb-8">{t.loginSub || "Access bill history & manage your connection."}</p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">{t.serviceNoOrUser || "Service No / User ID"}</label>
                        <div className="relative">
                            <input
                                inputMode="numeric"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 p-5 pl-12 rounded-2xl text-lg font-bold outline-none focus:border-blue-600 transition"
                            />
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">{t.password || "Password"}</label>
                        <div className="relative">
                            <input
                                type={showPass ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 p-5 pl-12 pr-12 rounded-2xl text-lg font-bold outline-none focus:border-blue-600 transition"
                                placeholder="••••••••"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 border border-blue-100">
                        <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                            {t.secureEnv || "Secure Environment. Keyboard input is monitored for safety."}
                        </p>
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg uppercase tracking-wider hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                    >
                        {isLoading ? (t.verifying || 'Verifying...') : (t.loginBtn || 'Login')}
                    </button>
                </div>
            </div>
        );
    }

    // Dashboard View
    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">{t.myConnection || "My Connection"}</h2>
                    <p className="text-slate-500 font-bold">{t.consumerNo || "Service No"}: {username}</p>
                </div>
                <button onClick={() => setView('LOGIN')} className="bg-red-50 text-red-600 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition flex items-center gap-2">
                    <LogOut size={16} /> {t.logout || "Logout"}
                </button>
            </div>

            {/* Current Bill Status */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/10">
                            <AlertCircle size={12} className="text-amber-400" /> {t.paymentDue || "Payment Due"}
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t.totalOutstanding || "Total Outstanding"}</p>
                        <h3 className="text-6xl font-black tracking-tighter">₹2,450.00</h3>
                        <p className="text-slate-400 text-sm font-medium mt-4">{t.billingCycle || "Billing Cycle"}: Feb 2026 • {t.dueDate || "Due Date"}: 15 Feb</p>
                    </div>
                    <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition">
                        {t.payBillNow || "Pay Bill Now"}
                    </button>
                </div>
                {/* BG Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* History */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <History size={20} />
                        </div>
                        <h3 className="font-black text-xl text-slate-900">{t.recentTxns || "Recent Transactions"}</h3>
                    </div>
                    <div className="space-y-4">
                        {[
                            { date: 'Jan 10, 2026', amount: '₹1,200.00', status: 'Paid', id: 'TXN-9988' },
                            { date: 'Dec 12, 2025', amount: '₹1,150.00', status: 'Paid', id: 'TXN-8877' },
                            { date: 'Nov 14, 2025', amount: '₹1,300.00', status: 'Paid', id: 'TXN-7766' },
                        ].map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                <div>
                                    <p className="font-bold text-slate-900">{tx.amount}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tx.date}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-green-600 text-[10px] font-black uppercase bg-green-100 px-2 py-1 rounded-lg">
                                        {tx.status}
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">{tx.id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <button className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-400 transition text-left group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition">
                                <Download size={20} />
                            </div>
                            <ArrowRight size={20} className="text-slate-300 group-hover:text-green-600 transition" />
                        </div>
                        <h4 className="font-black text-slate-900">{t.downloadStmt || "Download Statement"}</h4>
                        <p className="text-xs text-slate-500 font-medium">{t.downloadStmtDesc || "Get detailed statement for last 6 months"}</p>
                    </button>

                    <button className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-400 transition text-left group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition">
                                <FileText size={20} />
                            </div>
                            <ArrowRight size={20} className="text-slate-300 group-hover:text-orange-600 transition" />
                        </div>
                        <h4 className="font-black text-slate-900">{t.consumptionAnalysis || "Consumption Analysis"}</h4>
                        <p className="text-xs text-slate-500 font-medium">{t.consumptionAnalysisDesc || "View graphs of your power usage"}</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsumerLogin;
