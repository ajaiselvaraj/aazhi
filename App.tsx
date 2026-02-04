
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Language } from './types';
import KioskUI from './components/KioskUI';
import Documentation from './components/Documentation';
import Admin from './components/Admin';
import { Globe, Fingerprint, ShieldCheck, ChevronRight, Lock, User, Key, ArrowLeft, RefreshCw, Smartphone, Clock, EyeOff, Shield } from 'lucide-react';
import { APP_CONFIG, TRANSLATIONS } from './constants';

const LOGOUT_TIME = 120; // 2 Minutes

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('aazhi_lang');
    return (saved as Language) || Language.ENGLISH;
  });

  // Security & Privacy States
  const [timer, setTimer] = useState(LOGOUT_TIME);
  const [isPrivacyShieldOn, setIsPrivacyShieldOn] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Unified Login States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loginStep, setLoginStep] = useState<'IDENTIFIER' | 'OTP' | 'PASSWORD'>('IDENTIFIER');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    localStorage.setItem('aazhi_lang', language);
  }, [language]);

  // Handle inactivity auto-logout
  useEffect(() => {
    if (view === ViewState.DASHBOARD || view === ViewState.ADMIN) {
      timerRef.current = window.setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            handleBackToLanding();
            return LOGOUT_TIME;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimer(LOGOUT_TIME);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view]);

  const resetTimer = () => setTimer(LOGOUT_TIME);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setView(ViewState.LOGIN);
    setError('');
  };

  const t = TRANSLATIONS[language];

  const handleContinue = () => {
    setError('');
    if (!identifier) {
      setError("Please enter Aadhaar number or Official ID");
      return;
    }
    const isNumericOnly = /^\d+$/.test(identifier);
    const isAadhaarFormat = isNumericOnly && identifier.length === 12;
    if (isAadhaarFormat) {
      setIsProcessing(true);
      setTimeout(() => {
        setLoginStep('OTP');
        setIsProcessing(false);
      }, 1000);
    } else {
      if (identifier === '963852') {
        setLoginStep('PASSWORD');
      } else if (isNumericOnly && identifier.length < 12) {
        setError("Invalid Aadhaar number");
      } else {
        setError("Unauthorized access");
      }
    }
  };

  const verifyCitizenOtp = () => {
    if (otp.length === 6) {
      setIsProcessing(true);
      setTimeout(() => {
        setView(ViewState.DASHBOARD);
        setIsProcessing(false);
      }, 1000);
    } else {
      setError('Invalid OTP. Please enter 6 digits.');
    }
  };

  const verifyAdminPass = () => {
    if (password === '123456') {
      setIsProcessing(true);
      setTimeout(() => {
        setView(ViewState.ADMIN);
        setIsProcessing(false);
      }, 1000);
    } else {
      setError('Unauthorized access');
    }
  };

  const resetLogin = () => {
    setIdentifier('');
    setPassword('');
    setOtp('');
    setLoginStep('IDENTIFIER');
    setError('');
  };

  const handleBackToLanding = () => {
    setView(ViewState.LANDING);
    resetLogin();
    setIsPrivacyShieldOn(false);
  };

  const renderLanding = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F8F9FB] text-slate-900 relative overflow-hidden font-sans">
      {/* Background Watermark: Indian Emblem */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03] pointer-events-none z-0">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
          alt="Indian Emblem"
          className="w-full h-full object-contain grayscale"
        />
      </div>

      <header className="text-center mb-16 z-10 w-full max-w-4xl mx-auto">
        <h1 className="text-8xl font-black tracking-tighter mb-4 text-blue-950 drop-shadow-sm">
          {APP_CONFIG.TITLE}
        </h1>
        <p className="text-2xl text-slate-600 font-medium mb-8 tracking-tight">
          {APP_CONFIG.SUBTITLE}
        </p>
        <div className="inline-flex items-center gap-3 bg-white border border-slate-200 px-6 py-2 rounded-full shadow-sm">
          <ShieldCheck size={16} className="text-blue-600" />
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-blue-900">
            {APP_CONFIG.TAGLINE}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl z-10 px-4">
        {[
          { lang: Language.ENGLISH, label: 'English', sub: 'English' },
          { lang: Language.HINDI, label: 'हिन्दी', sub: 'Hindi' },
          { lang: Language.TAMIL, label: 'தமிழ்', sub: 'Tamil' },
          { lang: Language.BENGALI, label: 'বাংলা', sub: 'Bengali' },
          { lang: Language.MARATHI, label: 'मराठी', sub: 'Marathi' },
          { lang: Language.TELUGU, label: 'తెలుగు', sub: 'Telugu' },
          { lang: Language.GUJARATI, label: 'ગુજરાતી', sub: 'Gujarati' },
          { lang: Language.MALAYALAM, label: 'മലയാളം', sub: 'Malayalam' }
        ].map((item) => (
          <button
            key={item.lang}
            onClick={() => handleLanguageSelect(item.lang)}
            className="group relative bg-white border border-slate-100 p-6 rounded-[2rem] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-100 hover:border-blue-500 hover:ring-1 hover:ring-blue-500 text-center h-48 flex flex-col items-center justify-center gap-1 active:scale-95"
          >
            <span className="text-4xl font-black text-slate-800 mb-2 tracking-wide group-hover:scale-110 transition-transform duration-300">
              {item.label}
            </span>
            <span className="text-lg font-bold text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">
              {item.sub}
            </span>
          </button>
        ))}
      </div>

      <footer className="mt-20 z-10 text-center opacity-60 flex flex-col items-center gap-2 text-slate-500">
        <div className="flex items-center gap-6 text-xs font-black tracking-[0.3em] uppercase">
          <button onClick={() => setView(ViewState.DOCUMENTATION)} className="hover:text-blue-600 transition">Documentation</button>
          <span>|</span>
          <span>Govt. of India – Smart City 2.0</span>
        </div>
        <p className="text-[10px] font-medium tracking-wide opacity-50">Secure • Encrypted • Private</p>
      </footer>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 z-10 p-10">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl rotate-12 flex items-center justify-center shadow-xl shadow-blue-200">
            <Fingerprint size={40} className="-rotate-12" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-900 mb-2">{t.welcome}</h2>
          <p className="text-sm text-gray-500 font-medium">{t.loginSubtitle}</p>
        </div>

        <div className="space-y-6">
          {loginStep === 'IDENTIFIER' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">{t.enterId}</label>
              <div className="relative group">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value.trim());
                    setError('');
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-600 focus:bg-white transition group-hover:border-gray-200"
                  placeholder="e.g. 1234 5678 9012"
                />
                <User className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition" size={24} />
              </div>
              <p className="text-[10px] text-gray-400 mt-4 leading-relaxed px-1 font-medium">
                {t.aadhaarHint}
              </p>
              <button
                onClick={handleContinue}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition shadow-xl shadow-blue-100 mt-8 flex items-center justify-center gap-3 active:scale-95"
              >
                {isProcessing ? <RefreshCw className="animate-spin" /> : t.continue} <ArrowRightIcon />
              </button>
            </div>
          )}

          {loginStep === 'OTP' && (
            <div className="animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.otpVerification}</label>
                <button onClick={resetLogin} className="text-[10px] font-bold text-blue-600 hover:underline">Change ID</button>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl text-3xl tracking-[0.6em] font-black text-center outline-none focus:border-green-500 focus:bg-white transition"
                  placeholder="------"
                />
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-200" size={20} />
              </div>
              <p className="text-[10px] text-gray-400 mt-4 text-center">{t.otpHint}</p>
              <button
                onClick={verifyCitizenOtp}
                disabled={isProcessing || otp.length !== 6}
                className="w-full bg-green-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-green-700 transition shadow-xl shadow-green-100 mt-8 active:scale-95"
              >
                {isProcessing ? 'Verifying...' : t.loginCitizen}
              </button>
            </div>
          )}

          {loginStep === 'PASSWORD' && (
            <div className="animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.officialPassword}</label>
                <button onClick={resetLogin} className="text-[10px] font-bold text-blue-600 hover:underline">Change ID</button>
              </div>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 p-5 rounded-2xl text-xl font-bold outline-none focus:border-indigo-600 focus:bg-white transition"
                  placeholder="••••••••"
                />
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300" size={24} />
              </div>
              <button
                onClick={verifyAdminPass}
                disabled={isProcessing || !password}
                className="w-full bg-indigo-950 text-white p-5 rounded-2xl font-black text-lg hover:bg-black transition shadow-xl shadow-indigo-100 mt-8 active:scale-95"
              >
                {isProcessing ? 'Authenticating...' : t.accessAdmin}
              </button>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col items-center">
          <button
            onClick={() => setView(ViewState.LANDING)}
            className="text-gray-400 font-bold p-2 hover:text-gray-600 transition text-xs flex items-center gap-2"
          >
            <ArrowLeft size={14} /> {t.backToLang}
          </button>
        </div>
      </div>

      {error && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-2xl z-50 animate-in slide-in-from-top-10 flex items-center gap-3">
          <AlertCircleIcon /> {error}
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-30 text-xs font-bold text-blue-900 pointer-events-none">
        <ShieldCheck size={16} />
        <p>SECURE MEITY COMPLIANT KIOSK</p>
      </div>
    </div>
  );

  return (
    <div
      className={`font-sans antialiased text-gray-900 selection:bg-blue-100 h-screen overflow-hidden ${isPrivacyShieldOn ? 'privacy-active' : ''}`}
      onClick={resetTimer}
      onKeyDown={resetTimer}
    >
      {/* Session Timer & Shield UI Overlay */}
      {(view === ViewState.DASHBOARD || view === ViewState.ADMIN) && (
        <div className="fixed top-4 right-4 z-[9999] flex items-center gap-4 bg-white/90 backdrop-blur border p-2 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-xl">
            <Clock size={16} className={timer < 30 ? 'text-red-500 animate-pulse' : 'text-slate-500'} />
            <span className={`text-xs font-black ${timer < 30 ? 'text-red-600' : 'text-slate-900'}`}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span>
          </div>
          <button
            onClick={() => setIsPrivacyShieldOn(!isPrivacyShieldOn)}
            className={`p-2 rounded-xl transition-all ${isPrivacyShieldOn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            title={t.privacyShield}
          >
            {isPrivacyShieldOn ? <Shield size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
      )}

      {view === ViewState.LANDING && renderLanding()}
      {view === ViewState.LOGIN && renderLogin()}
      {view === ViewState.DASHBOARD && (
        <KioskUI
          language={language}
          onNavigate={setView}
          onLogout={handleBackToLanding}
          isPrivacyShield={isPrivacyShieldOn}
        />
      )}
      {view === ViewState.DOCUMENTATION && (
        <div className="min-h-screen bg-slate-100 p-8 overflow-auto">
          <Documentation onBack={() => setView(ViewState.LANDING)} />
        </div>
      )}
      {view === ViewState.ADMIN && (
        <Admin
          onBack={handleBackToLanding}
          language={language}
          onLanguageChange={setLanguage}
        />
      )}

      <style>{`
        .privacy-active .privacy-sensitive {
          filter: blur(8px);
          transition: filter 0.3s ease;
          user-select: none;
        }
        .privacy-active .privacy-sensitive:hover {
          filter: blur(0);
        }
      `}</style>
    </div>
  );
};

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);
const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
);

export default App;
