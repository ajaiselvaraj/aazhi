import React, { useEffect, useState } from 'react';
import { Phone, MapPin, AlertCircle, Info, Calendar, ShieldAlert, Zap, Droplets, HeartPulse, Building2, Flame, HelpCircle } from 'lucide-react';
import LiveAlertsPanel from './LiveAlertsPanel';
import DisruptionMap from './disruption/DisruptionMap';
import { CityAlert, Language } from '../../types';
import { LocalityService } from '../../services/civicService';
import { MOCK_USER_PROFILE } from '../../constants';
import { useTranslation } from 'react-i18next';
import { motion, Variants } from 'framer-motion';
import { useOrientation } from '../../contexts/OrientationContext';
import { dynamicTranslationService } from '../../services/dynamicTranslationService';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface Props {
    alerts: CityAlert[];
    onNavigate: (tab: string) => void;
    userName?: string;
    language: Language;
}

export const IMPORTANT_CONTACTS = [
    { name: "Ambulance", number: "108", icon: HeartPulse, color: "text-red-500", bg: "bg-red-50" },
    { name: "Police", number: "100", icon: ShieldAlert, color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Fire Department", number: "101", icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
    { name: "Women Helpline", number: "1091", icon: Phone, color: "text-pink-500", bg: "bg-pink-50" },
    { name: "Child Helpline", number: "1098", icon: Phone, color: "text-purple-500", bg: "bg-purple-50" },
    { name: "Municipal Support", number: "1913", icon: Building2, color: "text-indigo-500", bg: "bg-indigo-50" },
];

// PUBLIC_NOTICES removed: we now fetch dynamically from the backend

const DashboardHome: React.FC<Props> = React.memo(({ alerts, onNavigate, userName = "Citizen", language }) => {
    const wardContacts = LocalityService.getSupportContacts(MOCK_USER_PROFILE.ward);
    const { t } = useTranslation();
    const { isVertical } = useOrientation();

    // Use dynamically translated alerts
    const [translatedAlerts, setTranslatedAlerts] = useState<(CityAlert & { translatedTitle?: string, translatedDesc?: string })[]>([]);
    
    // Notice Board States
    const [activeNoticeTab, setActiveNoticeTab] = useState<string>('All');
    const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

    const localNotices = React.useMemo(() => {
        return (alerts as any[]).filter(a => a.is_notice).map(n => ({
            id: n.id,
            title: n.title,
            category: n.type || 'Notice',
            message: n.message || 'No additional details provided.',
            date: n.start_date ? new Date(n.start_date).toLocaleDateString() : 'Active',
            priority: n.priority || 3,
            expires_at: n.expires_at || null,
            start_date: n.start_date || null
        }));
    }, [alerts]);

    const getExpiryText = (expiresAt: string | null) => {
        if (!expiresAt) return { text: "No expiry", color: "text-slate-500" };
        const now = new Date();
        const exp = new Date(expiresAt);
        const diffTime = exp.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { text: "Expired", color: "text-red-500 font-bold" };
        if (diffDays === 0) return { text: "Expires today", color: "text-orange-500 font-bold" };
        if (diffDays === 1) return { text: "Expires tomorrow", color: "text-orange-500 font-bold" };
        if (diffDays <= 3) return { text: `${diffDays} days remaining`, color: "text-orange-500 font-bold" };
        return { text: `Expires ${exp.toLocaleDateString()}`, color: "text-slate-500" };
    };

    const getPriorityBadge = (priority: number) => {
        if (priority === 1) return { label: "High Priority", dot: "🔴", color: "text-red-700 bg-red-100" };
        if (priority === 2) return { label: "Medium Priority", dot: "🟡", color: "text-orange-700 bg-orange-100" };
        return { label: "General Notice", dot: "🟢", color: "text-emerald-700 bg-emerald-100" };
    };

    const getContactInfo = (category: string) => {
        switch(category) {
            case 'Tax': return 'Municipal Tax Office: 1800-TAX-HELP';
            case 'Health': return 'Health Department: 104';
            case 'Jobs': return 'Employment Cell: 1800-JOBS';
            default: return 'General Municipal Support: 1913';
        }
    };

    const filteredNotices = React.useMemo(() => {
        if (activeNoticeTab === 'All') return localNotices;
        return localNotices.filter(n => n.category === activeNoticeTab);
    }, [localNotices, activeNoticeTab]);

    useEffect(() => {
        let isMounted = true;
        
        const translateAlerts = async () => {
            if (!alerts || alerts.length === 0) {
                if (isMounted) setTranslatedAlerts([]);
                return;
            }

            const promises = alerts.map(async (alert) => {
                if (language === Language.ENGLISH) {
                    return { ...alert, translatedTitle: alert.title, translatedDesc: alert.message };
                }
                const translatedTitle = await dynamicTranslationService.translate(alert.title || 'Civic Alert', language);
                const translatedDesc = await dynamicTranslationService.translate(alert.message, language);
                return { ...alert, translatedTitle, translatedDesc };
            });

            const translated = await Promise.all(promises);
            if (isMounted) {
                setTranslatedAlerts(translated);
            }
        };

        translateAlerts();

        return () => { isMounted = false; };
    }, [alerts, language]);

    const greetingSection = (
        <motion.div variants={itemVariants} className={`flex ${isVertical ? 'flex-col gap-3' : 'justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100'}`}>
            <div>
                <h2 className={`${isVertical ? 'text-3xl' : 'text-3xl'} font-black text-slate-900 tracking-tight`}>
                    {t('welcomeCitizen')} <span className="privacy-sensitive">{userName === 'Citizen' ? '' : userName}</span>
                </h2>
                <p className="text-slate-500 font-medium mt-1">Digital Public Information Center</p>
            </div>

            {/* Ward Support Widget */}
            {wardContacts.length > 0 && (
                <div className={`bg-slate-50 px-6 py-4 rounded-[1.5rem] flex items-center gap-4 ${isVertical ? 'w-full justify-between' : 'border border-slate-200'}`}>
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Phone size={24} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('wardsupport')} • Ward {MOCK_USER_PROFILE.ward}</p>
                        <p className="font-black text-lg text-slate-900">{wardContacts[0].phone}</p>
                    </div>
                </div>
            )}
        </motion.div>
    );

    const alertsCenterSection = (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <AlertCircle className="text-red-500" size={24} />
                        Local Alerts & Information
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Locality-specific announcements</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Active Alerts</span>
                </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                    {translatedAlerts.filter(a => !(a as any).is_notice && (a.severity === 'Alert' || a.severity === 'Critical' || a.severity === 'Warning' || a.severity === 'Info')).map((alert, idx) => (
                        <div key={alert.id || idx} className={`p-4 rounded-[1.5rem] border ${alert.priority === 1 ? 'bg-red-50 border-red-100' : alert.priority === 2 ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'} flex gap-4 items-start`}>
                            <div className={`p-3 rounded-xl ${alert.priority === 1 ? 'bg-red-100 text-red-600' : alert.priority === 2 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                {alert.type === 'Water' ? <Droplets size={20} /> : alert.type === 'Power' ? <Zap size={20} /> : <Info size={20} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${alert.priority === 1 ? 'bg-red-200 text-red-800' : alert.priority === 2 ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
                                        {alert.type || 'Alert'}
                                    </span>
                                </div>
                                <h4 className={`font-bold text-[15px] ${alert.priority === 1 ? 'text-red-900' : alert.priority === 2 ? 'text-orange-900' : 'text-blue-900'}`}>{alert.translatedTitle}</h4>
                                <p className="text-sm mt-1 opacity-80 font-medium">{alert.translatedDesc}</p>
                            </div>
                        </div>
                    ))}
                    {translatedAlerts.length === 0 && (
                        <div className="text-center p-6 text-slate-500">No active alerts.</div>
                    )}
                </div>
            </div>
        </div>
    );

    const publicNoticeBoardSection = (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Calendar className="text-indigo-500" size={24} />
                        Public Notice Board
                    </h3>
                </div>
                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                    {['All', 'Tax', 'Health', 'Jobs', 'Event'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveNoticeTab(tab)}
                            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-colors ${activeNoticeTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-3">
                    {filteredNotices.map((notice, idx) => {
                        const priorityData = getPriorityBadge(notice.priority);
                        const expiryData = getExpiryText(notice.expires_at);
                        return (
                            <div key={idx} className="p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col justify-between group hover:border-indigo-200 transition gap-2">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${priorityData.color}`}>
                                                {priorityData.dot} {priorityData.label}
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                {notice.category}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-[15px] leading-tight mb-1">{notice.title}</h4>
                                    </div>
                                    <button onClick={() => setSelectedNotice(notice)} className="shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 shadow-sm transition hover:scale-110">
                                        <Info size={16} />
                                    </button>
                                </div>
                                <div className="flex justify-between items-center text-xs mt-1 border-t border-slate-200/60 pt-2">
                                    <span className="text-slate-500 font-medium">Published: {notice.date}</span>
                                    <span className={expiryData.color}>{expiryData.text}</span>
                                </div>
                            </div>
                        )
                    })}
                    {filteredNotices.length === 0 && (
                        <div className="text-center p-6 text-slate-500">No public notices available.</div>
                    )}
                </div>
            </div>
        </div>
    );

    const importantContactsSection = (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Phone className="text-emerald-500" size={24} />
                    Important Contacts
                </h3>
            </div>
            <div className="p-6">
                <div className={`grid ${isVertical ? 'grid-cols-2' : 'grid-cols-3 xl:grid-cols-6'} gap-4`}>
                    {IMPORTANT_CONTACTS.map((contact, idx) => {
                        const Icon = contact.icon;
                        return (
                            <div key={idx} className={`${contact.bg} p-4 rounded-2xl border border-white/50 flex flex-col items-center text-center justify-center gap-2 transition hover:shadow-md`}>
                                <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm ${contact.color}`}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">{contact.name}</p>
                                    <p className={`font-black text-xl ${contact.color}`}>{contact.number}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6 pb-10 px-4 pt-4">
            {/* Section 1: Welcome & Support */}
            {greetingSection}

            {/* Section 2: Expanded Live City Map */}
            <motion.div variants={itemVariants} className="w-full">
                <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100">
                    <div className="mb-4 px-4 flex justify-between items-end">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                <MapPin className="text-blue-500" size={28} />
                                Live City Map
                            </h3>
                            <p className="text-slate-500 text-sm font-medium mt-1">Locality awareness & city-wide visibility</p>
                        </div>
                    </div>
                    {/* DisruptionMap handles its own container size natively, but we give it a wrapper */}
                    <div className="w-full h-[400px] lg:h-[500px] rounded-[2rem] overflow-hidden">
                        <DisruptionMap alerts={alerts} language={language} />
                    </div>
                </div>
            </motion.div>

            {/* Middle Row: Alerts & Notices */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                {/* Section 3: Local Alerts */}
                <div className="h-full">
                    {alertsCenterSection}
                </div>

                {/* Section 4: Public Notice Board */}
                <div className="h-full">
                    {publicNoticeBoardSection}
                </div>
            </motion.div>

            {/* Section 5: Important Contacts */}
            <motion.div variants={itemVariants} className="w-full">
                {importantContactsSection}
            </motion.div>

            {/* Modal Overlay for Notice Details */}
            {selectedNotice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${getPriorityBadge(selectedNotice.priority).color}`}>
                                        {getPriorityBadge(selectedNotice.priority).dot} {getPriorityBadge(selectedNotice.priority).label}
                                    </span>
                                    <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                        {selectedNotice.category}
                                    </span>
                                </div>
                                <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedNotice.title}</h2>
                            </div>
                            <button onClick={() => setSelectedNotice(null)} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition shadow-sm font-black shrink-0">✕</button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                            <div>
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><HelpCircle size={14}/> What is it?</h3>
                                <p className="text-slate-700 text-[15px] font-medium leading-relaxed">{selectedNotice.message}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><Building2 size={14}/> Who should care?</h3>
                                <p className="text-slate-700 text-sm font-medium">All Citizens / Residents</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><Calendar size={14}/> When does it end?</h3>
                                <p className="text-slate-700 text-sm font-medium">{selectedNotice.expires_at ? new Date(selectedNotice.expires_at).toLocaleDateString() : 'No specified end date'}</p>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest mb-1 flex items-center gap-2"><Phone size={14}/> Where to get help?</h3>
                                <p className="text-indigo-900 font-bold">{getContactInfo(selectedNotice.category)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
});

export default DashboardHome;
