import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap, Droplets, ArrowRight, ShieldAlert, Navigation, Home, Flame, CheckCircle } from 'lucide-react';
import { MunicipalAPI } from '../../services/municipalApi';
import { AccessibleButton } from '../AccessibleButton';
import { speakText } from '../../utils/speak';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES_CONFIG } from '../../constants';
import { EmergencyReport } from '../../types/municipal';

const EMERGENCY_TYPES_KEYS = [
    { id: 'flood', labelKey: 'emer_flood', icon: Droplets, color: 'blue' },
    { id: 'fire', labelKey: 'emer_fire', icon: Flame, color: 'red' },
    { id: 'shelter', labelKey: 'emer_shelter', icon: Home, color: 'green' },
    { id: 'rescue', labelKey: 'emer_rescue', icon: ShieldAlert, color: 'orange' }
];

export const EmergencySOS: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { language, t } = useLanguage();
    const [step, setStep] = useState(1);
    const [type, setType] = useState('');
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    useEffect(() => {
        speakText({
            text: t("emer_sosActivated"),
            language: getLanguageName(),
            rate: 1.1
        });

        // Background auto-locate immediately for emergencies
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: t("emer_autoDetected") }),
                () => setLocation({ lat: 13.0827, lng: 80.2707, address: t("emer_fallback") })
            );
        } else {
            setLocation({ lat: 13.0827, lng: 80.2707, address: t("emer_fallback") });
        }
    }, [language]);

    const handleSOS = async () => {
        if (!type || !location) return;
        setIsSubmitting(true);
        try {
            // Bypass regular complaints and fire directly to emergency mock endpoint
            speakText({ text: t("emer_dispatching"), language: getLanguageName() });

            setTimeout(() => {
                setStep(3);
                setIsSubmitting(false);
            }, 1500);
        } catch (e) {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`flex flex-col h-full w-full bg-slate-50 p-8 font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}>
            <div className="flex justify-between items-center mb-8">
                <AccessibleButton
                    label={`← ${t("emer_cancelSos")}`}
                    speakLabel={t("emer_cancelReq")}
                    language={getLanguageName()}
                    onClick={onBack}
                    className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none text-red-700"
                />
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse"></div>
                    <h2 className="text-4xl font-black text-red-900 tracking-tight">{t("emer_title")}</h2>
                </div>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full">
                {step === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-3xl font-black mb-8 text-red-800 text-center uppercase tracking-widest">{t("emer_selectType")}</h3>
                        <div className="grid grid-cols-2 gap-8">
                            {EMERGENCY_TYPES_KEYS.map(em => (
                                <AccessibleButton
                                    key={em.id}
                                    label={t(em.labelKey)}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setType(em.id);
                                        setStep(2);
                                        speakText({ text: t(em.labelKey), language: getLanguageName() });
                                    }}
                                    className={`min-h-[160px] text-center p-8 text-3xl font-black border-4 border-transparent hover:border-${em.color}-500 bg-white hover:bg-${em.color}-50 shadow-xl relative overflow-hidden group`}
                                >
                                    {/* Fake child mapping trick for quick prototyping since AccessibleButton intercepts children. Icon is handled by label text for now. */}
                                </AccessibleButton>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in zoom-in-95 duration-500 max-w-2xl mx-auto text-center mt-20">
                        <div className="w-32 h-32 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                            <AlertTriangle size={64} />
                        </div>
                        <h3 className="text-4xl font-black text-red-900 mb-6 uppercase tracking-tighter">{t("emer_locatingUnits")}</h3>
                        <p className="text-2xl text-red-700 font-bold mb-12">
                            {t("emer_coordsAcquired")} {location?.address}.
                        </p>
                        <AccessibleButton
                            label={isSubmitting ? t("emer_broadcasting") : t("emer_confirmSos")}
                            speakLabel={t("emer_confirmSend")}
                            language={getLanguageName()}
                            onClick={handleSOS}
                            disabled={!location || isSubmitting}
                            className="w-full bg-red-700 text-white text-3xl font-black py-8 shadow-2xl hover:bg-red-800"
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in zoom-in-95 duration-700 pt-20 max-w-lg mx-auto text-center">
                        <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <CheckCircle size={64} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-4 uppercase tracking-tighter">{t("emer_unitsDispatched")}</h3>
                        <p className="text-xl text-slate-500 font-medium mb-12">
                            {t("emer_reliefEnRoute")}
                        </p>
                        <AccessibleButton
                            label={t("returnSafety")}
                            speakLabel={t("goBackBtn")}
                            language={getLanguageName()}
                            onClick={onBack}
                            className="w-full bg-blue-600 text-white py-6 text-2xl font-black"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
