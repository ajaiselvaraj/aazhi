import React from 'react';
import { useVoice } from './useVoice';

const VoiceOverlay: React.FC = () => {
  const { status, transcript, error, language } = useVoice();

  if (status === 'idle' && !error) return null;

  return (
    <div className="fixed top-24 right-32 w-80 max-w-[calc(100vw-3rem)] z-50 pointer-events-none animate-in fade-in slide-in-from-top-5">
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Voice Assistant ({language})
          </span>
          {status === 'listening' && (
             <span className="flex h-2 w-2 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
             </span>
          )}
        </div>
        
        <div className="text-sm font-medium text-slate-800 break-words">
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : status === 'listening' ? (
            <span className="text-slate-400 italic">Listening...</span>
          ) : status === 'processing' ? (
            <span className="text-slate-500 italic">Processing: "{transcript}"</span>
          ) : transcript ? (
            <span>"{transcript}"</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VoiceOverlay;
