import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useVoiceInput = (onResult: (text: string) => void) => {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = false;
        reco.interimResults = false;
        setRecognition(reco);
      }
    }
  }, []);

  useEffect(() => {
    if (recognition) {
      const langMap: Record<string, string> = {
        ta: 'ta-IN',
        hi: 'hi-IN',
        en: 'en-IN',
        te: 'te-IN',
        kn: 'kn-IN',
        ml: 'ml-IN'
      };
      recognition.lang = langMap[i18n.language] || 'en-IN';
    }
  }, [recognition, i18n.language]);

  const startListening = useCallback(() => {
    if (!recognition) return;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  }, [recognition, onResult]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  return { isListening, startListening, stopListening, isSupported: !!recognition };
};
