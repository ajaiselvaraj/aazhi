import React from 'react';
import { LayoutGrid, CreditCard, ArrowRight, User, FileText, Smartphone, Phone, MapPin, AlertCircle, Users, Briefcase } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import LiveAlertsPanel from './LiveAlertsPanel'; // ⭐ ADD-ON: live backend feed with fallback
import ConsumptionAnalytics from './ConsumptionAnalytics';
import DisruptionMap from './disruption/DisruptionMap';
import LiveMetricsOverlay from './disruption/LiveMetricsOverlay';
import { mockIncidents } from './disruption/mockIncidentData';
import { CityAlert, Language } from '../../types';
import { LocalityService } from '../../services/civicService';
import { MOCK_USER_PROFILE } from '../../constants';
import { useTranslation } from 'react-i18next';
import { motion, Variants } from 'framer-motion';
import { useOrientation } from '../../contexts/OrientationContext';

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

const DashboardHome: React.FC<Props> = ({ alerts, onNavigate, userName = "Citizen", language }) => {
    const wardContacts = LocalityService.getSupportContacts(MOCK_USER_PROFILE.ward);
    const { t } = useTranslation();
    const { isVertical } = useOrientation();

    const activeIncidentsCount = mockIncidents.filter((i) => i.status !== 'Resolved').length;

    const greetingSection = (
        <motion.div variants={itemVariants} className={`flex ${isVertical ? 'flex-col gap-3' : 'justify-between items-end'}`}>
            <div>
                <h2 className={`${isVertical ? 'text-3xl' : 'text-4xl'} font-black text-slate-900 tracking-tight mb-2`}>{t('welcomeCitizen')} <span className="privacy-sensitive">{userName === 'Citizen' ? '' : userName}</span></h2>
                <div className="flex gap-2">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1">
                        <Smartphone size={12} /> {t('eKycVerified')}
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1">
                        <User size={12} /> {t('aadhaar')}: •••• 9821
                    </span>
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1">
                        <MapPin size={12} /> {t('ward')} {MOCK_USER_PROFILE.ward}
                    </span>
                </div>
            </div>

            {/* Ward Support Widget */}
            {wardContacts.length > 0 && (
                <div className={`bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 ${isVertical ? 'w-full justify-between' : ''}`}>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('wardsupport')}</p>
                        <p className="font-bold text-slate-900">{wardContacts[0].phone}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center animate-pulse">
                        <Phone size={20} />
                    </div>
                </div>
            )}
        </motion.div>
    );

    const alertsSection = (
        <LiveAlertsPanel staticAlerts={alerts} language={language} />
    );

    const quickActionsSection = (
        <div className={`${isVertical ? 'flex flex-col gap-4' : 'grid grid-cols-3 gap-4 h-full'}`}>
            <motion.button
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('services')}
                className={`group bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl shadow-blue-200 hover:bg-blue-700 transition relative overflow-hidden text-left ${isVertical ? 'h-[130px] p-5 rounded-[1.8rem]' : 'h-full'}`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition duration-500">
                    <LayoutGrid size={isVertical ? 100 : 100} />
                </div>
                <div className={`relative z-10 flex ${isVertical ? 'flex-row items-center gap-4 h-full' : 'flex-col h-full justify-between'}`}>
                    <div className={`w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center ${isVertical ? 'w-12 h-12 shrink-0' : 'mb-4'}`}>
                        <LayoutGrid size={isVertical ? 24 : 32} />
                    </div>
                    <div className={`${isVertical ? 'flex-1 text-left' : ''}`}>
                        <h3 className={`${isVertical ? 'text-xl' : 'text-2xl'} font-black mb-1`}>{t('newRequest')}</h3>
                        <p className={`opacity-80 font-medium ${isVertical ? 'text-xs mb-0' : 'text-xs mb-3'}`}>{t('newRequestDesc')}</p>
                        {!isVertical && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-3 py-2 rounded-lg mt-3">
                                {t('start')} <ArrowRight size={12} />
                            </div>
                        )}
                    </div>
                    {isVertical && (
                        <div className="shrink-0 w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-colors">
                            <ArrowRight size={20} />
                        </div>
                    )}
                </div>
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('billing')}
                className={`group bg-white text-slate-900 border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-2xl transition relative overflow-hidden text-left ${isVertical ? 'h-[130px] p-5 rounded-[1.8rem]' : 'h-full'}`}
            >
                <div className="absolute top-0 right-0 p-4 text-slate-100 group-hover:text-slate-50 transition duration-500">
                    <CreditCard size={isVertical ? 100 : 100} />
                </div>
                <div className={`relative z-10 flex ${isVertical ? 'flex-row items-center gap-4 h-full' : 'flex-col h-full justify-between'}`}>
                    <div className={`w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 ${isVertical ? 'w-12 h-12 shrink-0' : 'mb-4'}`}>
                        <CreditCard size={isVertical ? 24 : 32} />
                    </div>
                    <div className={`${isVertical ? 'flex-1 text-left' : ''}`}>
                        <h3 className={`${isVertical ? 'text-xl' : 'text-2xl'} font-black mb-1`}>{t('payBills') || "Pay Bills"}</h3>
                        <p className={`text-slate-500 font-medium ${isVertical ? 'text-xs mb-0' : 'text-[10px] mb-4'}`}>{t('payBillsDesc') || "Utility bills"}</p>
                        {!isVertical && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 w-fit px-3 py-2 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition mt-3">
                                {t('pay') || "Pay"} <ArrowRight size={12} />
                            </div>
                        )}
                    </div>
                    {isVertical && (
                        <div className="shrink-0 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            <ArrowRight size={20} />
                        </div>
                    )}
                </div>
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('complaints')}
                className={`group bg-red-50 text-red-900 border border-red-100 p-6 rounded-[2rem] shadow-sm hover:shadow-2xl hover:bg-red-600 hover:text-white transition relative overflow-hidden text-left ${isVertical ? 'h-[130px] p-5 rounded-[1.8rem]' : 'h-full'}`}
            >
                <div className="absolute top-0 right-0 p-4 text-red-100 group-hover:text-red-500 transition duration-500">
                    <AlertCircle size={isVertical ? 100 : 100} />
                </div>
                <div className={`relative z-10 flex ${isVertical ? 'flex-row items-center gap-4 h-full' : 'flex-col h-full justify-between'}`}>
                    <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-sm ${isVertical ? 'w-12 h-12 shrink-0' : 'mb-4'}`}>
                        <AlertCircle size={isVertical ? 24 : 32} />
                    </div>
                    <div className={`${isVertical ? 'flex-1 text-left' : ''}`}>
                        <h3 className={`${isVertical ? 'text-xl' : 'text-2xl'} font-black mb-1`}>{t('reportIssue') || "Report Issue"}</h3>
                        <p className={`opacity-80 font-medium ${isVertical ? 'text-xs mb-0' : 'text-[10px] mb-4'}`}>{t('reportIssueDesc')}</p>
                        {!isVertical && (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/50 text-red-700 w-fit px-3 py-2 rounded-lg group-hover:bg-red-800 group-hover:text-white transition mt-3">
                                {t('reportIssue')} <ArrowRight size={12} />
                            </div>
                        )}
                    </div>
                    {isVertical && (
                        <div className="shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 group-hover:text-red-600 transition-colors">
                            <ArrowRight size={20} />
                        </div>
                    )}
                </div>
            </motion.button>
        </div>
    );

    const bottomLinksSection = (
        <div className={`grid ${isVertical ? 'grid-cols-1 gap-4' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
            <button onClick={() => onNavigate('emergency')} className={`bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-xl hover:border-red-200 transition group ${isVertical ? 'h-[80px] p-4 rounded-2xl' : ''}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition shadow-sm ${isVertical ? 'w-12 h-12 rounded-xl' : ''}`}>
                        <AlertCircle size={isVertical ? 24 : 32} />
                    </div>
                    <div className="text-left">
                        <h4 className={`font-black text-slate-800 ${isVertical ? 'text-lg' : 'text-2xl'} mb-0.5 flex items-center gap-2`}>{t('sosHelp')} <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div></h4>
                        <p className="opacity-80 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">{t('fireRescue')}</p>
                    </div>
                </div>
                <ArrowRight size={isVertical ? 20 : 28} className="text-slate-300 group-hover:text-red-500 group-hover:translate-x-1 transition" />
            </button>

            <button onClick={() => onNavigate('participation')} className={`bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-xl hover:border-indigo-200 transition group ${isVertical ? 'h-[80px] p-4 rounded-2xl' : ''}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition shadow-sm ${isVertical ? 'w-12 h-12 rounded-xl' : ''}`}>
                        <Users size={isVertical ? 24 : 32} />
                    </div>
                    <div className="text-left">
                        <h4 className={`font-black text-slate-800 ${isVertical ? 'text-lg' : 'text-2xl'} mb-0.5`}>{t('governance')}</h4>
                        <p className="opacity-80 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">{t('voteMeetings')}</p>
                    </div>
                </div>
                <ArrowRight size={isVertical ? 20 : 28} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition" />
            </button>

            <button onClick={() => onNavigate('business')} className={`bg-white border border-slate-100 p-5 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-xl hover:border-blue-200 transition group ${isVertical ? 'h-[80px] p-4 rounded-2xl' : ''}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition shadow-sm ${isVertical ? 'w-12 h-12 rounded-xl' : ''}`}>
                        <Briefcase size={isVertical ? 24 : 32} />
                    </div>
                    <div className="text-left">
                        <h4 className={`font-black text-slate-800 ${isVertical ? 'text-lg' : 'text-2xl'} mb-0.5`}>{t('vendorLicenses')}</h4>
                        <p className="opacity-80 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">{t('shopsCommerce')}</p>
                    </div>
                </div>
                <ArrowRight size={isVertical ? 20 : 28} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition" />
            </button>
        </div>
    );

    const mapSection = (
        <DisruptionMap alerts={alerts} language={language} />
    );

    const analyticsSection = (
        <ConsumptionAnalytics language={language} />
    );

    if (isVertical) {
        // Redesigned prioritized hierarchy for vertical mobile/kiosk layout
        return (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-10 px-4">
                {greetingSection}

                {/* 1. Incident Summary */}
                <motion.div variants={itemVariants} className="w-full">
                    <LiveMetricsOverlay activeCount={activeIncidentsCount} />
                </motion.div>

                {/* 2. Active Alerts */}
                <motion.div variants={itemVariants} className="w-full">
                    {alertsSection}
                </motion.div>

                {/* 3. Map (Redesigned as compact situational awareness widget) */}
                <motion.div variants={itemVariants} className="w-full">
                    {mapSection}
                </motion.div>

                {/* 4. SOS Help & 5. Governance / Business */}
                <motion.div variants={itemVariants} className="w-full">
                    {bottomLinksSection}
                </motion.div>

                {/* 6. Other Services (Pushed below primary situational awareness items) */}
                <motion.div variants={itemVariants} className="w-full">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest text-left mb-3">Other Services</h3>
                    {quickActionsSection}
                </motion.div>

                {/* Secondary Analytics */}
                <motion.div variants={itemVariants} className="w-full">
                    {analyticsSection}
                </motion.div>
            </motion.div>
        );
    }

    // Default Landscape HUD Layout
    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-10">
            {greetingSection}

            {/* Top Row: Alerts and Quick Actions */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-full">
                    {alertsSection}
                </div>

                <div className="lg:col-span-2">
                    {quickActionsSection}
                </div>
            </motion.div>

            {/* Middle Row: Analytics */}
            <motion.div variants={itemVariants} className="w-full">
                {analyticsSection}
            </motion.div>

            {/* Live Disruption Map Row (Hero Element) */}
            <motion.div variants={itemVariants} className="w-full">
                {mapSection}
            </motion.div>

            {/* Extra Kiosk Links Row */}
            <motion.div variants={itemVariants} className="w-full mt-6">
                {bottomLinksSection}
            </motion.div>
        </motion.div>
    );
};

export default DashboardHome;
