/**
 * useSpeechRecognition — Production-Grade, Kiosk-Safe Voice Recognition Hook
 *
 * ── WHAT WAS BROKEN (and why) ──────────────────────────────────────────────
 *
 * 1. CIRCULAR useCallback DEPENDENCY (critical bug):
 *    createRecognition() called destroyInstance() and itself inside onend.
 *    This created a circular dependency chain between two useCallback hooks,
 *    meaning every time either ref changed, BOTH callbacks were re-created,
 *    and the closure inside onend always held a stale copy of createRecognition.
 *    Result: the auto-restart logic was calling a stale no-op version of itself.
 *
 * 2. CLOSURE CAPTURE IN onend:
 *    The onend handler captured createRecognition/destroyInstance from the
 *    useCallback closure at the time the instance was created. If React
 *    re-rendered between creation and onend firing, the captured references
 *    were stale. This is why the restart "appeared" to run but produced no result.
 *
 * 3. INSTANCE BUILT INSIDE useCallback:
 *    Building the SpeechRecognition instance inside a useCallback meant every
 *    dependency change silently rebuilt the factory but not the active instance.
 *    The live recognition object was always wired to callbacks from a previous
 *    render cycle.
 *
 * ── HOW IT IS FIXED ────────────────────────────────────────────────────────
 *
 * - ALL mutable state used inside recognition callbacks is stored in useRef.
 *   Refs never go stale. Closures always read the current value.
 *
 * - The recognition instance lifecycle (create, start, destroy, restart) is
 *   managed by a single internal function (buildAndStart) that reads from
 *   refs only — no useCallback, no dependency arrays, no stale closures.
 *
 * - buildAndStart is stored in a ref (buildAndStartRef) and called by name
 *   inside the onend handler. Since refs are stable, onend always calls the
 *   latest version of the function.
 *
 * - startListening / stopListening / toggleListening are the only useCallback
 *   functions exposed. They have zero dependencies (they only touch refs and
 *   call buildAndStartRef.current).
 *
 * ── ARCHITECTURE ───────────────────────────────────────────────────────────
 *
 *   startListening()
 *     → destroyActive()           [nulls all handlers, aborts, clears ref]
 *     → buildAndStart()           [creates fresh instance, wires handlers, .start()]
 *         onstart   → sets isListening=true
 *         onspeechstart → logs
 *         onresult  → updates transcript, fires onCommand on isFinal only
 *         onerror   → logs; fatal errors set isManuallyStopped=true
 *         onend     → if !manuallyStopped: setTimeout(800ms) → buildAndStart()
 *
 *   stopListening()
 *     → sets isManuallyStopped=true
 *     → destroyActive()
 *     → setIsListening(false)
 *
 * COMPATIBILITY: Chrome 70+ desktop, Chrome Android, Android WebView (kiosk)
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Public Types ─────────────────────────────────────────────────
export type VoiceCommand =
  | 'login'
  | 'home'
  | 'service'
  | 'complaints'
  | 'trackapp'
  | 'assistant'
  | 'paybill'
  | 'history'
  | 'gas'
  | 'exit'
  | 'submit'
  | 'electricity_bill'
  | 'water_bill'
  | 'aadhaar'
  | 'back'
  | 'repeat'
  | 'municipal';

export interface UseSpeechRecognitionOptions {
  /** Callback fired with a matched VoiceCommand string, or "ai_query:<text>" */
  onCommand: (command: string) => void;
  /** BCP-47 language tag. Default: "en-IN". Reactive — changing it takes effect on next session. */
  lang?: string;
  /** If true, begin listening as soon as the component mounts. */
  autoStart?: boolean;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  transcript: string;
  lastCommand: VoiceCommand | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

