import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Globe, ShieldCheck, ArrowLeft, RefreshCw, Smartphone, Shield, Maximize2, Mic, AlertTriangle, ArrowRight, Lock, User, MapPin, ChevronDown, Navigation, CheckCircle } from 'lucide-react';
import { APP_CONFIG, LANGUAGES_CONFIG, MOCK_ALERTS } from './constants';
import { Language } from './types';
import KioskKeyboardWrapper from './components/KioskKeyboardWrapper';
import { ServiceComplaintProvider } from './contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';
import './i18n';
import { speakText, loadVoices } from './utils/speak';

// ─── LAZY LOADED COMPONENTS (Code Splitting) ───
const KioskUI = lazy(() => import('./components/KioskUI'));
const Documentation = lazy(() => import('./components/Documentation'));
const Admin = lazy(() => import('./components/Admin'));
const SuvidhaVoiceControl = lazy(() => import('./components/SuvidhaVoiceControl'));
const TalkbackOverlay = lazy(() => import('./components/TalkbackOverlay'));
import { authService } from './services/authService';
import { GrievanceService } from './services/civicService';
import { Persistence } from './utils/persistence';
import cdacLogo from './assets/cdac_logo.png';



enum ViewState {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  SELECTION = 'SELECTION',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN',
  DOCUMENTATION = 'DOCUMENTATION'
}

const LOGOUT_TIME = 120; // 2 minutes

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#F8F9FB]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Modules...</p>
    </div>
  </div>
);

// --- Language to Region/State mapping for manual location ---
const LOCATION_TO_LANGUAGE: Record<string, Language> = {
  'Tamil Nadu': Language.TAMIL,
  'Maharashtra': Language.MARATHI,
  'Karnataka': Language.KANNADA,
  'Kerala': Language.MALAYALAM,
  'Gujarat': Language.GUJARATI,
  'West Bengal': Language.BENGALI,
  'Punjab': Language.PUNJABI,
  'Uttar Pradesh': Language.HINDI,
  'Rajasthan': Language.HINDI,
  'Delhi': Language.HINDI,
  'Madhya Pradesh': Language.HINDI,
  'Bihar': Language.HINDI,
  'Andhra Pradesh': Language.TELUGU,
  'Telangana': Language.TELUGU,
  'Assam': Language.ASSAMESE,
  'Odisha': Language.ODIA,
  'Jammu & Kashmir': Language.URDU,

};

const STATES = Object.keys(LOCATION_TO_LANGUAGE);

