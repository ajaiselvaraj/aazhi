import React, { useCallback, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Language } from '../../types';

interface AudioGuidanceButtonProps {
  text: string;
  className?: string;
}

const langToCode: Record<string, string> = {
  [Language.ENGLISH]: 'en-IN',
  [Language.TAMIL]: 'ta-IN',
  [Language.HINDI]: 'hi-IN',
};

const getLocaleForSpeech = (langStr: string) => {
  return langToCode[langStr] || 'en-IN';
};

export const AudioGuidanceButton: React.FC<AudioGuidanceButtonProps> = ({ text, className = '' }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const currentLangCode = getLocaleForSpeech(currentLang);

  const speak = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!('speechSynthesis' in window)) return;

    // Prevent overlapping speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLangCode;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }, [text, currentLangCode]);

  // Cancel speech on unmount for performance and correctness
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <button
      onClick={speak}
      className={`flex items-center justify-center p-3 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 hover:scale-105 transition-all shadow-sm ${className}`}
      aria-label="Read page instructions aloud"
      title="Read instructions"
    >
      <Volume2 size={24} />
    </button>
  );
};
