import React, { useState, useEffect } from 'react';
import { Camera, MapPin, AlertCircle, CheckCircle, Mic, Plus } from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';
import { speakText } from '../../utils/speak';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES_CONFIG, MOCK_USER_PROFILE } from '../../constants';
import { Priority } from '../../types/municipal';
import { useServiceComplaint } from '../../contexts/ServiceComplaintContext';

const CIVIC_CATEGORIES_KEYS = [
    'civic_garbage',
    'civic_potholes',
    'civic_drainage',
    'civic_waterStagnation',
    'civic_illegalDump',
    'civic_toilet',
    'civic_strayAnimal',
    'civic_noise',
    'civic_streetLight',
    'civic_footpath',
    'civic_manhole',
    'civic_trafficSignal',
    'civic_fallenTree',
    'civic_parkMaint',
    'civic_pollution',
    'civic_mosquito',
    'civic_commercialWaste'
];

const PRIORITY_KEYS: { key: string; value: Priority }[] = [
    { key: 'civic_low', value: 'Low' },
    { key: 'civic_medium', value: 'Medium' },
    { key: 'civic_critical', value: 'Critical' }
];

export const CivicComplaintForm: React.FC<{ onBack: () => void; isPrivacyOn: boolean; language?: any; departmentId?: string }> = ({ onBack, isPrivacyOn, departmentId }) => {
    const { language, t } = useLanguage();
    const { addComplaint } = useServiceComplaint();
    const [step, setStep] = useState(1);
    const [category, setCategory] = useState('');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [desc, setDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
    const [isTrackingLoc, setIsTrackingLoc] = useState(false);

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    // Step 1: Speak Instructions on Load
    useEffect(() => {
        speakText({
            text: t("civic_selectComplaint"),
            language: getLanguageName()
        });
    }, [language]);

    // Step 2: Auto-detect Location
    const handleLocationDetect = () => {
        setIsTrackingLoc(true);
        speakText({ text: t("civic_locating"), language: getLanguageName() });

        // HTML5 GeoLocation API (mocked quickly for browsers without SSL/permissions)
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setIsTrackingLoc(false);
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        address: t("emer_autoDetected")
                    });
                },
                () => {
                    setIsTrackingLoc(false);
                    setLocation({ lat: 13.0827, lng: 80.2707, address: t("emer_fallback") });
                }
            );
        } else {
            setIsTrackingLoc(false);
            setLocation({ lat: 13.0827, lng: 80.2707, address: t("emer_fallback") });
        }
    };

    // Step 3: Handle Final Submission
    const handleSubmit = async () => {
        if (!category || !location) return;

        setIsSubmitting(true);
        try {
            // Map the department ID to category
            let deptCat = 'Municipal';
            if (departmentId === 'eb') deptCat = 'Electricity';
            else if (departmentId === 'water') deptCat = 'Water';
            else if (departmentId === 'gas') deptCat = 'Gas';

            addComplaint({
                name: MOCK_USER_PROFILE.name,
                phone: MOCK_USER_PROFILE.mobile,
                category: deptCat,
                complaintType: t(category), // Issue Type (translated)
                description: desc || 'Filed via Aazhi Kiosk.',
                location: location.address,
                area: MOCK_USER_PROFILE.ward || 'Unknown'
            });

            speakText({
                text: t("civic_successMsg"),
                language: getLanguageName(),
                rate: 0.9
            });

            setStep(4); // Success screen
        } catch (e) {
            console.error(e);
            speakText({ text: t("civic_errorMsg"), language: getLanguageName() });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Kiosk Optimized Progress Steps
    return (
        <div className={`flex flex-col h-full bg-slate-50 w-full p-8 font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}>
            {/* Kiosk Optimized Header Navigation */}
            <div className="flex justify-between items-center mb-12">
                <AccessibleButton
                    label={`← ${t("goBackBtn")}`}
                    speakLabel={t("goBackBtn")}
                    language={getLanguageName()}
                    onClick={onBack}
                    className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none"
                />
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">{t("civic_title")}</h2>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full">

                {step === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold mb-6 text-slate-700">{t("civic_whatIssue")}</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {CIVIC_CATEGORIES_KEYS.map(catKey => (
                                <AccessibleButton
                                    key={catKey}
                                    label={t(catKey)}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setCategory(catKey);
                                        setStep(2);
                                        speakText({ text: t(catKey), language: getLanguageName() });
                                    }}
                                    className={`
                    min-h-[120px] text-left !justify-start p-6 text-2xl
                    ${category === catKey ? 'ring-4 ring-blue-500 bg-blue-50' : 'bg-white'}
                  `}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center">
                        <h3 className="text-2xl font-bold mb-8 text-slate-700">{t("civic_geoTag")}</h3>

                        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 mb-8 flex flex-col items-center">
                            <MapPin size={48} className="text-red-500 mb-4" />
                            <p className="text-xl font-medium text-slate-600 mb-6">
                                {location ? location.address : t("civic_locationRequired")}
                            </p>
                            {!location && (
                                <AccessibleButton
                                    label={isTrackingLoc ? t("civic_locatingBtn") : t("civic_autoDetect")}
                                    language={getLanguageName()}
                                    onClick={handleLocationDetect}
                                    className="bg-blue-600 text-white w-full hover:bg-blue-700 border-none"
                                    disabled={isTrackingLoc}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {PRIORITY_KEYS.map((p) => (
                                <AccessibleButton
                                    key={p.value}
                                    label={t(p.key)}
                                    speakLabel={t(p.key)}
                                    language={getLanguageName()}
                                    onClick={() => setPriority(p.value)}
                                    className={`
                    ${priority === p.value ? 'ring-4 ring-indigo-500 bg-indigo-50 font-black scale-105' : 'bg-white opacity-70'}
                  `}
                                />
                            ))}
                        </div>

                        <div className="flex justify-between w-full mt-12 gap-6">
                            <AccessibleButton label={t("backBtn")} language={getLanguageName()} onClick={() => setStep(1)} className="flex-1 bg-slate-200 border-none" />
                            <AccessibleButton label={t("nextBtn")} language={getLanguageName()} onClick={() => { setStep(3); speakText({ text: t("civic_takePhoto"), language: getLanguageName() }) }} disabled={!location} className="flex-1 bg-slate-800 text-white border-none disabled:opacity-50" />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center">
                        <h3 className="text-2xl font-bold mb-8 text-slate-700">{t("civic_attachPhoto")}</h3>

                        <div className="bg-slate-100 border-4 border-dashed border-slate-300 rounded-[2rem] h-64 flex flex-col justify-center items-center cursor-pointer hover:bg-slate-200 transition mb-8">
                            <Camera size={64} className="text-slate-400 mb-4" />
                            <AccessibleButton
                                label={t("civic_takePhoto")}
                                speakLabel={t("civic_openCamera")}
                                language={getLanguageName()}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            />
                        </div>

                        <div className="flex justify-between w-full mt-12 gap-6">
                            <AccessibleButton label={t("backBtn")} language={getLanguageName()} onClick={() => setStep(2)} className="flex-1 bg-slate-200 border-none" />
                            <AccessibleButton
                                label={isSubmitting ? t("civic_submitting") : t("civic_submitComplaint")}
                                language={getLanguageName()}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 bg-green-600 text-white font-black border-none hover:bg-green-700 shadow-xl shadow-green-200 disabled:opacity-50"
                            />
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in zoom-in-95 duration-700 pt-20 max-w-lg mx-auto text-center">
                        <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <CheckCircle size={64} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-4">{t("civic_reportFiled")}</h3>
                        <p className="text-xl text-slate-500 font-medium mb-12">
                            {t("civic_officerNotified")}
                        </p>
                        <AccessibleButton
                            label={t("returnMainMenu")}
                            speakLabel={t("goBackBtn")}
                            language={getLanguageName()}
                            onClick={onBack}
                            className="w-full bg-blue-600 text-white"
                        />
                    </div>
                )}

            </div>
        </div>
    );
};
