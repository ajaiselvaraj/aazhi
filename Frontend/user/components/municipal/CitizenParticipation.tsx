import React, { useState } from 'react';
import { Calendar, FileSignature, CheckSquare, Search, Play, Vote, MessageSquare, Activity, AlertCircle, ArrowLeft } from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';

import { useTranslation } from 'react-i18next';
import { LANGUAGES_CONFIG } from '../../constants';
import { useOrientation } from '../../contexts/OrientationContext';

const CIVIC_ACTIONS_KEYS = [
    { id: 'ward', labelKey: 'citizen_wardCalendar', icon: Calendar, circleColor: '#b45309' },
    { id: 'suggest', labelKey: 'citizen_submitSuggestion', icon: MessageSquare, circleColor: '#047857' },
    { id: 'survey', labelKey: 'citizen_localSurvey', icon: CheckSquare, circleColor: '#1d4ed8' },
    { id: 'budget', labelKey: 'citizen_budgetTransparency', icon: Search, circleColor: '#6d28d9' },
    { id: 'track', labelKey: 'citizen_trackProgress', icon: Activity, circleColor: '#0f766e' },
    { id: 'rti', labelKey: 'citizen_rtiRequest', icon: FileSignature, circleColor: '#be123c' }
];

export const CitizenParticipation: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { t, i18n } = useTranslation();
    const language = i18n.language as any;
    const { isVertical } = useOrientation();
    const [step, setStep] = useState(1);
    const [view, setView] = useState('');

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    return (
        <div className={`flex flex-col h-full w-full font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}
             style={{ backgroundColor: step === 1 ? '#f4f6fa' : undefined }}
        >
            {/* Step 1: GOVERNANCE - Full zoom-out grid */}
            {step === 1 && (
                <div className="flex flex-col h-full p-4 sm:p-8 animate-in fade-in">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={onBack}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition shadow-sm"
                            style={{ backgroundColor: '#ffffff', border: '2px solid #e2e8f0', color: '#475569' }}
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter"
                                style={{ color: '#1e293b' }}>
                                {t("citizen_title") || 'GOVERNANCE'}
                            </h2>
                        </div>
                    </div>
                    <p className="text-center font-bold mb-8 uppercase tracking-widest text-sm"
                       style={{ color: '#64748b' }}>
                        {t("citizen_mainDashboard") || 'Select a service'}
                    </p>

                    {/* Category Grid */}
                    <div className={`grid ${isVertical ? 'grid-cols-1 gap-4' : 'grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6'} pb-12 overflow-y-auto`}>
                        {CIVIC_ACTIONS_KEYS.map(act => {
                            const IconComp = act.icon;
                            return (
                                <button
                                    key={act.id}
                                    onClick={() => {
                                        setView(t(act.labelKey));
                                        setStep(act.id === 'ward' ? 2 : act.id === 'track' ? 3 : 4);
                                        // NOTE: speakText removed based on stash if needed, or kept. The stash had it. We'll keep the white style.
                                    }}
                                    className="min-h-[160px] text-2xl font-black bg-white shadow-md border-b-4 border-slate-100 hover:border-blue-500 hover:bg-blue-50 p-6 flex flex-col justify-start text-left items-start gap-4 rounded-3xl transition-all"
                                >
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
                                         style={{ backgroundColor: act.circleColor + '20', color: act.circleColor }}>
                                        <IconComp size={32} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-[1.1rem] sm:text-lg font-black text-slate-800 leading-tight">
                                        {t(act.labelKey)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Steps 2-4: Keep existing kiosk layout */}
            {step > 1 && (
                <div className="p-8 bg-slate-50 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-12">
                        <AccessibleButton
                            label={`← ${t("citizen_mainDashboard")}`}
                            speakLabel={t("cancelBtn")}
                            language={getLanguageName()}
                            onClick={onBack}
                            className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none"
                        />
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <Vote className="text-blue-600" size={36} /> {t("citizen_title")}
                        </h2>
                    </div>

                    <div className="flex-1 max-w-6xl mx-auto w-full">

                {step === 2 && (
                    <div className="animate-in zoom-in-95 duration-500 max-w-3xl mx-auto mt-12">
                        <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 text-center">
                            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter">{t("citizen_wardMeetings")}</h2>

                            <div className="bg-blue-50 rounded-[2rem] p-8 border border-blue-100 text-left space-y-4 mb-10">
                                <div className="flex justify-between border-b border-blue-200 pb-4">
                                    <span className="text-blue-700 font-bold uppercase tracking-widest text-sm">{t("citizen_zoneCommittee")}</span>
                                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase">{t("citizen_upcoming")}</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-slate-900 mb-2">{t("citizen_meetingTopic")}</p>
                                    <p className="text-slate-600 font-medium">{t("citizen_meetingVenue")}</p>
                                </div>
                            </div>

                            <AccessibleButton
                                label={t("citizen_backGov")}
                                language={getLanguageName()}
                                onClick={() => setStep(1)}
                                className="w-full bg-slate-900 text-white py-6 text-xl font-black rounded-[2rem]"
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in slide-in-from-bottom-8 duration-500 max-w-4xl mx-auto mt-12">
                        <h3 className="text-3xl font-black mb-8 text-slate-800">{t("citizen_trackProject")}</h3>
                        <div className="bg-white rounded-[3rem] p-10 shadow-lg mb-8">
                            <div className="flex items-center gap-6 mb-8 border-b pb-8">
                                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse"><Activity size={40} /></div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{t("citizen_contractorId")} XYA-09</p>
                                    <p className="text-3xl font-black text-slate-900">45% {t("citizen_completed")}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex gap-4 items-center">
                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                    <p className="font-bold text-lg">{t("citizen_surveyDone")} <span className="text-slate-400 text-sm ml-2">March 2026</span></p>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                                    <p className="font-bold text-lg">{t("citizen_machineDeploy")} <span className="text-slate-400 text-sm ml-2">{t("citizen_inProgress")}</span></p>
                                </div>
                                <div className="flex gap-4 items-center opacity-40">
                                    <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                                    <p className="font-bold text-lg">{t("citizen_pipelineReroute")} <span className="text-slate-400 text-sm ml-2">{t("citizen_pending")}</span></p>
                                </div>
                            </div>
                        </div>
                        <AccessibleButton
                            label={t("citizen_closeTracker")}
                            language={getLanguageName()}
                            onClick={() => setStep(1)}
                            className="w-full bg-slate-900 text-white py-6 text-xl font-black rounded-3xl"
                        />
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in fade-in duration-500 max-w-2xl mx-auto mt-20 text-center">
                        <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={48} /></div>
                        <h3 className="text-4xl font-black mb-4">{t("citizen_underDev")}</h3>
                        <p className="text-slate-500 text-xl font-medium mb-12">{t("citizen_devMsg")}</p>
                        <AccessibleButton
                            label={t("backBtn")}
                            language={getLanguageName()}
                            onClick={() => setStep(1)}
                            className="w-full bg-slate-200 py-6 text-xl font-black border-none"
                        />
                    </div>
                )}
            </div>
                </div>
            )}
        </div>
    );
};