// ─────────────────────────────────────────────
// Scrolling Alert Banner Component
// ─────────────────────────────────────────────
const ScrollingAlertBanner: React.FC<{ language: Language; location: string }> = ({ language, location }) => {
  const { i18n } = useTranslation();

  const getLiteral = (key: string, lang: string) => {
    const resource = i18n.getResourceBundle(lang, 'translation');
    if (resource && resource[key]) return resource[key];
    const enResource = i18n.getResourceBundle(Language.ENGLISH, 'translation');
    if (enResource && enResource[key]) return enResource[key];
    return key;
  };

  const primaryAlert = MOCK_ALERTS[0];
  const translatedMessage = getLiteral(`alert_${primaryAlert.id}`, language) || primaryAlert.message;

  // Use a localized prefix based on the alert language
  const prefix = getLiteral('alertUpdateFor', language) || "Important update for";
  const isRtl = language === Language.URDU;

  // Personalized message including location
  const alertText = `${prefix} ${location}: ${translatedMessage}`;

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, #1e3a5f 0%, #1a3a8a 50%, #1e3a5f 100%)',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 30,
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, width: 60, height: '100%',
        background: 'linear-gradient(to right, #1e3a5f, transparent)', zIndex: 2, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, width: 60, height: '100%',
        background: 'linear-gradient(to left, #1e3a5f, transparent)', zIndex: 2, pointerEvents: 'none'
      }} />

      <div
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          animation: isRtl ? 'marquee-rtl 30s linear infinite' : 'marquee 30s linear infinite',
          willChange: 'transform',
        }}
      >
        {[0, 1].map((i) => (
          <span
            key={i}
            style={{
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.03em',
              padding: '0 80px',
              direction: isRtl ? 'rtl' : 'ltr',
              fontFamily: 'inherit',
            }}
          >
            ⚠️ {alertText}
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes marquee-rtl {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div >
  );
};

// ─────────────────────────────────────────────
// Location Selector Component
// ─────────────────────────────────────────────
interface LocationSelectorProps {
  selectedState?: string | null;
  locationInfo: string;
  onStateSelect?: (state: string | null) => void;
  onAutoDetect?: () => void;
  isDetecting?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  locationInfo
}) => {

  return (
    <div style={{ position: 'relative', zIndex: 50 }}>
      {/* Detected Area Display (Static Value Only) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(226, 232, 240, 0.6)',
        borderRadius: '12px',
        padding: '8px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
          {locationInfo}
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────
const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const { t, i18n } = useTranslation();
  const language = i18n.language as Language;
  const [timer, setTimer] = useState(LOGOUT_TIME);
  const [isPrivacyShieldOn, setIsPrivacyShieldOn] = useState(false);
  const [dashboardInitialTab, setDashboardInitialTab] = useState<'home' | 'ai' | 'billing' | 'status' | 'services' | 'complaints' | 'tracker' | 'gas' | 'municipal'>('home');
  const [dashboardInitialAiQuery, setDashboardInitialAiQuery] = useState<string>('');
  const timerRef = useRef<number | null>(null);
  // Refactored Login States - Defaulting to AADHAAR while providing a backend-linked mock that generates real JWT tokens.
  const [loginMethod, setLoginMethod] = useState<'AADHAAR' | 'MOBILE'>('AADHAAR');
  const [authStage, setAuthStage] = useState<'INPUT' | 'OTP'>('INPUT');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Location & Alert Banner state ──
  const [alertLanguage, setAlertLanguage] = useState<Language>(Language.ENGLISH);
  const [locationInfo, setLocationInfo] = useState<string>('Detecting location...');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Alert language is strictly location-based and separate from UI language
  // (Sync effect removed)



  // Handle location auto-detect precisely
  const handleAutoDetectLocation = useCallback(() => {
    setIsDetectingLocation(true);

    const updateStateWithLocation = (city: string | undefined, region: string | undefined) => {
      if (region) {
        setLocationInfo(city ? `${city}, ${region}` : region);
        if (LOCATION_TO_LANGUAGE[region]) {
          setAlertLanguage(LOCATION_TO_LANGUAGE[region]);
        } else {
          setAlertLanguage(Language.ENGLISH);
        }
      } else {
        setLocationInfo('Chennai, Tamil Nadu');
        setAlertLanguage(Language.TAMIL);
      }
      setIsDetectingLocation(false);
    };

    const fallbackToIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        updateStateWithLocation(data.city, data.region);
      } catch (e) {
        updateStateWithLocation('Chennai', 'Tamil Nadu');
      }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Reverse geocode to get exact City and State
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
            const region = data.address?.state;
            
            updateStateWithLocation(city, region);
          } catch (error) {
            fallbackToIP();
          }
        },
        (error) => {
          console.warn("Geolocation denied or failed. Falling back to IP tracking:", error.message);
          fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      fallbackToIP();
    }
  }, []);

  // Initial detection on mount and accessibility setup
  useEffect(() => {
    handleAutoDetectLocation();

    // ─── ROUTE PERSISTENCE: Restore last view ───
    const savedRoute = Persistence.loadRoute();
    if (savedRoute && savedRoute.view) {
      console.log("♻️ Restoring last session view:", savedRoute.view);
      setView(savedRoute.view as ViewState);
    }

    // Pre-load Text-to-Speech voices for Accessibility
    loadVoices().then(() => {
      // Speak welcome message
      setTimeout(() => {
        speakText({
          text: "Welcome to Aazhi, your all in one companion.",
          language: "English"
        });
      }, 1000);
    });
  }, [handleAutoDetectLocation]);

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

  // Logic for Login Navigation
  const handleLanguageSelect = (lang: Language) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('selectedLanguage', lang);
    localStorage.setItem('app_lang', lang);

    // Find the language info to speak out loud
    const selectedLangConfig = LANGUAGES_CONFIG.find(l => l.code === lang);
    if (selectedLangConfig) {
      // Speak in English that the language was selected
      speakText({
        text: `Language changed to ${selectedLangConfig.name}`,
        language: 'English'
      });
      // Then speak the native greeting
      setTimeout(() => {
        speakText({
          text: selectedLangConfig.label,
          language: selectedLangConfig.name
        });
      }, 1500);
    }

    // Navigate directly to authentication page (LOGIN view)
    setView(ViewState.LOGIN);
    setError('');
  };

  // Logic for Sending OTP or Triggering Admin Password
  const handleSendOtp = async () => {
    setError('');
    

    if (loginMethod === 'AADHAAR') {
      if (identifier.replace(/\s/g, '').length !== 12) {
        setError(t('err_aadhaar'));
        return;
      }
      // Note: In a real app, Aadhaar OTP would come from UIDAI. 
      // For this demo, we simulate it or use the same mobile logic.
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setAuthStage('OTP');
      }, 1000);
      return;
    } 
    
    if (loginMethod === 'MOBILE') {
      if (identifier.length !== 10) {
        setError(t('err_mobile'));
        return;
      }

      setIsProcessing(true);
      try {
        await authService.sendOtp(identifier);
        setAuthStage('OTP');
        speakText({ text: t('otpSent') || "OTP sent to your mobile", language: "English" });
      } catch (e: any) {
        console.error("Auth Error", e);
        setError(e.message || "Failed to send OTP. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Logic for Login Submission
  const handleLoginSubmit = async () => {
    setError('');
    setIsProcessing(true);

    try {
        // Authenticate with backend
        await authService.verifyOtp(identifier, otp);
        
        setView(ViewState.SELECTION);
      } else {
        // Aadhaar Login Simulation
        // Try backend first
        try {
          await authService.mockAadhaar(identifier);
          speakText({ text: "Aadhaar authentication successful", language: "English" });
          setView(ViewState.SELECTION);
        } catch (e: any) {
          throw e;
        }
      }
    } catch (e: any) {
      console.error("Login submission error", e);
      setError(e.message || "Authentication failed. Invalid OTP.");
    } finally {
      setIsProcessing(false);
    }
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

  const handleVoiceCommand = useCallback((command: string) => {
    console.log('App received voice command:', command);
    switch (command) {
      case 'login':
        setView(ViewState.LOGIN);
        break;
      case 'home':
        setDashboardInitialTab('home');
        setView(ViewState.DASHBOARD);
        break;
      case 'assistant':
        setDashboardInitialTab('ai');
        setView(ViewState.DASHBOARD);
        break;
      case 'paybill':
        setDashboardInitialTab('billing');
        setView(ViewState.DASHBOARD);
        break;
      case 'history':
        setDashboardInitialTab('status');
        setView(ViewState.DASHBOARD);
        break;
      case 'service':
        setDashboardInitialTab('services');
        setView(ViewState.DASHBOARD);
        break;
      case 'complaints':
        setDashboardInitialTab('complaints');
        setView(ViewState.DASHBOARD);
        break;
      case 'trackapp':
        setDashboardInitialTab('tracker');
        setView(ViewState.DASHBOARD);
        break;
      case 'gas':
        setDashboardInitialTab('gas');
        setView(ViewState.DASHBOARD);
        break;
      case 'exit':
        handleBackToLanding();
        break;
      default:
        // Automatically inject unmatched conversational speech into the AI Assistant Module
        if (command.startsWith('ai_query:')) {
          const rawQuery = command.replace('ai_query:', '').trim();
          if (rawQuery) {
            setDashboardInitialAiQuery(rawQuery);
            setDashboardInitialTab('ai');
            setView(ViewState.DASHBOARD);
          }
        } else {
          console.warn('Unhandled app-level command:', command);
        }
    }
  }, [setView, handleBackToLanding]);

  // ─────────────────────────────────────────────
  // Render: LANDING (Language Selection)
  // ─────────────────────────────────────────────
  const renderLanding = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F8F9FB] text-slate-900 relative overflow-hidden font-sans">
      {/* Background Watermark: Indian Emblem */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 pointer-events-none z-0">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
          alt="Indian Emblem"
          className="w-full h-full object-contain grayscale"
        />
      </div>

      {/* Top-right Location Selector & CDAC Logo */}
      <div style={{
        position: 'absolute', top: '24px', right: '32px', zIndex: 40,
        display: 'flex', alignItems: 'center', gap: '1.5rem'
      }}>
        <img src={cdacLogo} alt="CDAC Logo" className="h-12 w-auto object-contain" />
        <LocationSelector
          locationInfo={locationInfo}
        />
      </div>


      {/* Top-left Voice Navigation */}
      <div style={{
        position: 'absolute', top: '24px', left: '32px', zIndex: 40,
      }}>
        <SuvidhaVoiceControl onCommand={handleVoiceCommand} ttsLanguage={alertLanguage} showTTS={false} />
      </div>



      {/* Compact Header */}
      <header className="text-center mb-6 z-10 w-full max-w-7xl mx-auto flex flex-col items-center justify-center pt-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 text-blue-950 drop-shadow-sm leading-tight">
          {APP_CONFIG.TITLE}
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-lg text-slate-600 font-medium tracking-tight">
            {t('loginSubtitle')}
          </p>
          <div className="hidden md:inline-flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            <ShieldCheck size={14} className="text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-900">
              {t('appTagline')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid: Clean Language Selection Area */}
      <div className="flex-1 w-full overflow-y-auto pb-4 px-4 md:px-8 flex items-center justify-center">
        <div className="grid gap-6 md:gap-8 w-full max-w-[1600px] auto-rows-fr py-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {LANGUAGES_CONFIG.map((item) => (
            <button
              key={item.code}
              id={`lang-btn-${item.code}`}
              onClick={() => handleLanguageSelect(item.code)}
              className={`
                group relative bg-white transition-all duration-200
                flex flex-col items-center justify-center gap-3
                h-full p-6 w-full rounded-2xl border-2
                ${language === item.code
                  ? 'border-blue-600 ring-4 ring-blue-600/20 shadow-xl z-20 scale-105'
                  : 'border-slate-200 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1'
                }
              `}
              dir={item.rtl ? 'rtl' : 'ltr'}
            >
              <span className={`text-2xl sm:text-3xl font-bold text-slate-800 group-hover:scale-105 transition-transform duration-200 text-center flex-shrink-0 ${item.rtl ? 'font-serif text-3xl sm:text-4xl' : ''}`}>
                {item.label}
              </span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors mt-1 text-center break-words leading-tight max-w-full">
                {item.name}
              </span>

              {/* Selection Checkmark */}
              {language === item.code && (
                <div className="absolute top-2 right-2 text-blue-600 bg-blue-50 rounded-full p-1">
                  <ShieldCheck size={16} fill="currentColor" stroke="white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div >

      <footer className="mb-2 z-10 text-center opacity-70 flex flex-col items-center gap-1 text-slate-500 text-[10px] font-medium tracking-wide">
        <div className="flex items-center gap-4 uppercase tracking-[0.2em]">
          <button onClick={() => setView(ViewState.DOCUMENTATION)} className="hover:text-blue-600 transition font-bold">{t('documentation')}</button>
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
            <Maximize2 size={10} /> {t('fullscreen')}
          </button>
        </div>
        <p className="opacity-50">{t('footerSecure')}</p>
      </footer>

      {/* Scrolling Alert Banner at bottom */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}>
        <ScrollingAlertBanner language={alertLanguage} location={locationInfo} />
      </div>
    </div >
  );

  // ─────────────────────────────────────────────
  // Render: SELECTION
  // ─────────────────────────────────────────────
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
        <div>
          <img src={cdacLogo} alt="CDAC Logo" className="h-10 w-auto object-contain" />
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

  // ─────────────────────────────────────────────
  // Render: LOGIN
  // ─────────────────────────────────────────────
  const renderLogin = () => (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden font-sans">
      {/* Login State Logic will trigger popup */}

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
        <div className="flex items-center gap-4">
          <SuvidhaVoiceControl onCommand={handleVoiceCommand} ttsLanguage={alertLanguage} variant="inline" />
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100/50 border border-green-200 rounded-full shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{t('systemOnline')}</span>
          </div>
          <img src={cdacLogo} alt="CDAC Logo" className="h-10 w-auto object-contain ml-2" />
        </div>

      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="relative w-full max-w-2xl"> {/* Positioning wrapper */}
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
                  id="login-tab-aadhaar"
                  onClick={() => { setLoginMethod('AADHAAR'); resetLoginState(); }}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${loginMethod === 'AADHAAR' ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 '}`}
                >
                  <User size={16} /> {t('aadhaar')}
                </button>
                <button
                  id="login-tab-mobile"
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
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-bold text-slate-900 ml-1 uppercase tracking-wider">{t('aadhaarNumber')}</label>
                      </div>
                      <div className="relative group">
                        <input
                          id="aadhaar-input"
                          data-type="aadhaar"
                          inputMode="numeric"
                          type="text"
                          maxLength={14}
                          value={identifier.replace(/(\d{4})(?=\d)/g, "$1 ")}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                            setIdentifier(val);
                            setError('');
                          }}
                          onInput={(e) => {
                            const val = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 12);
                            setIdentifier(val);
                            setError('');
                          }}
                          className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl text-xl font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition placeholder:text-slate-300 placeholder:tracking-widest"
                          placeholder="XXXX XXXX XXXX"
                        />
                        <Shield className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      </div>
                      <button
                        id="aadhaar-verify-btn"
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
                        id="aadhaar-otp-input"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-3xl font-black text-center outline-none focus:border-green-500 tracking-[1em]"
                        placeholder="------"
                      />
                      <button
                        id="aadhaar-confirm-btn"
                        onClick={handleLoginSubmit}
                        disabled={isProcessing || (otp.length !== 6 && otp !== '123')}
                        className="w-full bg-green-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        {isProcessing ? <RefreshCw className="animate-spin" /> : <>{t('confirmLogin')} <ShieldCheck size={20} /></>}
                      </button>
                      <button onClick={() => setAuthStage('INPUT')} className="text-sm font-bold text-slate-400 hover:text-blue-600">{t('changeAadhaar')}</button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. MOBILE FLOW */}
              {(loginMethod === 'MOBILE') && (
                <div className="animate-in fade-in slide-in-from-right-8">
                  {authStage === 'INPUT' ? (
                    <>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-bold text-slate-900 ml-1 uppercase tracking-wider">{t('mobileOTP')}</label>
                      </div>
                      <div className="relative group">
                        <input
                          id="mobile-input"
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
                        id="mobile-send-otp-btn"
                        onClick={handleSendOtp}
                        disabled={isProcessing || identifier.length === 0}
                        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none mt-6 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? <RefreshCw className="animate-spin" /> : <>{t('sendOTP')} <ArrowRight size={20} /></>}
                      </button>
                    </>
                  ) : (
                    /* STANDARD OTP UI */
                    <div className="text-center space-y-6">
                      <p className="text-slate-500 font-medium">{t('enterCode')} {identifier}</p>
                      <input
                        id="mobile-otp-input"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-slate-200 p-4 rounded-2xl text-3xl font-black text-center outline-none focus:border-green-500 tracking-[1em]"
                        placeholder="------"
                      />
                      <button
                        id="mobile-verify-btn"
                        onClick={handleLoginSubmit}
                        disabled={isProcessing || (otp.length !== 6 && otp !== '123')}
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
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <div
      className={`font-sans antialiased text-gray-900 selection:bg-blue-100 h-screen overflow-hidden ${isPrivacyShieldOn ? 'privacy-active' : ''}`}
      onClick={() => {
        resetTimer();
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
              onNavigate={(v: any) => setView(v)}
              onLogout={handleBackToLanding}
              isPrivacyShield={isPrivacyShieldOn}
              timer={timer}
              onTogglePrivacy={() => setIsPrivacyShieldOn(!isPrivacyShieldOn)}
              initialTab={dashboardInitialTab as any}
              initialAiQuery={dashboardInitialAiQuery}
              onVoiceCommand={handleVoiceCommand}
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
              onLanguageChange={(lang) => i18n.changeLanguage(lang)}
            />
          )}

        </ServiceComplaintProvider>
      </KioskKeyboardWrapper>

      <TalkbackOverlay />

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
    </Suspense>
  );
};

export default App;
