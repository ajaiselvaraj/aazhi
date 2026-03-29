/**
 * VoiceDemo — Example integration page demonstrating SuvidhaVoiceControl
 *
 * Shows how to use the unified voice component with:
 *   - Voice command navigation across pages
 *   - TTS reading of department lists, service names, messages, and notifications
 *   - Both "floating" and "panel" variants
 *   - Programmatic TTS via ref
 *
 * This page is meant as a reference / demo and can be removed from production.
 */

import React, { useRef, useState, useCallback } from 'react';
import SuvidhaVoiceControl, {
  SuvidhaVoiceControlRef,
} from './SuvidhaVoiceControl';
import { VoiceCommand } from '../hooks/useSpeechRecognition';
import {
  Home,
  LayoutGrid,
  AlertTriangle,
  Search,
  HelpCircle,
  CheckCircle,
  LogIn,
  Volume2,
  Sparkles,
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────
const DEPARTMENTS = [
  { name: 'Revenue Department', nameTA: 'வருவாய் துறை', services: 4 },
  { name: 'Public Works', nameTA: 'பொதுப் பணித்துறை', services: 6 },
  { name: 'Water Supply', nameTA: 'குடிநீர் வழங்கல்', services: 3 },
  { name: 'Electricity Board', nameTA: 'மின்சார வாரியம்', services: 5 },
  { name: 'Health Department', nameTA: 'சுகாதாரத் துறை', services: 4 },
];

const SERVICES = [
  'Birth Certificate',
  'Death Certificate',
  'Property Tax Payment',
  'Water Connection',
  'Street Light Repair',
  'Garbage Collection',
];

const NOTIFICATIONS = [
  { id: 1, text: 'Your complaint #4521 has been resolved. Thank you for your patience.', type: 'success' },
  { id: 2, text: 'Water supply will be disrupted on March 25th from 10 AM to 2 PM in Ward 12.', type: 'warning' },
  { id: 3, text: 'New service available: Online Property Tax Assessment.', type: 'info' },
];

// ─── Page mapping for voice commands ──────────────────────────────
const PAGE_MAP: Record<VoiceCommand, { label: string; icon: React.ReactNode; color: string }> = {
  login: { label: 'Login Page', icon: <LogIn size={20} />, color: '#3b82f6' },
  home: { label: 'Home Page', icon: <Home size={20} />, color: '#22c55e' },
  service: { label: 'Services Page', icon: <LayoutGrid size={20} />, color: '#8b5cf6' },
  complaints: { label: 'Complaints Page', icon: <AlertTriangle size={20} />, color: '#f59e0b' },
  trackapp: { label: 'Track Application', icon: <Search size={20} />, color: '#06b6d4' },
  assistant: { label: 'AI Assistant', icon: <HelpCircle size={20} />, color: '#ec4899' },
  submit: { label: 'Form Submitted', icon: <CheckCircle size={20} />, color: '#10b981' },
};

// ─── Component ────────────────────────────────────────────────────
const VoiceDemo: React.FC = () => {
  const voiceRef = useRef<SuvidhaVoiceControlRef>(null);
  const [currentPage, setCurrentPage] = useState<VoiceCommand | null>(null);
  const [commandLog, setCommandLog] = useState<{ command: VoiceCommand; time: string }[]>([]);
  const [ttsLang, setTtsLang] = useState<'English' | 'Tamil'>('English');

  // ── Voice command handler ───────────────────────────────────────
  const handleCommand = useCallback((command: VoiceCommand) => {
    console.log(`[VoiceDemo] Navigating to: ${command}`);
    setCurrentPage(command);
    setCommandLog((prev) => [
      { command, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9), // Keep last 10
    ]);
  }, []);

  // ── Read text aloud (programmatic TTS via ref) ──────────────────
  const readAloud = (text: string) => {
    voiceRef.current?.speakText(text, ttsLang);
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #faf5ff 100%)',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    padding: '32px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    padding: 24,
    marginBottom: 24,
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 16,
  };

  return (
    <div style={containerStyle}>
      {/* ── Page Header ──────────────────────────────────────────── */}
      <header style={{ maxWidth: 1200, margin: '0 auto 32px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 16,
          }}
        >
          <Sparkles size={14} />
          Voice Integration Demo
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: '#0f172a',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          Suvidha Voice Controls
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', fontWeight: 500, maxWidth: 600, margin: '0 auto' }}>
          Speak a command to navigate or tap 🔊 buttons to hear content read aloud.
          Supports English and Tamil.
        </p>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* ── Left Column: Content ─────────────────────────────── */}
        <div>
          {/* Voice Control — Inline Variant */}
          <div style={{ ...cardStyle, position: 'sticky', top: 16, zIndex: 30 }}>
            <SuvidhaVoiceControl
              ref={voiceRef}
              onCommand={handleCommand}
              ttsLanguage={ttsLang}
              variant="inline"
              showTTS={true}
              showSTT={true}
            />
          </div>

          {/* Navigation result */}
          {currentPage && (
            <div
              style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: `${PAGE_MAP[currentPage].color}10`,
                border: `2px solid ${PAGE_MAP[currentPage].color}40`,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: PAGE_MAP[currentPage].color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {PAGE_MAP[currentPage].icon}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Navigated to:
                </p>
                <p style={{ fontSize: 20, fontWeight: 900, color: PAGE_MAP[currentPage].color, margin: 0 }}>
                  {PAGE_MAP[currentPage].label}
                </p>
              </div>
            </div>
          )}

          {/* Department List with TTS buttons */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={headingStyle}>🏛️ Departments</h3>
              <button
                onClick={() =>
                  readAloud(
                    ttsLang === 'Tamil'
                      ? DEPARTMENTS.map((d) => d.nameTA).join('. ')
                      : DEPARTMENTS.map((d) => d.name).join('. ')
                  )
                }
                aria-label="Read all departments aloud"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: '1px solid #ddd6fe',
                  background: '#faf5ff',
                  color: '#7c3aed',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Volume2 size={14} /> Read All
              </button>
            </div>

            {DEPARTMENTS.map((dept, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: i % 2 === 0 ? '#f8fafc' : '#ffffff',
                  marginBottom: 6,
                  border: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    {dept.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                    {dept.nameTA} • {dept.services} services
                  </p>
                </div>
                <button
                  onClick={() => readAloud(ttsLang === 'Tamil' ? dept.nameTA : dept.name)}
                  aria-label={`Read ${dept.name} aloud`}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  <Volume2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Services grid with TTS */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>📄 Available Services</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {SERVICES.map((service, i) => (
                <button
                  key={i}
                  onClick={() => readAloud(service)}
                  aria-label={`Read ${service} aloud`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <Volume2 size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  {service}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications with TTS */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>🔔 Notifications</h3>
            {NOTIFICATIONS.map((notif) => {
              const colorMap = { success: '#22c55e', warning: '#f59e0b', info: '#3b82f6' };
              const bgMap = { success: '#f0fdf4', warning: '#fffbeb', info: '#eff6ff' };
              return (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: bgMap[notif.type as keyof typeof bgMap],
                    border: `1px solid ${colorMap[notif.type as keyof typeof colorMap]}30`,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: colorMap[notif.type as keyof typeof colorMap],
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0, flex: 1 }}>
                    {notif.text}
                  </p>
                  <button
                    onClick={() => readAloud(notif.text)}
                    aria-label="Read notification aloud"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: 'none',
                      background: `${colorMap[notif.type as keyof typeof colorMap]}20`,
                      color: colorMap[notif.type as keyof typeof colorMap],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Volume2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Column: Panel Variant + Command Log ────────── */}
        <div>
          {/* Language Toggle */}
          <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>TTS Language:</span>
            <button
              onClick={() => setTtsLang('English')}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                border: ttsLang === 'English' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                background: ttsLang === 'English' ? '#eff6ff' : '#fff',
                color: ttsLang === 'English' ? '#2563eb' : '#64748b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              English
            </button>
            <button
              onClick={() => setTtsLang('Tamil')}
              style={{
                padding: '6px 14px',
                borderRadius: 10,
                border: ttsLang === 'Tamil' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                background: ttsLang === 'Tamil' ? '#eff6ff' : '#fff',
                color: ttsLang === 'Tamil' ? '#2563eb' : '#64748b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              தமிழ் (Tamil)
            </button>
          </div>

          {/* Panel variant of voice control */}
          <SuvidhaVoiceControl
            onCommand={handleCommand}
            ttsLanguage={ttsLang}
            variant="panel"
            showTTS={true}
            showSTT={true}
          />

          {/* Command Log */}
          <div style={{ ...cardStyle, marginTop: 24 }}>
            <h3 style={headingStyle}>📜 Command Log</h3>
            {commandLog.length === 0 ? (
              <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, textAlign: 'center', padding: 20 }}>
                Say a command to see it logged here…
              </p>
            ) : (
              commandLog.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: i === 0 ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${i === 0 ? '#bfdbfe' : '#f1f5f9'}`,
                    marginBottom: 6,
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: PAGE_MAP[entry.command]?.color || '#94a3b8',
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      {PAGE_MAP[entry.command]?.label || entry.command}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{entry.time}</span>
                </div>
              ))
            )}
          </div>

          {/* Quick Reference Card */}
          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: 'none' }}>
            <h3 style={{ ...headingStyle, color: '#64748b' }}>💡 Voice Command Reference</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { cmd: '"Login"', desc: 'Navigate to login page' },
                { cmd: '"Home"', desc: 'Go to dashboard' },
                { cmd: '"Service"', desc: 'Open services page' },
                { cmd: '"Complaints"', desc: 'File a complaint' },
                { cmd: '"Track"', desc: 'Track application status' },
                { cmd: '"Assistant"', desc: 'Open AI assistant' },
                { cmd: '"Submit"', desc: 'Submit current form' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code
                    style={{
                      padding: '3px 10px',
                      borderRadius: 8,
                      background: 'rgba(99,102,241,0.15)',
                      color: '#a5b4fc',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      minWidth: 100,
                      textAlign: 'center',
                    }}
                  >
                    {item.cmd}
                  </code>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceDemo;
