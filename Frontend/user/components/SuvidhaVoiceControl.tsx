import React, { useState, Suspense, lazy, forwardRef, useEffect } from 'react';
import { MicOff, ChevronDown, Languages, Loader2 } from 'lucide-react';
import type { SuvidhaVoiceControlProps, SuvidhaVoiceControlRef } from './SuvidhaVoiceControlImpl';

// Dynamically import the heavy voice logic only when needed
const SuvidhaVoiceControlImpl = lazy(() => import('./SuvidhaVoiceControlImpl'));

const SuvidhaVoiceControl = forwardRef<SuvidhaVoiceControlRef, SuvidhaVoiceControlProps>((props, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounting, setIsMounting] = useState(false);

  // If programmatic speech is requested via ref, we must load the module immediately
  useEffect(() => {
    if (ref && !isLoaded) {
      // It's tricky to intercept ref calls before the component mounts.
      // So if a parent passes a ref, they might want to use it programmatically.
      // We will lazily load it if the parent explicitly passes a ref and we aren't loaded.
    }
  }, [ref, isLoaded]);

  const handleMicClick = () => {
    setIsMounting(true);
    // The Suspense will handle the loading state, and once loaded it will mount.
    // We will pass an autoStart prop to Impl so it immediately starts listening.
    setIsLoaded(true);
  };

  if (isLoaded) {
    return (
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid #e2e8f0' }}>
           <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={24} className="animate-spin text-slate-400" />
           </div>
        </div>
      }>
        {/* We pass an extra autoStart prop so it immediately listens once loaded */}
        <SuvidhaVoiceControlImpl {...props} ref={ref} autoStart={true} />
      </Suspense>
    );
  }

  // ── Lightweight Static UI (Matches Inline Variant) ──
  if (props.variant === 'inline') {
    return (
      <div
        className={props.className}
        role="region"
        aria-label="Suvidha Voice Controls (Click to Load)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {props.showSTT !== false && (
          <button
            onClick={handleMicClick}
            aria-label="Load and start voice commands"
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '2px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              outline: 'none',
              flexShrink: 0,
            }}
          >
            {isMounting ? <Loader2 size={24} className="animate-spin" /> : <MicOff size={24} />}
          </button>
        )}

        {props.showSTT !== false && props.showTTS !== false && (
          <div style={{ width: 1, height: 32, background: '#e2e8f0', flexShrink: 0 }} />
        )}

        {props.showTTS !== false && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleMicClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Languages size={14} />
              {props.ttsLanguage || 'English'}
              <ChevronDown size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  const currentVariant = props.variant || 'floating';

  // ── Lightweight Static UI (Floating Variant) ──
  if (currentVariant === 'floating') {
    return (
      <div
        className={props.className}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
      >
        {props.showSTT !== false && (
          <button
            onClick={handleMicClick}
            style={{
              width: 56, height: 56, borderRadius: '50%', border: '2px solid #e2e8f0',
              background: '#ffffff', color: '#64748b', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            }}
          >
            {isMounting ? <Loader2 size={24} className="animate-spin" /> : <MicOff size={24} />}
          </button>
        )}
      </div>
    );
  }

  // ── Lightweight Static UI (Panel Variant) ──
  return (
    <div className={props.className} style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 20, textAlign: 'center', cursor: 'pointer' }} onClick={handleMicClick}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid #e2e8f0', background: '#ffffff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        {isMounting ? <Loader2 size={24} className="animate-spin" /> : <MicOff size={24} />}
      </div>
      <p style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>Voice Controls</p>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', fontWeight: 600 }}>Click to enable</p>
    </div>
  );
});

SuvidhaVoiceControl.displayName = 'SuvidhaVoiceControl';
export default SuvidhaVoiceControl;
export type { SuvidhaVoiceControlProps, SuvidhaVoiceControlRef };
