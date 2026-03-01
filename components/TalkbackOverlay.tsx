import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { speakText } from '../utils/speak';
import { useLanguage } from '../contexts/LanguageContext';
import { LANGUAGES_CONFIG } from '../constants';

export const TalkbackOverlay: React.FC = () => {
    const [enabled, setEnabled] = useState(false);
    const { language, t } = useLanguage();

    const getLanguageName = () => {
        const config = LANGUAGES_CONFIG.find(l => l.code === language);
        return config ? config.name : 'English';
    };

    const toggleTalkback = () => {
        const newState = !enabled;
        setEnabled(newState);

        // Announce the state change
        speakText({
            text: newState ? 'Talkback enabled' : 'Talkback disabled',
            language: getLanguageName()
        });
    };

    const handlePointerDown = useCallback((e: PointerEvent | MouseEvent | TouchEvent) => {
        if (!enabled) return;

        const path = e.composedPath() as HTMLElement[];
        let targetElement = path.find(el => {
            if (!el || !el.tagName) return false;
            const tag = el.tagName.toLowerCase();
            if (['button', 'a', 'input', 'textarea', 'select'].includes(tag)) return true;
            if (el.hasAttribute?.('aria-label') || el.getAttribute?.('role') === 'button') return true;
            return false;
        }) || (e.target instanceof HTMLElement ? e.target : null);

        if (targetElement && targetElement.id === 'talkback-toggle') return;

        if (targetElement) {
            // Apply a brief highlight for visual feedback
            const originalOutline = targetElement.style.outline;
            const originalOutlineOffset = targetElement.style.outlineOffset;

            targetElement.style.outline = '4px solid #22c55e';
            targetElement.style.outlineOffset = '2px';

            setTimeout(() => {
                if (targetElement) {
                    targetElement.style.outline = originalOutline;
                    targetElement.style.outlineOffset = originalOutlineOffset;
                }
            }, 200);

            let textToSpeak = '';
            if (targetElement.tagName.toLowerCase() === 'input') {
                const input = targetElement as HTMLInputElement;
                textToSpeak = `Input field: ${input.placeholder || input.name || ''}. ${input.value ? `Current value: ${input.value}` : ''}`;
            } else {
                textToSpeak = targetElement.getAttribute('aria-label') || targetElement.innerText || targetElement.textContent || '';
            }

            // Clean up text
            textToSpeak = textToSpeak.replace(/[\n\r\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

            if (textToSpeak) {
                // Cancel ongoing speech immediately and talk fast
                window.speechSynthesis?.cancel();
                speakText({
                    text: textToSpeak,
                    language: getLanguageName(),
                    rate: 1.3, // Faster rate for responsiveness
                    pitch: 1.1 // Slightly higher pitch for clarity
                });
            }
        }
    }, [enabled, language]);

    useEffect(() => {
        if (enabled) {
            // pointerdown fires immediately on touch vs 300ms delay of click
            window.addEventListener('pointerdown', handlePointerDown as any, true);
        } else {
            window.removeEventListener('pointerdown', handlePointerDown as any, true);
        }

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown as any, true);
        };
    }, [enabled, handlePointerDown]);

    return (
        <button
            id="talkback-toggle"
            onClick={toggleTalkback}
            className={`
        fixed bottom-6 right-6 z-[100] w-16 h-16 rounded-full shadow-2xl 
        flex items-center justify-center transition-all duration-300 border-4 border-white
        ${enabled
                    ? 'bg-green-500 text-white scale-110 shadow-green-500/50'
                    : 'bg-slate-800 text-white hover:bg-slate-700 shadow-slate-900/40'}
      `}
            aria-label={enabled ? 'Disable Talkback' : 'Enable Talkback'}
        >
            {enabled ? <Volume2 size={32} /> : <VolumeX size={32} />}

            {/* Live Indicator pulse when enabled */}
            {enabled && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                </span>
            )}
        </button>
    );
};

export default TalkbackOverlay;
