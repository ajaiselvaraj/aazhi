import React, { useState } from 'react';
import { FileText, ArrowRight, Upload, X, ShieldCheck } from 'lucide-react';
import DocScanner from './DocScanner';
import DigiLockerAuth from './digilocker/DigiLockerAuth';
import { DigiLockerDoc } from '../../types/digilocker';

interface Props {
    serviceName: string;
    mode: 'SELF' | 'COUNTER';
    onCancel: () => void;
    onSubmit: (data: any) => void;
}

const ServiceFormWizard: React.FC<Props> = ({ serviceName, mode, onCancel, onSubmit }) => {
    const [step, setStep] = useState<'details' | 'scan' | 'review'>('details');
    const [details, setDetails] = useState({ name: 'Arun Kumar', mobile: '9876543210' });
    const [scanComplete, setScanComplete] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

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

    // Assisted prompts mapping
    const getPrompt = () => {
        if (step === 'details') return "Please confirm your personal details for the application.";
        if (step === 'scan') return "We need to verify your identity. Please scan your Aadhaar.";
        if (step === 'review') return "Review all details before final submission.";
        return "";
    };

    const handleScanComplete = () => {
        setShowScanner(false);
        setScanComplete(true);
        setStep('review');
    };

    return (
        <div className="bg-white rounded-[3rem] shadow-2xl border p-12 max-w-2xl mx-auto animate-in zoom-in-95 relative overflow-hidden">
            {/* Wizard Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-900 text-white rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Application Wizard</h2>
                    <p className="text-xs text-blue-600 font-black uppercase tracking-widest">{serviceName} • {mode}</p>
                </div>
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
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Applicant Name</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus:border-blue-600 outline-none font-bold text-slate-900 privacy-sensitive"
                                value={details.name}
                                onChange={e => setDetails({ ...details, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                            <input
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
                        Next Step <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {/* Step 2: Document Upload Selection */}
            {step === 'scan' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <h3 className="text-xl font-black text-slate-900 text-center mb-4">How would you like to provide documents?</h3>

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
                                    <h4 className="font-black text-lg group-hover:text-white text-[#2E3192]">Fetch from DigiLocker</h4>
                                    <p className="text-xs font-bold opacity-60 mt-1 uppercase tracking-widest group-hover:text-indigo-100">Recommended • Instant Verification</p>
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
                            <span className="bg-white px-4 text-xs font-bold text-slate-400 uppercase relative z-10">OR</span>
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-100"></div>
                        </div>

                        <button
                            onClick={() => setShowScanner(true)}
                            className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] flex items-center justify-between group hover:border-slate-300 transition-all text-slate-500 hover:text-slate-900"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border text-slate-400 group-hover:text-slate-900 group-hover:scale-110 transition"><Upload size={24} /></div>
                                <div className="text-left">
                                    <h4 className="font-bold text-base">Upload Manually</h4>
                                    <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">Scan Physical Copies</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <div className="flex justify-center mt-4">
                        <button onClick={() => setStep('details')} className="text-slate-400 font-bold text-xs uppercase hover:text-slate-600">Back</button>
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
                            <span className="text-xs font-bold text-slate-500">Name</span>
                            <span className="text-sm font-black text-slate-900 privacy-sensitive">{details.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-xs font-bold text-slate-500">Mobile</span>
                            <span className="text-sm font-black text-slate-900 privacy-sensitive">{details.mobile}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500">Documents</span>
                            <span className="text-sm font-black text-green-600 flex items-center gap-1">Verified <CheckCircleIcon /></span>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button onClick={onCancel} className="flex-1 bg-slate-100 p-6 rounded-2xl font-black text-slate-500 uppercase text-xs tracking-widest hover:bg-slate-200 transition">Cancel</button>
                        <button onClick={() => onSubmit(details)} className="flex-1 bg-blue-600 p-6 rounded-2xl font-black text-white uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-100">Submit Request</button>
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
