import React, { useState, useEffect, useRef } from 'react';
import KioskUI from './components/KioskUI';
import Documentation from './components/Documentation';
import Admin from './components/Admin';
import { Globe, Fingerprint, ShieldCheck, ChevronRight, Lock, User, Key, ArrowLeft, RefreshCw, Smartphone, Clock, EyeOff, Shield, Maximize2, Mic, AlertTriangle, ArrowRight } from 'lucide-react';
import { APP_CONFIG, LANGUAGES_CONFIG } from './constants';
import { Language } from './types';
import KioskKeyboardWrapper from './components/KioskKeyboardWrapper';
import { ServiceComplaintProvider } from './contexts/ServiceComplaintContext';
import { useLanguage } from './contexts/LanguageContext';

enum ViewState {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  SELECTION = 'SELECTION',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN',
  DOCUMENTATION = 'DOCUMENTATION'
}

const LOGOUT_TIME = 120; // 2 minutes

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const { language, setLanguage, t } = useLanguage();
  const [timer, setTimer] = useState(LOGOUT_TIME);
  const [isPrivacyShieldOn, setIsPrivacyShieldOn] = useState(false);
  const [dashboardInitialTab, setDashboardInitialTab] = useState<'home' | 'ai' | 'billing'>('home');
  const timerRef = useRef<number | null>(null);

  // Refactored Login States
  const [loginMethod, setLoginMethod] = useState<'AADHAAR' | 'MOBILE' | 'PASSWORD'>('AADHAAR');
  const [authStage, setAuthStage] = useState<'INPUT' | 'OTP' | 'PASSWORD'>('INPUT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle inactivity auto-logout
  useEffect(() => {
    if (view === ViewState.DASHBOARD || view === ViewState.ADMIN || view === ViewState.SELECTION) {
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

  // Logic for Sending OTP or Triggering Admin Password
  const handleSendOtp = () => {
    setError('');
    if (loginMethod === 'AADHAAR') {
      if (identifier.replace(/\s/g, '').length !== 12) {
        setError(t('err_aadhaar'));
        return;
      }
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setAuthStage('OTP');
      }, 1000);

    } else if (loginMethod === 'MOBILE') {
      // Hidden Admin Logic: Check for special number
      if (identifier === '963852') {
        setIsProcessing(true);
        setTimeout(() => {
          setIsProcessing(false);
          setLoginMethod('PASSWORD');
          setAuthStage('PASSWORD');
          setIdentifier('');
          setPassword('');
        }, 500);
        return;
      }

      if (identifier.length !== 10) {
        setError(t('err_mobile'));
        return;
      }
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setAuthStage('OTP');
      }, 1000);
    }
  };

  // Logic for Login Submission
  const handleLoginSubmit = () => {
    setError('');
    setIsProcessing(true);

    setTimeout(() => {
      if (authStage === 'PASSWORD') {
        if (password === '789456') {
          setView(ViewState.ADMIN);
        } else {
          setError(t('err_adminPass'));
          setIsProcessing(false);
          return;
        }
      } else {
        // OTP Flow
        // OTP Flow
        if (otp.length === 6) {
          // Redirect both Login methods to Selection Screen first
          setView(ViewState.SELECTION);
        } else {
          setError(t('err_otp'));
          setIsProcessing(false);
          return;
        }
      }
      setIsProcessing(false);
    }, 1000);
  };

  const resetLoginState = () => {
    setIdentifier('');
    setPassword('');
    setOtp('');
    setError('');
    setAuthStage('INPUT');
  };

  const handleBackToLanding = () => {
    setView(ViewState.LANDING);
    resetLoginState();
    setIsPrivacyShieldOn(false);
  };

  const handleSelection = (target: 'ai' | 'billing') => {
    setDashboardInitialTab(target);
    setView(ViewState.DASHBOARD);
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

      {/* Compact Header */}
      <header className="text-center mb-6 z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center pt-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 text-blue-950 drop-shadow-sm leading-tight">
          {APP_CONFIG.TITLE}
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-lg text-slate-600 font-medium tracking-tight">
            {APP_CONFIG.SUBTITLE}
          </p>
          <div className="hidden md:inline-flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            <ShieldCheck size={14} className="text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-900">
              {APP_CONFIG.TAGLINE}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid: Optimized for 23 items at 100% zoom */}
      <div className="flex-1 w-full max-w-[1600px] z-10 px-6 overflow-y-auto pb-4 flex items-center justify-center">
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 w-full">
          {LANGUAGES_CONFIG.map((item) => (
            <button
              key={item.code}
              onClick={() => handleLanguageSelect(item.code)}
              className={`
                group relative bg-white transition-all duration-200
                flex flex-col items-center justify-center gap-0.5
                h-24 w-full rounded-xl border
                ${language === item.code
                  ? 'border-blue-600 ring-2 ring-blue-600 shadow-xl z-20 scale-105'
                  : 'border-slate-200 hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5'
                }
              `}
              dir={item.rtl ? 'rtl' : 'ltr'}
            >
              <span className={`text-xl font-bold text-slate-800 group-hover:scale-105 transition-transform duration-200 ${item.rtl ? 'font-serif text-2xl' : ''}`}>
                {item.label}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                {item.name}
              </span>

              {/* Selection Checkmark */}
              {language === item.code && (
                <div className="absolute top-1 right-1 text-blue-600 bg-blue-50 rounded-full p-0.5">
                  <ShieldCheck size={12} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <footer className="mb-4 z-10 text-center opacity-70 flex flex-col items-center gap-1 text-slate-500 text-[10px] font-medium tracking-wide">
        <div className="flex items-center gap-4 uppercase tracking-[0.2em]">
          <button onClick={() => setView(ViewState.DOCUMENTATION)} className="hover:text-blue-600 transition font-bold">Documentation</button>
          <span>|</span>
          <button onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(e => console.log(e));
            } else {
              document.exitFullscreen();
            }
          }}
            className="hover:text-blue-600 transition font-bold flex items-center gap-1"
          >
            <Maximize2 size={10} /> Fullscreen
          </button>
        </div>
        <p className="opacity-50">{t('footerSecure')}</p>
      </footer>
    </div>
  );

  const renderSelection = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans">
      <header className="px-8 py-6 flex items-center justify-between bg-white/80 backdrop-blur-md fixed top-0 w-full z-20 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">
            <span className="text-xl">A</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{APP_CONFIG.TITLE}</h1>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-0.5">{t('sel_welcomeUser')}</p>
          </div>
        </div>
      </header>

      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 z-10 animate-in zoom-in-95 duration-500">
        <button onClick={() => handleSelection('ai')} className="group relative bg-white p-10 rounded-[3rem] shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-slate-100 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="w-32 h-32 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner relative z-10 group-hover:scale-110 transition duration-300">
            <Mic size={64} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 relative z-10 group-hover:text-indigo-900">{t('sel_aiTitle')}</h2>
          <p className="text-slate-500 font-medium relative z-10">{t('sel_aiDesc')}</p>
          <div className="mt-8 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold uppercase text-xs tracking-widest relative z-10 group-hover:bg-indigo-700 shadow-lg shadow-indigo-200">
            {t('sel_aiBtn')}
          </div>
        </button>

        <button onClick={() => handleSelection('billing')} className="group relative bg-white p-10 rounded-[3rem] shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-slate-100 flex flex-col items-center text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="w-32 h-32 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner relative z-10 group-hover:scale-110 transition duration-300">
            <RefreshCw size={64} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-4 relative z-10 group-hover:text-blue-900">{t('sel_payTitle')}</h2>
          <p className="text-slate-500 font-medium relative z-10">{t('sel_payDesc')}</p>
          <div className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-full font-bold uppercase text-xs tracking-widest relative z-10 group-hover:bg-blue-700 shadow-lg shadow-blue-200">
            {t('sel_payBtn')}
          </div>
        </button>
      </div>

      <button onClick={handleBackToLanding} className="mt-12 text-slate-400 font-bold uppercase tracking-widest hover:text-red-500 transition z-10 text-xs flex items-center gap-2">
        <ArrowLeft size={16} /> {t('sel_cancel')}
      </button>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden font-sans">
      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/50">
        <div className="flex items-center gap-4">
          <button onClick={() => setView(ViewState.LANDING)} className="p-2 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft className="text-slate-500" size={20} />
          </button>
          <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
              alt="Emblem"
              className="w-6 h-6 object-contain invert brightness-0"
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{APP_CONFIG.TITLE}</h1>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-0.5">{t('govtOfIndia')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100/50 border border-green-200 rounded-full shadow-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{t('systemOnline')}</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12 text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">

          {/* Decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500"></div>

          {/* Shield Icon */}
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldCheck size={40} />
          </div>

          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">{t('secureAuth')}</h2>
          <p className="text-slate-500 font-medium mb-10">{t('useDigitalID')}</p>

          {/* Tabs - Only show in INPUT stage and NOT in Password Mode */}
          {authStage === 'INPUT' && (
            <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-10 mx-auto max-w-md shadow-inner">
              <button
                onClick={() => { setLoginMethod('AADHAAR'); resetLoginState(); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${loginMethod === 'AADHAAR' ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 '}`}
              >
                <User size={16} /> {t('aadhaar')}
              </button>
              <button
                onClick={() => { setLoginMethod('MOBILE'); resetLoginState(); }}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${loginMethod === 'MOBILE' ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Smartphone size={16} /> {t('mobileOTP')}
              </button>
            </div>
          )}

          {/* Input Form Area */}
          <div className="max-w-md mx-auto space-y-6 text-left min-h-[200px]">

            {/* 1. AADHAAR FLOW */}
            {loginMethod === 'AADHAAR' && (
              <div className="animate-in fade-in slide-in-from-right-8">
                {authStage === 'INPUT' ? (
                  <>
                    <label className="block text-xs font-bold text-slate-900 mb-2 ml-1 uppercase tracking-wider">{t('aadhaarNumber')}</label>
                    <div className="relative group">
                      <input
                        inputMode="numeric"
                        type="text"
                        maxLength={14}
                        value={identifier}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                          setIdentifier(formatted);
                          setError('');
                        }}
                        className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition placeholder:text-slate-300 placeholder:tracking-widest"
                        placeholder="XXXX XXXX XXXX"
                      />
                      <Shield className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={isProcessing || identifier.replace(/\s/g, '').length !== 12}
                      className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none mt-6 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <>{t('verifyIdentity')} <ArrowRight size={20} /></>}
                    </button>
                  </>
                ) : (
                  <div className="text-center space-y-6">
                    <p className="text-slate-500 font-medium">{t('enterCodeLinked')}</p>
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-3xl font-black text-center outline-none focus:border-green-500 tracking-[1em]"
                      placeholder="------"
                    />
                    <button
                      onClick={handleLoginSubmit}
                      disabled={isProcessing || otp.length !== 6}
                      className="w-full bg-green-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <>{t('confirmLogin')} <ShieldCheck size={20} /></>}
                    </button>
                    <button onClick={() => setAuthStage('INPUT')} className="text-sm font-bold text-slate-400 hover:text-blue-600">{t('changeAadhaar')}</button>
                  </div>
                )}
              </div>
            )}

            {/* 2. MOBILE FLOW & 3. HIDDEN ADMIN PASSWORD FLOW */}
            {(loginMethod === 'MOBILE' || loginMethod === 'PASSWORD') && (
              <div className="animate-in fade-in slide-in-from-right-8">
                {authStage === 'INPUT' ? (
                  <>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-xs font-bold text-slate-900 ml-1 uppercase tracking-wider">{t('mobileNumber')}</label>
                      <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase select-none">Admin: 963852 • Pass: 789456</span>
                    </div>
                    <div className="relative group">
                      <input
                        inputMode="numeric"
                        maxLength={10}
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value.replace(/\D/g, ''));
                          setError('');
                        }}
                        className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition placeholder:text-slate-300"
                        placeholder="98765 43210"
                      />
                      <Smartphone className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    </div>
                    <button
                      onClick={handleSendOtp}
                      disabled={isProcessing || identifier.length === 0}
                      className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none mt-6 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <>{t('sendOTP')} <ArrowRight size={20} /></>}
                    </button>
                  </>
                ) : authStage === 'PASSWORD' ? (
                  /* HIDDEN ADMIN PASSWORD UI */
                  <div className="animate-in fade-in slide-in-from-right-8">
                    <label className="block text-xs font-bold text-slate-900 mb-2 ml-1 uppercase tracking-wider">{t('adminPasswordLabel')}</label>
                    <div className="relative group">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl text-xl font-bold outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition placeholder:text-slate-300"
                        placeholder="••••••"
                      />
                      <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    </div>
                    <button
                      onClick={handleLoginSubmit}
                      disabled={isProcessing || !password}
                      className="w-full bg-indigo-900 text-white p-5 rounded-2xl font-bold text-lg hover:bg-indigo-950 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none mt-6 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <>{t('accessSystem')} <Lock size={20} /></>}
                    </button>
                    <button onClick={() => { setAuthStage('INPUT'); setLoginMethod('MOBILE'); setIdentifier(''); }} className="text-sm font-bold text-slate-400 hover:text-blue-600 mt-4 block mx-auto">{t('cancelAdmin')}</button>
                  </div>
                ) : (
                  /* STANDARD OTP UI */
                  <div className="text-center space-y-6">
                    <p className="text-slate-500 font-medium">{t('enterCode')} {identifier}</p>
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-3xl font-black text-center outline-none focus:border-green-500 tracking-[1em]"
                      placeholder="------"
                    />
                    <button
                      onClick={handleLoginSubmit}
                      disabled={isProcessing || otp.length !== 6}
                      className="w-full bg-green-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <RefreshCw className="animate-spin" /> : <>{t('verifyLogin')} <ShieldCheck size={20} /></>}
                    </button>
                    <button onClick={() => setAuthStage('INPUT')} className="text-sm font-bold text-slate-400 hover:text-blue-600">{t('changeNumber')}</button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-2xl z-50 animate-in slide-in-from-bottom-10 flex items-center gap-3 text-sm">
          <AlertTriangle size={18} /> {error}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`font-sans antialiased text-gray-900 selection:bg-blue-100 h-screen overflow-hidden ${isPrivacyShieldOn ? 'privacy-active' : ''}`}
      onClick={() => {
        resetTimer();
        // Auto-fullscreen on first interaction if not active
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => { });
        }
      }}
      onKeyDown={resetTimer}
    >
      <KioskKeyboardWrapper language={language}>
        <ServiceComplaintProvider>
          {view === ViewState.LANDING && renderLanding()}
          {view === ViewState.LOGIN && renderLogin()}
          {view === ViewState.SELECTION && renderSelection()}
          {view === ViewState.DASHBOARD && (
            <KioskUI
              language={language}
              onNavigate={setView}
              onLogout={handleBackToLanding}
              isPrivacyShield={isPrivacyShieldOn}
              timer={timer}
              onTogglePrivacy={() => setIsPrivacyShieldOn(!isPrivacyShieldOn)}
              initialTab={dashboardInitialTab}
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
        </ServiceComplaintProvider>
      </KioskKeyboardWrapper>

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

export default App;
