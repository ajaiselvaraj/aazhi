import React from 'react';
import { CheckCircle } from 'lucide-react';
import QRCode from 'react-qr-code';

interface Props {
    serviceName: string;
    token: string;
    mobile: string;
    onFinish: () => void;
}

const ServiceSuccess: React.FC<Props> = ({ serviceName, token, mobile, onFinish }) => {
    return (
        <div className="flex flex-col items-center justify-center py-10 animate-in bounce-in">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 max-w-lg w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-3 bg-green-500"></div>
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                    <CheckCircle size={56} />
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Request Filed!</h2>
                <p className="text-slate-500 font-bold mb-10">A confirmation SMS has been sent to +91 {mobile}</p>

                <div className="bg-slate-900 text-white p-8 rounded-[3rem] mb-10 space-y-4">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Your Service Token</p>
                    <h3 className="text-7xl font-black tracking-tighter">{token}</h3>
                    <div className="flex justify-center pt-6">
                        <div className="bg-white p-4 rounded-3xl">
                            <QRCode
                                value={`https://suvidha.gov.in/track/${token}`}
                                size={120}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">Scan QR to continue on Mobile</p>
                </div>

                <button
                    onClick={onFinish}
                    className="w-full bg-slate-100 text-slate-600 p-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition"
                >
                    Finish & Clear Session
                </button>
            </div>
        </div>
    );
};

export default ServiceSuccess;
