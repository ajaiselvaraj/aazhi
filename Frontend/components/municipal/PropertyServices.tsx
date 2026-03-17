import React, { useState } from 'react';
import { Home, HardHat, Pickaxe, MapPin, CheckCircle, Smartphone } from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';
import { speakText } from '../../utils/speak';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES_CONFIG } from '../../constants';
import { Application } from '../../types/municipal';

const PROPERTY_SERVICES_KEYS = [
    { id: 'approval', labelKey: 'prop_buildApproval', icon: Home },
    { id: 'track', labelKey: 'prop_trackPermit', icon: MapPin },
    { id: 'renovate', labelKey: 'prop_renovation', icon: Pickaxe },
    { id: 'tax_cert', labelKey: 'prop_taxAssess', icon: Smartphone },
    { id: 'mutation', labelKey: 'prop_mutation', icon: HardHat },
    { id: 'encroach', labelKey: 'prop_encroach', icon: MapPin }
];

export const PropertyServices: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { language, t } = useLanguage();
    const [step, setStep] = useState(1);
    const [service, setService] = useState('');

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    return (
        <div className={`flex flex-col h-full bg-slate-50 w-full p-8 font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}>
            <div className="flex justify-between items-center mb-12">
                <AccessibleButton
                    label={`← ${t("mainMenu")}`}
                    speakLabel={t("cancelBtn")}
                    language={getLanguageName()}
                    onClick={onBack}
                    className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none"
                />
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">{t("prop_title")}</h2>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full">
                {step === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {PROPERTY_SERVICES_KEYS.map(svc => (
                                <AccessibleButton
                                    key={svc.id}
                                    label={t(svc.labelKey)}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setService(t(svc.labelKey));
                                        setStep(2);
                                        speakText({ text: t("prop_scanPrompt"), language: getLanguageName() });
                                    }}
                                    className="min-h-[140px] text-2xl font-black bg-white shadow-md border-2 border-slate-100 p-8 hover:border-indigo-500 hover:bg-indigo-50"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in slide-in-from-bottom-8 duration-500 max-w-3xl mx-auto text-center mt-12">
                        <div className="bg-indigo-100 p-12 rounded-[3.5rem] shadow-xl border border-indigo-200">
                            <h2 className="text-4xl font-black text-indigo-900 mb-6 tracking-tighter">{t("prop_docScan")}</h2>

                            <div className="bg-white rounded-2xl p-10 mb-8 border-4 border-dashed border-indigo-300 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition">
                                <HardHat className="text-indigo-500 mb-4" size={64} />
                                <p className="text-xl text-indigo-700 font-bold mb-2">{t("prop_tapScanDeed")}</p>
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{t("prop_orBuildGuide")}</p>
                            </div>

                            <AccessibleButton
                                label={t("continueBtn")}
                                speakLabel={t("nextBtn")}
                                language={getLanguageName()}
                                onClick={() => setStep(3)}
                                className="w-full bg-indigo-600 text-white py-6 text-2xl font-black hover:bg-indigo-700"
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in zoom-in-95 duration-700 pt-20 max-w-lg mx-auto text-center">
                        <div className="w-32 h-32 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <CheckCircle size={64} />
                        </div>
                        <h3 className="text-4xl font-black text-slate-800 mb-4 tracking-tighter">{t("prop_requestSubmitted")}</h3>
                        <p className="text-xl text-slate-500 font-medium mb-12">
                            {t("prop_routedMsg")}
                        </p>
                        <AccessibleButton
                            label={t("returnHome")}
                            speakLabel={t("goBackBtn")}
                            language={getLanguageName()}
                            onClick={onBack}
                            className="w-full bg-slate-900 text-white text-2xl py-6"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
