import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useVoice } from './useVoice';

const VoiceButton: React.FC = () => {
  const { status, startListening, stopListening } = useVoice();
  const [targetNode, setTargetNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Look for target node. Since React can mount out of order, we could use a small polling or mutation observer
    // if it's rendered after. For simple setup, we just query it.
    const findTarget = () => {
      const node = document.getElementById('voice-button-target');
      if (node) {
        setTargetNode(node);
      }
    };
    findTarget();
    
    // In a dynamic app, we can setup a mutation observer to find the target when it's added.
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const isListening = status === 'listening';
  const isProcessing = status === 'processing';
  const isError = status === 'error';

  let bgColor = 'bg-blue-600 hover:bg-blue-700';
  let pulse = '';
  let icon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
    </svg>
  );

  if (isListening) {
    bgColor = 'bg-red-500 hover:bg-red-600';
    pulse = 'animate-pulse';
  } else if (isProcessing) {
    bgColor = 'bg-yellow-500 hover:bg-yellow-600';
    icon = (
      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
    );
  } else if (isError) {
    bgColor = 'bg-orange-600 hover:bg-orange-700';
  }

  const button = (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 z-50 ${bgColor} ${pulse} outline-none focus:ring-4 focus:ring-blue-300 mx-2 flex-shrink-0`}
      aria-label={isListening ? 'Stop Voice Navigation' : 'Start Voice Navigation'}
      title="Voice Navigation"
    >
      {icon}
    </button>
  );

  if (targetNode) {
    return createPortal(button, targetNode);
  }

  return button; // Fallback inline where VoiceProvider places it if target not found
};

export default VoiceButton;
