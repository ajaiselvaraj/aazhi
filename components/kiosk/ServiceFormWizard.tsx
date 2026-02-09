import React, { useState } from 'react';
import { FileText, ArrowRight, Upload, X, ShieldCheck, MapPin } from 'lucide-react';
import DocScanner from './DocScanner';
import DigiLockerAuth from './digilocker/DigiLockerAuth';
import { DigiLockerDoc } from '../../types/digilocker';
import { DEPARTMENTS, MOCK_USER_PROFILE, PREDEFINED_ISSUES, TRANSLATIONS } from '../../constants';
import { GrievanceService } from '../../services/civicService';
import { Language } from '../../types';

interface Props {
    serviceName: string;
    mode: 'SELF' | 'COUNTER';
    onCancel: () => void;
    onSubmit: (data: any) => void;
    language?: Language;
}

const ServiceFormWizard: React.FC<Props> = ({ serviceName, mode, onCancel, onSubmit, language = Language.ENGLISH }) => {
    const [step, setStep] = useState<'details' | 'scan' | 'review'>('details');
    const [details, setDetails] = useState({ name: MOCK_USER_PROFILE.name, mobile: MOCK_USER_PROFILE.mobile });
    const [scanComplete, setScanComplete] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const t = TRANSLATIONS[language];
    const svcKey = `serv_${serviceName.replace(/[\s\/]/g, '')}` as keyof typeof t;
    const translatedServiceName = t[svcKey] as string || serviceName;

    // Auto-detect Department
    const department = DEPARTMENTS.find(d => d.services.includes(serviceName));
    const isIssue = department && PREDEFINED_ISSUES[department.id]?.includes(serviceName);

    // DigiLocker State
    const [showDigiLocker, setShowDigiLocker] = useState(false);
    const [dlReqId, setDlReqId] = useState('');
    const [dlDocs, setDlDocs] = useState<DigiLockerDoc[]>([]);

    const handleDigiLockerSuccess = (docs: DigiLockerDoc[]) => {
        setDlDocs(docs);
        setShowDigiLocker(false);
        setScanComplete(true);
        setStep('review');
    };

    const getPrompt = () => {
        if (step === 'details') return t.promptDetails || "Please confirm your personal details.";
        if (step === 'scan') return isIssue ? (t.promptIssue || "Optional: Upload a photo of the issue.") : (t.promptScan || "We need to verify your identity. Please scan your Aadhaar.");
        if (step === 'review') return t.promptReview || "Review details before submission.";
        return "";
    };

    const handleScanComplete = () => {
        setShowScanner(false);
        setScanComplete(true);
        setStep('review');
    };

    const handleFinalSubmit = () => {
        // Feature 4: Strict Issue Creation
        if (department) {
            GrievanceService.createRequest({
                type: serviceName,
                department: department.name,
                citizenName: details.name,
                citizenId: MOCK_USER_PROFILE.id,
                details: `${serviceName} reported via Kiosk.`, // No free text allowed
                ward: MOCK_USER_PROFILE.ward,
                issueCategory: isIssue ? 'METER_FAULT' : undefined // Simplified mapping for demo
            });
        }
        onSubmit(details);
    };

    return (
        <div className="bg-white rounded-[3rem] shadow-2xl border p-12 max-w-2xl mx-auto animate-in zoom-in-95 relative overflow-hidden">
            {/* Wizard Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-900 text-white rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{isIssue ? (t.reportIssue || 'Report Issue') : (t.appWizard || 'Application Wizard')}</h2>
                    <p className="text-xs text-blue-600 font-black uppercase tracking-widest">{translatedServiceName} • {mode === 'SELF' ? (t.modeSelf || 'Self Service') : (t.modeCounter || 'Counter Help')}</p>
                </div>
            </div>

            {/* Feature 8: Community-Centered Behavior */}
            <div className="absolute top-8 right-8 flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                <MapPin size={12} /> {t.ward || "Ward"} {MOCK_USER_PROFILE.ward}
            </div>

            {/* Assistant Prompt Bubble */}
            <div className="mb-8 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                <p className="text-sm text-blue-800 font-bold">{getPrompt()}</p>
            </div>


            {/* Step 1: Details */}
            {step === 'details' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.applicantName || "Applicant Name"}</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-bold text-slate-900 privacy-sensitive"
                                value={details.name}
                                onChange={e => setDetails({ ...details, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.contactNumber || "Contact Number"}</label>
                            <input
                                inputMode="numeric"
                                type="text"
                                className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-bold text-slate-900 privacy-sensitive"
                                value={details.mobile}
                                onChange={e => setDetails({ ...details, mobile: e.target.value })}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setStep('scan')}
                        className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-100 flex items-center justify-center gap-2 mt-4"
                    >
                        {t.nextStep || "Next Step"} <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {/* Step 2: Document Upload Selection */}
            {step === 'scan' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <h3 className="text-xl font-black text-slate-900 text-center mb-4">{t.docProvHeading || "How would you like to provide documents?"}</h3>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Option 1: DigiLocker (Preferred) */}
                        <button
                            onClick={() => {
                                // Simulate backend initiation
                                setDlReqId('DLK-TEMP-' + Date.now());
                                setShowDigiLocker(true);
                            }}
                            className="bg-[#2E3192]/5 border-2 border-[#2E3192] p-8 rounded-[2rem] flex items-center justify-between group hover:bg-[#2E3192] hover:text-white transition-all relative overflow-hidden"
                        >
                            <div className="flex items-center gap-6 z-10">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-[#2E3192] font-black text-xl">DL</div>
                                <div className="text-left">
                                    <h4 className="font-black text-lg group-hover:text-white text-[#2E3192]">{t.fetchDL || "Fetch from DigiLocker"}</h4>
                                    <p className="text-xs font-bold opacity-60 mt-1 uppercase tracking-widest group-hover:text-indigo-100">{t.fetchDLDesc || "Recommended • Instant Verification"}</p>
                                </div>
                            </div>
                            <div className="bg-white/20 p-3 rounded-full z-10">
                                <ArrowRight size={24} />
                            </div>
                            {/* Decorative BG */}
                            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition">
                                <ShieldCheck size={150} />
                            </div>
                        </button>

                        {/* Option 2: Manual Scan */}
                        <div className="relative text-center">
                            <span className="bg-white px-4 text-xs font-bold text-slate-400 uppercase relative z-10">{t.or || "OR"}</span>
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-100"></div>
                        </div>

                        <button
                            onClick={() => setShowScanner(true)}
                            className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] flex items-center justify-between group hover:border-slate-300 transition-all text-slate-500 hover:text-slate-900"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border text-slate-400 group-hover:text-slate-900 group-hover:scale-110 transition"><Upload size={24} /></div>
                                <div className="text-left">
                                    <h4 className="font-bold text-base">{t.uploadMan || "Upload Manually"}</h4>
                                    <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">{t.uploadManDesc || "Scan Physical Copies"}</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className="flex justify-center mt-4">
                        <button onClick={() => setStep('details')} className="text-slate-400 font-bold text-xs uppercase hover:text-slate-600">{t.back || "Back"}</button>
                    </div>
                </div>
            )}

            {/* Scanner Wrapper */}
            {showScanner && (
                <DocScanner
                    onScanComplete={handleScanComplete}
                    onCancel={() => setShowScanner(false)}
                />
            )}

            {/* DigiLocker Auth Wrapper */}
            {showDigiLocker && (
                <DigiLockerAuth
                    requestId={dlReqId}
                    onSuccess={handleDigiLockerSuccess}
                    onCancel={() => setShowDigiLocker(false)}
                />
            )}

            {/* Step 3: Review */}
            {step === 'review' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-xs font-bold text-slate-500">{t.applicantName || "Name"}</span>
                            <span className="text-sm font-black text-slate-900 privacy-sensitive">{details.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-xs font-bold text-slate-500">{t.contactNumber || "Mobile"}</span>
                            <span className="text-sm font-black text-slate-900 privacy-sensitive">{details.mobile}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500">{t.docProvHeading ? "Documents" : "Documents"}</span>
                            <span className="text-sm font-black text-green-600 flex items-center gap-1">{t.eKycVerified || "Verified"} <CheckCircleIcon /></span>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button onClick={onCancel} className="flex-1 bg-slate-100 p-6 rounded-2xl font-black text-slate-500 uppercase text-xs tracking-widest hover:bg-slate-200 transition">{t.cancel || "Cancel"}</button>
                        <button onClick={handleFinalSubmit} className="flex-1 bg-blue-600 p-6 rounded-2xl font-black text-white uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-100">{t.submitReq || "Submit Request"}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);

export default ServiceFormWizard;
