import React, { useState } from 'react';
import { CheckCircle, BellRing, MessageSquare, Smartphone, ChevronRight } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Language } from '../../types';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/apiClient';

interface Props {
    serviceName: string;
    token: string;
    mobile: string;
    onFinish: () => void;
    language?: Language;
}

const ServiceSuccess: React.FC<Props> = ({ serviceName, token, mobile, onFinish, language = Language.ENGLISH }) => {
    const { t } = useTranslation();
    
    // Status Subscription State
    const [subStep, setSubStep] = useState<'idle' | 'otp' | 'success'>('idle');
    const [channel, setChannel] = useState<'sms' | 'whatsapp'>('whatsapp');
    const [contact, setContact] = useState(mobile || '');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubscribeRequest = async () => {
        if (!contact || contact.length < 10) {
            setError(t('invalidMobile') || "Please enter a valid mobile number.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await apiClient.requestSubscription({
                complaintId: token, // We use the token as the complaint identifier
                contact,
                channel
            });
            setSubStep('otp');
        } catch (err: any) {
            setError(err.message || "Failed to request subscription.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 4) {
            setError(t('invalidOtp') || "Please enter a valid OTP.");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await apiClient.verifySubscription({
                complaintId: token,
                contact,
                channel,
                otp
            });
            setSubStep('success');
        } catch (err: any) {
            setError(err.message || "Failed to verify OTP.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-10 animate-in bounce-in w-full max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 w-full">
                {/* Left Side: Success Receipt */}
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center relative overflow-hidden flex flex-col justify-center h-full">
                    <div className="absolute top-0 left-0 w-full h-3 bg-green-500"></div>
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">{t('reqFiled') || "Request Filed!"}</h2>
                    <p className="text-slate-500 font-bold mb-8 text-sm">{t('smsSent') || "A confirmation SMS has been sent to +91"} {mobile}</p>

                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] mb-8 space-y-3">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('yourToken') || "Your Service Token"}</p>
                        <h3 className="text-5xl font-black tracking-tighter">{token}</h3>
                        <div className="flex justify-center pt-4">
                            <div className="bg-white p-3 rounded-2xl">
                                <QRCode
                                    value={`https://suvidha.gov.in/track/${token}`}
                                    size={100}
                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    viewBox={`0 0 256 256`}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">{t('scanQr') || "Scan QR to track on Mobile"}</p>
                    </div>

                    <button
                        onClick={onFinish}
                        className="w-full bg-slate-100 text-slate-600 p-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition"
                    >
                        {t('finish') || "Finish & Clear Session"}
                    </button>
                </div>

                {/* Right Side: Status Subscription Feature */}
                <div className="bg-blue-50/50 p-10 rounded-[3rem] shadow-xl border border-blue-100 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <BellRing size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Status Subscription</h3>
                            <p className="text-blue-600 font-bold text-sm tracking-tight">"Ping Me When Done"</p>
                        </div>
                    </div>

                    <p className="text-slate-600 text-sm font-medium leading-relaxed mb-8">
                        Skip manual tracking! Enter your preferred contact below and the Kiosk will send you proactive push updates at each status change.
                    </p>

                    {subStep === 'idle' && (
                        <div className="flex-1 flex flex-col justify-center space-y-6 animate-in fade-in zoom-in">
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Preferred Channel</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setChannel('whatsapp')}
                                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all border-2 ${channel === 'whatsapp' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <MessageSquare size={20} /> WhatsApp
                                    </button>
                                    <button 
                                        onClick={() => setChannel('sms')}
                                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all border-2 ${channel === 'sms' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Smartphone size={20} /> SMS
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500">Mobile Number</label>
                                <input
                                    type="tel"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    className="w-full bg-white border-none p-5 rounded-2xl font-bold text-lg text-slate-800 shadow-inner focus:ring-4 focus:ring-blue-100 outline-none transition"
                                    placeholder="Enter 10 digit number"
                                    maxLength={10}
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}

                            <button
                                onClick={handleSubscribeRequest}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-auto"
                            >
                                {loading ? "Sending..." : "Subscribe for Updates"} <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {subStep === 'otp' && (
                        <div className="flex-1 flex flex-col justify-center space-y-6 animate-in slide-in-from-right fade-in">
                            <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
                                <h4 className="font-black text-slate-800 text-lg">Verify Subscription</h4>
                                <p className="text-slate-500 text-sm font-medium">
                                    Enter the 4-digit PIN sent via {channel.toUpperCase()} to +91 {contact}
                                </p>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black text-2xl text-center text-slate-800 tracking-[0.5em] shadow-inner focus:ring-4 focus:ring-blue-100 outline-none transition"
                                    placeholder="••••"
                                    maxLength={6}
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}

                            <div className="flex gap-3 mt-auto">
                                <button
                                    onClick={() => setSubStep('idle')}
                                    className="px-6 py-5 bg-white text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleVerifyOtp}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? "Verifying..." : "Verify & Enable"}
                                </button>
                            </div>
                        </div>
                    )}

                    {subStep === 'success' && (
                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 animate-in zoom-in fade-in">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[2.5rem] flex items-center justify-center">
                                <BellRing size={40} className="animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">You're Subscribed!</h3>
                                <p className="text-slate-600 font-medium leading-relaxed">
                                    We'll proactively send you updates via {channel.toUpperCase()} on +91 {contact} whenever your complaint status changes.
                                </p>
                            </div>
                            <div className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold border border-blue-100 shadow-sm mt-4 inline-flex">
                                Subscription Active
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceSuccess;
