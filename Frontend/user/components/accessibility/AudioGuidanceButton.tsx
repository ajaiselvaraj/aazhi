import React, { useCallback, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
  const [isOn, setIsOn] = useState(() => localStorage.getItem('kiosk_a11y') === 'true');

  const toggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !isOn;
    setIsOn(nextState);
    localStorage.setItem('kiosk_a11y', String(nextState));

    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (nextState) {
        const utterance = new SpeechSynthesisUtterance("Accessibility mode enabled.");
        utterance.lang = currentLangCode;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        
        utterance.onend = () => {
             window.dispatchEvent(new Event('announce_current_page'));
        };
        
        window.speechSynthesis.speak(utterance);
    }
  }, [isOn, currentLangCode]);

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
      onClick={toggle}
      className={`flex items-center justify-center p-3 rounded-full ${isOn ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} hover:scale-105 transition-all shadow-sm ${className}`}
      aria-label={isOn ? "Turn off audio guidance" : "Turn on audio guidance"}
      title={isOn ? "Turn off audio guidance" : "Turn on audio guidance"}
    >
      {isOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
    </button>
  );
};
