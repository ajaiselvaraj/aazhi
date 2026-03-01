import React, { useState, useEffect } from 'react';
import { Camera, MapPin, AlertCircle, CheckCircle, Mic, Plus } from 'lucide-react';
import { MunicipalAPI } from '../../services/municipalApi';
import { AccessibleButton } from '../AccessibleButton';
import { speakText } from '../../utils/speak';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES_CONFIG } from '../../constants';
import { Priority } from '../../types/municipal';

const CIVIC_CATEGORIES = [
    'Garbage not collected',
    'Road potholes',
    'Drainage blockage',
    'Water stagnation',
    'Illegal dumping',
    'Public toilet issues',
    'Stray animal complaints',
    'Noise pollution',
    'Street light complaint',
    'Broken footpath',
    'Open manhole reporting',
    'Damaged traffic signal',
    'Fallen tree',
    'Park maintenance',
    'Pollution reporting',
    'Mosquito complaint',
    'Commercial waste request'
];

export const CivicComplaintForm: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { language } = useLanguage();
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
            text: "Please select your complaint type.",
            language: getLanguageName()
        });
    }, [language]);

    // Step 2: Auto-detect Location
    const handleLocationDetect = () => {
        setIsTrackingLoc(true);
        speakText({ text: "Locating your nearest zone.", language: getLanguageName() });

        // HTML5 GeoLocation API (mocked quickly for browsers without SSL/permissions)
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setIsTrackingLoc(false);
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        address: "Your Sub-Ward Location (Auto-detected)"
                    });
                },
                () => {
                    setIsTrackingLoc(false);
                    setLocation({ lat: 13.0827, lng: 80.2707, address: 'Chennai Default Zone (Fallback)' });
                }
            );
        } else {
            setIsTrackingLoc(false);
            setLocation({ lat: 13.0827, lng: 80.2707, address: 'Chennai Central' });
        }
    };

    // Step 3: Handle Final Submission
    const handleSubmit = async () => {
        if (!category || !location) return;

        setIsSubmitting(true);
        try {
            await MunicipalAPI.submitComplaint({
                category,
                description: desc || 'Filed via Aazhi Kiosk.',
                priority,
                location,
                photoUrl: 'base64_or_signed_url_would_go_here'
            });

            speakText({
                text: "Complaint submitted successfully. Your reference code has been generated.",
                language: getLanguageName(),
                rate: 0.9
            });

            setStep(4); // Success screen
        } catch (e) {
            console.error(e);
            speakText({ text: "An error occurred.", language: getLanguageName() });
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
                    label="← Go Back"
                    speakLabel="Return to previous menu"
                    language={getLanguageName()}
                    onClick={onBack}
                    className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none"
                />
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Report Civic Issue</h2>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full">

                {step === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold mb-6 text-slate-700">1. What is the issue?</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {CIVIC_CATEGORIES.map(cat => (
                                <AccessibleButton
                                    key={cat}
                                    label={cat}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setCategory(cat);
                                        setStep(2);
                                        speakText({ text: `You selected ${cat}. Next, attach proof.`, language: getLanguageName() });
                                    }}
                                    className={`
                    min-h-[120px] text-left !justify-start p-6 text-2xl
                    ${category === cat ? 'ring-4 ring-blue-500 bg-blue-50' : 'bg-white'}
                  `}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center">
                        <h3 className="text-2xl font-bold mb-8 text-slate-700">2. Geo-Tag & Priority</h3>

                        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 mb-8 flex flex-col items-center">
                            <MapPin size={48} className="text-red-500 mb-4" />
                            <p className="text-xl font-medium text-slate-600 mb-6">
                                {location ? location.address : "Location required to route directly to local ward officer."}
                            </p>
                            {!location && (
                                <AccessibleButton
                                    label={isTrackingLoc ? "Locating..." : "Auto-Detect My Location"}
                                    language={getLanguageName()}
                                    onClick={handleLocationDetect}
                                    className="bg-blue-600 text-white w-full hover:bg-blue-700 border-none"
                                    disabled={isTrackingLoc}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {(['Low', 'Medium', 'Critical'] as Priority[]).map((p) => (
                                <AccessibleButton
                                    key={p}
                                    label={p}
                                    speakLabel={`Set priority to ${p}`}
                                    language={getLanguageName()}
                                    onClick={() => setPriority(p)}
                                    className={`
                    ${priority === p ? 'ring-4 ring-indigo-500 bg-indigo-50 font-black scale-105' : 'bg-white opacity-70'}
                  `}
                                />
                            ))}
                        </div>

                        <div className="flex justify-between w-full mt-12 gap-6">
                            <AccessibleButton label="Back" language={getLanguageName()} onClick={() => setStep(1)} className="flex-1 bg-slate-200 border-none" />
                            <AccessibleButton label="Next" language={getLanguageName()} onClick={() => { setStep(3); speakText({ text: "Add photo", language: getLanguageName() }) }} disabled={!location} className="flex-1 bg-slate-800 text-white border-none disabled:opacity-50" />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center">
                        <h3 className="text-2xl font-bold mb-8 text-slate-700">3. Attach Photo (Optional)</h3>

                        <div className="bg-slate-100 border-4 border-dashed border-slate-300 rounded-[2rem] h-64 flex flex-col justify-center items-center cursor-pointer hover:bg-slate-200 transition mb-8">
                            <Camera size={64} className="text-slate-400 mb-4" />
                            <AccessibleButton
                                label="Take Photo"
                                speakLabel="Open Camera to take a photo of the complaint"
                                language={getLanguageName()}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                            />
                        </div>

                        <div className="flex justify-between w-full mt-12 gap-6">
                            <AccessibleButton label="Back" language={getLanguageName()} onClick={() => setStep(2)} className="flex-1 bg-slate-200 border-none" />
                            <AccessibleButton
                                label={isSubmitting ? "Submitting..." : "Submit Complaint"}
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
                        <h3 className="text-4xl font-black text-slate-800 mb-4">Report Filed!</h3>
                        <p className="text-xl text-slate-500 font-medium mb-12">
                            Your Sub-Ward officer has been notified. We will update you via SMS when action is taken.
                        </p>
                        <AccessibleButton
                            label="Return to Main Menu"
                            speakLabel="Going back to dashboard"
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
