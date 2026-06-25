import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AnnouncementContextType {
  announce: (message: string) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType>({ announce: () => {} });

export const useAnnouncer = () => useContext(AnnouncementContext);

export const AriaLiveAnnouncer: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [announcement, setAnnouncement] = useState('');

  const announce = useCallback((message: string) => {
    // Clear first to ensure screen readers read it again if it's the exact same message
    setAnnouncement('');
    setTimeout(() => {
      setAnnouncement(message);
    }, 50);
  }, []);

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
