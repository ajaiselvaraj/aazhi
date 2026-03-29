import { getLanguageCode } from './languageMap';

// Cache for loaded voices to avoid requesting repeatedly
let availableVoices: SpeechSynthesisVoice[] = [];

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

interface SpeakOptions {
    text: string;
    language: string; // The selected language string, e.g., "Hindi", "English"
    rate?: number; // Slower speech rate for accessibility, default 0.85
    pitch?: number; // Clear pronunciation setting, default 1.0
    volume?: number; // Volume default 1.0 (max)
}

export const speakText = async ({
    text,
    language,
    rate = 0.85, // Default slower rate for senior citizens and clear hearing
    pitch = 1.0,
    volume = 1.0
}: SpeakOptions) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.warn('Speech Synthesis not supported in this environment.');
        return;
    }

    // Check if voice is globally enabled.
    // If it is not explicitly set to 'true', do not speak.
    const isVoiceEnabledGlobally = localStorage.getItem('voice_enabled') === 'true';
    if (!isVoiceEnabledGlobally) {
        return;
    }

    // Cancel any ongoing speech before starting a new one
    window.speechSynthesis.cancel();

    // If text is empty, nothing to speak
    if (!text || text.trim() === '') return;

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

    // Try to find the exact voice for the requested language
    let selectedVoice = availableVoices.find(voice => voice.lang === langCode);

    // Fallback 1: Try finding a voice that starts with the language code (e.g., 'hi' for 'hi-IN')
    if (!selectedVoice) {
        selectedVoice = availableVoices.find(voice => voice.lang.startsWith(langCode.split('-')[0]));
    }

    // Fallback 2: Fallback to Indian English
    if (!selectedVoice) {
        selectedVoice = availableVoices.find(voice => voice.lang === 'en-IN');
    }

    // Fallback 3: Fallback to any English or the first available voice
    if (!selectedVoice) {
        selectedVoice = availableVoices.find(voice => voice.lang.startsWith('en')) || availableVoices[0];
    }

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
};
