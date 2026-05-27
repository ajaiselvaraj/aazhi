/**
 * VoiceAssistantContext.tsx — Global Voice Assistant Provider
 *
 * SINGLETON provider that owns:
 * 1. The one and only SpeechRecognition session (via useSpeechRecognition hook)
 * 2. The authoritative speak function (globalSpeak with female voice + echo prevention)
 * 3. First-interaction welcome flow
 * 4. Voice-enabled state (synced with localStorage)
 *
 * ALL components that need voice functionality consume this context
 * instead of creating their own STT/TTS instances.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSpeechRecognition, VoiceCommand } from '../hooks/useSpeechRecognition';
import {
  globalSpeak,
  triggerFirstInteractionWelcome,
  getNavigationAnnouncement,
  getLangLocale,
  UNRECOGNIZED_COMMAND_MSG,
} from '../utils/globalVoice';

// ─── Centralized Command Mapping ──────────────────────────────────
interface CommandItem {
  phrase: string;
  action: 'HOME' | 'SERVICES' | 'PAY_BILLS' | 'TRACK' | 'HELP' | 'HISTORY' | 'ASSISTANT' | 'ELECTRICITY_SERVICES' | 'WATER_SERVICES' | 'GAS_SERVICES' | 'MUNICIPAL_SERVICES';
}

const COMMANDS_MAP: Record<CommandItem['action'], string[]> = {
  HOME: [
    'go home', 'dashboard', 'home',
    'मुख्य पृष्ठ', 'होम', 'হোম', 'முகப்பு'
  ],
  SERVICES: [
    'open services', 'services page', 'services', 'service',
    'सेवाएं', 'সেৱা', 'சேவைகள்'
  ],
  PAY_BILLS: [
    'pay bill', 'pay bills', 'electricity payment', 'payment', 'billing', 'bill payment',
    'बिल भुगतान', 'பில்', 'பில் கட்டணம்'
  ],
  TRACK: [
    'track application', 'track complaint', 'track app', 'track status', 'track',
    'स्थिति', 'ஆৱেদনৰ অৱস্থা', 'நிலைமை'
  ],
  HELP: [
    'help', 'support', 'help me',
    'मদद', 'உதவி', 'সহায়'
  ],
  HISTORY: [
    'open history', 'my history', 'history',
    'इतिहास', 'வரலாறு'
  ],
  ASSISTANT: [
    'open assistant', 'ai assistant', 'assistant',
    'सहायता', 'உதவி'
  ],
  ELECTRICITY_SERVICES: [
    'electricity services', 'electricity service', 'electricity',
    'बिजली', 'மின்சாரம்', 'மின்சார'
  ],
  WATER_SERVICES: [
    'water services', 'water service', 'water',
    'पानी', 'தண்ணீர்', 'நீர்'
  ],
  GAS_SERVICES: [
    'gas services', 'gas service', 'gas',
    'गैस', 'கேஸ்'
  ],
  MUNICIPAL_SERVICES: [
    'municipal services', 'municipal service', 'municipal', 'municipality',
    'नगर पालिका', 'நகராட்சி'
  ]
};

const FLATTENED_COMMANDS: CommandItem[] = Object.entries(COMMANDS_MAP)
  .flatMap(([action, phrases]) => phrases.map(phrase => ({ phrase: phrase.toLowerCase().trim(), action: action as any })))
  .sort((a, b) => b.phrase.length - a.phrase.length);

function normalizeCommand(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,?!;:"'()\[\]{}_+\-\/*\\|<>`~@#$%^&=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Context Shape ────────────────────────────────────────────────
export interface VoiceAssistantContextValue {
  /** Whether voice assistance is currently enabled */
  voiceEnabled: boolean;
  /** Toggle voice assistance on/off */
  toggleVoiceAssistance: () => void;
  /** Turn voice on explicitly */
  enableVoice: () => void;
  /** Turn voice off explicitly */
  disableVoice: () => void;

  /** Whether the mic is actively listening */
  isListening: boolean;
  /** Whether the browser supports SpeechRecognition */
  isSupported: boolean;
  /** Current live transcript from STT */
  transcript: string;
  /** Last matched voice command */
  lastCommand: VoiceCommand | null;
  /** Any STT error */
  error: string | null;

  /** Start listening for voice commands */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;

  /** Speak text using the global female-voice TTS with echo prevention */
  speak: (text: string, language?: string, onEnd?: () => void) => void;
  /** Speak a navigation announcement */
  announceNavigation: (tab: string, command: string) => void;
  /** Speak the unrecognized command message */
  announceUnrecognized: () => void;

  /** Whether TTS is currently speaking */
  isSpeaking: boolean;

  /** The current UI language name (e.g. "English", "Tamil") */
  language: string;
  /** Set the language for both STT and TTS */
  setLanguage: (lang: string) => void;

  /** Trigger the first-interaction welcome flow */
  triggerWelcome: () => void;
  /** Whether the welcome has already been triggered this session */
  hasWelcomed: boolean;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | null>(null);

