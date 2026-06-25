import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Language } from '../../types';

interface VoiceInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  language?: Language | string;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  rows?: number;
}

const langToCode: Record<string, string> = {
  [Language.ENGLISH]: 'en-IN',
  [Language.TAMIL]: 'ta-IN',
  [Language.HINDI]: 'hi-IN',
};

const getLocaleForRecognition = (langStr: string) => {
  return langToCode[langStr] || 'en-IN';
};

export const VoiceInputField: React.FC<VoiceInputFieldProps> = ({
  value,
  onChange,
  language,
  multiline = false,
  placeholder = '',
  className = '',
  id,
  rows = 4
}) => {
  const { i18n } = useTranslation();
  const currentLang = language || i18n.language;
  const currentLangCode = getLocaleForRecognition(currentLang);

  const [isSupported, setIsSupported] = useState(true);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'completed'>('idle');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const startListening = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isSupported) return;

    if (status === 'listening' || status === 'processing') {
      // Stop listening if already active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
      }
      setStatus('idle');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLangCode;

    let finalTranscriptPart = '';

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event: any) => {
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }

      if (final) {
        finalTranscriptPart += final;
        setStatus('processing');
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
         console.error('Speech recognition error in field', event.error);
      }
      setStatus('idle');
    };

    recognition.onend = () => {
      if (finalTranscriptPart) {
        const spacer = value.trim().length > 0 ? ' ' : '';
        onChange(value + spacer + finalTranscriptPart.trim());
        setStatus('completed');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('idle');
      }
      recognitionRef.current = null;
      // Restore focus to input so virtual keyboard works
      setTimeout(() => inputRef.current?.focus(), 100);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  }, [currentLangCode, isSupported, onChange, status, value]);

  const baseClassName = `flex-1 w-full bg-white border-2 border-slate-200 rounded-xl p-4 pr-14 text-slate-800 font-bold focus:border-blue-500 outline-none placeholder:text-slate-300 placeholder:font-normal transition-all ${className}`;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  return (
    <div className="relative w-full group">
      {multiline ? (
        <textarea
          id={id}
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className={`${baseClassName} resize-none`}
          placeholder={placeholder}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          className={baseClassName}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {isSupported && (
        <button
          type="button"
          onClick={startListening}
          aria-label="Start voice input"
          className={`absolute ${multiline ? 'top-3 right-3' : 'top-1/2 -translate-y-1/2 right-3'} p-2 rounded-full transition-all flex items-center justify-center
            ${status === 'idle' ? 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600' : ''}
            ${status === 'listening' ? 'bg-red-100 text-red-600 animate-pulse' : ''}
            ${status === 'processing' ? 'bg-amber-100 text-amber-600' : ''}
            ${status === 'completed' ? 'bg-green-100 text-green-600' : ''}
          `}
        >
          {status === 'idle' && <Mic size={20} />}
          {status === 'listening' && (
             <div className="relative flex items-center justify-center">
                 <span className="absolute w-full h-full rounded-full bg-red-400 animate-ping opacity-75"></span>
                 <Mic size={20} className="relative z-10" />
             </div>
          )}
          {status === 'processing' && <Loader2 size={20} className="animate-spin" />}
          {status === 'completed' && <CheckCircle2 size={20} />}
        </button>
      )}
      
      {/* Visual text feedback */}
      {status !== 'idle' && (
        <div className={`absolute ${multiline ? 'bottom-3 right-4' : '-bottom-6 right-0'} text-xs font-bold pointer-events-none select-none
           ${status === 'listening' ? 'text-red-500' : ''}
           ${status === 'processing' ? 'text-amber-500' : ''}
           ${status === 'completed' ? 'text-green-500' : ''}
        `}>
          {status === 'listening' && 'Listening...'}
          {status === 'processing' && 'Processing...'}
          {status === 'completed' && 'Voice Added'}
        </div>
      )}
    </div>
  );
};
