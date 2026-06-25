"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AssistantState = "idle" | "listening" | "thinking" | "speaking";

// Minimal shape for the Web Speech API, which TypeScript's DOM lib doesn't
// fully cover across browsers (esp. webkit-prefixed Safari/Chrome).
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<ArrayLike<{ transcript: string }> & SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useVoiceAssistant() {
  const [state, setState] = useState<AssistantState>("idle");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interimText, setInterimText] = useState("");

  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  // Tracks whether the component is still mounted so async callbacks
  // (speech end, fetch responses) don't set state after unmount.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.speechSynthesis?.cancel();
      try {
        recogRef.current?.stop();
      } catch {
        // no-op: recognition may already be stopped
      }
    };
  }, []);

  const initRecognition = useCallback(
    (onFinalTranscript: (text: string) => void) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        setSpeechSupported(false);
        return null;
      }
      const recog = new SR();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = "en-US";

      recog.onstart = () => {
        if (mountedRef.current) setState("listening");
      };
      recog.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((r) => r[0].transcript)
          .join("");
        if (mountedRef.current) setInterimText(transcript);

        const last = e.results[e.results.length - 1];
        if (last.isFinal && transcript.trim()) {
          onFinalTranscript(transcript.trim());
        }
      };
      recog.onerror = (e) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          if (mountedRef.current) {
            setIsListening(false);
            setState("idle");
          }
        }
      };
      recog.onend = () => {
        if (mountedRef.current) {
          setIsListening(false);
          setState((s) => (s === "listening" ? "idle" : s));
        }
      };

      recogRef.current = recog;
      return recog;
    },
    []
  );

  const startListening = useCallback(
    (onFinalTranscript: (text: string) => void) => {
      window.speechSynthesis?.cancel();
      const recog = recogRef.current ?? initRecognition(onFinalTranscript);
      if (!recog) return;
      setInterimText("");
      setIsListening(true);
      try {
        recog.start();
      } catch {
        // Recognition may already be active; ignore.
      }
    },
    [initRecognition]
  );

  const stopListening = useCallback(() => {
    setIsListening(false);
    setState((s) => (s === "listening" ? "idle" : s));
    try {
      recogRef.current?.stop();
    } catch {
      // no-op
    }
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) {
      setState("idle");
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#/g, "");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-US") ??
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => mountedRef.current && setState("speaking");
    utterance.onend = () => {
      if (mountedRef.current) setState("idle");
      onDone?.();
    };
    utterance.onerror = () => {
      if (mountedRef.current) setState("idle");
      onDone?.();
    };

    setState("speaking");
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancelSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setState("idle");
  }, []);

  return {
    state,
    setState,
    isListening,
    speechSupported,
    interimText,
    startListening,
    stopListening,
    speak,
    cancelSpeaking,
  };
}
