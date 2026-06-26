import { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';

interface UseSpeechRecognitionProps {
    language: Language;
    onResult: (text: string) => void;
    onInterim?: (text: string) => void;
}

const langMap: Record<string, string> = {
    [Language.ENGLISH]: 'en-IN',
    [Language.ASSAMESE]: 'as-IN',
    [Language.BENGALI]: 'bn-IN',
    [Language.GUJARATI]: 'gu-IN',
    [Language.HINDI]: 'hi-IN',
    [Language.KANNADA]: 'kn-IN',
    [Language.MALAYALAM]: 'ml-IN',
    [Language.MARATHI]: 'mr-IN',
    [Language.ODIA]: 'or-IN',
    [Language.PUNJABI]: 'pa-IN',
    [Language.TAMIL]: 'ta-IN',
    [Language.TELUGU]: 'te-IN',
    [Language.URDU]: 'ur-IN',
    [Language.BODO]: 'en-IN',
    [Language.DOGRI]: 'doi-IN',
    [Language.KASHMIRI]: 'ks-IN',
    [Language.KONKANI]: 'kok-IN',
    [Language.MAITHILI]: 'mai-IN',
    [Language.MANIPURI]: 'mni-IN',
    [Language.SANSKRIT]: 'sa-IN',
    [Language.SANTALI]: 'sat-IN',
    [Language.SINDHI]: 'sd-IN'
};

export const useSpeechRecognition = ({ language, onResult, onInterim }: UseSpeechRecognitionProps) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    const onResultRef = useRef(onResult);
    const onInterimRef = useRef(onInterim);
    const latestInterimRef = useRef<string>('');

    useEffect(() => {
        onResultRef.current = onResult;
        onInterimRef.current = onInterim;
    }, [onResult, onInterim]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch(e) {}
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Speech recognition not supported');
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch(e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Enable continuous to capture full sentences
        recognition.interimResults = true;
        recognition.lang = langMap[language as string] || 'en-IN';

        // Post-processing to fix common phonetic mistakes without restricting vocabulary
        const postProcess = (text: string) => {
            if (!text) return text;
            let processed = text;
            
            const corrections: [RegExp, string][] = [
                [/\bwhere is\b/gi, 'query'],
                [/\badhar\b/gi, 'Aadhaar'],
                [/\bsuvida\b/gi, 'Suvidhaa'],
                [/\bsubida\b/gi, 'Suvidhaa'],
                [/\bmunicipality\b/gi, 'municipal'],
            ];

            corrections.forEach(([regex, replacement]) => {
                processed = processed.replace(regex, replacement);
            });

            // Convert spoken numbers to digits
            const wordsToNumbers: Record<string, string> = {
                'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
                'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
                'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
                'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
                'eighteen': '18', 'nineteen': '19'
            };

            const tensToNumbers: Record<string, string> = {
                'twenty': '2', 'thirty': '3', 'forty': '4', 'fifty': '5',
                'sixty': '6', 'seventy': '7', 'eighty': '8', 'ninety': '9'
            };

            // Compound tens (e.g., "twenty two" -> "22")
            processed = processed.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/gi, (match, ten, unit) => {
                return tensToNumbers[ten.toLowerCase()] + wordsToNumbers[unit.toLowerCase()];
            });

            // Standalone tens (e.g., "twenty" -> "20")
            processed = processed.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/gi, (match) => {
                return tensToNumbers[match.toLowerCase()] + '0';
            });

            // Basic numbers (0-19)
            processed = processed.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/gi, (match) => {
                return wordsToNumbers[match.toLowerCase()];
            });

            // Optional: collapse multiple digits separated by spaces (e.g. "9 8 7" -> "987")
            // This is especially useful for phone numbers
            processed = processed.replace(/(\d)\s+(?=\d)/g, '$1');

            // Capitalize first letter if it's the start
            return processed.charAt(0).toUpperCase() + processed.slice(1);
        };

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
            latestInterimRef.current = '';
            if (onInterimRef.current) onInterimRef.current('');
        };

        recognition.onspeechstart = () => {
            setIsProcessing(true);
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' '; // Add space for continuous dictation
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (interimTranscript) {
                const processedInterim = postProcess(interimTranscript);
                latestInterimRef.current = processedInterim;
                if (onInterimRef.current) onInterimRef.current(processedInterim);
            }
            if (finalTranscript) {
                const processedFinal = postProcess(finalTranscript);
                latestInterimRef.current = '';
                onResultRef.current(processedFinal);
                // Clear interim display since it's now finalized and injected
                if (onInterimRef.current) onInterimRef.current('');
                setIsProcessing(false);
                // Do NOT set isListening to false here. We are in continuous mode!
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed') {
                setError('Microphone permission required');
            } else if (event.error === 'no-speech') {
                // If it's continuous, "no-speech" just means they paused a long time. 
                // We shouldn't error out completely, but browsers often stop on this.
                // We will handle it silently if they already spoke, or show error if they didn't.
                if (!latestInterimRef.current) {
                    setError('No speech detected');
                }
            } else {
                setError(`Speech recognition error (${event.error})`);
            }
            setIsListening(false);
            setIsProcessing(false);
            if (onInterimRef.current) onInterimRef.current('');

            if (latestInterimRef.current) {
                onResultRef.current(latestInterimRef.current + ' ');
                latestInterimRef.current = '';
            }

            setTimeout(() => {
                setError((prev) => prev !== null ? null : prev);
            }, 3000);
        };

        recognition.onend = () => {
            setIsListening(false);
            setIsProcessing(false);
            if (onInterimRef.current) onInterimRef.current('');
            
            if (latestInterimRef.current) {
                onResultRef.current(latestInterimRef.current + ' ');
                latestInterimRef.current = '';
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (e) {
            console.error('Failed to start speech recognition', e);
        }
    }, [language]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch(e) {}
        }
    }, []);

    return {
        isListening,
        isProcessing,
        error,
        startListening,
        stopListening,
        supported: typeof window !== 'undefined' && !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition)
    };
};
