import React from 'react';
import { useVoiceAssistant } from './useVoiceAssistant';

export function VoiceDebugPanel() {
  const { transcript, isListening, lastCommand, error } = useVoiceAssistant();

  return (
    <div style={{ position: 'fixed', bottom: 10, right: 10, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '5px', zIndex: 9999 }}>
      <h4>Voice Debug</h4>
      <p>Listening: {isListening ? 'Yes' : 'No'}</p>
      <p>Transcript: {transcript}</p>
      <p>Last Command: {lastCommand}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
