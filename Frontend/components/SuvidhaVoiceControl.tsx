/**
 * SuvidhaVoiceControl — Unified Voice Control Component for the Suvidha Application
 *
 * This component combines both Speech-to-Text (voice commands) and Text-to-Speech
 * (content reading) into a single, reusable, accessible widget.
 *
 * FEATURES:
 * ─────────────────────────────────────────────────────
 * 1. Speech-to-Text (STT):
 *    - Recognizes commands: login, home, service, complaints, trackapp, assistant, submit
 *    - Visual feedback while listening (pulsing indicator, waveform animation)
 *    - Fires onCommand callback for navigation/actions
 *
 * 2. Text-to-Speech (TTS):
 *    - Read any text content aloud
 *    - English + Tamil + all Indian languages
 *    - Controls: play, pause, resume, stop
 *    - Visual feedback while speaking
 *
 * 3. Reusability:
 *    - Use on any page: Home, Service, Complaints, Track Application, Assistant, Submit
 *    - Configurable via props
 *
 * 4. Accessibility:
 *    - Full ARIA attributes
 *    - Screen-reader compatible labels
 *    - Focus management
 *    - Keyboard-accessible controls
 *
 * USAGE:
 * ─────────────────────────────────────────────────────
 *   <SuvidhaVoiceControl
 *     onCommand={(cmd) => navigate(cmd)}
 *     ttsLanguage="Tamil"
 *     showTTS={true}
 *   />
 *
 *   // To read content from outside, use the ref:
 *   const voiceRef = useRef<SuvidhaVoiceControlRef>(null);
 *   voiceRef.current?.speakText("Welcome to Suvidha");
 */

import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Languages,
} from 'lucide-react';
import { useSpeechRecognition, VoiceCommand } from '../hooks/useSpeechRecognition';
import { useTextToSpeech, SpeakOptions } from '../hooks/useTextToSpeech';

// ─── Types ────────────────────────────────────────────────────────
export interface SuvidhaVoiceControlProps {
  /**
   * Callback fired when a voice command is recognized.
   * Use this to navigate pages or trigger actions.
   */
  onCommand: (command: VoiceCommand) => void;

  /**
   * Language for Text-to-Speech output.
   * Matches keys in languageMap: "English", "Tamil", "Hindi", etc.
   * Default: "English"
   */
  ttsLanguage?: string;

  /**
   * Whether to show TTS controls (read-aloud button + controls).
   * Default: true
   */
  showTTS?: boolean;

  /**
   * Whether to show the STT (microphone) button.
   * Default: true
   */
  showSTT?: boolean;

  /**
   * BCP-47 language for speech recognition input.
   * Default: "en-IN"
   */
  sttLang?: string;

  /**
   * Layout variant:
   *   - "floating" — compact floating widget (default)
   *   - "inline"   — inline bar for embedding in headers/toolbars
   *   - "panel"    — expanded panel with all details visible
   */
  variant?: 'floating' | 'inline' | 'panel';

  /**
   * Additional CSS class name for the root container
   */
  className?: string;
}

/**
 * Ref handle exposed via forwardRef so parent components
 * can programmatically trigger TTS from outside.
 */
export interface SuvidhaVoiceControlRef {
  /** Speak text programmatically */
  speakText: (text: string, language?: string) => void;
  /** Stop all speech */
  stopSpeaking: () => void;
  /** Start listening for voice commands */
  startListening: () => void;
  /** Stop listening for voice commands */
  stopListening: () => void;
}

// ─── Human-readable command labels ────────────────────────────────
const COMMAND_LABELS: Record<VoiceCommand, string> = {
  login: '🔐 Login',
  home: '🏠 Home',
  service: '🏛️ Services',
  complaints: '📋 Complaints',
  trackapp: '🔍 Track Application',
  assistant: '🤖 AI Assistant',
  paybill: '💳 Pay Bill',
  history: '📜 History',
  exit: '🚪 Exit',
  submit: '✅ Submit',
};

