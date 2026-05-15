import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface OrientationContextValue {
  isVertical: boolean;
  toggleOrientation: () => void;
}

const OrientationContext = createContext<OrientationContextValue>({
  isVertical: false,
  toggleOrientation: () => {},
});

export const OrientationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVertical, setIsVertical] = useState<boolean>(() => {
    const stored = localStorage.getItem('kiosk_orientation');
    // Default to vertical (kiosk mode) if no preference has ever been saved
    if (stored === null) return true;
    return stored === 'vertical';
  });

  const toggleOrientation = useCallback(() => {
    setIsVertical(prev => {
      const next = !prev;
      localStorage.setItem('kiosk_orientation', next ? 'vertical' : 'horizontal');
      // Notify layout listeners (e.g. chart libraries)
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      return next;
    });
  }, []);

  // Apply body-level data attribute so CSS can target globally
  useEffect(() => {
    document.body.setAttribute('data-orientation', isVertical ? 'vertical' : 'horizontal');
  }, [isVertical]);

  return (
    <OrientationContext.Provider value={{ isVertical, toggleOrientation }}>
      {children}
    </OrientationContext.Provider>
  );
};

export const useOrientation = () => useContext(OrientationContext);