// ─── Intent / Command Map ─────────────────────────────────────────
// Priority-ordered: more specific multi-word phrases come BEFORE single words.
const COMMAND_MAP: [VoiceCommand, string[]][] = [
  ['electricity_bill', [
    'electricity bill', 'electricity payment', 'open electricity',
    'eb bill', 'e b bill', 'power bill', 'current bill', 'pay current bill',
    'current payment', 'bijli bill', 'bijli ka bill',
    'बिजली बिल', 'बिजली का बिल', 'বিদ্যুৎ বিল', 'மின்சார கட்டணம்',
  ]],
  ['water_bill', [
    'water bill', 'water payment', 'water tax', 'pay water',
    'water supply bill', 'jal bill',
    'पानी का बिल', 'पानी बिल', 'জল বিল', 'தண்ணீர் கட்டணம்',
  ]],
  ['gas', [
    'gas booking', 'gas service', 'gas cylinder', 'gas connection', 'book gas',
    'lpg booking', 'lpg cylinder', 'lpg service',
    'गैस बुकिंग', 'गैस', 'সিলিন্ডার', 'கேஸ்',
  ]],
  ['aadhaar', [
    'aadhaar verification', 'aadhaar check', 'aadhar verification', 'aadhar check',
    'verify aadhaar', 'open aadhaar', 'aadhaar', 'aadhar',
    'आधार', 'আধাৰ', 'ஆதார்',
  ]],
  ['municipal', [
    'municipal services', 'municipality services', 'corporation services',
    'municipal corporation', 'municipality', 'corporation',
    'नगर पालिका', 'পৌৰসভা', 'நகராட்சி',
  ]],
  ['home', [
    'go home', 'go to home', 'open home', 'main page', 'home page', 'dashboard', 'home',
    'मुख्य पृष्ठ', 'होम', 'হোম', 'முகப்பு',
  ]],
  ['service', [
    'open services', 'government services', 'all services', 'view services',
    'services', 'service', 'department',
    'सेवाएं', 'সেৱা', 'சேவைகள்',
  ]],
  ['complaints', [
    'register complaint', 'file complaint', 'submit complaint', 'grievance',
    'complaint', 'complaints', 'report problem',
    'शिकायत', 'অভিযোগ', 'புகார்',
  ]],
  ['trackapp', [
    'track application', 'track app', 'track my request', 'check status',
    'application status', 'track status', 'track',
    'स्थिति', 'আৱেদনৰ অৱস্থা', 'நிலைமை',
  ]],
  ['assistant', [
    'open assistant', 'ai assistant', 'talk to assistant',
    'help me', 'assistant', 'chatbot', 'help', 'support',
    'मदद', 'সহায়', 'உதவி',
  ]],
  ['paybill', [
    'pay bills', 'pay my bill', 'bill payment', 'billing', 'payment',
    'बिल भुगतान', 'বিল', 'பில்',
  ]],
  ['history', [
    'my history', 'past requests', 'my requests', 'view history', 'records', 'history',
    'इतिहास', 'ইতিহাস', 'வரலாறு',
  ]],
  ['back', [
    'go back', 'previous page', 'back', 'return',
    'वापस', 'পিছলৈ', 'பின்னால்',
  ]],
  ['exit', [
    'log out', 'logout', 'sign out', 'exit app', 'exit', 'quit',
    'लॉगआउट', 'বাহিৰলৈ', 'வெளியேறு',
  ]],
  ['submit', [
    'submit form', 'submit request', 'confirm submit', 'confirm',
    'submit', 'send', 'done', 'finish',
    'सबमिट', 'জমা দিয়ক', 'சமர்ப்பி',
  ]],
  ['login', [
    'log in', 'sign in', 'login', 'authenticate',
    'लॉग इन', 'লগ ইন', 'நுழை',
  ]],
  ['repeat', [
    'say again', 'repeat that', 'pardon', 'repeat',
    'दोहराएं', 'পুনৰাবৃত্তি', 'மீண்டும்',
  ]],
];

// ─── Text Normalizer (Unicode-safe) ──────────────────────────────
// Strips ASCII punctuation only. Does NOT strip Hindi/Tamil/Assamese characters.
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,?!;:()'"\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Intent Matcher ───────────────────────────────────────────────
function matchIntent(raw: string): VoiceCommand | null {
  const normalized = normalizeText(raw);
  console.log('[STT:Intent] Matching normalized text:', JSON.stringify(normalized));
  for (const [cmd, keywords] of COMMAND_MAP) {
    for (const kw of keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        console.log(`[STT:Intent] ✅ Matched command="${cmd}" via keyword="${kw}"`);
        return cmd;
      }
    }
  }
  console.log('[STT:Intent] ❌ No match — will route to AI');
  return null;
}

