import { useEffect, useState, useCallback } from 'react';

export const useInactivityTimer = (
  timeoutMs: number = 45000, // 45 seconds of idle time before warning
  warningMs: number = 15000, // 15 seconds warning countdown before logout
  onLogout: () => void
) => {
  const [isWarning, setIsWarning] = useState(false);
  const [countdown, setCountdown] = useState(warningMs / 1000);

  const resetTimer = useCallback(() => {
    setIsWarning(false);
    setCountdown(warningMs / 1000);
  }, [warningMs]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let warningIntervalId: NodeJS.Timeout;

    const handleInactivity = () => {
      setIsWarning(true);
      
      warningIntervalId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(warningIntervalId);
            onLogout(); // Wipe state and redirect to Home
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const startTimer = () => {
      clearTimeout(timeoutId);
      clearInterval(warningIntervalId);
      timeoutId = setTimeout(handleInactivity, timeoutMs);
    };

    // Listen for events common on touch kiosks
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (!isWarning) {
        startTimer();
      }
    };

    activityEvents.forEach((event) => window.addEventListener(event, handleActivity));
    startTimer();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(warningIntervalId);
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [timeoutMs, warningMs, isWarning, onLogout]);

  return { isWarning, countdown, resetTimer };
};