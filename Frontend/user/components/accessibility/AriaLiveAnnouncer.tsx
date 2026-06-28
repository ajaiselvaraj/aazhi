import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { voiceEngine } from '../../src/voice/VoiceEngine';

interface AnnouncementContextType {
  announce: (message: string) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType>({ announce: () => {} });

export const useAnnouncer = () => useContext(AnnouncementContext);

export const AriaLiveAnnouncer: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [announcement, setAnnouncement] = useState('');
  const { i18n } = useTranslation();

  const announce = useCallback((message: string) => {
    // Clear first to ensure screen readers read it again if it's the exact same message
    setAnnouncement('');
    
    // Announce using VoiceEngine for TalkBack system
    const langNames: Record<string, string> = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
      kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali', mr: 'Marathi',
      gu: 'Gujarati', pa: 'Punjabi', as: 'Assamese'
    };
    const baseLang = i18n.language ? i18n.language.split('-')[0] : 'en';
    const langName = langNames[baseLang] || 'English';
    
    if (localStorage.getItem('kiosk_a11y') === 'true') {
      voiceEngine.speak(message, langName);
    }

    setTimeout(() => {
      setAnnouncement(message);
    }, 50);
  }, [i18n.language]);

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0'
        }}
      >
        {announcement}
      </div>
    </AnnouncementContext.Provider>
  );
};
