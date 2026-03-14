import React, { useState } from 'react';
import { FileText, Building2, UserCircle, Briefcase, MapPin, Search } from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';
import { speakText } from '../../utils/speak';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES_CONFIG } from '../../constants';
import { Application } from '../../types/municipal';

const BUSINESS_CATEGORIES = [
    { id: 'hawker', label: 'Street Vendor License', icon: UserCircle },
    { id: 'market', label: 'Market Stall Allocation', icon: MapPin },
    { id: 'event', label: 'Event Permission', icon: FileText },
    { id: 'ads', label: 'Advertisement Board', icon: Briefcase },
    { id: 'trade', label: 'Trade Registration', icon: Building2 }
];

export const VendorLicenseFlow: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { language } = useLanguage();
    const [step, setStep] = useState(1);
    const [type, setType] = useState('');
    const [applicantName, setApplicantName] = useState('');
    const [aadhaarUrl, setAadhaarUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reference, setReference] = useState('');

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        speakText({ text: "Processing your business application.", language: getLanguageName() });
        setTimeout(() => {
            setReference(`APP-${Math.floor(Math.random() * 90000) + 10000}`);
            setStep(4);
            setIsSubmitting(false);
            speakText({ text: "Application submitted. Your tracking number is ready.", language: getLanguageName() });
        }, 2000);
    };

    return (
        <div className={`flex flex-col h-full bg-slate-50 w-full p-8 font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}>
            <div className="flex justify-between items-center mb-12">
                <AccessibleButton
                    label="← Main Menu"
                    speakLabel="Cancel application"
                    language={getLanguageName()}
                    onClick={onBack}
                    className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none"
                />
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Business & Local Vendors</h2>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full">
                {step === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold mb-6 text-slate-700">Select Service Type</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {BUSINESS_CATEGORIES.map(cat => (
                                <AccessibleButton
                                    key={cat.id}
                                    label={cat.label}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setType(cat.id);
                                        setStep(2);
                                        speakText({ text: `${cat.label} selected. Step 2. Input details.`, language: getLanguageName() });
                                    }}
                                    className="min-h-[140px] text-xl font-bold bg-white text-left p-6 shadow border-b-4 border-slate-200 hover:border-blue-500"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center mt-12">
                        <div className="text-left bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 mb-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Applicant Full Name</label>
                                <input
                                    type="text"
                                    value={applicantName}
                                    onChange={e => setApplicantName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 p-6 rounded-2xl text-xl font-bold outline-none focus:border-blue-500"
                                    placeholder="e.g. R. Venkatesh"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Aadhaar Document Scan</label>
                                <div className="border-4 border-dashed border-slate-200 rounded-2xl h-40 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                                    <FileText className="text-slate-400 mb-2" size={32} />
                                    <span className="text-slate-500 font-bold">Tap to Scan Document</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between w-full mt-12 gap-6">
                            <AccessibleButton label="Back" language={getLanguageName()} onClick={() => setStep(1)} className="flex-1 bg-slate-200 border-none" />
                            <AccessibleButton
                                label="Review Details"
                                language={getLanguageName()}
                                onClick={() => { setStep(3); speakText({ text: "Please review and confirm.", language: getLanguageName() }); }}
                                disabled={!applicantName}
                                className="flex-1 bg-blue-600 text-white border-none disabled:opacity-50"
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in zoom-in-95 duration-500 max-w-2xl mx-auto mt-12">
                        <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl mb-8">
                            <h3 className="text-xs uppercase font-black tracking-widest text-slate-400 mb-6">Application Review</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-800 pb-2">
                                    <span className="text-slate-400">Service</span>
                                    <span className="font-bold">{BUSINESS_CATEGORIES.find(c => c.id === type)?.label}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-800 pb-2">
                                    <span className="text-slate-400">Applicant</span>
                                    <span className="font-bold">{applicantName}</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="text-slate-400">Aadhaar KYC</span>
                                    <span className="font-bold text-green-400">Verified ✓</span>
                                </div>
                            </div>
                            <AccessibleButton
                                label={isSubmitting ? "Submitting to Ward Officer..." : "Submit Application"}
                                language={getLanguageName()}
                                disabled={isSubmitting}
                                onClick={handleSubmit}
                                className="w-full bg-blue-600 mt-8 py-6 text-xl font-black border-none"
                            />
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in zoom-in-95 duration-700 pt-20 max-w-lg mx-auto text-center">
                        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100">
                            <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Under Review</h2>
                            <p className="text-slate-500 font-medium mb-10">
                                Your application has been successfully routed to the Zonal Business Officer.
                            </p>

                            <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-100">
                                <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Tracking Number</p>
                                <p className="text-4xl font-black text-blue-900 tracking-tight">{reference}</p>
                            </div>

                            <AccessibleButton
                                label="Done"
                                speakLabel="Going back"
                                language={getLanguageName()}
                                onClick={onBack}
                                className="w-full bg-slate-900 text-white py-6 text-xl font-black"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
