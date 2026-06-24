import React, { useState } from 'react';
import { BellRing, MessageSquare, Smartphone, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/apiClient';

interface Props {
    complaintId: string;
    defaultMobile: string;
}

const StatusSubscription: React.FC<Props> = ({ complaintId, defaultMobile }) => {
    const { t } = useTranslation();
    const [subStep, setSubStep] = useState<'idle' | 'otp' | 'success'>('idle');
    const [channel, setChannel] = useState<'sms' | 'whatsapp'>('whatsapp');
    const [contact, setContact] = useState(defaultMobile || '');
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
                complaintId: complaintId,
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
                complaintId: complaintId,
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
        <div className="bg-blue-50/50 p-8 rounded-[2rem] shadow-lg border border-blue-100 flex flex-col relative overflow-hidden w-full max-w-sm mx-auto mt-6 text-left">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
                    <BellRing size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Status Subscription</h3>
                    <p className="text-blue-600 font-bold text-xs tracking-tight">"Ping Me When Done"</p>
                </div>
            </div>

            {subStep === 'idle' && (
                <div className="flex flex-col space-y-5 animate-in fade-in relative z-10">
                    <p className="text-slate-600 text-sm font-medium leading-relaxed">
                        Skip manual tracking! Get proactive push updates at each status change.
                    </p>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preferred Channel</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setChannel('whatsapp')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all border-2 ${channel === 'whatsapp' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
                            >
                                <MessageSquare size={16} /> WhatsApp
                            </button>
                            <button 
                                onClick={() => setChannel('sms')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all border-2 ${channel === 'sms' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-transparent text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Smartphone size={16} /> SMS
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('mobileNumber') || 'Mobile Number'}</label>
                        <input
                            type="tel"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            className="w-full bg-white border-none p-4 rounded-xl font-bold text-base text-slate-800 shadow-inner focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder={t('enterTenDigit') || 'Enter 10 digit number'}
                            maxLength={10}
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">{error}</p>}

                    <button
                        onClick={handleSubscribeRequest}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (t('sending') || 'Sending...') : (t('subscribe') || 'Subscribe')} <ChevronRight size={16} />
                    </button>
                </div>
            )}

            {subStep === 'otp' && (
                <div className="flex flex-col space-y-5 animate-in slide-in-from-right fade-in relative z-10">
                    <div className="bg-white p-5 rounded-2xl shadow-sm space-y-3">
                        <h4 className="font-black text-slate-800 text-base">{t('verifySubscription') || 'Verify Subscription'}</h4>
                        <p className="text-slate-500 text-xs font-medium">
                            Enter the 4-digit PIN sent via {channel.toUpperCase()} to +91 {contact}
                        </p>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="w-full bg-slate-50 border-none p-4 rounded-xl font-black text-xl text-center text-slate-800 tracking-[0.5em] shadow-inner focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder="••••"
                            maxLength={6}
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            onClick={() => setSubStep('idle')}
                            className="px-4 py-3 bg-white text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition border border-slate-100 shadow-sm"
                        >
                            {t('backBtn') || 'Back'}
                        </button>
                        <button
                            onClick={handleVerifyOtp}
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white p-3 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                        >
                            {loading ? (t('verifying') || 'Verifying...') : (t('verify') || 'Verify')}
                        </button>
                    </div>
                </div>
            )}

            {subStep === 'success' && (
                <div className="flex flex-col items-center text-center space-y-4 animate-in zoom-in fade-in relative z-10 py-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <BellRing size={28} className="animate-bounce" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">You're Subscribed!</h3>
                        <p className="text-slate-600 font-medium text-xs leading-relaxed">
                            We'll proactively send you updates via {channel.toUpperCase()} on +91 {contact} whenever your complaint status changes.
                        </p>
                    </div>
                    <div className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold border border-blue-100 shadow-sm text-xs mt-2 inline-flex">
                        Subscription Active
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusSubscription;