// ─── Available TTS Languages (quick-select) ───────────────────────
const TTS_LANGUAGES = [
  { label: 'English', value: 'English' },
  { label: 'தமிழ்', value: 'Tamil' },
  { label: 'हिन्दी', value: 'Hindi' },
  { label: 'తెలుగు', value: 'Telugu' },
  { label: 'ಕನ್ನಡ', value: 'Kannada' },
  { label: 'മലയാളം', value: 'Malayalam' },
];

// ─── Component ────────────────────────────────────────────────────
const SuvidhaVoiceControl = forwardRef<SuvidhaVoiceControlRef, SuvidhaVoiceControlProps>(
  (
    {
      onCommand,
      ttsLanguage = 'English',
      showTTS = true,
      showSTT = true,
      sttLang = 'en-IN',
      variant = 'floating',
      className = '',
    },
    ref
  ) => {
    // ── Local state ───────────────────────────────────────────────
    const [isExpanded, setIsExpanded] = useState(variant === 'panel');
    const [selectedTTSLang, setSelectedTTSLang] = useState(ttsLanguage);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [commandFeedback, setCommandFeedback] = useState<string | null>(null);

    const langPickerRef = useRef<HTMLDivElement>(null);

    // ── Hooks ─────────────────────────────────────────────────────
    const handleCommand = useCallback(
      (command: VoiceCommand) => {
        const label = COMMAND_LABELS[command];
        setCommandFeedback(label);
        setTimeout(() => setCommandFeedback(null), 3000);
        onCommand(command);
      },
      [onCommand]
    );

    const stt = useSpeechRecognition({
      onCommand: handleCommand,
      lang: sttLang,
    });

    const tts = useTextToSpeech();

    // ── Expose imperative API via ref ──────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        speakText: (text: string, language?: string) => {
          tts.speak({ text, language: language || selectedTTSLang });
        },
        stopSpeaking: tts.stop,
        startListening: stt.startListening,
        stopListening: stt.stopListening,
      }),
      [tts, stt, selectedTTSLang]
    );

    // Close language picker on outside click
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
          setShowLangPicker(false);
        }
      };
      if (showLangPicker) {
        document.addEventListener('mousedown', handleOutsideClick);
      }
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showLangPicker]);

    // ── Render helpers ────────────────────────────────────────────

    /** Microphone / STT button */
    const renderMicButton = () => (
      <button
        id="suvidha-voice-mic-btn"
        onClick={stt.toggleListening}
        disabled={!stt.isSupported}
        aria-label={stt.isListening ? 'Stop listening for voice commands' : 'Start listening for voice commands'}
        aria-pressed={stt.isListening}
        role="switch"
        title={stt.isSupported ? (stt.isListening ? 'Listening… Click to stop' : 'Click to start voice commands') : 'Voice commands not supported'}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: stt.isListening ? '3px solid #3b82f6' : '2px solid #e2e8f0',
          background: stt.isListening
            ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
            : '#ffffff',
          color: stt.isListening ? '#ffffff' : '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: stt.isSupported ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          boxShadow: stt.isListening
            ? '0 0 0 4px rgba(59,130,246,0.2), 0 8px 25px rgba(59,130,246,0.3)'
            : '0 2px 10px rgba(0,0,0,0.08)',
          position: 'relative',
          outline: 'none',
          opacity: stt.isSupported ? 1 : 0.5,
          flexShrink: 0,
          animation: stt.isListening ? 'suvidha-pulse 2s ease-in-out infinite' : 'none',
        }}
      >
        {stt.isListening ? <Mic size={24} /> : <MicOff size={24} />}

        {/* Live indicator dot */}
        {stt.isListening && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #fff',
              animation: 'suvidha-ping 1.5s ease-in-out infinite',
            }}
          />
        )}
      </button>
    );

    /** Listening status badge */
    const renderListeningBadge = () => {
      if (!stt.isListening && !commandFeedback) return null;

      return (
        <div
          role="status"
          aria-live="polite"
          aria-label={commandFeedback ? `Command recognized: ${commandFeedback}` : 'Listening for voice commands'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px',
            borderRadius: 14,
            background: commandFeedback
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            maxWidth: 280,
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
          }}
        >
          {commandFeedback ? (
            <>
              <Sparkles size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
              <span>{commandFeedback}</span>
            </>
          ) : (
            <>
              {/* Audio waveform animation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      borderRadius: 2,
                      background: '#60a5fa',
                      animation: `suvidha-wave 1s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 10, color: '#93c5fd' }}>Listening…</span>
                <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 600 }}>{sttLang}</span>
              </div>
            </>
          )}
        </div>
      );
    };

    /** TTS Controls */
    const renderTTSControls = () => {
      if (!showTTS) return null;

      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          role="toolbar"
          aria-label="Text-to-Speech controls"
        >
          {/* Language selector */}
          <div ref={langPickerRef} style={{ position: 'relative' }}>
            <button
              id="suvidha-tts-lang-btn"
              onClick={() => setShowLangPicker(!showLangPicker)}
              aria-label={`Text-to-speech language: ${selectedTTSLang}. Click to change.`}
              aria-expanded={showLangPicker}
              aria-haspopup="listbox"
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
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Languages size={14} />
              {TTS_LANGUAGES.find((l) => l.value === selectedTTSLang)?.label || selectedTTSLang}
              {showLangPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {/* Dropdown */}
            {showLangPicker && (
              <div
                role="listbox"
                aria-label="Select TTS language"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  zIndex: 100,
                  overflow: 'hidden',
                  minWidth: 140,
                }}
              >
                {TTS_LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    role="option"
                    aria-selected={selectedTTSLang === lang.value}
                    onClick={() => {
                      setSelectedTTSLang(lang.value);
                      setShowLangPicker(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: selectedTTSLang === lang.value ? 800 : 600,
                      color: selectedTTSLang === lang.value ? '#3b82f6' : '#334155',
                      background: selectedTTSLang === lang.value ? '#eff6ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Speaking state indicator + controls */}
          {tts.isSpeaking && (
            <div
              role="status"
              aria-live="polite"
              aria-label={tts.isPaused ? 'Speech paused' : 'Speaking'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 8,
                background: tts.isPaused
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <Volume2 size={12} style={{ animation: tts.isPaused ? 'none' : 'suvidha-pulse 1.5s infinite' }} />
              {tts.isPaused ? 'Paused' : 'Speaking'}
            </div>
          )}

          {/* Pause / Resume */}
          {tts.isSpeaking && (
            <button
              id="suvidha-tts-pause-btn"
              onClick={tts.isPaused ? tts.resume : tts.pause}
              aria-label={tts.isPaused ? 'Resume speech' : 'Pause speech'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              {tts.isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          )}

          {/* Stop */}
          {tts.isSpeaking && (
            <button
              id="suvidha-tts-stop-btn"
              onClick={tts.stop}
              aria-label="Stop speech"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <Square size={12} fill="currentColor" />
            </button>
          )}
        </div>
      );
    };

    /** Error display */
    const renderError = () => {
      if (!stt.error) return null;
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 10,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <AlertCircle size={14} />
          {stt.error}
        </div>
      );
    };

    // ─── Variant: Floating (compact FAB-style) ────────────────────
    if (variant === 'floating') {
      return (
        <>
          <div
            className={className}
            role="region"
            aria-label="Suvidha Voice Controls"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {showSTT && renderMicButton()}
            {renderListeningBadge()}
            {renderTTSControls()}
            {renderError()}
          </div>
          <style>{KEYFRAME_STYLES}</style>
        </>
      );
    }

    // ─── Variant: Inline (toolbar-style) ──────────────────────────
    if (variant === 'inline') {
      return (
        <>
          <div
            className={className}
            role="region"
            aria-label="Suvidha Voice Controls"
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
            {showSTT && renderMicButton()}
            {renderListeningBadge()}

            {/* Divider */}
            {showSTT && showTTS && (
              <div style={{ width: 1, height: 32, background: '#e2e8f0', flexShrink: 0 }} />
            )}

            {renderTTSControls()}
            {renderError()}
          </div>
          <style>{KEYFRAME_STYLES}</style>
        </>
      );
    }

    // ─── Variant: Panel (expanded, all details visible) ───────────
    return (
      <>
        <div
          className={className}
          role="region"
          aria-label="Suvidha Voice Controls Panel"
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Mic size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Voice Controls
                </h3>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                  Say a command or read content aloud
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
              style={{
                padding: 6,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>

          {/* Panel Body */}
          {isExpanded && (
            <div style={{ padding: 20 }}>
              {/* STT Section */}
              {showSTT && (
                <div style={{ marginBottom: 20 }}>
                  <h4
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 12,
                    }}
                  >
                    🎤 Voice Commands
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    {renderMicButton()}
                    {renderListeningBadge()}
                  </div>

                  {/* Available commands reference */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    {(Object.entries(COMMAND_LABELS) as [VoiceCommand, string][]).map(
                      ([cmd, label]) => (
                        <span
                          key={cmd}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            background:
                              stt.lastCommand === cmd ? '#dbeafe' : '#f8fafc',
                            border: `1px solid ${stt.lastCommand === cmd ? '#93c5fd' : '#e2e8f0'}`,
                            fontSize: 11,
                            fontWeight: 700,
                            color: stt.lastCommand === cmd ? '#2563eb' : '#64748b',
                            transition: 'all 0.2s',
                          }}
                        >
                          {label}
                        </span>
                      )
                    )}
                  </div>

                  {/* Transcript display */}
                  {stt.transcript && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        color: '#475569',
                        fontStyle: 'italic',
                      }}
                    >
                      <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 10, fontStyle: 'normal' }}>
                        HEARD:{' '}
                      </span>
                      "{stt.transcript}"
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              {showSTT && showTTS && (
                <div style={{ height: 1, background: '#f1f5f9', margin: '0 -20px 20px' }} />
              )}

              {/* TTS Section */}
              {showTTS && (
                <div>
                  <h4
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 12,
                    }}
                  >
                    🔊 Read Content Aloud
                  </h4>
                  {renderTTSControls()}

                  {/* Current speech text */}
                  {tts.isSpeaking && tts.currentText && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: '#faf5ff',
                        border: '1px solid #e9d5ff',
                        fontSize: 12,
                        color: '#7c3aed',
                        fontWeight: 600,
                        maxHeight: 60,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Volume2
                        size={12}
                        style={{
                          display: 'inline',
                          marginRight: 6,
                          verticalAlign: 'middle',
                          animation: 'suvidha-pulse 1.5s infinite',
                        }}
                      />
                      {tts.currentText.slice(0, 120)}
                      {tts.currentText.length > 120 ? '…' : ''}
                    </div>
                  )}
                </div>
              )}

              {renderError()}
            </div>
          )}
        </div>
        <style>{KEYFRAME_STYLES}</style>
      </>
    );
  }
);

SuvidhaVoiceControl.displayName = 'SuvidhaVoiceControl';

// ─── Keyframe Animations ──────────────────────────────────────────
const KEYFRAME_STYLES = `
  @keyframes suvidha-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.05); opacity: 0.85; }
  }

  @keyframes suvidha-ping {
    0%      { transform: scale(1); opacity: 1; }
    75%     { transform: scale(1.8); opacity: 0; }
    100%    { transform: scale(1); opacity: 0; }
  }

  @keyframes suvidha-wave {
    0%, 100% { height: 4px; }
    50%      { height: 16px; }
  }

  /* Focus-visible for accessibility */
  #suvidha-voice-mic-btn:focus-visible,
  #suvidha-tts-lang-btn:focus-visible,
  #suvidha-tts-pause-btn:focus-visible,
  #suvidha-tts-stop-btn:focus-visible {
    outline: 3px solid #3b82f6;
    outline-offset: 2px;
  }
`;

export default SuvidhaVoiceControl;
