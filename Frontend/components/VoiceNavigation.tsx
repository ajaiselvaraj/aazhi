import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Loader2, Volume2, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../types';

interface VoiceNavigationProps {
    onCommand: (command: string) => void;
}

const VoiceNavigation: React.FC<VoiceNavigationProps> = ({ onCommand }) => {
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { language, setLanguage, tForLang } = useLanguage();

    const recognitionRef = useRef<any>(null);
    const isManuallyStopped = useRef(false);

    // 🔊 Voice Synthesis (Feedback)
    const speakFeedback = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }, []);

    const processTranscript = useCallback((transcript: string) => {
        // 1️⃣ Normalize Transcript
        const raw = transcript;
        console.log("RAW TRANSCRIPT:", raw);

        const cleaned = raw
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/gi, "");

        console.log("CLEANED:", cleaned);

        let match = false;
        let action = "";
        let feedbackKey = "";
        let targetLang = Language.ENGLISH;

        // 3️⃣ Use Loose Matching (NOT exact match)
        if (cleaned.includes("english")) {
            action = "SELECT_EN";
            setLanguage(Language.ENGLISH);
            feedbackKey = "feedback_lang_changed";
            targetLang = Language.ENGLISH;
            match = true;
        } else if (cleaned.includes("hindi")) {
            action = "SELECT_HI";
            setLanguage(Language.HINDI);
            feedbackKey = "feedback_lang_changed";
            targetLang = Language.HINDI;
            match = true;
        } else if (cleaned.includes("tamil") || cleaned.includes("thamil")) {
            action = "SELECT_TA";
            setLanguage(Language.TAMIL);
            feedbackKey = "feedback_lang_changed";
            targetLang = Language.TAMIL;
            match = true;
        } else if (cleaned.includes("telugu")) {
            action = "SELECT_TE";
            setLanguage(Language.TELUGU);
            feedbackKey = "feedback_lang_changed";
            targetLang = Language.TELUGU;
            match = true;
        } else if (cleaned.includes("kannada")) {
            action = "SELECT_KN";
            setLanguage(Language.KANNADA);
            feedbackKey = "feedback_lang_changed";
            targetLang = Language.KANNADA;
            match = true;
        } else if (cleaned.includes("malayalam")) {
            action = "SELECT_ML";
            setLanguage(Language.MALAYALAM);
            feedbackKey = "feedback_lang_changed";
            targetLang = Language.MALAYALAM;
            match = true;
        } else if (cleaned.includes("login")) {
            action = "LOGIN";
            feedbackKey = "feedback_navigating_login";
            // Check current language for feedback
            targetLang = language;
            match = true;
        }

        if (match) {
            console.log(`[Voice] MATCH SUCCESS: ${action}`);
            setIsThinking(true);

            let feedbackText = "";
            if (action.startsWith("SELECT_")) {
                const langNames: Record<string, string> = {
                    "SELECT_EN": "English",
                    "SELECT_HI": "Hindi",
                    "SELECT_TA": "Tamil",
                    "SELECT_TE": "Telugu",
                    "SELECT_KN": "Kannada",
                    "SELECT_ML": "Malayalam"
                };
                feedbackText = `${langNames[action]} Selected`;
                setFeedback(feedbackText);
                speakFeedback(feedbackText);
            }

            // Trigger command to parent
            onCommand(action);

            if (action === "LOGIN") {
                // Keep it on for a second for feedback then stop if needed, 
                // but user wants it to restart automatically in onend usually.
                // However, navigation usually kills the component or state.
            }

            setTimeout(() => {
                setIsThinking(false);
                setFeedback(null);
            }, 3000);
        }
    }, [onCommand, speakFeedback, setLanguage, language, tForLang]);

    const startRecognition = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Browser not supported');
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
        }

        try {
            const recognition = new SpeechRecognition();
            // 2️⃣ Set Recognition Language Properly
            recognition.lang = "en-IN";
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                console.log("[Voice] recognition.onstart: Listening in en-IN");
                setIsListening(true);
                setError(null);
                isManuallyStopped.current = false;
            };

            recognition.onresult = (event: any) => {
                const results = event.results;
                const transcript = results[results.length - 1][0].transcript;
                processTranscript(transcript);
            };

            recognition.onerror = (event: any) => {
                console.error('[Voice] recognition.onerror:', event.error);
                if (event.error === 'not-allowed') {
                    setError('Mic access denied');
                    setIsListening(false);
                    isManuallyStopped.current = true;
                }
            };

            // 4️⃣ Restart Recognition Automatically
            recognition.onend = () => {
                console.log("[Voice] recognition.onend");
                if (!isManuallyStopped.current) {
                    recognition.start();
                } else {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (e) {
            console.error('[Voice] Init failed:', e);
            setIsListening(false);
        }
    }, [processTranscript]);

    const stopRecognition = useCallback(() => {
        isManuallyStopped.current = true;
        if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    const toggleVoice = () => {
        if (isListening) {
            stopRecognition();
        } else {
            startRecognition();
        }
    };

    useEffect(() => {
        return () => {
            isManuallyStopped.current = true;
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleVoice}
                    disabled={isThinking}
                    className={`p-4 rounded-full transition-all duration-500 shadow-2xl border-2 flex items-center justify-center ${isListening
                        ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-200 text-white animate-pulse'
                        : 'bg-white border-blue-100 text-blue-600 hover:scale-110'
                        }`}
                >
                    {isThinking ? (
                        <Loader2 className="animate-spin" size={24} />
                    ) : isListening ? (
                        <Volume2 size={24} />
                    ) : (
                        <Mic size={24} />
                    )}
                </button>

                {isListening && (
                    <div className="bg-slate-900/90 backdrop-blur-xl px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-4">
                        <div className="flex gap-1">
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-400 uppercase">Listening</span>
                            <span className="text-[10px] text-white opacity-70 uppercase">en-IN</span>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className="bg-blue-600 text-white px-6 py-2 rounded-xl border-2 border-blue-400 shadow-xl flex items-center gap-3">
                        <Sparkles size={18} className="text-yellow-300 animate-pulse" />
                        <span className="text-xs font-black uppercase">{feedback}</span>
                    </div>
                )}
            </div>

            {error && (
                <div className="text-[10px] text-red-600 uppercase font-bold">{error}</div>
            )}
        </div>
    );
};

export default VoiceNavigation;
