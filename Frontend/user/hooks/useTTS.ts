import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const useTTS = (text: string) => {
  const { i18n } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = () => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map language to BCP 47 language tag
    const langMap: Record<string, string> = {
      ta: 'ta-IN',
      hi: 'hi-IN',
      en: 'en-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN'
    };
    
    utterance.lang = langMap[i18n.language] || 'en-IN';
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const isA11yOn = localStorage.getItem('kiosk_a11y') === 'true';
    if (isA11yOn && text) {
      speak();
    }
    return () => {
      stop();
    };
  }, [text, i18n.language]);

  return { speak, stop, isPlaying };
};
