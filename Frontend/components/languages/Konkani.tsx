import React from 'react';
import { ArrowLeft, Globe, Zap, CheckCircle2 } from 'lucide-react';

interface Props {
    onBack: () => void;
    onContinue: () => void;
}

const KonkaniPage: React.FC<Props> = ({ onBack, onContinue }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 flex flex-col items-center justify-center font-sans w-full">
            <div className="w-full max-w-4xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/50 p-10 relative overflow-hidden">
                {/* Decorative Blobs */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

                <button onClick={onBack} className="relative z-10 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold mb-8 transition-colors group">
                    <div className="bg-slate-100 group-hover:bg-blue-100 p-2 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </div>
                    Back to Language Selection
                </button>

                <div className="relative z-10 flex items-start gap-8 flex-col md:flex-row">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold text-xs uppercase tracking-widest rounded-full">Supported Language</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-800 mb-2 tracking-tight">Konkani <span className="text-blue-600 font-normal ml-2" style={{ fontFamily: '"Noto Sans Devanagari", sans-serif' }}>(कोंकणी)</span></h1>
                        <p className="text-slate-600 text-lg leading-relaxed mb-8">
                            Konkani is an Indo-Aryan language spoken along the western coast of India. It is the official language of Goa and is officially written in the Devanagari script.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <Globe className="text-blue-500 mb-3" size={24} />
                                <h3 className="font-bold text-slate-800">Region</h3>
                                <p className="text-sm text-slate-500">Goa & Konkan Coast</p>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <Zap className="text-amber-500 mb-3" size={24} />
                                <h3 className="font-bold text-slate-800">Script</h3>
                                <p className="text-sm text-slate-500">Devanagari</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-[400px] bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden flex-shrink-0">
                        <div className="bg-slate-800 p-4 text-center">
                            <h3 className="text-white font-bold tracking-wide">Interface Preview</h3>
                        </div>
                        <div className="p-6 space-y-4" style={{ fontFamily: '"Noto Sans Devanagari", sans-serif' }}>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-slate-400 text-sm font-sans">Welcome</span>
                                <span className="text-slate-800 font-bold text-lg">येवकार</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-slate-400 text-sm font-sans">Continue</span>
                                <span className="text-slate-800 font-bold text-lg">फुडें वचात</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-slate-400 text-sm font-sans">Login</span>
                                <span className="text-slate-800 font-bold text-lg">भितर सरप</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <span className="text-slate-400 text-sm font-sans">Help</span>
                                <span className="text-slate-800 font-bold text-lg">मदत</span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50">
                            <button onClick={onContinue} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-md hover:shadow-lg active:scale-95">
                                <CheckCircle2 size={18} /> Apply & Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KonkaniPage;
