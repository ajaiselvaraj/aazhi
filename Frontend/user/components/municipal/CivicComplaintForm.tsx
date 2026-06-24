import React, { useState, useEffect } from 'react';
import {
    Camera, MapPin, AlertCircle, CheckCircle, Mic, Plus, ArrowLeft,
    Trash2, AlertTriangle, Waves, CloudRain, Archive, Users, Dog,
    Megaphone, Lightbulb, Footprints, TreePine, Leaf, Factory, Bug,
    Package, Receipt, Droplets, Grid, Locate, ChevronsDown, Minus, ChevronsUp
} from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';

import { useTranslation } from 'react-i18next';
import { LANGUAGES_CONFIG } from '../../constants';
import { Priority } from '../../types/municipal';
import { useServiceComplaint } from '../../contexts/ServiceComplaintContext';
import { useOrientation } from '../../contexts/OrientationContext';
import StatusSubscription from '../kiosk/StatusSubscription';
import { Persistence, debounceSaveForm } from '../../utils/persistence';

// Icon + color mapping per category key
const CIVIC_ISSUE_META: Record<string, { icon: any; circleColor: string }> = {
    'civic_garbage':         { icon: Trash2,        circleColor: 'bg-[#0f766e]' },
    'civic_potholes':        { icon: AlertTriangle,  circleColor: 'bg-[#b45309]' },
    'civic_drainage':        { icon: Waves,          circleColor: 'bg-[#047857]' },
    'civic_waterStagnation': { icon: CloudRain,      circleColor: 'bg-[#1d4ed8]' },
    'civic_illegalDump':     { icon: Archive,        circleColor: 'bg-[#6d28d9]' },
    'civic_toilet':          { icon: Users,          circleColor: 'bg-[#be123c]' },
    'civic_strayAnimal':     { icon: Dog,            circleColor: 'bg-[#b45309]' },
    'civic_noise':           { icon: Megaphone,      circleColor: 'bg-[#0f766e]' },
    'civic_streetLight':     { icon: Lightbulb,      circleColor: 'bg-[#b45309]' },
    'civic_footpath':        { icon: Footprints,     circleColor: 'bg-[#475569]' },
    'civic_manhole':         { icon: AlertCircle,    circleColor: 'bg-[#b91c1c]' },
    'civic_trafficSignal':   { icon: Grid,           circleColor: 'bg-[#047857]' },
    'civic_fallenTree':      { icon: TreePine,       circleColor: 'bg-[#15803d]' },
    'civic_parkMaint':       { icon: Leaf,           circleColor: 'bg-[#15803d]' },
    'civic_pollution':       { icon: Factory,        circleColor: 'bg-[#475569]' },
    'civic_mosquito':        { icon: Bug,            circleColor: 'bg-[#be123c]' },
    'civic_commercialWaste': { icon: Package,        circleColor: 'bg-[#1d4ed8]' },
    'civic_propertyTax':     { icon: Receipt,        circleColor: 'bg-[#0f766e]' },
    'civic_waterQuality':    { icon: Droplets,       circleColor: 'bg-[#0369a1]' },
};

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
    'civic_commercialWaste',
    'civic_propertyTax',
    'civic_waterQuality'
];

const PRIORITY_KEYS: { key: string; value: Priority }[] = [
    { key: 'civic_low', value: 'Low' },
    { key: 'civic_medium', value: 'Medium' },
    { key: 'civic_critical', value: 'Critical' }
];

