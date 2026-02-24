import React from 'react';
import { LayoutGrid, CreditCard, ArrowRight, User, FileText, Smartphone, Phone, MapPin } from 'lucide-react';
import AlertsPanel from './AlertsPanel';
import ConsumptionAnalytics from './ConsumptionAnalytics';
import DisruptionMap from './DisruptionMap';
import { CityAlert, Language } from '../../types';
import { LocalityService } from '../../services/civicService';
import { MOCK_USER_PROFILE } from '../../constants';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
    alerts: CityAlert[];
    onNavigate: (tab: string) => void;
    userName?: string;
    language: Language;
}

const DashboardHome: React.FC<Props> = ({ alerts, onNavigate, userName = "Citizen", language }) => {
    const wardContacts = LocalityService.getSupportContacts(MOCK_USER_PROFILE.ward);
    const { t } = useLanguage();

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-10">
            {/* Greeting Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{t('namaste')}, <span className="privacy-sensitive">{userName}</span></h2>
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
                    <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('wardsupport')}</p>
                            <p className="font-bold text-slate-900">{wardContacts[0].phone}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center animate-pulse">
                            <Phone size={20} />
                        </div>
                    </div>
                )}
            </div>

            {/* Top Row: Alerts and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 h-full">
                    <AlertsPanel alerts={alerts} language={language} />
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
                                <h3 className="text-2xl font-black mb-1">{t('newRequest')}</h3>
                                <p className="opacity-80 text-xs font-medium mb-4">{t('newRequestDesc')}</p>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/20 w-fit px-3 py-2 rounded-lg">
                                    {t('start')} <ArrowRight size={12} />
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
                                <h3 className="text-2xl font-black mb-1">{t('payBills')}</h3>
                                <p className="text-slate-500 text-xs font-medium mb-4">{t('payBillsDesc')}</p>
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 w-fit px-3 py-2 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition">
                                    {t('pay')} <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Middle Row: Advanced Visuals (Analytics & Map) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConsumptionAnalytics language={language} />
                <DisruptionMap alerts={alerts} language={language} />
            </div>

            {/* Bottom Row: Zero-Document / DigiLocker Showcase */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-[2.5rem] p-8 relative overflow-hidden mt-10">
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex gap-6 items-center">
                        <div className="bg-white p-4 rounded-2xl shadow-sm text-indigo-600">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-indigo-900">{t('zeroDocVault')}</h3>
                            <p className="text-indigo-600 font-bold text-sm">{t('docVaultDesc')}</p>
                        </div>
                    </div>
                    <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition">
                        {t('viewDocs')}
                    </button>
                </div>

                {/* Visual Flair */}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-100 to-transparent"></div>
            </div>

        </div>
    );
};

export default DashboardHome;
