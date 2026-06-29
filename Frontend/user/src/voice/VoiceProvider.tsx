import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { voiceEngine, VoiceEngineStatus } from './VoiceEngine';
import { getActionForCommand } from './VoiceCommands';
import { voiceController } from './VoiceController';
import VoiceButton from './VoiceButton';
import VoiceOverlay from './VoiceOverlay';
import { detectIntent, IntentResult, buildConfirmationPrompt, isConfirmation, isDenial } from './IntentMapper';

interface VoiceContextProps {
  status: VoiceEngineStatus;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  language: string;
}

const VoiceContext = createContext<VoiceContextProps | undefined>(undefined);

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

interface VoiceProviderProps {
  children: ReactNode;
  appLanguage: string; // Inject current app language e.g. "English", "Tamil"
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ children, appLanguage }) => {
  const [status, setStatus] = useState<VoiceEngineStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const lastExecutionTime = useRef<number>(0);

  // ── Intent Confirmation State ──
  // Stores a MEDIUM-confidence intent waiting for the user to say "yes" or "no".
  const pendingIntentRef = useRef<IntentResult | null>(null);
  // Auto-clear timeout handle for pending confirmation
  const pendingIntentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: speak TTS feedback safely (no-op if synthesis unavailable)
  const speakFeedback = useCallback((text: string) => {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.warn('[VoiceProvider] TTS feedback error:', err);
    }
  }, []);

  // Helper: clear any pending confirmation state
  const clearPendingIntent = useCallback(() => {
    pendingIntentRef.current = null;
    if (pendingIntentTimeoutRef.current !== null) {
      clearTimeout(pendingIntentTimeoutRef.current);
      pendingIntentTimeoutRef.current = null;
    }
  }, []);

  // Setup Engine callbacks
  useEffect(() => {
    voiceEngine.onStatusChange = (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'listening') {
        setError(null);
        setTranscript('');
      }
    };

    voiceEngine.onResult = (text, confidence, isFinal) => {
      setTranscript(text);

      // Prevent double execution or ghost locks by ignoring all speech for 3 seconds after an intent executes
      if (Date.now() - lastExecutionTime.current < 3000) return;

      console.time('Voice_Processing');

      // ── INTENT LAYER: Pre-process with natural-language intent detection ──
      // This runs BEFORE the existing getActionForCommand.
      // On any error it returns null and the existing system takes over.
      try {
        // ── Step 1: Check if user is responding to a MEDIUM-confidence prompt ──
        if (pendingIntentRef.current && isFinal) {
          if (isConfirmation(text)) {
            const confirmed = pendingIntentRef.current;
            clearPendingIntent();
            lastExecutionTime.current = Date.now();
            console.log(`[IntentMapper] ✅ Confirmed: ${confirmed.serviceName}`);
            speakFeedback(`Opening ${confirmed.serviceName}.`);
            voiceController.handleAction(confirmed.action, appLanguage);
            console.timeEnd('Voice_Processing');
            return;
          } else if (isDenial(text)) {
            clearPendingIntent();
            speakFeedback('Okay, cancelled.');
            console.log('[IntentMapper] ❌ User cancelled pending intent.');
            console.timeEnd('Voice_Processing');
            return;
          }
          // If neither yes nor no, fall through to re-match as a new command
          clearPendingIntent();
        }

        // ── Step 2: Run intent detection on the current transcript ──
        const intentResult = detectIntent(text, appLanguage);

        if (intentResult) {
          if (intentResult.confidence === 'HIGH') {
            // HIGH confidence: navigate immediately without asking
            if (!isFinal && intentResult.score < 4) {
              // Wait for final transcript for borderline HIGH scores
              console.timeEnd('Voice_Processing');
              return;
            }
            lastExecutionTime.current = Date.now();
            console.log(`[IntentMapper] 🚀 HIGH confidence → ${intentResult.serviceName}`);

            // If the intent carries deep-nav metadata, dispatch VOICE_DEEP_NAV
            // so App.tsx can route to the exact sub-page (eb tab, complaint category, etc.)
            if (intentResult.targetTab) {
              window.dispatchEvent(new CustomEvent('VOICE_DEEP_NAV', {
                detail: {
                  action: intentResult.action,
                  targetTab: intentResult.targetTab,
                  targetSubView: intentResult.targetSubView,
                }
              }));
            } else {
              // No deep metadata — use the standard action channel
              voiceController.handleAction(intentResult.action, appLanguage);
            }
            console.timeEnd('Voice_Processing');
            return;

          } else if (intentResult.confidence === 'MEDIUM') {
            // MEDIUM confidence: ask for confirmation
            if (!isFinal) {
              console.timeEnd('Voice_Processing');
              return; // Wait for final result before asking
            }
            pendingIntentRef.current = intentResult;
            // Auto-clear if user doesn't respond in 10 seconds
            pendingIntentTimeoutRef.current = setTimeout(() => {
              if (pendingIntentRef.current) {
                clearPendingIntent();
                console.log('[IntentMapper] Pending intent timed out.');
              }
            }, 10000);
            const prompt = buildConfirmationPrompt(intentResult.serviceName, appLanguage);
            console.log(`[IntentMapper] ❓ MEDIUM confidence → asking: "${prompt}"`);
            speakFeedback(prompt);
            console.timeEnd('Voice_Processing');
            return;

          }
          // LOW confidence: fall through to existing system
        }
      } catch (intentErr) {
        // Safety net: intent layer error must NEVER crash the voice pipeline.
        // Log the error, clear any stale state, and let the existing system handle it.
        console.error('[IntentMapper] Unexpected error in intent layer:', intentErr);
        clearPendingIntent();
        try {
          speakFeedback('Voice navigation is temporarily unavailable.');
        } catch (_) { /* ignore TTS errors too */ }
      }

      // ── EXISTING SYSTEM: Unchanged fallback path ──────────────────────────
      // Runs when intent detection returns null/LOW or encounters an error.
      const match = getActionForCommand(text, appLanguage);

      if (match) {
        // Priority 1: Navigation commands
        if (!isFinal && match.score < 3) {
          console.timeEnd('Voice_Processing');
          return;
        }

        // Execute immediately, but DO NOT stop the engine so it stays continuous
        lastExecutionTime.current = Date.now();
        voiceController.handleAction(match.action, appLanguage);
        console.timeEnd('Voice_Processing');
      } else {
        // Priority 2: General queries - fallback to AI
        if (!isFinal) {
          console.timeEnd('Voice_Processing');
          return;
        }

        lastExecutionTime.current = Date.now();
        voiceController.handleAction('ASK_AI' as any, appLanguage, text);
        console.timeEnd('Voice_Processing');
      }
    };

    voiceEngine.onError = (err) => {
      setError(err);
    };
    
    return () => {
      voiceEngine.stop();
      clearPendingIntent();
    };
  }, [appLanguage, speakFeedback, clearPendingIntent]);

  useEffect(() => {
    voiceEngine.setLanguage(appLanguage);
  }, [appLanguage]);

  const startListening = useCallback(() => {
    voiceEngine.start();
  }, []);

  const stopListening = useCallback(() => {
    voiceEngine.stop();
  }, []);

  // Keyboard compatibility: Pause listening if an input receives focus
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (status === 'listening') {
          stopListening();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [status, stopListening]);

  return (
    <VoiceContext.Provider
      value={{ status, transcript, error, startListening, stopListening, language: appLanguage }}
    >
      {children}
      {/* Floating Button and UI Feedback */}
      <VoiceOverlay />
      <VoiceButton />
    </VoiceContext.Provider>
  );
};

export default VoiceProvider;
