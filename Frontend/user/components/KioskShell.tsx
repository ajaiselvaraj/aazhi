import React, { useState, useEffect } from 'react';
import { Home, CreditCard, AlertTriangle, FileCheck, HelpCircle, LogOut, Wifi, WifiOff, Battery, BatteryCharging, Clock, Search, ShieldCheck, ArrowLeft } from 'lucide-react';
import { APP_CONFIG } from '../constants';
import cdacLogo from '../assets/cdac_logo.png';

import { Language } from '../types';
import { useTranslation } from 'react-i18next';

import KioskErrorBoundary from './KioskErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import { SystemService } from '../services/systemService';
import { useOrientation } from '../contexts/OrientationContext';
import OrientationToggle from './OrientationToggle';
import { AudioGuidanceButton } from './accessibility/AudioGuidanceButton';

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

const DynamicBatteryIcon = ({ level, isCharging }: { level: number | null, isCharging: boolean }) => {
    if (isCharging) {
        return <BatteryCharging size={18} className="text-green-500" />;
    }
    if (level === null) {
        return <Battery size={18} className="text-slate-400" />;
    }
    
    const isCritical = level <= 20;
    const colorClass = isCritical ? "text-red-500" : "text-slate-400 text-slate-500";
    const fillColorClass = isCritical ? "text-red-500" : "text-green-500";
    const fillWidth = (level / 100) * 14; 

    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={`lucide lucide-battery ${colorClass}`}
        >
            <rect width="16" height="10" x="2" y="7" rx="2" ry="2"/>
            <line x1="22" x2="22" y1="11" y2="13"/>
            <rect 
                width={fillWidth} 
                height="8" 
                x="3" 
                y="8" 
                rx="1" 
                ry="1" 
                fill="currentColor" 
                stroke="none"
                className={fillColorClass}
            />
        </svg>
    );
};

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
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
    const [isCharging, setIsCharging] = useState(false);
    const { isVertical, toggleOrientation } = useOrientation();
    const { t } = useTranslation();

    const translateAlertMessage = (alert: any) => {
        if (!alert || !alert.message) return '';
        return t(alert.message) || alert.message;
    };

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        let batteryMonitor: any;
        const updateBattery = () => {
            if (batteryMonitor) {
                setBatteryLevel(Math.round(batteryMonitor.level * 100));
                setIsCharging(batteryMonitor.charging);
            }
        };

        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((b: any) => {
                batteryMonitor = b;
                updateBattery();
                b.addEventListener('levelchange', updateBattery);
                b.addEventListener('chargingchange', updateBattery);
            });
        }

        return () => {
            if (batteryMonitor) {
                batteryMonitor.removeEventListener('levelchange', updateBattery);
                batteryMonitor.removeEventListener('chargingchange', updateBattery);
            }
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Security: Block Browser Hotkeys (F5, F12, Ctrl+R, etc.)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const blockedKeys = ['F5', 'F12'];
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            
            if (
                blockedKeys.includes(e.key) || 
                (isCtrlOrCmd && ['r', 'R', 'i', 'I', 'c', 'C', 'u', 'U'].includes(e.key))
            ) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);

    // Security: Hardware Tamper/Heartbeat Monitor
    useEffect(() => {
        // Send heartbeat every 5 minutes (300000ms) to avoid spamming the console
        const heartbeat = setInterval(() => {
            if (isOnline) {
                SystemService.sendHeartbeat({
                    terminalId: 'CBE-02',
                    batteryLevel,
                    isCharging,
                    timestamp: new Date().toISOString()
                });
            }
        }, 300000); 
        return () => clearInterval(heartbeat);
    }, [isOnline, batteryLevel, isCharging]);

    // Security: Aggressive Data Clearing on Logout
    const handleSecureLogout = async () => {
        // 1. Preserve non-PII settings
        const lang = localStorage.getItem('selectedLanguage');
        const appLang = localStorage.getItem('app_lang');

        // 2. Aggressively clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // 2.5 Aggressively clear all cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // 3. Restore non-PII settings
        if (lang) localStorage.setItem('selectedLanguage', lang);
        if (appLang) localStorage.setItem('app_lang', appLang);

        // 4. Update parent view state to Landing
        onLogout();

        // 5. Removed hard redirect to /logout as it causes 404 in state-based SPA.
    };

    // Security: Auto-logout when idle timer hits 0
    useEffect(() => {
        if (timer <= 0) {
            handleSecureLogout();
        }
    }, [timer]);

    const isElderlyMode = sessionStorage.getItem('elderlyMode') === 'true';

    const NAV_ITEMS = isElderlyMode ? [
        { id: 'elderly-back', label: t('back') || 'Back', icon: ArrowLeft },
        { id: 'billing', label: t('navPayBills') || 'Pay Bill', icon: CreditCard },
        { id: 'ai', label: t('getHelp') || t('navAssistant') || 'Get Help', icon: HelpCircle },
        { id: 'emergency', label: t('emergency') || 'Emergency', icon: AlertTriangle }
    ] : [
        { id: 'home', label: t('navHome') || 'Home', icon: Home },
        { id: 'billing', label: t('navPayBills') || 'Pay Bills', icon: CreditCard },
        { id: 'complaints', label: t('navComplaints') || 'Complaints', icon: AlertTriangle },
        { id: 'tracker', label: t('trackApp'), icon: Search },
        { id: 'status', label: t('navHistory') || 'History', icon: FileCheck },
        { id: 'ai', label: t('navAssistant') || 'Assistant', icon: HelpCircle },
        { id: 'integrity', label: t('civicIntegrity') || 'Civic Integrity', icon: ShieldCheck },
    ];

    return (
        <div 
            className={`kiosk-main-layout flex h-full w-full overflow-hidden bg-slate-50 font-sans select-none ${isVertical ? 'flex-col-reverse vertical-mode' : 'flex-row horizontal-mode'} ${isElderlyMode ? 'elderly-mode-active' : ''}`}
            onContextMenu={(e) => { if (process.env.NODE_ENV === 'production') e.preventDefault(); }}
            onDragStart={(e) => e.preventDefault()}
            style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        >

            {/* 
        REGION 1: PERMANENT SIDEBAR / BOTTOM BAR 
        - Always visible
        - Large touch targets (min 80px)
        - High contrast active states
        - Anchored to left (horizontal) or bottom (vertical)
      */}
            <nav className={`${isVertical ? 'h-32 w-full border-t flex-row overflow-hidden pb-safe' : 'w-28 md:w-32 flex-col border-r'} bg-white flex border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 shrink-0 print:hidden`}>

                {/* Brand Trigger */}
                <div className={`${isVertical ? 'w-32 border-r h-full' : 'h-28 border-b'} flex flex-col items-center justify-center border-slate-100 p-2 shrink-0`}>
                    <div className="w-12 h-12 bg-white border-2 border-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-1">
                        <span className="text-blue-600 font-black text-xl">A</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">AAZHI</span>
                </div>

                {/* Primary Navigation */}
                <div className={`flex-1 flex ${isVertical ? 'flex-row justify-around w-full px-2' : 'flex-col overflow-y-auto py-4 gap-6 justify-center'} items-center no-scrollbar`}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <motion.button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`
                  relative group flex flex-col items-center justify-center ${isVertical ? 'w-24 h-24 min-w-[6rem] shrink-0' : 'w-24 h-24'} rounded-2xl transition-colors duration-300
                  ${isActive
                                        ? 'bg-white text-blue-600 border-2 border-blue-600 shadow-xl shadow-blue-200 z-10'
                                        : 'text-slate-400 hover:bg-slate-50 border-2 border-transparent'
                                    }
                `}
                            >
                                <div className={`
                    mb-1 transition-transform duration-300
                    ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                `}>
                                    <item.icon size={isActive ? (isVertical ? 28 : 32) : (isVertical ? 24 : 28)} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`
                  text-[9px] font-black uppercase tracking-wider text-center
                  ${isActive ? 'opacity-100' : 'opacity-70'}
                `}>
                                    {item.label}
                                </span>

                                {isActive && (
                                    <motion.div layoutId="activeTabIndicator" className={`absolute ${isVertical ? 'bottom-[2px] left-4 right-4 h-1' : 'left-[3px] top-2 bottom-2 w-1'} bg-blue-600 rounded-full`}></motion.div>
                                )}
                            </motion.button>
                        )
                    })}
                </div>

                {/* Emergency / Logout - Bottom or Right */}
                <div className={`p-3 ${isVertical ? 'border-l w-32 h-full flex items-center justify-center' : 'border-t'} border-slate-100 shrink-0`}>
                    <button
                        onClick={handleSecureLogout}
                        className={`w-full ${isVertical ? 'h-full aspect-auto' : 'aspect-square'} rounded-2xl bg-red-50 text-red-500 flex flex-col items-center justify-center gap-1 hover:bg-red-500 hover:text-white transition-colors duration-300`}
                    >
                        <LogOut size={isVertical ? 24 : 24} />
                        <span className="text-[10px] font-black uppercase">{t('navExit') || 'Exit'}</span>
                    </button>
                </div>
            </nav>

            {/* 
        REGION 2: MAIN VIEWPORT
        - Flex-1 to fill remaining space
        - Flex column for Header + Content
      */}
            <main className="flex-1 flex-col h-full bg-[#f8f9fc] relative overflow-hidden flex">

                {/* Kiosk Header Board */}
                <header className={`${isVertical ? 'h-auto py-5 px-6 flex-col gap-5' : 'h-24 px-8 flex-row'} flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/50 shrink-0 print:hidden transition-all duration-300`}>
                    <div className={`${isVertical ? 'w-full flex justify-between items-start' : ''}`}>
                        <div>
                            <h1 className={`${isVertical ? 'text-3xl' : 'text-2xl'} font-black text-slate-800 tracking-tight flex items-center gap-3 transition-all duration-300`}>
                                {activeTab === 'home' ? t('welcomeCitizen') || 'Welcome, Citizen' : NAV_ITEMS.find(n => n.id === activeTab)?.label}
                            </h1>
                            <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-2">
                                <span>{t('loginSubtitle')}</span>
                            </div>
                        </div>

                        {isVertical && (
                            <div className="flex items-center">
                                <img src={cdacLogo} alt="CDAC Logo" style={{ height: '48px' }} className="w-auto object-contain" />
                            </div>
                        )}
                    </div>

                    <div className={`flex items-center ${isVertical ? 'w-full justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200' : 'gap-6'}`}>

                        {/* System Status Indicators */}
                        <div className={`flex items-center gap-4 ${isVertical ? '' : 'pl-6 border-l border-slate-200'}`}>
                            <div className="text-right">
                                <p className={`${isVertical ? 'text-2xl' : 'text-xl'} font-black text-slate-900 leading-none`}>
                                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex gap-2 text-slate-300 items-center">
                                {isOnline ? (
                                    <Wifi size={isVertical ? 24 : 18} className="text-green-500" />
                                ) : (
                                    <WifiOff size={isVertical ? 24 : 18} className="text-red-500" />
                                )}
                                <div className="flex items-center transform scale-125">
                                    <DynamicBatteryIcon level={batteryLevel} isCharging={isCharging} />
                                </div>
                            </div>
                        </div>

                            {/* Session Timer & Privacy Shield */}
                            <div className={`flex items-center gap-4 ${isVertical ? '' : 'pl-6 border-l border-slate-200'}`}>
                                <div id="voice-button-target"></div>
                                {/* Timer */}
                                <div className={`flex items-center gap-2 px-4 py-3 bg-white shadow-sm border border-slate-200 rounded-xl`}>
                                    <Clock size={isVertical ? 20 : 16} className={timer < 30 ? 'text-red-500 animate-pulse' : 'text-slate-500'} />
                                    <span className={`${isVertical ? 'text-lg' : 'text-sm'} font-black ${timer < 30 ? 'text-red-600' : 'text-slate-900'}`}>
                                        {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
                                    </span>
                                </div>

                                {/* Audio Guidance Button */}
                                <div className={`${isVertical ? 'scale-110' : ''}`}>
                                    <AudioGuidanceButton text={t(`guidance_${activeTab}`) || t('guidance_default') || "Welcome. Please follow the instructions on the screen."} className="w-12 h-12 shadow-sm" />
                                </div>

                                {/* Orientation Toggle */}
                                <div className={`${isVertical ? 'scale-110 origin-right' : ''}`}>
                                    <OrientationToggle variant="icon" />
                                </div>

                                {/* CDAC Logo Section (Horizontal Only) */}
                                {!isVertical && (
                                    <div className="flex items-center pl-6 border-l border-slate-200">
                                        <img src={cdacLogo} alt="CDAC Logo" style={{ height: '40px' }} className="w-auto object-contain" />
                                    </div>
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={activeTab}
                            initial={{ opacity: 0, y: 15, scale: 0.98, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -15, scale: 0.98, filter: "blur(4px)" }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-6 md:p-8"
                        >
                            <KioskErrorBoundary>
                                {children}
                            </KioskErrorBoundary>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* City Alert Ticker - Fixed Bottom Overlay */}
                {alerts.length > 0 && (
                    <div className="absolute bottom-0 w-full bg-slate-900 text-white py-2 px-6 flex items-center justify-between text-xs font-bold z-50 print:hidden">
                        <div className="flex items-center gap-2 text-yellow-400 shrink-0">
                            <AlertTriangle size={14} />
                            <span className="uppercase tracking-widest">{t('cityAlert') || "City Alert"}</span>
                        </div>
                        <div className="flex-1 mx-4 overflow-hidden relative" style={{ height: '20px' }}>
                            <div 
                                className="whitespace-nowrap absolute whitespace-nowrap"
                                style={{ 
                                    animation: `marquee ${Math.max(20, alerts.map(a => translateAlertMessage(a)).join('  •  ').length * 0.15)}s linear infinite` 
                                }}
                            >
                                {alerts.map(a => translateAlertMessage(a)).join('  •  ')}
                            </div>
                        </div>
                    </div>

                )}
            </main>

            {/* Security: Full Screen Network Disconnect Overlay */}
            {!isOnline && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white select-none">
                    <WifiOff size={100} className="text-red-500 mb-8 animate-pulse" />
                    <h1 className="text-5xl font-black mb-4 uppercase tracking-wider">{t('offlineTitle') || 'Terminal Offline'}</h1>
                    <p className="text-2xl text-slate-300 max-w-2xl text-center mb-8">
                        {t('offlineDesc') || 'Network connection has been lost. The system will automatically resume when the connection is restored.'}
                    </p>
                    <div className="flex items-center gap-3 text-slate-400">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                        <span className="text-lg font-bold tracking-widest uppercase">{t('offlineWait') || 'Waiting for connection...'}</span>
                    </div>
                </div>
            )}

            <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes marquee {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }

      `}</style>
        </div>
    );
};

export default KioskShell;
