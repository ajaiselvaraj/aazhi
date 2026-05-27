/**
 * speak.ts — Aazhi Text-to-Speech Utility
 *
 * Updated to:
 * 1. Prefer female voices matching the selected language
 * 2. Dispatch aazhi-speech-start/end events for echo prevention
 * 3. Use accessibility-friendly rate (0.85)
 */

import { getLanguageCode } from './languageMap';

// Cache for loaded voices to avoid requesting repeatedly
let availableVoices: SpeechSynthesisVoice[] = [];

// Female voice name keywords across OS / browsers
const FEMALE_VOICE_KEYWORDS = /female|woman|girl|zira|hazel|susan|victoria|samantha|karen|moira|tessa|fiona|veena|siri|cortana/i;

// Helper to reliably load voices, since getVoices is asynchronous on some browsers
export const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            availableVoices = voices;
            resolve(voices);
        } else {
            // Event listener for when voices are finally loaded by the browser
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                availableVoices = voices;
                resolve(voices);
            };
        }
    });
};

/**
 * Find the best female voice for a given language code.
 * Fallback chain: exact+female → exact → prefix+female → prefix → en-IN female → en female → en → first
 */
function findFemaleVoice(langCode: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;
    const prefix = langCode.split('-')[0];
    const femaleVoices = voices.filter((v) => FEMALE_VOICE_KEYWORDS.test(v.name));

    if (femaleVoices.length > 0) {
        return (
            femaleVoices.find((v) => v.lang === langCode) ||
            femaleVoices.find((v) => v.lang.startsWith(prefix)) ||
            femaleVoices.find((v) => v.lang === 'en-IN') ||
            femaleVoices.find((v) => v.lang.startsWith('en')) ||
            femaleVoices[0]
        );
    }

    // Last resort fallback ONLY if absolutely no female voice exists in the system
    return (
        voices.find((v) => v.lang === langCode) ||
        voices.find((v) => v.lang.startsWith(prefix)) ||
        voices[0]
    );
}

interface SpeakOptions {
    text: string;
    language: string; // The selected language string, e.g., "Hindi", "English"
    rate?: number; // Slower speech rate for accessibility, default 0.85
    pitch?: number; // Clear pronunciation setting, default 1.0
    volume?: number; // Volume default 1.0 (max)
    onEnd?: () => void; // Callback when speech ends
}

export const speakText = async ({
    text,
    language,
    rate = 0.85, // Default slower rate for senior citizens and clear hearing
    pitch = 1.0,
    volume = 1.0,
    onEnd
}: SpeakOptions) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech Synthesis not supported in this environment.');
        onEnd?.();
        return;
    }

    // Check if voice is globally enabled.
    // If it is not explicitly set to 'true', do not speak.
    const isVoiceEnabledGlobally = localStorage.getItem('voice_enabled') === 'true';
    if (!isVoiceEnabledGlobally) {
        onEnd?.();
        return;
    }

    // Cancel any ongoing speech before starting a new one
    window.speechSynthesis.cancel();

    // If text is empty, nothing to speak
    if (!text || text.trim() === '') {
        onEnd?.();
        return;
    }

    const langCode = getLanguageCode(language);

    // Ensure we have voices loaded
    if (availableVoices.length === 0) {
        await loadVoices();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Use female-preferred voice finder
    const selectedVoice = findFemaleVoice(langCode, availableVoices);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    // Echo prevention: dispatch events so mic mutes during speech
    utterance.onstart = () => {
        window.dispatchEvent(new CustomEvent('aazhi-speech-start'));
    };

    utterance.onend = () => {
        window.dispatchEvent(new CustomEvent('aazhi-speech-end'));
        onEnd?.();
    };

    utterance.onerror = () => {
        window.dispatchEvent(new CustomEvent('aazhi-speech-end'));
        onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
};
