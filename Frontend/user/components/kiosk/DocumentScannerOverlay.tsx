import React, { useState, useEffect } from 'react';
import { Camera, X, CheckCircle, RefreshCw, Smartphone, ScanLine, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

interface Props {
  onScanComplete: (fileName: string) => void;
  onClose: () => void;
  documentName?: string;
}

const DocumentScannerOverlay: React.FC<Props> = ({ onScanComplete, onClose, documentName }) => {
  const { t } = useTranslation();
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'processing' | 'done'>('idle');
  
  useEffect(() => {
     if (scanState === 'scanning') {
         // Simulate hardware scanner warming up
         setTimeout(() => {
             setScanState('processing');
             // Simulate image processing OCR
             setTimeout(() => {
                 setScanState('done');
                 setTimeout(() => {
                     onScanComplete(`Scanned_${documentName || 'Document'}_${Date.now()}.pdf`);
                 }, 1500);
             }, 2000);
         }, 2500);
     }
  }, [scanState, documentName, onScanComplete]);

  const ScannerUI = (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        {/* Left Side: Instructions */}
        <div className="bg-indigo-900 p-10 text-white flex-1 flex flex-col justify-between">
           <div>
               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 backdrop-blur-sm border border-white/20">
                   <ScanLine size={32} />
               </div>
               <h3 className="text-3xl font-black tracking-tight mb-4">Official Document Scanner</h3>
               <p className="text-indigo-200 font-medium leading-relaxed mb-8">
                   Please place your {documentName ? <strong className="text-white bg-indigo-800 px-2 py-0.5 rounded">{documentName}</strong> : 'document'} face down on the glass scanner bed exactly on the alignment marks.
               </p>

               <ul className="space-y-4">
                   {[
                       'Ensure the glass is clean',
                       'Align along the top-left corner',
                       'Do not open lid while scanning'
                   ].map((step, i) => (
                       <li key={i} className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                           <span className="text-sm text-indigo-100 font-medium">{step}</span>
                       </li>
                   ))}
               </ul>
           </div>
           
           <button onClick={onClose} className="mt-12 py-4 px-6 border-2 border-indigo-700 hover:bg-indigo-800 rounded-2xl font-bold uppercase tracking-widest text-xs transition flex items-center justify-center gap-2">
               <X size={16} /> Cancel Scanning
           </button>
        </div>

        {/* Right Side: Scanner Feed/Status */}
        <div className="p-10 flex-[1.5] bg-slate-50 flex flex-col items-center justify-center relative shadow-inner">
            {scanState === 'idle' && (
                <div className="text-center animate-in zoom-in-95">
                    <div className="w-48 h-64 border-4 border-dashed border-slate-300 rounded-xl mb-8 mx-auto relative bg-white shadow-sm flex items-center justify-center group overflow-hidden">
                        <FileText size={64} className="text-slate-200 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute top-4 left-4 w-4 h-4 border-t-4 border-l-4 border-indigo-500 rounded-tl"></div>
                        <div className="absolute top-4 right-4 w-4 h-4 border-t-4 border-r-4 border-indigo-500 rounded-tr"></div>
                        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-4 border-l-4 border-indigo-500 rounded-bl"></div>
                        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-4 border-r-4 border-indigo-500 rounded-br"></div>
                    </div>
                    <button 
                        onClick={() => setScanState('scanning')}
                        className="bg-green-600 text-white px-12 py-5 rounded-full text-xl font-black hover:bg-green-700 transition shadow-xl shadow-green-200 hover:-translate-y-1 hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                    >
                        <Camera size={28} /> Start Hardware Scan
                    </button>
                </div>
            )}

            {scanState === 'scanning' && (
                <div className="text-center w-full max-w-sm">
                    <h4 className="text-2xl font-black text-slate-800 mb-2">Scanning in progress...</h4>
                    <p className="text-slate-500 font-medium mb-12">Please keep the lid closed</p>
                    
                    <div className="relative w-full h-64 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-slate-100 flex justify-center pt-8">
                            <FileText size={120} className="text-slate-200" />
                        </div>
                        {/* Scanner light beam animation */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] z-10 animate-[scan_2s_ease-in-out_infinite_alternate]"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-green-500/10 z-0 animate-[scan-bg_2s_ease-in-out_infinite_alternate]"></div>
                    </div>
                </div>
            )}

            {scanState === 'processing' && (
                <div className="text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <RefreshCw size={40} className="animate-spin" />
                    </div>
                    <h4 className="text-2xl font-black text-slate-800 mb-2">Optimizing PDF...</h4>
                    <p className="text-slate-500 font-medium">Running secure OCR analysis</p>
                </div>
            )}

            {scanState === 'done' && (
                <div className="text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} />
                    </div>
                    <h4 className="text-3xl font-black text-slate-800 mb-2">{t('scanComplete') || 'Scan Complete!'}</h4>
                    <p className="text-slate-500 font-medium">Document safely attached to your application.</p>
                </div>
            )}
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(256px); }
        }
        @keyframes scan-bg {
          0% { height: 0; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );

  return createPortal(ScannerUI, document.body);
};

export default DocumentScannerOverlay;
