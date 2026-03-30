/**
 * useTextToSpeech — Custom React hook for Text-to-Speech with full controls
 *
 * Features:
 *   - Speak any text content (page headers, service names, messages, notifications)
 *   - English + Tamil support (extensible to all Indian languages via languageMap)
 *   - Controls: start, stop, pause, resume
 *   - Visual feedback state (isSpeaking, isPaused)
 *   - Automatic voice selection with multi-level fallback
 *
 * Uses Web Speech API (SpeechSynthesis).
 *
 * @returns { speak, stop, pause, resume, isSpeaking, isPaused, isSupported }
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getLanguageCode } from '../utils/languageMap';

// ─── Types ────────────────────────────────────────────────────────
export interface SpeakOptions {
  /** The text content to read aloud */
  text: string;
  /**
   * Language name string — matches keys in languageMap.ts
   * e.g. "English", "Tamil", "Hindi"
   */
  language?: string;
  /** Speech rate (0.1–10). Default 0.9 for clarity */
  rate?: number;
  /** Pitch (0–2). Default 1.0 */
  pitch?: number;
  /** Volume (0–1). Default 1.0 */
  volume?: number;
}

export interface UseTextToSpeechReturn {
  /** Speak the given text. Cancels any ongoing speech first. */
  speak: (options: SpeakOptions) => void;
  /** Stop all speech immediately */
  stop: () => void;
  /** Pause current speech (can be resumed) */
  pause: () => void;
  /** Resume paused speech */
  resume: () => void;
  /** Whether speech is currently playing */
  isSpeaking: boolean;
  /** Whether speech is currently paused */
  isPaused: boolean;
  /** Whether the browser supports SpeechSynthesis */
  isSupported: boolean;
  /** The text currently being spoken */
  currentText: string;
  /** The language currently being used for speech */
  currentLanguage: string;
}

// ─── Voice Cache ──────────────────────────────────────────────────
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }
    // Some browsers load voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      const v = window.speechSynthesis.getVoices();
      cachedVoices = v;
      resolve(v);
    };
    // Safety timeout — resolve with empty if voices never load
    setTimeout(() => resolve([]), 3000);
  });
}

/**
 * Find the best matching voice for a given language code.
 * Fallback chain: exact match → prefix match → en-IN → any English → first available
 */
function findBestVoice(langCode: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const prefix = langCode.split('-')[0]; // e.g. "ta" from "ta-IN"

  return (
    voices.find((v) => v.lang === langCode) ||           // Exact: "ta-IN"
    voices.find((v) => v.lang.startsWith(prefix)) ||     // Prefix: "ta-*"
    voices.find((v) => v.lang === 'en-IN') ||            // Indian English
    voices.find((v) => v.lang.startsWith('en')) ||       // Any English
    voices[0]                                             // Last resort
  );
}

// ─── Hook Implementation ──────────────────────────────────────────
export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('English');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // ── Sync state with SpeechSynthesis polling ─────────────────────
  // SpeechSynthesis doesn't fire events reliably in all browsers,
  // so we poll to keep our state accurate.
  useEffect(() => {
    if (!isSupported) return;

    const interval = setInterval(() => {
      const synth = window.speechSynthesis;
      if (!synth.speaking && !synth.pending) {
        if (isSpeaking) {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isSupported, isSpeaking]);

  // ── Pre-load voices on mount ────────────────────────────────────
  useEffect(() => {
    if (isSupported && cachedVoices.length === 0) {
      loadVoicesAsync();
    }
  }, [isSupported]);

  // ── Speak ───────────────────────────────────────────────────────
  const speak = useCallback(
    ({
      text,
      language = 'English',
      rate = 0.9,
      pitch = 1.0,
      volume = 1.0,
    }: SpeakOptions) => {
      if (!isSupported) {
        console.warn('[TTS] SpeechSynthesis not supported.');
        return;
      }

      if (!text || text.trim() === '') return;

      // Check if voice is globally enabled.
      // If it is not explicitly set to 'true', do not speak.
      const isVoiceEnabledGlobally = localStorage.getItem('voice_enabled') === 'true';
      if (!isVoiceEnabledGlobally) {
          console.log('[TTS] Speech blocked: voice_enabled is false/null.');
          return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const langCode = getLanguageCode(language);
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = langCode;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Assign best voice
      const voice = findBestVoice(langCode, cachedVoices);
      if (voice) utterance.voice = voice;

      // State tracking callbacks
      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setCurrentText(text);
        setCurrentLanguage(language);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentText('');
      };

      utterance.onerror = (event) => {
        console.warn('[TTS] Error:', event.error);
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  // ── Stop ────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentText('');
  }, [isSupported]);

  // ── Pause ───────────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (!isSupported || !window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  // ── Resume ──────────────────────────────────────────────────────
  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported, isPaused]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    currentText,
    currentLanguage,
  };
}
