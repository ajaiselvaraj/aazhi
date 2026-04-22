/**
 * useSpeechRecognition — Custom React hook for Speech-to-Text (Voice Commands)
 *
 * Supported Commands:
 *   login, home, service, complaints, trackapp, assistant, submit
 *
 * Uses Web Speech API (SpeechRecognition) with automatic fallback detection.
 * Continuously listens and auto-restarts on silence.
 *
 * @param onCommand - callback fired when a recognized command is detected
 * @returns { isListening, isSupported, error, transcript, startListening, stopListening, toggleListening }
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────
export type VoiceCommand =
  | 'login'
  | 'home'
  | 'service'
  | 'complaints'
  | 'trackapp'
  | 'assistant'
  | 'paybill'
  | 'history'
  | 'gas'
  | 'exit'
  | 'submit';

export interface UseSpeechRecognitionOptions {
  /** Callback fired when a voice command is recognized, or raw transcript is captured */
  onCommand: (command: string) => void;
  /** BCP-47 language code for recognition, default "en-IN" */
  lang?: string;
  /** Whether to automatically start listening on mount */
  autoStart?: boolean;
}

export interface UseSpeechRecognitionReturn {
  /** Whether the recognizer is actively listening */
  isListening: boolean;
  /** Whether the browser supports Web Speech API */
  isSupported: boolean;
  /** Error message (mic denied, unsupported, etc.) */
  error: string | null;
  /** The last raw transcript received */
  transcript: string;
  /** The last matched command (for visual feedback) */
  lastCommand: VoiceCommand | null;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
}

// ─── Command Keyword Map ──────────────────────────────────────────
// Each command maps to an array of keywords/phrases that trigger it.
// Uses loose "includes" matching for robustness with speech recognition.
const COMMAND_MAP: Record<VoiceCommand, string[]> = {
  login: ['login', 'log in', 'sign in', 'signin', 'authenticate'],
  home: ['home', 'go home', 'main page', 'dashboard', 'main'],
  service: ['service', 'services', 'department', 'departments', 'apply'],
  complaints: ['complaint', 'complaints', 'grievance', 'grievances', 'report', 'issue', 'problem'],
  trackapp: ['track', 'track app', 'track application', 'tracking', 'status', 'check status'],
  assistant: ['assistant', 'help', 'ai', 'chatbot', 'chat', 'support', 'guide'],
  paybill: ['pay bill', 'pay bills', 'billing', 'payment', 'pay'],
  history: ['history', 'records', 'past requests', 'my history'],
  gas: ['gas', 'gas services', 'gas department', 'gas connection', 'lpg', 'cylinder', 'gas booking'],
  exit: ['exit', 'logout', 'log out', 'sign out', 'leave', 'quit'],
  submit: ['submit', 'send', 'confirm', 'yes', 'done', 'finish', 'complete'],
};

// ─── Hook Implementation ──────────────────────────────────────────
export function useSpeechRecognition({
  onCommand,
  lang = 'en-IN',
  autoStart = false,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  const recognitionRef = useRef<any>(null);
  const isManuallyStopped = useRef(false);
  const onCommandRef = useRef(onCommand);

  // Keep the callback reference fresh without re-creating the recognizer
  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // ── Feature detection ───────────────────────────────────────────
  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  // ── Match transcript to a command ───────────────────────────────
  const matchCommand = useCallback((text: string): VoiceCommand | null => {
    const cleaned = text.toLowerCase().trim().replace(/[^\w\s]/gi, '');

    for (const [command, keywords] of Object.entries(COMMAND_MAP)) {
      for (const keyword of keywords) {
        if (cleaned.includes(keyword)) {
          return command as VoiceCommand;
        }
      }
    }
    return null;
  }, []);

  // ── Start Recognition ───────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Tear down previous instance
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        isManuallyStopped.current = false;
      };

      recognition.onresult = (event: any) => {
        const results = event.results;
        const latestResult = results[results.length - 1];
        const rawTranscript = latestResult[0].transcript;

        setTranscript(rawTranscript);
        console.log('[VoiceHook] Transcript:', rawTranscript);

        const matched = matchCommand(rawTranscript);
        if (matched) {
          console.log(`[VoiceHook] Command matched: "${matched}"`);
          setLastCommand(matched);
          onCommandRef.current(matched);

          // Clear the last-command indicator after 3 seconds
          setTimeout(() => setLastCommand(null), 3000);
        } else {
          // If no static command match, pass it for Natural Language processing
          console.log(`[VoiceHook] Unmatched phrase pushed to AI engine: "${rawTranscript}"`);
          onCommandRef.current(`ai_query:${rawTranscript}`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceHook] Error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone access was denied. Please allow microphone permissions.');
          setIsListening(false);
          isManuallyStopped.current = true;
        } else if (event.error === 'no-speech') {
          // Silence — will auto-restart in onend
        } else if (event.error === 'network') {
          setError('Network error. Speech recognition requires an internet connection.');
        }
      };

      // Auto-restart on natural end (silence timeout, etc.)
      recognition.onend = () => {
        if (!isManuallyStopped.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn('[VoiceHook] Restart failed:', e);
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('[VoiceHook] Init failed:', e);
      setError('Failed to initialize speech recognition.');
      setIsListening(false);
    }
  }, [SpeechRecognitionAPI, lang, matchCommand]);

  // ── Stop Recognition ────────────────────────────────────────────
  const stopListening = useCallback(() => {
    isManuallyStopped.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  // ── Toggle ──────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ── Auto-start on mount (optional) ─────────────────────────────
  useEffect(() => {
    if (autoStart && isSupported) {
      startListening();
    }
    return () => {
      isManuallyStopped.current = true;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isListening,
    isSupported,
    error,
    transcript,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
  };
}
