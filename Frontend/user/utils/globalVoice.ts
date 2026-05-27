/**
 * globalVoice.ts — Aazhi Voice Assistant Singleton
 *
 * A non-React singleton that is the SINGLE authoritative speech function
 * for all navigation feedback, welcome messages and accessibility guidance
 * in the Aazhi smart governance platform.
 *
 * Features:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. FEMALE VOICE PREFERENCE — selects the best female voice for each
 *    language/locale with a multi-level fallback chain.
 *
 * 2. ACCESSIBILITY RATE — speaks at 0.85 speed for elderly and
 *    visually impaired citizens at public kiosks.
 *
 * 3. ECHO PREVENTION EVENTS — dispatches `aazhi-speech-start` and
 *    `aazhi-speech-end` window events so the SpeechRecognition hook
 *    can mute the mic while TTS is playing, preventing feedback loops.
 *
 * 4. FIRST INTERACTION WELCOME — sets voice_enabled in localStorage,
 *    dispatches a StorageEvent so all components see it, speaks the
 *    welcome greeting, then signals the mic to start listening via
 *    `aazhi-start-listening`.
 */

// ─── Voice cache ─────────────────────────────────────────────────────
let voicesCache: SpeechSynthesisVoice[] = [];

function loadVoicesGlobal(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) {
    voicesCache = v;
  } else {
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => { voicesCache = window.speechSynthesis.getVoices(); },
      { once: true }
    );
  }
}

// Load voices as early as possible (module side-effect)
if (typeof window !== 'undefined') {
  loadVoicesGlobal();
}

// ─── Female-preferred voice finder ───────────────────────────────────
// Common female voice name keywords across OS / browsers.
const FEMALE_VOICE_KEYWORDS = /female|woman|girl|zira|hazel|susan|victoria|samantha|karen|moira|tessa|fiona|veena|siri|cortana/i;

