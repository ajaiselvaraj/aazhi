import React, { useState } from 'react';
import { Calendar, FileSignature, CheckSquare, Search, Play, Vote, MessageSquare, Activity, AlertCircle } from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';
import { speakText } from '../../utils/speak';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES_CONFIG } from '../../constants';

const CIVIC_ACTIONS_KEYS = [
    { id: 'ward', labelKey: 'citizen_wardCalendar', icon: Calendar },
    { id: 'suggest', labelKey: 'citizen_submitSuggestion', icon: MessageSquare },
    { id: 'survey', labelKey: 'citizen_localSurvey', icon: CheckSquare },
    { id: 'budget', labelKey: 'citizen_budgetTransparency', icon: Search },
    { id: 'track', labelKey: 'citizen_trackProgress', icon: Activity },
    { id: 'rti', labelKey: 'citizen_rtiRequest', icon: FileSignature }
];

export const CitizenParticipation: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { language, t } = useLanguage();
    const [step, setStep] = useState(1);
    const [view, setView] = useState('');

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    return (
        <div className={`flex flex-col h-full bg-slate-50 w-full p-8 font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}>
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
                {step === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {CIVIC_ACTIONS_KEYS.map(act => (
                                <AccessibleButton
                                    key={act.id}
                                    label={t(act.labelKey)}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setView(t(act.labelKey));
                                        setStep(act.id === 'ward' ? 2 : act.id === 'track' ? 3 : 4);
                                        speakText({ text: t(act.labelKey), language: getLanguageName() });
                                    }}
                                    className="min-h-[160px] text-2xl font-black bg-white shadow-md border-b-4 border-slate-100 hover:border-blue-500 hover:bg-blue-50 p-6 flex flex-col justify-start text-left items-start gap-4"
                                />
                            ))}
                        </div>
                    </div>
                )}

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
    );
};
