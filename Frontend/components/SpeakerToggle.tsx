import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SpeakerToggle: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('voice_enabled') === 'true';
  });

  const toggleVoice = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('voice_enabled', newState.toString());
    
    // Dispatch a custom event to notify other components (like KioskUI)
    window.dispatchEvent(new CustomEvent('voice-toggle', { detail: { enabled: newState } }));

    // Announce the state change if turning ON
    if (newState) {
      const utterance = new SpeechSynthesisUtterance("Voice guidance enabled");
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }
  };

  return (
    <div className="fixed bottom-12 right-12 z-[100] print:hidden">
      <motion.button
        id="voice-feedback-toggle"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleVoice}
        className={`
          w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-300
          ${isEnabled 
            ? 'bg-blue-600 text-white border-2 border-blue-400 ring-4 ring-blue-500/20' 
            : 'bg-white text-slate-400 border-2 border-slate-200'
          }
        `}
        title={isEnabled ? "Disable Voice Feedback" : "Enable Voice Feedback"}
        aria-label={isEnabled ? "Disable Voice Feedback" : "Enable Voice Feedback"}
      >
        <AnimatePresence mode="wait">
          {isEnabled ? (
            <motion.div
              key="on"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <Volume2 size={32} />
            </motion.div>
          ) : (
            <motion.div
              key="off"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <VolumeX size={32} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {isEnabled && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
          </span>
        )}
      </motion.button>
    </div>
  );
};

export default SpeakerToggle;
