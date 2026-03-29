import React, { useEffect, useRef } from 'react';

const VoiceFeedbackController: React.FC = () => {
  const lastSpeachRef = useRef<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const speak = (text: string) => {
    const isVoiceEnabled = localStorage.getItem('voice_enabled') === 'true';
    if (!isVoiceEnabled || !text) return;

    // Prevent repeating the same speech in short successions
    if (lastSpeachRef.current === text) {
      return;
    }

    // Debounce to prevent rapid overlapping
    if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US'; // Mandatory: strictly English only
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
        
        lastSpeachRef.current = text;
        // Reset last speech after 3 seconds
        setTimeout(() => {
          if (lastSpeachRef.current === text) {
            lastSpeachRef.current = null;
          }
        }, 3000);
    }, 200); // 200ms delay debounce for smooth transitions
  };

  useEffect(() => {
    /** 
     * GLOBAL LISTENERS for 'data-voice'
     * This approach allows any button/element to be tagged without 
     * adding local event handlers to every component.
     */
    const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const voiceElem = target.closest('[data-voice-hover]');
        if (voiceElem) {
            const voiceText = voiceElem.getAttribute('data-voice-hover');
            if (voiceText) speak(voiceText);
        }
    };

    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const voiceElem = target.closest('[data-voice-click]');
        if (voiceElem) {
            const voiceText = voiceElem.getAttribute('data-voice-click');
            if (voiceText) speak(voiceText);
        }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('click', handleClick);

    return () => {
        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('click', handleClick);
        if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return null; // This component provides global behavior, no UI.
};

export default VoiceFeedbackController;