export const CivicComplaintForm: React.FC<{ onBack: () => void; isPrivacyOn: boolean; language?: any; departmentId?: string }> = ({ onBack, isPrivacyOn, departmentId }) => {
    const { t, i18n } = useTranslation();
    const language = i18n.language as any;
    const { isVertical } = useOrientation();
    const { addComplaint } = useServiceComplaint();
    
    // Load cached data
    const savedForm = Persistence.loadFormData('civic_form') || {};
    const [step, setStep] = useState(savedForm.step || 1);
    const [category, setCategory] = useState(savedForm.category || '');
    const [priority, setPriority] = useState<Priority>(savedForm.priority || 'Medium');
    const [desc, setDesc] = useState(savedForm.desc || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(savedForm.location || null);
    
    const [isTrackingLoc, setIsTrackingLoc] = useState(false);
    const [submittedTicket, setSubmittedTicket] = useState('');

    // Auto-save form data on change
    useEffect(() => {
        debounceSaveForm('civic_form', { step, category, priority, desc, location });
    }, [step, category, priority, desc, location]);

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };



    // Step 2: Auto-detect Location
    const handleLocationDetect = () => {
        setIsTrackingLoc(true);


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
        console.log("🖱️ [Civic] Submit button clicked in Step 3");
        if (!category || !location) {
            console.warn("⚠️ [Civic] Cannot submit: category and/or location missing", { category, location });
            return;
        }

        setIsSubmitting(true);
        console.log("⏳ [Civic] Starting API submission process...");

        // Read real logged-in user from session
        const sessionStr = localStorage.getItem('aazhi_user');
        const sessionUser = sessionStr ? JSON.parse(sessionStr) : null;

        try {
            // Map the department ID to category
            let deptCat = 'Municipal';
            let requestCategory = 'civic';
            if (departmentId === 'eb') {
                deptCat = 'Electricity';
                requestCategory = 'power';
            } else if (departmentId === 'water') {
                deptCat = 'Water';
                requestCategory = 'municipal';
            } else if (departmentId === 'gas') {
                deptCat = 'Gas';
                requestCategory = 'gas';
            }

            console.log(`🚀 [Civic] Calling addComplaint for department: ${deptCat} (category: ${requestCategory})`);
            
            const payload = {
                name: sessionUser?.name || null,
                phone: sessionUser?.mobile || null,
                category: deptCat,
                complaintType: t(category), // Issue Type (translated)
                description: desc || 'Filed via Aazhi Kiosk.',
                location: location.address,
                area: sessionUser?.ward || 'Unknown',
                request_category: requestCategory
            };

            console.log("📦 [Civic] Submission Payload:", payload);

            const ticketId = await addComplaint(payload);

            console.log("✅ [Civic] Submission success. Ticket received:", ticketId);
            setSubmittedTicket(ticketId);
            Persistence.clearFormData('civic_form');

            setStep(4); // Success screen
        } catch (e: any) {
            console.error("❌ [Civic] Critical submission failure:", e?.message || e);

        } finally {
            setIsSubmitting(false);
            console.log("🏳️ [Civic] Submission flow ended.");
        }
    };

    // Render Kiosk Optimized Progress Steps
    return (
        <div className={`flex flex-col h-full w-full font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}
             style={{ backgroundColor: step === 1 ? '#f4f6fa' : undefined }}
        >
            {/* Step 1: REPORT CIVIC ISSUE - Full zoom-out grid */}
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
                                {t("civic_title") || 'REPORT CIVIC ISSUE'}
                            </h2>
                        </div>
                    </div>
                    <p className="text-center font-bold mb-8 uppercase tracking-widest text-sm"
                       style={{ color: '#64748b' }}>
                        {t("civic_whatIssue") || '1. What is the issue?'}
                    </p>

                    {/* Category Grid */}
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pb-12 overflow-y-auto">
                        {CIVIC_CATEGORIES_KEYS.map(catKey => {
                            const meta = CIVIC_ISSUE_META[catKey] || { icon: AlertCircle, circleColor: 'bg-[#475569]' };
                            const IconComp = meta.icon;
                            return (
                                <div 
                                    key={catKey}
                                    className="w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] max-w-[400px] flex"
                                >
                                    <button
                                        onClick={() => {
                                            setCategory(catKey);
                                            setStep(2);
                                        }}
                                        className="group flex flex-col items-center justify-center gap-4 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] w-full min-h-[160px] flex-1"
                                        style={{
                                            backgroundColor: '#222836',
                                            borderRadius: '1.5rem',
                                            border: 'none',
                                            padding: '1.5rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div className={`w-16 h-16 rounded-full ${meta.circleColor} flex items-center justify-center group-hover:scale-110 transition-transform shadow-md`}>
                                            <IconComp size={32} className="text-white" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[1.1rem] sm:text-lg font-bold text-center leading-tight"
                                              style={{ color: '#ffffff' }}>
                                            {t(catKey)}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Steps 2-4: Keep the existing kiosk header for non-grid steps */}
            {step > 1 && (
                <div className="p-8 bg-slate-50 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-12">
                        <AccessibleButton
                            label={`← ${t("goBackBtn")}`}
                            speakLabel={t("goBackBtn")}
                            language={getLanguageName()}
                            onClick={() => step === 2 ? setStep(1) : undefined}
                            className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none"
                        />
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight">{t("civic_title")}</h2>
                    </div>

                    <div className="flex-1 max-w-5xl mx-auto w-full overflow-y-auto pr-2 custom-scrollbar">

                {step === 2 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto w-full text-center flex flex-col items-center justify-center pt-4">
                        {(() => {
                            const meta = CIVIC_ISSUE_META[category] || { icon: AlertCircle, circleColor: 'bg-blue-100' };
                            const IconComp = meta.icon;
                            return (
                                <div className="mb-8 flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm mx-auto justify-center">
                                    <div className={`w-12 h-12 rounded-full ${meta.circleColor} flex items-center justify-center shadow-md`}>
                                        <IconComp size={24} className="text-white" strokeWidth={2.5} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">Selected Issue</p>
                                        <p className="text-lg font-black text-slate-800 leading-tight">{t(category)}</p>
                                    </div>
                                </div>
                            );
                        })()}
                        <h3 className="text-xl font-bold text-[#1e293b] mb-6">
                            2. Geo-Tag & Priority
                        </h3>

                        <div className="bg-[#f8fafc] rounded-xl p-8 border border-slate-200 w-full mb-8 flex flex-col items-center text-center shadow-sm">
                            <MapPin size={32} className="text-red-600 mb-4" />
                            <p className="text-slate-500 font-medium mb-6 max-w-xs">
                                {location ? location.address : "Location required to route directly to local ward officer."}
                            </p>
                            {!location ? (
                                <button
                                    onClick={handleLocationDetect}
                                    disabled={isTrackingLoc}
                                    className="w-full sm:w-3/4 bg-[#1e293b] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition disabled:opacity-50"
                                >
                                    <Locate size={18} /> {isTrackingLoc ? t("civic_locatingBtn") : "Auto-Detect My Location"}
                                </button>
                            ) : (
                                <div className="w-full sm:w-3/4 bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2">
                                    <CheckCircle size={18} /> Location Detected!
                                </div>
                            )}
                        </div>

                        <div className="w-full flex flex-col items-center">
                            <label className="block text-sm font-bold text-slate-700 mb-4">Select Issue Priority</label>
                            <div className="flex flex-col gap-4 w-full mb-10">
                                <button
                                    onClick={() => setPriority('High')}
                                    className={`py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all border ${priority === 'High' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-[#f0f4f8] text-[#1e293b] border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <ChevronsUp size={20} /> High
                                </button>
                                <button
                                    onClick={() => setPriority('Medium')}
                                    className={`py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all border ${priority === 'Medium' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-[#f0f4f8] text-[#1e293b] border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <Minus size={20} /> Medium
                                </button>
                                <button
                                    onClick={() => setPriority('Low')}
                                    className={`py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all border ${priority === 'Low' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-[#f0f4f8] text-[#1e293b] border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <ChevronsDown size={20} /> Low
                                </button>
                            </div>
                        </div>

                        <div className="w-full border-t border-slate-200 pt-8 flex justify-between gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 bg-[#1e293b] text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-sm"
                            >
                                Back
                            </button>
                            <button
                                disabled={!location}
                                onClick={() => { setStep(3); }}
                                className={`flex-1 py-4 rounded-xl font-bold transition shadow-sm ${location ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-[#e2e8f0] text-slate-400'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center">
                        {(() => {
                            const meta = CIVIC_ISSUE_META[category] || { icon: AlertCircle, circleColor: 'bg-blue-100' };
                            const IconComp = meta.icon;
                            return (
                                <div className="mb-8 flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm mx-auto justify-center">
                                    <div className={`w-12 h-12 rounded-full ${meta.circleColor} flex items-center justify-center shadow-md`}>
                                        <IconComp size={24} className="text-white" strokeWidth={2.5} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">Selected Issue</p>
                                        <p className="text-lg font-black text-slate-800 leading-tight">{t(category)}</p>
                                    </div>
                                </div>
                            );
                        })()}
                        <h3 className="text-2xl font-bold mb-8 text-slate-700">{t("civic_attachPhoto")}</h3>

                        <div 
                            className="bg-slate-100 border-4 border-dashed border-slate-300 rounded-[2rem] h-64 flex flex-col justify-center items-center cursor-pointer hover:bg-slate-200 transition mb-8"
                        >
                            <Camera size={64} className="text-slate-400 mb-4" />
                            <AccessibleButton
                                label={t("civic_takePhoto")}
                                language={getLanguageName()}
                                className="bg-blue-600 text-white hover:bg-blue-700 pointer-events-none"
                            />
                        </div>

                        <div className="flex justify-between w-full mt-12 gap-6">
                            <AccessibleButton label={t("backBtn")} language={getLanguageName()} onClick={() => setStep(2)} className="flex-1 bg-slate-200 border-none" />

                            <AccessibleButton
                                label={isSubmitting ? t("civic_submitting") : t("civic_submitComplaint")}
                                language={getLanguageName()}
                                onClick={handleSubmit}
                                disabled={isSubmitting || !location}
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
                        <p className="text-2xl font-bold text-blue-600 mb-4 bg-blue-50 py-3 rounded-xl border border-blue-100 drop-shadow-sm">
                            Ticket: {submittedTicket}
                        </p>
                        <p className="text-xl text-slate-500 font-medium mb-12">
                            {t("civic_officerNotified")}
                        </p>

                        <div className="mb-8 w-full flex justify-center">
                            <StatusSubscription 
                                complaintId={submittedTicket} 
                                defaultMobile={(() => {
                                    const sessionStr = localStorage.getItem('aazhi_user');
                                    const sessionUser = sessionStr ? JSON.parse(sessionStr) : null;
                                    return sessionUser?.mobile || '';
                                })()} 
                            />
                        </div>

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
            )}
        </div>
    );
};