// ─── Hook for consumers ───────────────────────────────────────────
export function useVoiceAssistant(): VoiceAssistantContextValue {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) {
    throw new Error('useVoiceAssistant must be used within <VoiceAssistantProvider>');
  }
  return ctx;
}

// ─── Provider Props ───────────────────────────────────────────────
interface VoiceAssistantProviderProps {
  children: React.ReactNode;
  /** Callback when a voice command is recognized */
  onCommand: (command: string) => void;
  /** Initial language (default: 'English') */
  initialLanguage?: string;
}

// ─── Provider Implementation ──────────────────────────────────────
export const VoiceAssistantProvider: React.FC<VoiceAssistantProviderProps> = ({
  children,
  onCommand,
  initialLanguage = 'English',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Voice enabled state ─────────────────────────────────────────
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem('voice_enabled') === 'true';
  });

  // ── Language state ──────────────────────────────────────────────
  const [language, setLanguageState] = useState(initialLanguage);

  // ── TTS speaking state ──────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Welcome flag ────────────────────────────────────────────────
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const hasWelcomedRef = useRef(false);

  // ── Sync voiceEnabled with localStorage changes ─────────────────
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'voice_enabled') {
        setVoiceEnabled(e.newValue === 'true');
      }
    };
    const handleCustom = () => {
      setVoiceEnabled(localStorage.getItem('voice_enabled') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('aazhi-voice-enabled', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('aazhi-voice-enabled', handleCustom);
    };
  }, []);

  // ── Track TTS speaking state via window events ──────────────────
  useEffect(() => {
    const onStart = () => setIsSpeaking(true);
    const onEnd = () => setIsSpeaking(false);
    window.addEventListener('aazhi-speech-start', onStart);
    window.addEventListener('aazhi-speech-end', onEnd);
    return () => {
      window.removeEventListener('aazhi-speech-start', onStart);
      window.removeEventListener('aazhi-speech-end', onEnd);
    };
  }, []);

  // ── Language setter ─────────────────────────────────────────────
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
  }, []);

  // ── Speak wrapper ───────────────────────────────────────────────
  const speak = useCallback(
    (text: string, lang?: string, onEnd?: () => void) => {
      if (!localStorage.getItem('voice_enabled') || localStorage.getItem('voice_enabled') === 'false') {
        onEnd?.();
        return;
      }
      globalSpeak(text, lang || language, onEnd);
    },
    [language]
  );

  // ── Centralized Speech Command Handler ───────────────────────────
  const handleSTTCommand = useCallback((rawText: string) => {
    const normalized = normalizeCommand(rawText);

    // Find matching command
    let matchedAction: CommandItem['action'] | null = null;
    let matchedPhrase = '';

    for (const item of FLATTENED_COMMANDS) {
      if (normalized.includes(item.phrase)) {
        matchedAction = item.action;
        matchedPhrase = item.phrase;
        break;
      }
    }

    // Required Console Logs
    console.log(`[VoiceAssistant] heard command: "${rawText}"`);
    console.log(`[VoiceAssistant] normalized command: "${normalized}"`);

    if (matchedAction) {
      console.log(`[VoiceAssistant] matched route: "${matchedAction}" (matched phrase: "${matchedPhrase}")`);

      const executeNavigation = (path: string, announcement: string) => {
        console.log(`[VoiceAssistant] triggered action: navigate to "${path}"`);
        speak(announcement, language, () => {
          navigate(path);
        });
      };

      const executeScrollHighlight = (deptId: string, serviceName: string) => {
        const isAlreadyOnServices = location.pathname === '/services';
        const announcement = `Showing ${serviceName} services.`;
        console.log(`[VoiceAssistant] triggered action: scroll/highlight "${deptId}"`);

        if (isAlreadyOnServices) {
          speak(announcement, language, () => {
            highlightDeptCard(deptId);
          });
        } else {
          speak(announcement, language, () => {
            navigate('/services');
            setTimeout(() => {
              highlightDeptCard(deptId);
            }, 350);
          });
        }
      };

      const highlightDeptCard = (deptId: string) => {
        const el = document.getElementById(`dept-card-${deptId}`);
        if (!el) {
          console.warn(`[VoiceAssistant] Element #dept-card-${deptId} not found.`);
          return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('dept-card-highlight');
        if (el instanceof HTMLElement) {
          el.focus();
        }
        setTimeout(() => {
          el.classList.remove('dept-card-highlight');
        }, 3000);
      };

      // Actions dispatcher
      switch (matchedAction) {
        case 'HOME':
          executeNavigation('/', 'Going to home page.');
          break;
        case 'SERVICES':
          executeNavigation('/services', 'Opening services page.');
          break;
        case 'PAY_BILLS':
          executeNavigation('/pay-bills', 'Opening payment portal.');
          break;
        case 'TRACK':
          executeNavigation('/track', 'Opening application tracker.');
          break;
        case 'HELP':
          executeNavigation('/help', 'Opening voice assistant.');
          break;
        case 'HISTORY':
          executeNavigation('/history', 'Opening history.');
          break;
        case 'ASSISTANT':
          executeNavigation('/assistant', 'Opening voice assistant.');
          break;
        case 'ELECTRICITY_SERVICES':
          executeScrollHighlight('eb', 'electricity');
          break;
        case 'WATER_SERVICES':
          executeScrollHighlight('water', 'water');
          break;
        case 'GAS_SERVICES':
          executeScrollHighlight('gas', 'gas');
          break;
        case 'MUNICIPAL_SERVICES':
          executeScrollHighlight('municipal', 'municipal');
          break;
        default:
          break;
      }
    } else {
      console.log(`[VoiceAssistant] matched route: null (invalid command)`);
      console.log(`[VoiceAssistant] triggered action: speak unrecognized error`);
      speak('Command not recognized. Please try again.', language);
    }
  }, [navigate, location.pathname, speak, language]);

  // ── Speech Recognition (the SINGLE session) ────────────────────
  const sttLang = getLangLocale(language);

  const stt = useSpeechRecognition({
    onCommand: handleSTTCommand,
    lang: sttLang,
    autoStart: false, // We control start manually
  });

  // ── Listen for aazhi-start-listening event (from welcome flow) ──
  useEffect(() => {
    const handleStartListening = () => {
      const isVoiceEnabled = localStorage.getItem('voice_enabled') === 'true';
      if (isVoiceEnabled && stt.isSupported) {
        stt.startListening();
      }
    };
    window.addEventListener('aazhi-start-listening', handleStartListening);
    return () => {
      window.removeEventListener('aazhi-start-listening', handleStartListening);
    };
  }, [stt.isSupported]);

  // ── Voice toggle functions ──────────────────────────────────────
  const enableVoice = useCallback(() => {
    localStorage.setItem('voice_enabled', 'true');
    setVoiceEnabled(true);
  }, []);

  const disableVoice = useCallback(() => {
    localStorage.setItem('voice_enabled', 'false');
    setVoiceEnabled(false);
    stt.stopListening();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [stt]);

  const toggleVoiceAssistance = useCallback(() => {
    if (voiceEnabled) {
      disableVoice();
    } else {
      enableVoice();
    }
  }, [voiceEnabled, enableVoice, disableVoice]);

  // ── Navigation announcement ─────────────────────────────────────
  const announceNavigation = useCallback(
    (tab: string, command: string) => {
      const msg = getNavigationAnnouncement(tab, command);
      speak(msg);
    },
    [speak]
  );

  // ── Unrecognized command ────────────────────────────────────────
  const announceUnrecognized = useCallback(() => {
    speak(UNRECOGNIZED_COMMAND_MSG);
  }, [speak]);

  // ── Welcome flow ────────────────────────────────────────────────
  const triggerWelcome = useCallback(() => {
    if (hasWelcomedRef.current) return;
    hasWelcomedRef.current = true;
    setHasWelcomed(true);
    triggerFirstInteractionWelcome(language);
  }, [language]);

  // ── Context value ───────────────────────────────────────────────
  const value: VoiceAssistantContextValue = {
    voiceEnabled,
    toggleVoiceAssistance,
    enableVoice,
    disableVoice,

    isListening: stt.isListening,
    isSupported: stt.isSupported,
    transcript: stt.transcript,
    lastCommand: stt.lastCommand,
    error: stt.error,

    startListening: stt.startListening,
    stopListening: stt.stopListening,
    toggleListening: stt.toggleListening,

    speak,
    announceNavigation,
    announceUnrecognized,

    isSpeaking,

    language,
    setLanguage,

    triggerWelcome,
    hasWelcomed,
  };

  return (
    <VoiceAssistantContext.Provider value={value}>
      {children}
    </VoiceAssistantContext.Provider>
  );
};
