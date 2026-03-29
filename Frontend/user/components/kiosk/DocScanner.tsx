import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertTriangle, RefreshCw, Scan, X } from 'lucide-react';

interface Props {
    onScanComplete: () => void;
    onCancel: () => void;
}

const DocScanner: React.FC<Props> = ({ onScanComplete, onCancel }) => {
    const [scanState, setScanState] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
    const [feedback, setFeedback] = useState<string>('Place document on the glass bed');
    const [qualityScore, setQualityScore] = useState(0);

    const startScan = () => {
        setScanState('scanning');
        setFeedback('Aligning document boundaries...');
        setQualityScore(0);

        // Simulation sequence
        setTimeout(() => {
            setFeedback('Detecting glare...');
            setQualityScore(30);
        }, 1500);

        setTimeout(() => {
            setFeedback('Auto-cropping image...');
            setQualityScore(60);
        }, 3000);

        setTimeout(() => {
            setFeedback('Enhancing text contrast...');
            setQualityScore(90);
        }, 4500);

        setTimeout(() => {
            setScanState('success');
            setFeedback('Scan Complete!');
            setQualityScore(100);
            setTimeout(onScanComplete, 1500);
        }, 6000);
    };

    return (
        <div className="bg-slate-900/5 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden animate-in zoom-in-95">
                <button onClick={onCancel} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition">
                    <X size={20} />
                </button>

                <div className="text-center mb-8">
                    <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase">Smart Document Scanner</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{feedback}</p>
                </div>

                <div className="relative aspect-[3/4] bg-slate-100 rounded-3xl overflow-hidden border-4 border-slate-200 border-dashed mb-8 group cursor-pointer" onClick={scanState === 'idle' ? startScan : undefined}>
                    {scanState === 'idle' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 transition group-hover:bg-slate-50 group-hover:text-blue-500">
                            <Upload size={48} className="mb-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Tap to Scan</span>
                        </div>
                    )}

                    {scanState === 'scanning' && (
                        <>
                            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_20px_cyan] animate-[scan-beam_2s_infinite_alternate_ease-in-out] z-10"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Scan size={64} className="text-slate-300 animate-pulse" />
                            </div>
                            {/* Simulated Glare Overlay */}
                            <div className="absolute top-10 right-10 w-20 h-20 bg-white/40 blur-xl rounded-full animate-pulse"></div>
                        </>
                    )}

                    {scanState === 'success' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-50 text-green-600 animate-in fade-in">
                            <CheckCircle size={64} className="mb-4" />
                            <span className="text-xl font-black uppercase">Verified</span>
                        </div>
                    )}
                </div>

                {scanState !== 'idle' && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 mb-2">
                            <span>Quality Check</span>
                            <span>{qualityScore}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${qualityScore}%` }}></div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            {qualityScore > 20 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1"><CheckCircle size={10} /> Glare Free</span>}
                            {qualityScore > 50 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1"><CheckCircle size={10} /> Edges Detected</span>}
                            {qualityScore > 80 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1"><CheckCircle size={10} /> Text Readable</span>}
                        </div>
                    </div>
                )}
            </div>
            <style>{`
        @keyframes scan-beam { 0% { top: 0; } 100% { top: 100%; } }
      `}</style>
        </div>
    );
};

export default DocScanner;
