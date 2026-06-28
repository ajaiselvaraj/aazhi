import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface VoiceInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onVoiceResult: (text: string) => void;
  icon?: React.ReactNode;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onVoiceResult, icon, className, ...props }) => {
  const { isListening, startListening, stopListening, isSupported } = useVoiceInput(onVoiceResult);

  return (
    <div className="relative group w-full flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition">
      {icon && <div className="pl-5 text-slate-400">{icon}</div>}
      <input
        {...props}
        className={`w-full bg-transparent p-5 text-xl font-bold outline-none placeholder:text-slate-300 ${className || ''}`}
      />
      {isSupported && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            isListening ? stopListening() : startListening();
          }}
          className={`h-20 w-20 min-w-[80px] flex items-center justify-center shrink-0 border-l border-slate-200 transition-colors ${
            isListening ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {isListening ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      )}
    </div>
  );
};

export default VoiceInput;
