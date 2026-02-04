import React, { useState } from 'react';
import { ShieldCheck, X, Smartphone, ArrowRight, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { fetchDigiLockerDocuments } from '../../../services/api/digilockerService';
import { DigiLockerDoc } from '../../../types/digilocker';

interface Props {
    requestId: string;
    onSuccess: (docs: DigiLockerDoc[]) => void;
    onCancel: () => void;
}

const DigiLockerAuth: React.FC<Props> = ({ requestId, onSuccess, onCancel }) => {
    const [step, setStep] = useState<'LOGIN' | 'OTP' | 'CONSENT' | 'FETCHING'>('LOGIN');
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');

    const handleLogin = () => {
        if (mobile.length === 10) setStep('OTP');
    };

    const handleVerify = () => {
        if (otp === '123456') {
            setStep('CONSENT');
        } else {
            alert("For demo, enter OTP: 123456");
        }
    };

    const handleConsent = async () => {
        setStep('FETCHING');
        try {
            const docs = await fetchDigiLockerDocuments(requestId);
            onSuccess(docs);
        } catch (err) {
            alert("Failed to fetch documents");
            onCancel();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
                {/* Header */}
                <div className="bg-[#2E3192] p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-lg">
                            {/* Simplified DigiLocker Logo Rep */}
                            <div className="w-6 h-6 bg-[#2E3192] rounded flex items-center justify-center font-black text-xs">DL</div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-none">DigiLocker</h3>
                            <p className="text-[10px] opacity-75 uppercase tracking-widest">Govt. of India</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition"><X size={16} /></button>
                </div>

                <div className="p-8">
                    {step === 'LOGIN' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h4 className="text-xl font-bold text-slate-800">Sign In to your account</h4>
                                <p className="text-xs text-slate-500 mt-1">Access your digital documents securely.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Mobile / Aadhaar</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={10}
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-lg outline-none focus:border-[#2E3192]"
                                        placeholder="98765 43210"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                                    />
                                    <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                            </div>
                            <button
                                onClick={handleLogin}
                                disabled={mobile.length !== 10}
                                className="w-full bg-[#2E3192] text-white p-4 rounded-xl font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-900 transition disabled:opacity-50"
                            >
                                Next <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {step === 'OTP' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h4 className="text-xl font-bold text-slate-800">Verify OTP</h4>
                                <p className="text-xs text-slate-500 mt-1">Enter code sent to +91 {mobile}</p>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    maxLength={6}
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-black text-2xl text-center outline-none focus:border-[#2E3192] tracking-[0.5em]"
                                    placeholder="------"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                                <p className="text-[10px] text-center mt-4 text-slate-400 font-bold">Demo OTP: 123456</p>
                            </div>
                            <button
                                onClick={handleVerify}
                                className="w-full bg-[#00A651] text-white p-4 rounded-xl font-bold shadow-xl shadow-green-100 flex items-center justify-center gap-2 hover:bg-green-700 transition"
                            >
                                Verify & Sign In <ShieldCheck size={18} />
                            </button>
                        </div>
                    )}

                    {step === 'CONSENT' && (
                        <div className="space-y-6">
                            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
                                <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-sm mb-4">
                                    <Lock className="text-indigo-600" size={32} />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-2">Allow Access?</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    <span className="font-bold text-slate-900">SUVIDHA Kiosk</span> requests access to your <span className="font-bold text-slate-900">Aadhaar</span> and <span className="font-bold text-slate-900">Driving License</span> for verification.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <button
                                    onClick={handleConsent}
                                    className="w-full bg-[#2E3192] text-white p-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-900 transition"
                                >
                                    Allow Access <CheckCircle size={18} />
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="w-full bg-white text-slate-500 border border-slate-200 p-4 rounded-xl font-bold transition hover:bg-slate-50"
                                >
                                    Deny
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'FETCHING' && (
                        <div className="py-10 flex flex-col items-center justify-center text-center">
                            <Loader2 size={48} className="text-[#2E3192] animate-spin mb-6" />
                            <h4 className="font-bold text-slate-900 mb-2">Fetching Documents...</h4>
                            <p className="text-xs text-slate-500">Retrieving standard documents from Issuer</p>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        <Lock size={10} /> Secured by MeitY
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DigiLockerAuth;
