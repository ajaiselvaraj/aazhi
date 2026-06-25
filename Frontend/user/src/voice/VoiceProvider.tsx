import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { voiceEngine, VoiceEngineStatus } from './VoiceEngine';
import { getActionForCommand } from './VoiceCommands';
import { voiceController } from './VoiceController';
import VoiceButton from './VoiceButton';
import VoiceOverlay from './VoiceOverlay';

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

  const isExecutingIntent = useRef(false);

  // Setup Engine callbacks
  useEffect(() => {
    voiceEngine.onStatusChange = (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'listening') {
        setError(null);
        setTranscript('');
        isExecutingIntent.current = false; // Fix ghost lock!
      }
    };

    voiceEngine.onResult = (text, confidence, isFinal) => {
      setTranscript(text);
      
      if (isFinal) {
        isExecutingIntent.current = false; // Unlock for the next phrase
      }

      if (isExecutingIntent.current) return; // Prevent double execution
      
      console.time('Voice_Processing');
      const match = getActionForCommand(text, appLanguage);
      
      if (match) {
        // Priority 1: Navigation commands
        if (!isFinal && match.score < 3) {
            console.timeEnd('Voice_Processing');
            return;
        }
        
        // Execute immediately, but DO NOT stop the engine so it stays continuous
        isExecutingIntent.current = true;
        voiceController.handleAction(match.action, appLanguage);
        console.timeEnd('Voice_Processing');
      } else {
        // Priority 2: General queries - fallback to AI
        if (!isFinal) {
            console.timeEnd('Voice_Processing');
            return; 
        }
        
        isExecutingIntent.current = true;
        voiceController.handleAction('ASK_AI' as any, appLanguage, text);
        console.timeEnd('Voice_Processing');
      }
    };

    voiceEngine.onError = (err) => {
      setError(err);
    };
    
    return () => {
      voiceEngine.stop();
    };
  }, [appLanguage]);

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
