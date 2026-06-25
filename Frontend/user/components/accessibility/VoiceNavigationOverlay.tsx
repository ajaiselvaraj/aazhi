import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Language } from '../../types';

// Supported language mappings for route parsing
const routeMappings: Record<string, Record<string, { path: string; feedback: string }>> = {
  en: {
    'home': { path: '/home', feedback: 'Navigating to home' },
    'go home': { path: '/home', feedback: 'Navigating to home' },
    'dashboard': { path: '/home', feedback: 'Navigating to home' },
    'start': { path: '/home', feedback: 'Navigating to home' },
    'file complaint': { path: '/complaints', feedback: 'Navigating to complaint page' },
    'new complaint': { path: '/complaints', feedback: 'Navigating to complaint page' },
    'create complaint': { path: '/complaints', feedback: 'Navigating to complaint page' },
    'track request': { path: '/track', feedback: 'Opening request tracker' },
    'track complaint': { path: '/track', feedback: 'Opening request tracker' },
    'complaint status': { path: '/track', feedback: 'Opening request tracker' },
    'track': { path: '/track', feedback: 'Opening request tracker' },
    'status': { path: '/status', feedback: 'Checking status' },
    'check status': { path: '/status', feedback: 'Checking status' },
    'view status': { path: '/status', feedback: 'Checking status' },
    'help': { path: '/assistant', feedback: 'Opening assistant' },
    'assistance': { path: '/assistant', feedback: 'Opening assistant' },
    'support': { path: '/assistant', feedback: 'Opening assistant' },
  },
  ta: {
    'home': { path: '/home', feedback: 'முகப்பிற்கு செல்கிறேன்' },
    'வீட்டுக்கு போ': { path: '/home', feedback: 'முகப்பிற்கு செல்கிறேன்' },
    'புகார் பதிவு செய்': { path: '/complaints', feedback: 'புகார் பதிவு பக்கத்திற்கு செல்கிறேன்' },
    'complaint file pannu': { path: '/complaints', feedback: 'புகார் பதிவு பக்கத்திற்கு செல்கிறேன்' },
    'புகாரை பார்': { path: '/track', feedback: 'புகார் நிலையை சரிபார்க்கிறேன்' },
    'track request': { path: '/track', feedback: 'புகார் நிலையை சரிபார்க்கிறேன்' },
    'நிலையை பார்': { path: '/status', feedback: 'நிலையை சரிபார்க்கிறேன்' },
    'status paaru': { path: '/status', feedback: 'நிலையை சரிபார்க்கிறேன்' },
    'உதவி வேண்டும்': { path: '/assistant', feedback: 'உதவியாளரை திறக்கிறேன்' },
    'உதவி': { path: '/assistant', feedback: 'உதவியாளரை திறக்கிறேன்' },
  },
  hi: {
    'होम': { path: '/home', feedback: 'होम पर जा रहा हूँ' },
    'घर चलो': { path: '/home', feedback: 'होम पर जा रहा हूँ' },
    'शिकायत दर्ज करें': { path: '/complaints', feedback: 'शिकायत पृष्ठ पर जा रहा हूँ' },
    'नई शिकायत': { path: '/complaints', feedback: 'शिकायत पृष्ठ पर जा रहा हूँ' },
    'शिकायत ट्रैक करें': { path: '/track', feedback: 'शिकायत ट्रैकर खोल रहा हूँ' },
    'स्थिति जांचें': { path: '/track', feedback: 'शिकायत ट्रैकर खोल रहा हूँ' },
    'स्थिति देखें': { path: '/status', feedback: 'स्थिति देख रहा हूँ' },
    'स्थिति': { path: '/status', feedback: 'स्थिति देख रहा हूँ' },
    'सहायता': { path: '/assistant', feedback: 'सहायता खोल रहा हूँ' },
    'मदद करें': { path: '/assistant', feedback: 'सहायता खोल रहा हूँ' },
  }
};

const langToCode: Record<string, string> = {
  [Language.ENGLISH]: 'en',
  [Language.TAMIL]: 'ta',
  [Language.HINDI]: 'hi',
};

const getLocaleForRecognition = (langStr: string) => {
  const map: Record<string, string> = {
    [Language.ENGLISH]: 'en-IN',
    [Language.TAMIL]: 'ta-IN',
    [Language.HINDI]: 'hi-IN',
  };
  return map[langStr] || 'en-IN';
};