function pickFemaleVoice(
  langCode: string,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
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

// ─── Language → BCP-47 locale map ────────────────────────────────────
export const LANG_LOCALE: Record<string, string> = {
  english: 'en-IN',
  tamil: 'ta-IN',
  hindi: 'hi-IN',
  telugu: 'te-IN',
  kannada: 'kn-IN',
  malayalam: 'ml-IN',
  assamese: 'as-IN',
  bengali: 'bn-IN',
  gujarati: 'gu-IN',
  marathi: 'mr-IN',
  punjabi: 'pa-IN',
  odia: 'or-IN',
  urdu: 'ur-IN',
  bodo: 'brx-IN',
  dogri: 'doi-IN',
  kashmiri: 'ks-IN',
  konkani: 'kok-IN',
  maithili: 'mai-IN',
  'manipuri (meitei)': 'mni-IN',
  sanskrit: 'sa-IN',
  santali: 'sat-IN',
  sindhi: 'sd-IN',
};

export function getLangLocale(language: string): string {
  return LANG_LOCALE[language.toLowerCase()] || 'en-IN';
}

// ─── Welcome messages (all 10 target languages) ───────────────────────
export const WELCOME_MESSAGES: Record<string, string> = {
  english:
    'Welcome to Aazhi Smart Citizen Service Platform. Voice assistance is enabled.',
  tamil:
    'ஆழி ஸ்மார்ட் சிட்டிசன் சேவை தளத்திற்கு வரவேற்கிறோம். குரல் உதவி இயக்கப்பட்டுள்ளது.',
  hindi:
    'आज़ी स्मार्ट नागरिक सेवा प्लेटफॉर्म में स्वागत है। आवाज़ सहायता सक्षम है।',
  telugu:
    'ఆళి స్మార్ట్ సిటిజన్ సర్వీస్ ప్లాట్‌ఫారమ్‌కు స్వాగతం. వాయిస్ సహాయం ప్రారంభించబడింది.',
  kannada:
    'ಆಳಿ ಸ್ಮಾರ್ಟ್ ನಾಗರಿಕ ಸೇವಾ ವೇದಿಕೆಗೆ ಸ್ವಾಗತ. ಧ್ವನಿ ಸಹಾಯವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ.',
  malayalam:
    'ആഴി സ്മാർട്ട് സിറ്റിസൺ സർവീസ് പ്ലാറ്റ്ഫോമിലേക്ക് സ്വാഗതം. ശബ്ദ സഹായം സജ്ജമാക്കിയിരിക്കുന്നു.',
  bengali:
    'আজি স্মার্ট সিটিজেন সার্ভিস প্ল্যাটফর্মে স্বাগতম। ভয়েস সহায়তা সক্ষম করা হয়েছে।',
  gujarati:
    'આઝી સ્માર્ટ સિટિઝન સર્વિસ પ્લેટફોર્મ પર આપનું સ્વાગત છે. ભાષ્ય સહાય સક્રિય કરેલ છે.',
  marathi:
    'आझी स्मार्ट नागरिक सेवा व्यासपीठावर आपले स्वागत आहे. आवाज सहाय्य सक्षम केले आहे.',
  assamese:
    'আজি স্মাৰ্ট চিটিজেন চেৰভিচ প্লেটফৰ্মলৈ স্বাগতম। ভয়েচ সহায় সক্ৰিয় কৰা হৈছে।',
};

export function getWelcomeMessage(language: string): string {
  return WELCOME_MESSAGES[language.toLowerCase()] || WELCOME_MESSAGES.english;
}

// ─── Navigation announcement messages ────────────────────────────────
export function getNavigationAnnouncement(tab: string, command: string): string {
  // Command-specific, most descriptive
  const commandOverrides: Record<string, string> = {
    electricity_bill: 'Showing electricity services.',
    water_bill:       'Opening water bill payment.',
    gas:              'Opening gas services.',
    paybill:          'Opening payment portal.',
    complaints:       'Opening complaints. Please describe your issue.',
    trackapp:         'Tracking your application status.',
    assistant:        'Opening voice assistant. How can I help you?',
    history:          'Opening your request history.',
    municipal:        'Opening municipal services.',
    aadhaar:          'Opening Aadhaar services.',
    home:             'Going to home page.',
    service:          'Opening services page.',
    exit:             'Logging out. Goodbye.',
    repeat:           'Repeating last response.',
    back:             'Going back.',
  };
  if (commandOverrides[command]) return commandOverrides[command];

  // Tab fallback
  const tabLabels: Record<string, string> = {
    home:        'Going to home page.',
    services:    'Opening services page.',
    complaints:  'Opening complaints.',
    billing:     'Opening payment portal.',
    status:      'Opening your history.',
    ai:          'Opening voice assistant.',
    tracker:     'Opening application tracker.',
    gas:         'Opening gas services.',
    municipal:   'Opening municipal services.',
  };
  return tabLabels[tab] || `Opening ${tab}.`;
}

// ─── Error / unrecognized command message ─────────────────────────────
export const UNRECOGNIZED_COMMAND_MSG =
  'Command not recognized. Please try again.';

// ─── Core speak function ──────────────────────────────────────────────
/**
 * globalSpeak — The authoritative speech function for Aazhi voice navigation.
 *
 * • Prefers female voice for the requested language
 * • Rate 0.85 for accessibility clarity
 * • Dispatches `aazhi-speech-start` before speaking → mics mute
 * • Dispatches `aazhi-speech-end` when done → mics unmute
 * • Calls optional onEnd callback when done
 */
export function globalSpeak(
  text: string,
  language: string = 'English',
  onEnd?: () => void
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  if (!text?.trim()) {
    onEnd?.();
    return;
  }

  // Cancel any in-flight speech first
  window.speechSynthesis.cancel();

  const langCode = getLangLocale(language);
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang    = langCode;
  utter.rate    = 0.85;   // Slower for elderly / kiosk environments
  utter.pitch   = 1.0;
  utter.volume  = 1.0;

  // Pick best female voice; refresh cache if empty
  const voices = voicesCache.length > 0
    ? voicesCache
    : window.speechSynthesis.getVoices();
  if (voicesCache.length === 0 && voices.length > 0) voicesCache = voices;

  const voice = pickFemaleVoice(langCode, voices);
  if (voice) utter.voice = voice;

  utter.onstart = () => {
    window.dispatchEvent(new CustomEvent('aazhi-speech-start'));
  };

  utter.onend = () => {
    window.dispatchEvent(new CustomEvent('aazhi-speech-end'));
    onEnd?.();
  };

  utter.onerror = () => {
    window.dispatchEvent(new CustomEvent('aazhi-speech-end'));
    onEnd?.();
  };

  window.speechSynthesis.speak(utter);
}

// ─── First-interaction welcome ────────────────────────────────────────
/**
 * triggerFirstInteractionWelcome
 *
 * Called exactly once per session when the user first touches/clicks the
 * interface after logging in. It:
 * 1. Sets voice_enabled='true' in localStorage (makes speakText work)
 * 2. Dispatches a StorageEvent so all listeners (KioskUI, SuvidhaVoiceControlImpl)
 *    see the change immediately.
 * 3. Speaks the localized welcome greeting using globalSpeak (female voice).
 * 4. After speech ends, dispatches `aazhi-start-listening` so the mic opens.
 */
export function triggerFirstInteractionWelcome(language: string): void {
  // Enable voice globally
  localStorage.setItem('voice_enabled', 'true');

  // Notify components synchronously via storage-like event
  try {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key:      'voice_enabled',
        newValue: 'true',
        oldValue: null,
        storageArea: localStorage,
      })
    );
  } catch (_) {
    // StorageEvent constructor may not support init dict in all browsers
    window.dispatchEvent(new Event('aazhi-voice-enabled'));
  }

  const msg = getWelcomeMessage(language);
  globalSpeak(msg, language, () => {
    // Signal the mic to start listening once welcome speech is done
    window.dispatchEvent(new CustomEvent('aazhi-start-listening'));
  });
}
