import React, { useState } from 'react';
import { Download, QrCode, Search, ShieldCheck, CheckCircle, FileText, Smartphone } from 'lucide-react';
import { AccessibleButton } from '../AccessibleButton';
import { speakText } from '../../utils/speak';
import { useLanguage } from '../../contexts/LanguageContext';
import { LANGUAGES_CONFIG } from '../../constants';
import { Certificate } from '../../types/municipal';

const CERT_TYPES = [
    'Birth Certificate',
    'Death Certificate',
    'Marriage Certificate',
    'Domicile Certificate',
    'Trade License',
    'Shop Establishment'
];

export const CertificateDownload: React.FC<{ onBack: () => void; isPrivacyOn: boolean }> = ({ onBack, isPrivacyOn }) => {
    const { language } = useLanguage();
    const [step, setStep] = useState(1);
    const [type, setType] = useState('');
    const [certData, setCertData] = useState<Certificate | null>(null);
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    const handleSearch = () => {
        if (!identifier) return;
        setIsVerifying(true);
        setTimeout(() => {
            setStep(3);
            setIsVerifying(false);
            speakText({ text: "Enter the OTP sent to your registered mobile.", language: getLanguageName() });
        }, 1200);
    };

    const handleOTPAuth = () => {
        if (otp.length !== 6) return;
        setIsVerifying(true);
        setTimeout(() => {
            setCertData({
                id: `CERT-${identifier.slice(-4)}-2026`,
                type,
                issuedTo: 'Prakash Raj',
                issueDate: '2026-01-15',
                qrCodeData: `verified:aazhi.gov/${identifier}`,
                downloadUrl: '#',
                isVerified: true
            });
            setStep(4);
            setIsVerifying(false);
            speakText({ text: "Authentication successful. Your certificate is ready to print.", language: getLanguageName() });
        }, 1500);
    };

    return (
        <div className={`flex flex-col h-full bg-slate-50 w-full p-8 font-sans ${isPrivacyOn ? 'privacy-sensitive' : ''}`}>
            <div className="flex justify-between items-center mb-12">
                <AccessibleButton
                    label="← Main Menu"
                    speakLabel="Go back"
                    language={getLanguageName()}
                    onClick={onBack}
                    className="text-xl px-8 py-4 bg-white shadow-sm hover:bg-slate-100 border-none"
                />
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">E-Certificates</h2>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full">
                {step === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold mb-6 text-slate-700">Select Document Type</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {CERT_TYPES.map(ct => (
                                <AccessibleButton
                                    key={ct}
                                    label={ct}
                                    language={getLanguageName()}
                                    onClick={() => {
                                        setType(ct);
                                        setStep(2);
                                        speakText({ text: `${ct}. Enter Registration ID.`, language: getLanguageName() });
                                    }}
                                    className="min-h-[120px] text-2xl font-black bg-white shadow border-b-4 border-slate-200 hover:border-blue-500"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center mt-12">
                        <h3 className="text-3xl font-black text-slate-800 mb-8">{type} Retrieval</h3>

                        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 mb-8">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest text-left mb-2">Registration ID / Aadhaar</label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={e => setIdentifier(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 p-6 rounded-2xl text-2xl font-bold outline-none focus:border-blue-500 tracking-widest"
                                placeholder="ENTER ID"
                            />
                        </div>

                        <AccessibleButton
                            label={isVerifying ? "Searching Database..." : "Proceed to OTP"}
                            language={getLanguageName()}
                            onClick={handleSearch}
                            disabled={!identifier || isVerifying}
                            className="w-full bg-blue-600 text-white py-6 text-2xl font-black shadow-lg"
                        />
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center mt-12">
                        <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Smartphone size={40} />
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 mb-2">Enter OTP</h3>
                        <p className="text-slate-500 font-bold mb-8">Sent to your registered mobile ending in •••92</p>

                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white border-4 border-slate-200 p-6 rounded-2xl text-4xl font-black text-center outline-none focus:border-green-500 tracking-[0.5em] mb-8"
                            placeholder="------"
                        />

                        <AccessibleButton
                            label={isVerifying ? "Verifying..." : "Confirm & Download"}
                            language={getLanguageName()}
                            onClick={handleOTPAuth}
                            disabled={otp.length !== 6 || isVerifying}
                            className="w-full bg-green-600 text-white py-6 text-2xl font-black shadow-lg"
                        />
                    </div>
                )}

                {step === 4 && certData && (
                    <div className="animate-in zoom-in-95 duration-700 pt-10 max-w-3xl mx-auto text-center">
                        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-4 bg-green-500"></div>

                            <div className="flex justify-between items-start mb-12">
                                <div className="text-left">
                                    <h3 className="text-gray-400 font-black text-xs uppercase tracking-widest mb-1">State Govt of TN</h3>
                                    <h2 className="text-3xl font-black text-slate-900 mb-4">{certData.type}</h2>
                                    <p className="text-slate-500 font-medium">Issued on: {certData.issueDate}</p>
                                    <p className="text-slate-500 font-medium tracking-wider mt-1">ID: {certData.id}</p>
                                </div>
                                <div className="w-28 h-28 bg-slate-100 rounded-2xl border-4 border-white shadow flex items-center justify-center text-slate-400">
                                    <QrCode size={64} />
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-6 mb-12 border border-slate-200">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Digitally Signed By</p>
                                <p className="font-bold text-slate-800 flex items-center justify-center gap-2">
                                    Authorized Registrar <ShieldCheck className="text-green-500" size={18} />
                                </p>
                            </div>

                            <AccessibleButton
                                label="Print Official Copy"
                                speakLabel="Printing document"
                                language={getLanguageName()}
                                onClick={() => {
                                    speakText({ text: "Printing. Please collect below.", language: getLanguageName() });
                                    onBack();
                                }}
                                className="w-full bg-blue-600 text-white py-6 text-2xl font-black flex items-center justify-center gap-3"
                            >
                                <Download size={24} />
                            </AccessibleButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
