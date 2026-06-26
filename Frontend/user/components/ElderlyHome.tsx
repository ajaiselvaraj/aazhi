import React from 'react';
import { CreditCard, HeartHandshake, AlertTriangle, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Language } from '../types';
import cdacLogo from '../assets/cdac_logo.png';

interface ElderlyHomeProps {
  onSelect: (target: 'billing' | 'ai' | 'emergency') => void;
  onExit: () => void;
  language?: Language;
}

export const ElderlyHome: React.FC<ElderlyHomeProps> = ({ onSelect, onExit }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen h-screen w-full bg-[#F4F6FA] text-slate-900 flex flex-col justify-between p-6 md:p-12 select-none font-sans overflow-y-auto">
      {/* Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b-4 border-slate-300 mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <img src={cdacLogo} alt="CDAC Logo" className="h-14 md:h-16 w-auto object-contain" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-blue-950 tracking-tight leading-none">AAZHI</h1>
            <p className="text-sm md:text-base font-bold text-slate-600 tracking-wider uppercase mt-1">Senior Citizen Mode (65+)</p>
          </div>
        </div>

        <button
          onClick={onExit}
          style={{ minHeight: '64px', borderRadius: '16px' }}
          className="bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 px-6 py-3 font-black text-lg md:text-xl flex items-center gap-3 border-2 border-red-300 shadow-md transition-all"
        >
          <LogOut size={28} strokeWidth={2.5} />
          <span>EXIT</span>
        </button>
      </header>

      {/* Main Content: Three Giant Cards */}
      <main className="w-full max-w-4xl mx-auto my-auto flex flex-col gap-8 md:gap-10 py-4 shrink-0">
        {/* CARD 1: PAY BILL */}
        <button
          onClick={() => onSelect('billing')}
          style={{ minHeight: '140px', fontSize: '36px', borderRadius: '28px' }}
          className="w-full bg-[#1E3A8A] hover:bg-[#1d4ed8] active:scale-[0.98] transition-all text-white font-black shadow-[0_10px_30px_rgba(30,58,138,0.3)] flex items-center justify-start px-10 md:px-16 gap-8 border-4 border-blue-300"
        >
          <div className="w-20 h-20 shrink-0 bg-white/10 rounded-2xl flex items-center justify-center border-2 border-white/20">
            <CreditCard size={56} className="text-blue-200" strokeWidth={2.5} />
          </div>
          <span className="tracking-wide uppercase text-left leading-tight">
            💳 {t('navPayBills') || 'PAY BILL'}
          </span>
        </button>

        {/* CARD 2: GET HELP */}
        <button
          onClick={() => onSelect('ai')}
          style={{ minHeight: '140px', fontSize: '36px', borderRadius: '28px' }}
          className="w-full bg-[#047857] hover:bg-[#059669] active:scale-[0.98] transition-all text-white font-black shadow-[0_10px_30px_rgba(4,120,87,0.3)] flex items-center justify-start px-10 md:px-16 gap-8 border-4 border-emerald-300"
        >
          <div className="w-20 h-20 shrink-0 bg-white/10 rounded-2xl flex items-center justify-center border-2 border-white/20">
            <HeartHandshake size={56} className="text-emerald-200" strokeWidth={2.5} />
          </div>
          <span className="tracking-wide uppercase text-left leading-tight">
            🤝 {t('getHelp') || t('navAssistant') || 'GET HELP'}
          </span>
        </button>

        {/* CARD 3: EMERGENCY */}
        <button
          onClick={() => onSelect('emergency')}
          style={{ minHeight: '140px', fontSize: '36px', borderRadius: '28px' }}
          className="w-full bg-[#B91C1C] hover:bg-[#dc2626] active:scale-[0.98] transition-all text-white font-black shadow-[0_10px_30px_rgba(185,28,28,0.3)] flex items-center justify-start px-10 md:px-16 gap-8 border-4 border-red-300 animate-pulse"
        >
          <div className="w-20 h-20 shrink-0 bg-white/10 rounded-2xl flex items-center justify-center border-2 border-white/20">
            <AlertTriangle size={56} className="text-red-200" strokeWidth={2.5} />
          </div>
          <span className="tracking-wide uppercase text-left leading-tight">
            🚨 {t('emergency') || 'EMERGENCY'}
          </span>
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center pt-6 border-t-2 border-slate-200 mt-8 text-slate-500 font-bold text-sm md:text-base tracking-wider shrink-0">
        <p>Govt. of India Official Portal · Simplified Navigation Mode</p>
      </footer>
    </div>
  );
};

export default ElderlyHome;