const VoiceNavigationOverlay: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  
  const currentLangCode = getLocaleForRecognition(i18n.language);
  const currentSimpleLang = langToCode[i18n.language] || 'en';
  
  // Persisted settings
  const [isListening, setIsListening] = useState(() => localStorage.getItem('voiceNavigationEnabled') === 'true');
  const [talkbackEnabled, setTalkbackEnabled] = useState(() => localStorage.getItem('talkbackEnabled') !== 'false');
  
  const [transcript, setTranscript] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const lastNavTimeRef = useRef<number>(0);
  const lastAnnouncementRef = useRef<string>('');
  const previousRouteRef = useRef<string>(location.pathname);

  // Persistence
  useEffect(() => localStorage.setItem('voiceNavigationEnabled', isListening.toString()), [isListening]);
  useEffect(() => {
    localStorage.setItem('talkbackEnabled', talkbackEnabled.toString());
    if (!talkbackEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [talkbackEnabled]);

  // Route tracker
  useEffect(() => {
    previousRouteRef.current = location.pathname;
  }, [location.pathname]);

  // Speech Queue Manager & Duplicate Preventer
  const announce = useCallback((message: string, force: boolean = false) => {
    if (!talkbackEnabled || !('speechSynthesis' in window)) return;
    
    if (!force && lastAnnouncementRef.current === message) return; // Prevent exact duplicates
    
    lastAnnouncementRef.current = message;
    window.speechSynthesis.cancel(); // Clear any existing speech
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = currentLangCode;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
       setTimeout(() => {
         if (lastAnnouncementRef.current === message) lastAnnouncementRef.current = '';
       }, 5000); // Clear queue lock after a generous 5s window
    };

    window.speechSynthesis.speak(utterance);
  }, [talkbackEnabled, currentLangCode]);

  // Command Parser
  const handleCommand = useCallback((command: string) => {
    const now = Date.now();
    
    // UI Voice Toggles
    if (command.includes('turn microphone off') || command.includes('stop listening') || command.includes('disable voice navigation')) {
      announce('Voice navigation disabled', true);
      setIsListening(false);
      return;
    }
    if (command.includes('mute voice') || command.includes('disable talkback') || command.includes('turn voice off')) {
      setTalkbackEnabled(false);
      return;
    }
    if (command.includes('enable talkback') || command.includes('turn voice on') || command.includes('unmute voice')) {
      setTalkbackEnabled(true);
      setTimeout(() => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(currentSimpleLang === 'ta' ? 'குரல் இயக்கப்பட்டது' : currentSimpleLang === 'hi' ? 'आवाज़ सक्षम' : 'Voice feedback enabled');
          utterance.lang = currentLangCode;
          window.speechSynthesis.speak(utterance);
        }
      }, 100);
      return;
    }

    // Single Navigation Trigger (3000ms Cooldown)
    if (now - lastNavTimeRef.current < 3000) return;

    const dict = routeMappings[currentSimpleLang] || routeMappings['en'];
    
    const checkDict = (searchDict: Record<string, { path: string; feedback: string }>) => {
       for (const [key, action] of Object.entries(searchDict)) {
          if (command.includes(key)) {
            if (previousRouteRef.current !== action.path) {
              lastNavTimeRef.current = Date.now();
              announce(action.feedback, true);
              navigate(action.path);
            }
            return true;
          }
       }
       return false;
    };

    let matched = checkDict(dict);
    if (!matched && currentSimpleLang !== 'en') matched = checkDict(routeMappings['en']);
    
    if (!matched) console.log('Command not recognized:', command);
  }, [currentSimpleLang, currentLangCode, announce, navigate, setTalkbackEnabled]);

  const handleCommandRef = useRef(handleCommand);
  useEffect(() => { handleCommandRef.current = handleCommand; }, [handleCommand]);

  // Lazy Loaded, Language-Aware Speech Recognition - Push-To-Talk Pattern
  useEffect(() => {
    if (!isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported");
      setIsListening(false);
      return;
    }

    if (!recognitionRef.current || recognitionRef.current.lang !== currentLangCode) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
      
      const recognition = new SpeechRecognition();
      // Safe mode: Not continuous, no infinite loops. Frees the OS audio session after one command.
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLangCode;

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        if (event.results[current].isFinal) {
          const result = event.results[current][0].transcript.toLowerCase().trim();
          setTranscript(result);
          handleCommandRef.current(result);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // DO NOT automatically restart! This was locking the UI and blocking the virtual keyboard.
        // It must be manually restarted by the user (push-to-talk), or handled safely.
        setIsListening(false);
        setTranscript('');
      };

      recognitionRef.current = recognition;
    }

    try { recognitionRef.current.start(); } catch (e) {
      console.error("Failed to start speech recognition", e);
      setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
        recognitionRef.current = null;
      }
    };
  }, [isListening, currentLangCode]);

  // Safety checks
  if (!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] print:hidden pointer-events-none">
      <div className={`pointer-events-none flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${
        isListening && talkbackEnabled 
          ? 'bg-white border-green-200 ring-2 ring-green-100' 
          : 'bg-white/95 border-gray-100'
      }`}>
        
        {/* Voice Navigation Button */}
        <button
          onClick={() => setIsListening(prev => {
            if (!prev) announce('Voice navigation enabled', true);
            else announce('Voice navigation disabled', true);
            return !prev;
          })}
          className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${
            isListening ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-label={isListening ? 'Disable Voice Navigation' : 'Enable Voice Navigation'}
        >
          <div className="relative flex items-center justify-center">
             {isListening && <span className="absolute w-full h-full rounded-full bg-green-400 animate-ping opacity-75"></span>}
             {isListening ? <Mic size={16} className="relative z-10" /> : <MicOff size={16} />}
          </div>
          <span className="hidden sm:inline">Voice Nav: {isListening ? 'ON' : 'OFF'}</span>
        </button>

        {/* TalkBack Button */}
        <button
          onClick={() => setTalkbackEnabled(prev => {
            const next = !prev;
            if (next && 'speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const msg = new SpeechSynthesisUtterance(currentSimpleLang === 'ta' ? 'குரல் இயக்கப்பட்டது' : currentSimpleLang === 'hi' ? 'आवाज़ सक्षम' : 'Voice feedback enabled');
              msg.lang = currentLangCode;
              window.speechSynthesis.speak(msg);
            }
            return next;
          })}
          className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors font-medium text-sm ${
            talkbackEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-label={talkbackEnabled ? 'Disable Voice Feedback' : 'Enable Voice Feedback'}
        >
          {talkbackEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span className="hidden sm:inline">Feedback: {talkbackEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Status Indicator */}
        {isListening && transcript && (
          <div className="pl-3 border-l border-gray-200 text-xs font-medium text-gray-500 max-w-[120px] truncate hidden md:block" aria-live="polite">
            {transcript}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceNavigationOverlay;
