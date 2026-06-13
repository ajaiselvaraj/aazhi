import React, { useState, useEffect } from 'react';
import { AlertTriangle, Home, Flame, CheckCircle, X, HandHeart, Droplets } from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';

import { useTranslation } from 'react-i18next';
import { LANGUAGES_CONFIG } from '../../constants';
// No need for OrientationContext anymore as it is natively responsive

const EMERGENCY_TYPES_KEYS = [
    { id: 'flood', labelKey: 'emer_flood', defaultLabel: 'Flood Reporting', circleColor: 'bg-[#263e5b]', icon: Droplets, iconColor: 'text-blue-300' },
    { id: 'fire', labelKey: 'emer_fire', defaultLabel: 'Fire Hazard', circleColor: 'bg-[#5c3e34]', icon: Flame, iconColor: 'text-orange-300' },
    { id: 'shelter', labelKey: 'emer_shelter', defaultLabel: 'Shelter Location', circleColor: 'bg-[#224641]', icon: Home, iconColor: 'text-teal-300' },
    { id: 'rescue', labelKey: 'emer_rescue', defaultLabel: 'Disaster Assistance', circleColor: 'bg-[#4c3a64]', icon: HandHeart, iconColor: 'text-[#d8b4fe]' }
];

export const EmergencySOS: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { t, i18n } = useTranslation();
    const language = i18n.language as any;
    const [step, setStep] = useState(1);
    const [type, setType] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    useEffect(() => {

        // Background auto-locate immediately for emergencies
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: t("emer_autoDetected") }),
                () => setLocation({ lat: 13.0827, lng: 80.2707, address: t("emer_fallback") })
            );
        } else {
            setLocation({ lat: 13.0827, lng: 80.2707, address: t("emer_fallback") });
        }
    }, [language, t]);

    const handleSOS = async () => {
        if (!type || !location) return;
        setIsSubmitting(true);
        try {
            // Bypass regular complaints and fire directly to emergency mock endpoint

            setTimeout(() => {
                setStep(3);
                setIsSubmitting(false);
            }, 1500);
        } catch (e) {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`flex flex-col h-full w-full bg-[#f8f9fc] p-4 sm:p-8 font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}>
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-12 gap-4">
                <AccessibleButton
                    label="CANCEL SOS"
                    speakLabel={t("emer_cancelReq")}
                    language={getLanguageName()}
                    onClick={onBack}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 !bg-[#b22222] hover:!bg-red-800 !border-none rounded-xl shadow-md !px-6 sm:!px-8 !py-3 sm:!py-4 !text-white !min-h-[auto]"
                >
                    <X size={28} strokeWidth={4} />
                    <span className="text-xl sm:text-2xl font-black uppercase tracking-wide">CANCEL SOS</span>
                </AccessibleButton>
                
                <div className="w-full sm:w-auto flex items-center justify-center gap-3 sm:gap-4 bg-[#fff1f2] border-2 border-red-100/50 py-3 sm:py-4 px-6 sm:px-10 rounded-full shadow-[0_4px_20px_rgba(220,38,38,0.05)]">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-400 animate-pulse shadow-[0_0_15px_rgba(248,113,113,0.8)]"></div>
                    <h2 className="text-2xl sm:text-[2rem] font-black text-[#991b1b] tracking-tighter uppercase leading-none mt-1">EMERGENCY PROTOCOL</h2>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col justify-start sm:justify-center relative z-10 pb-8">
                {step === 1 && (
                    <div className="animate-in fade-in duration-500 flex flex-col items-center w-full mt-4 sm:mt-0">
                        <h3 className="text-xs sm:text-[13px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 sm:mb-8 text-center">
                            SELECT REQUIRED EMERGENCY SERVICE
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 w-full">
                            {EMERGENCY_TYPES_KEYS.map(em => (
                                <AccessibleButton
                                    key={em.id}
                                    label={t(em.labelKey) !== em.labelKey ? t(em.labelKey) : em.defaultLabel}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setType(em.id);
                                        setStep(2);
                                    }}
                                    className="!bg-[#222836] hover:!bg-[#2c3344] !border-none !rounded-[2.5rem] p-6 sm:p-10 flex flex-col items-center justify-center gap-6 sm:gap-8 shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full min-h-[180px] sm:min-h-[260px] group"
                                >
                                    <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full ${em.circleColor} flex items-center justify-center transition-transform group-hover:scale-105`}>
                                        {em.icon ? (
                                            <em.icon size={56} className={em.iconColor || "text-white opacity-90"} strokeWidth={2.5} />
                                        ) : null}
                                    </div>
                                    <span className="!text-white text-[1.75rem] sm:text-4xl font-black tracking-tight text-center leading-none">
                                        {t(em.labelKey) !== em.labelKey ? t(em.labelKey) : em.defaultLabel}
                                    </span>
                                </AccessibleButton>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in zoom-in-95 duration-500 max-w-2xl mx-auto text-center mt-10 sm:mt-20">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                            <AlertTriangle size={64} />
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-red-900 mb-6 uppercase tracking-tighter">{t("emer_locatingUnits")}</h3>
                        <p className="text-xl sm:text-2xl text-red-700 font-bold mb-12">
                            {t("emer_coordsAcquired")} {location?.address}.
                        </p>
                        <AccessibleButton
                            label={isSubmitting ? t("emer_broadcasting") : t("emer_confirmSos")}
                            speakLabel={t("emer_confirmSend")}
                            language={getLanguageName()}
                            onClick={handleSOS}
                            disabled={!location || isSubmitting}
                            className="w-full !bg-red-700 !text-white text-2xl sm:text-3xl font-black py-6 sm:py-8 shadow-2xl hover:!bg-red-800 !rounded-2xl !border-none"
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in zoom-in-95 duration-700 pt-10 sm:pt-20 max-w-lg mx-auto text-center">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <CheckCircle size={64} />
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-black text-slate-800 mb-4 uppercase tracking-tighter">{t("emer_unitsDispatched")}</h3>
                        <p className="text-lg sm:text-xl text-slate-500 font-medium mb-12">
                            {t("emer_reliefEnRoute")}
                        </p>
                        <AccessibleButton
                            label={t("returnSafety")}
                            speakLabel={t("goBackBtn")}
                            language={getLanguageName()}
                            onClick={onBack}
                            className="w-full !bg-blue-600 !text-white py-6 text-xl sm:text-2xl font-black !rounded-2xl !border-none"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