// ─── Resolve the SpeechRecognition constructor once at module level ─
// Stored at module scope so it is computed exactly once, not on every render.
const SpeechRecognitionAPI: (new () => any) | null =
  typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
    : null;

// ─── Environment diagnostics (run once at startup) ────────────────
if (typeof window !== 'undefined') {
  const isSecure = window.isSecureContext;
  const proto    = window.location.protocol;
  const host     = window.location.hostname;
  const origin   = window.location.origin;
  console.log(`[STT:Env] Protocol: ${proto}  Host: ${host}  Origin: ${origin}  SecureContext: ${isSecure}`);
  if (!isSecure) {
    console.error(
      '[STT:Env] ⛔ PAGE IS NOT A SECURE CONTEXT.\n' +
      '  SpeechRecognition REQUIRES https:// or localhost.\n' +
      `  Current origin: ${origin}\n` +
      '  If you are on a LAN IP (e.g., 192.168.x.x), Chrome will block mic access\n' +
      '  and return onerror("network") or onerror("not-allowed").\n' +
      '  FIX: Open the app via http://localhost:3000 (not the LAN IP).'
    );
  }
  if (!SpeechRecognitionAPI) {
    console.error('[STT:Env] ❌ SpeechRecognition API not found. Chrome / Chrome Android required.');
  } else {
    console.log('[STT:Env] ✅ SpeechRecognition API available.');
  }
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useSpeechRecognition({
  onCommand,
  lang = 'en-IN',
  autoStart = false,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {

  // ── React state (drives UI) ──────────────────────────────────────
  const [isListening,  setIsListening]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [transcript,   setTranscript]   = useState('');
  const [lastCommand,  setLastCommand]  = useState<VoiceCommand | null>(null);

  // ── Refs (readable from any closure without stale capture) ────────
  //
  // RULE: Every value that a recognition event handler needs to READ or WRITE
  //       must live in a ref. Closures over useState setters are fine because
  //       React guarantees setter identity is stable across renders.
  //
  const recognitionRef      = useRef<any>(null);       // The active SpeechRecognition instance
  const isManuallyStopped   = useRef(false);           // True when user deliberately stopped
  const isListeningRef      = useRef(false);           // Mirror of isListening for sync reads
  const restartTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCommandRef        = useRef(onCommand);       // Always current callback
  const langRef             = useRef(lang);            // Always current lang
  // Counts consecutive network errors — drives restart backoff
  const networkErrCount     = useRef(0);

  // Keep refs in sync with props on every render (no dependency array needed)
  onCommandRef.current = onCommand;
  langRef.current      = lang;

  const isSupported = !!SpeechRecognitionAPI;

  // ── destroyActive ─────────────────────────────────────────────────
  // Tears down the current recognition instance completely.
  // Nulls out ALL event handlers before abort() to prevent ghost callbacks.
  // Safe to call even if no instance exists.
  //
  // NOTE: This is a plain function (not useCallback) because it only touches
  // refs and is only ever called from other ref-stored functions or stable
  // useCallback wrappers. It never needs to be passed as a prop.
  function destroyActive() {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
      console.log('[STT:Lifecycle] Pending restart timer cancelled.');
    }
    if (recognitionRef.current) {
      console.log('[STT:Lifecycle] 🧹 Destroying active recognition instance.');
      const rec = recognitionRef.current;
      // Null every handler BEFORE abort to prevent any late-firing callbacks.
      rec.onstart       = null;
      rec.onaudiostart  = null;
      rec.onsoundstart  = null;
      rec.onspeechstart = null;
      rec.onspeechend   = null;
      rec.onsoundend    = null;
      rec.onaudioend    = null;
      rec.onresult      = null;
      rec.onerror       = null;
      rec.onend         = null;
      try { rec.abort(); } catch (_) { /* already stopped — ignore */ }
      recognitionRef.current = null;
    }
  }

  // ── buildAndStart ─────────────────────────────────────────────────
  // Creates a FRESH SpeechRecognition instance, wires all event handlers,
  // and calls .start(). Reads exclusively from refs — never from closure state.
  //
  // Stored in a ref (buildAndStartRef) so the onend handler can call
  // "the current version" of this function without capturing a stale closure.
  //
  function buildAndStart() {
    if (!SpeechRecognitionAPI) {
      console.error('[STT:Lifecycle] ❌ SpeechRecognition API not available. Aborting.');
      return;
    }
    if (isManuallyStopped.current) {
      console.log('[STT:Lifecycle] Skipping buildAndStart — manually stopped.');
      return;
    }
    if (isListeningRef.current) {
      console.warn('[STT:Lifecycle] Already listening — skipping duplicate buildAndStart.');
      return;
    }

    console.log('[STT:Lifecycle] 🔧 Creating FRESH SpeechRecognition instance...');
    const rec = new SpeechRecognitionAPI();

    // ── Core Configuration ──────────────────────────────────────────
    //
    // continuous=true  → do not stop after one phrase; keep mic open.
    //                    This eliminates the need for rapid restart cycles.
    //
    // interimResults=true → receive partial results in real time.
    //                       We only fire commands on isFinal=true results,
    //                       but the partial transcript is shown in the UI.
    //
    // maxAlternatives=5 → increases the chance of matching a keyword even
    //                      if the top-1 transcript has a transcription error.
    //
    // lang              → always read from langRef so it reflects the latest
    //                     prop value at the moment of instance creation.
    //
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 5;
    rec.lang            = langRef.current;

    console.log(
      `[STT:Lifecycle] Config → lang="${rec.lang}" continuous=${rec.continuous} ` +
      `interimResults=${rec.interimResults} maxAlternatives=${rec.maxAlternatives}`
    );

    // ── onstart ────────────────────────────────────────────────────
    rec.onstart = () => {
      console.log('[STT:Event] ✅ onstart — microphone is OPEN. lang=' + rec.lang);
      isListeningRef.current = true;
      networkErrCount.current = 0; // clean start — reset backoff counter
      setIsListening(true);
      setError(null);
    };

    // ── onaudiostart ───────────────────────────────────────────────
    rec.onaudiostart = () => {
      console.log('[STT:Event] 🎙️ onaudiostart — audio pipeline receiving data');
    };

    // ── onsoundstart ───────────────────────────────────────────────
    rec.onsoundstart = () => {
      console.log('[STT:Event] 🔉 onsoundstart — sound present in audio stream');
    };

    // ── onspeechstart ──────────────────────────────────────────────
    rec.onspeechstart = () => {
      console.log('[STT:Event] 🗣️ onspeechstart — SPEECH DETECTED');
    };

    // ── onspeechend ────────────────────────────────────────────────
    rec.onspeechend = () => {
      console.log('[STT:Event] 🔇 onspeechend — user stopped speaking');
    };

    // ── onsoundend ─────────────────────────────────────────────────
    rec.onsoundend = () => {
      console.log('[STT:Event] 🔈 onsoundend — sound ended');
    };

    // ── onaudioend ─────────────────────────────────────────────────
    rec.onaudioend = () => {
      console.log('[STT:Event] 🎧 onaudioend — audio capture ended');
    };

    // ── onresult ───────────────────────────────────────────────────
    // Fired every time the engine produces a transcript (interim or final).
    // We always update the displayed transcript for any result.
    // We ONLY run intent matching on isFinal=true results to prevent
    // premature command firing from partial speech.
    rec.onresult = (event: any) => {
      console.log(
        `[STT:Event] 📝 onresult — resultIndex=${event.resultIndex} ` +
        `total=${event.results.length}`
      );

      let latestTopTranscript = '';       // Best alt of newest result (for display)
      const finalAlternatives: string[] = []; // All alts from final results only

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let a = 0; a < result.length; a++) {
          const text = result[a].transcript?.trim() ?? '';
          const conf = result[a].confidence?.toFixed(3) ?? 'n/a';
          if (!text) continue;

          console.log(
            `[STT:Event]   results[${i}].alternatives[${a}]: "${text}" ` +
            `isFinal=${result.isFinal} confidence=${conf}`
          );

          if (a === 0 && i === event.results.length - 1) {
            // Top alternative of the most recent result → update display
            latestTopTranscript = text;
          }
          if (result.isFinal) {
            finalAlternatives.push(text);
          }
        }
      }

      // Update live transcript display
      if (latestTopTranscript) {
        setTranscript(latestTopTranscript);
      }

      // Intent matching — ONLY on finalized speech
      if (finalAlternatives.length > 0) {
        console.log('[STT:Intent] 🏁 Final transcript(s):', finalAlternatives);
        let matched: VoiceCommand | null = null;
        for (const alt of finalAlternatives) {
          matched = matchIntent(alt);
          if (matched) break;
        }

        if (matched) {
          console.log(`[STT:Intent] 🚀 Firing command: "${matched}"`);
          setLastCommand(matched);
          onCommandRef.current(matched);
          setTimeout(() => setLastCommand(null), 3000);
        } else {
          // Pass unmatched speech to AI assistant
          const primary = finalAlternatives[0];
          console.log(`[STT:Intent] 🤖 Routing to AI: "${primary}"`);
          onCommandRef.current(`ai_query:${primary}`);
        }
      }
    };

    // ── onerror ────────────────────────────────────────────────────
    // Handles all recognition errors. Fatal errors (permission denied, no mic)
    // set isManuallyStopped=true so onend does NOT auto-restart.
    // Non-fatal errors (no-speech, network blip, aborted) allow onend to restart.
    //
    // "network" error most likely causes in this project:
    //  1. App opened via LAN IP on HTTP — insecure context, Chrome blocks cloud speech
    //  2. Zero-delay instance reuse — previous TCP session not fully closed
    //  3. Firewall/proxy blocking speech.googleapis.com
    //  4. Rapid restart loop exhausting Chrome speech service quota
    rec.onerror = (event: any) => {
      const type = event.error as string;
      const msg  = (event.message as string) || '(no message)';
      console.warn(`[STT:Event] ⚠️ onerror — type="${type}" message="${msg}"`);
      // Dump full event for debugging
      console.warn('[STT:Event] Full error event:', JSON.stringify({
        error:     event.error,
        message:   event.message,
        timeStamp: event.timeStamp,
      }));

      switch (type) {
        case 'not-allowed':
        case 'service-not-allowed':
          console.error(
            '[STT:Error] 🔒 FATAL — Microphone permission denied.\n' +
            '  Possible causes:\n' +
            '  1. User clicked "Block" on the mic permission prompt.\n' +
            '  2. Page served over HTTP on a LAN IP (not localhost/HTTPS).\n' +
            `  Current origin: ${typeof window !== 'undefined' ? window.location.origin : 'unknown'}\n` +
            '  FIX: Open via http://localhost:3000, not the LAN IP.'
          );
          setError('Microphone access denied. Open via localhost or HTTPS and allow mic permission.');
          isManuallyStopped.current = true;
          isListeningRef.current    = false;
          setIsListening(false);
          break;

        case 'audio-capture':
          console.error('[STT:Error] 🎙️ FATAL — No microphone hardware detected.');
          setError('No microphone found. Please connect a microphone.');
          isManuallyStopped.current = true;
          isListeningRef.current    = false;
          setIsListening(false);
          break;

        case 'network':
          networkErrCount.current += 1;
          console.error(
            `[STT:Error] 🌐 Network error (occurrence #${networkErrCount.current}).\n` +
            '  Most likely causes for THIS app:\n' +
            '  1. App opened via LAN IP on HTTP — insecure context.\n' +
            '     SOLUTION: Use http://localhost:3000\n' +
            '  2. Previous session not fully closed before restart (zero-delay restart).\n' +
            '     SOLUTION: 800ms+ delay before restart (enforced in onend).\n' +
            '  3. Firewall or proxy blocking speech.googleapis.com.\n' +
            '     SOLUTION: Whitelist *.googleapis.com on your network.\n' +
            '  4. Chrome speech quota exceeded by rapid restart loops.\n' +
            '     SOLUTION: Backoff enforced in onend.'
          );
          if (networkErrCount.current >= 3) {
            setError(
              'Speech service unavailable. Use localhost (not LAN IP), check internet, or refresh.'
            );
          }
          // Non-fatal — onend will restart with exponential backoff
          break;

        case 'no-speech':
          console.log('[STT:Error] 🔕 no-speech — silence timeout. onend will restart.');
          break;

        case 'aborted':
          console.log('[STT:Error] ⏸ aborted — intentional (manual stop or restart).');
          break;

        default:
          console.warn(`[STT:Error] ❓ Unhandled error type: "${type}"`);
          break;
      }
    };

    // ── onend ──────────────────────────────────────────────────────
    // Fires after EVERY recognition session end — whether from silence timeout,
    // error, or explicit stop. This is the ONLY place that schedules a restart.
    //
    // CRITICAL RULES enforced here:
    //  1. Never restart if isManuallyStopped is true.
    //  2. Always wait at least 800ms before restarting (hardware mic release time).
    //  3. ALWAYS call buildAndStartRef.current() — never call buildAndStart()
    //     directly — to ensure we execute the LATEST version of the function,
    //     not a stale closure captured when this instance was first created.
    rec.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
      console.log(
        `[STT:Event] 🔚 onend — session ended. manuallyStopped=${isManuallyStopped.current} ` +
        `networkErrCount=${networkErrCount.current}`
      );

      if (isManuallyStopped.current) {
        console.log('[STT:Lifecycle] Staying stopped (manual stop requested).');
        return;
      }

      // Compute restart delay with exponential backoff for network errors.
      // Base: 800ms (minimum hardware mic release time).
      // Each consecutive network error adds 500ms, capped at 5s total.
      // This prevents hammering the speech service when connection is unstable.
      const baseDelay    = 800;
      const backoffExtra = Math.min(networkErrCount.current * 500, 4200);
      const delay        = baseDelay + backoffExtra;

      console.log(`[STT:Lifecycle] ⏳ Scheduling fresh restart in ${delay}ms (backoff=${backoffExtra}ms)...`);
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (isManuallyStopped.current) {
          console.log('[STT:Lifecycle] Restart aborted — stopped during wait window.');
          return;
        }
        console.log('[STT:Lifecycle] 🔄 Restarting with FRESH instance...');
        // Always call via ref — never call buildAndStart() directly in a closure.
        // This ensures we execute the LATEST version, not a stale captured copy.
        buildAndStartRef.current();
      }, delay);
    };

    // Store and start
    recognitionRef.current = rec;
    try {
      rec.start();
      console.log('[STT:Lifecycle] 🚀 recognition.start() called.');
    } catch (e: any) {
      console.error('[STT:Lifecycle] ❌ recognition.start() threw:', e.message);
      setError('Failed to start speech recognition: ' + e.message);
      recognitionRef.current = null;
      isListeningRef.current = false;
      setIsListening(false);
    }
  }

  // Store buildAndStart in a ref so onend can ALWAYS call the current version.
  // This is the key pattern that breaks the circular-closure problem:
  //   onend → buildAndStartRef.current()  (always current, never stale)
  const buildAndStartRef = useRef(buildAndStart);
  buildAndStartRef.current = buildAndStart; // Updated on every render

  // ── startListening (public API) ────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      console.error('[STT:API] ❌ SpeechRecognition not supported in this browser.');
      setError('Speech recognition is not supported. Please use Chrome.');
      return;
    }
    if (isListeningRef.current) {
      console.warn('[STT:API] Already listening — ignoring duplicate start call.');
      return;
    }
    console.log('[STT:API] startListening() invoked.');
    destroyActive();
    isManuallyStopped.current = false;
    networkErrCount.current   = 0;   // reset backoff on explicit user start
    buildAndStartRef.current();
  }, []); // zero deps — reads exclusively from refs

  // ── stopListening (public API) ─────────────────────────────────────
  const stopListening = useCallback(() => {
    console.log('[STT:API] stopListening() invoked — halting recognition.');
    isManuallyStopped.current = true;
    isListeningRef.current    = false;
    destroyActive();
    setIsListening(false);
  }, []); // zero deps — reads exclusively from refs

  // ── toggleListening (public API) ───────────────────────────────────
  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // ── Auto-start on mount ────────────────────────────────────────────
  useEffect(() => {
    if (autoStart && isSupported) {
      // Delay 300ms to let React complete the mount cycle before touching audio APIs.
      const t = setTimeout(() => {
        console.log('[STT:API] 🟢 Auto-start triggered (mount delay 300ms).');
        startListening();
      }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      console.log('[STT:API] 🔴 Component unmounting — stopping recognition.');
      isManuallyStopped.current = true;
      destroyActive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isListening,
    isSupported,
    error,
    transcript,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
  };
}
