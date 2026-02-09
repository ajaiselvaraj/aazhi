import React, { useState, useEffect } from 'react';
import { Home, LayoutGrid, CreditCard, AlertTriangle, FileCheck, HelpCircle, LogOut, Volume2, Type, Wifi, Battery, Clock, Shield, EyeOff } from 'lucide-react';
import { APP_CONFIG, TRANSLATIONS } from '../constants';
import { Language } from '../types';

interface KioskShellProps {
    children: React.ReactNode;
    activeTab: string;
    onNavigate: (tab: string) => void;
    onLogout: () => void;
    userName?: string;
    alerts?: any[];
    language: Language;
    timer?: number;
    isPrivacyShield?: boolean;
    onTogglePrivacy?: () => void;
}

/**
 * KIOSK SHELL COMPONENT
 * 
 * Replaces the traditional website layout with a rigid, full-viewport 
 * command center interface designed for large touch screens.
 */
const KioskShell: React.FC<KioskShellProps> = ({
    children,
    activeTab,
    onNavigate,
    onLogout,
    userName = "Citizen",
    alerts = [],
    language,
    timer = 120, // Default to avoid crash if not passed
    isPrivacyShield = false,
    onTogglePrivacy
}) => {
    const [time, setTime] = useState(new Date());
    const t = TRANSLATIONS[language];

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const NAV_ITEMS = [
        { id: 'home', label: t.navHome || 'Home', icon: Home },
        { id: 'services', label: t.navServices || 'Services', icon: LayoutGrid },
        { id: 'billing', label: t.navPayBills || 'Pay Bills', icon: CreditCard },
        { id: 'complaints', label: t.navHelp || 'Help', icon: AlertTriangle },
        { id: 'status', label: t.navHistory || 'History', icon: FileCheck },
        { id: 'ai', label: t.navAssistant || 'Assistant', icon: HelpCircle },
    ];

    return (
        <div className="flex h-full w-full overflow-hidden bg-slate-50 selection:bg-blue-100 font-sans">

            {/* 
        REGION 1: PERMANENT SIDEBAR 
        - Always visible
        - Large touch targets (min 80px)
        - High contrast active states
        - Anchored to left (closest to user entry point)
      */}
            <nav className="w-28 md:w-32 bg-white flex flex-col border-r border-slate-200 shadow-2xl z-50 shrink-0 print:hidden">

                {/* Brand Trigger - Top Left */}
                <div className="h-28 flex flex-col items-center justify-center border-b border-slate-100 p-2">
                    <div className="w-14 h-14 bg-white border-2 border-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-2">
                        <span className="text-blue-600 font-black text-2xl">A</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">AAZHI</span>
                </div>

                {/* Primary Navigation - Centered Vertical Stack */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4 overflow-y-auto no-scrollbar">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={`
                  relative group flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all duration-300
                  ${isActive
                                        ? 'bg-white text-blue-600 border-2 border-blue-600 shadow-xl shadow-blue-200 scale-110 z-10'
                                        : 'text-slate-400 hover:bg-slate-50 active:scale-95'
                                    }
                `}
                            >
                                <div className={`
                    mb-2 transition-transform duration-300
                    ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                `}>
                                    <item.icon size={isActive ? 32 : 28} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`
                  text-[10px] font-black uppercase tracking-wider
                  ${isActive ? 'opacity-100' : 'opacity-70'}
                `}>
                                    {item.label}
                                </span>

                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-600 rounded-r-full"></div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Emergency / Logout - Bottom */}
                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={onLogout}
                        className="w-full aspect-square rounded-2xl bg-red-50 text-red-500 flex flex-col items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition-colors duration-300"
                    >
                        <LogOut size={24} />
                        <span className="text-[9px] font-black uppercase">{t.navExit || 'Exit'}</span>
                    </button>
                </div>
            </nav>

            {/* 
        REGION 2: MAIN VIEWPORT
        - Flex-1 to fill remaining space
        - Flex column for Header + Content
      */}
            <main className="flex-1 flex flex-col h-full bg-[#f8f9fc] relative overflow-hidden">

                {/* Kiosk Header Board - Information Only (Not Nav) */}
                <header className="h-24 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/50 shrink-0 print:hidden">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            {activeTab === 'home' ? `${t.welcomeUser || 'Welcome'}, ${userName}` : NAV_ITEMS.find(n => n.id === activeTab)?.label}
                        </h1>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide">
                                {t.terminalId || 'Terminal ID'}: CBE-02
                            </span>
                            <span>•</span>
                            <span>{APP_CONFIG.SUBTITLE}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Accessibility Quick Toggles */}
                        <div className="hidden xl:flex bg-slate-100 p-1 rounded-xl">
                            <button className="p-3 text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-lg transition"><Volume2 size={20} /></button>
                            <button className="p-3 text-slate-400 hover:bg-white hover:text-blue-600 hover:shadow-sm rounded-lg transition"><Type size={20} /></button>
                        </div>

                        {/* System Status Indicators - Time Moved Left */}
                        <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
                            <div className="text-right">
                                <p className="text-xl font-black text-slate-900 leading-none">
                                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex gap-2 text-slate-300">
                                <Wifi size={18} className="text-green-500" />
                                <Battery size={18} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Session Timer & Privacy Shield - Moved to Right Corner */}
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                            {/* Timer */}
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                                <Clock size={16} className={timer < 30 ? 'text-red-500 animate-pulse' : 'text-slate-500'} />
                                <span className={`text-sm font-black ${timer < 30 ? 'text-red-600' : 'text-slate-900'}`}>
                                    {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                                </span>
                            </div>

                            {/* Privacy Shield Toggle */}
                            {onTogglePrivacy && (
                                <button
                                    onClick={onTogglePrivacy}
                                    className={`p-3 rounded-xl transition-all shadow-sm ${isPrivacyShield ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}`}
                                    title={t?.privacyShield || "Privacy Shield"}
                                >
                                    {isPrivacyShield ? <Shield size={20} /> : <EyeOff size={20} />}
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* 
           REGION 3: DYNAMIC CONTENT AREA 
           - Uses 100% of remaining height
           - Own scrolling container
           - No padding constraints (handled by children or internal wrapper)
        */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative p-6 md:p-8 w-full">
                    {/* Content Wrapper for breathability */}
                    <div className="h-full w-full max-w-[1920px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </div>

                {/* City Alert Ticker - Fixed Bottom Overlay */}
                {alerts.length > 0 && (
                    <div className="absolute bottom-0 w-full bg-slate-900 text-white py-2 px-6 flex items-center justify-between text-xs font-bold z-50 print:hidden">
                        <div className="flex items-center gap-2 text-yellow-400 shrink-0">
                            <AlertTriangle size={14} />
                            <span className="uppercase tracking-widest">{t.cityAlert || "City Alert"}</span>
                        </div>
                        <div className="flex-1 mx-4 overflow-hidden">
                            <div className="whitespace-nowrap animate-marquee">
                                {alerts.map(a => {
                                    const alertKey = `alert_${a.id}` as keyof typeof t;
                                    return t[alertKey] || a.message;
                                }).join('  •  ')}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes marquee {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-marquee { display: inline-block; animation: marquee 20s linear infinite; }
      `}</style>
        </div>
    );
};

export default KioskShell;
