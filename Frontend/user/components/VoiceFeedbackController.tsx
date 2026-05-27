import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { globalSpeak } from '../utils/globalVoice';
import { LANGUAGES_CONFIG } from '../constants';

// ─── Custom Accessibility Field Map ────────────────────────────────
const accessibilityMap: Record<string, string> = {
  aadhaar: "Please enter your Aadhaar number.",
  aadhar: "Please enter your Aadhaar number.",
  mobile: "Please enter your mobile number.",
  phone: "Please enter your mobile number.",
  contact: "Please enter your mobile number.",
  name: "Please enter your full name.",
  address: "Please enter your address.",
  location: "Please enter your address.",
  complaint: "Please describe your issue.",
  issue: "Please describe your issue.",
  problem: "Please describe your issue.",
  amount: "Please enter payment amount.",
  payment: "Please enter payment amount.",
  otp: "Please enter the verification code.",
  verification: "Please enter the verification code.",
  code: "Please enter the verification code.",
  pin: "Please enter your password or pin.",
  password: "Please enter your password.",
  search: "Please enter your search query.",
  query: "Please enter your search query.",
  consumer: "Please enter your consumer or account number.",
  account: "Please enter your consumer or account number.",
  tracker: "Please enter your application tracking ID.",
  tracking: "Please enter your application tracking ID.",
  notes: "Please enter resolution notes.",
  area: "Please enter area value.",
  tax: "Please enter tax amount.",
  value: "Please enter expected value.",
  id: "Please enter your ID number.",
  license: "Please enter your license details."
};

// ─── Multilingual Translation Bundle ──────────────────────────────
const GUIDANCE_TRANSLATIONS: Record<string, Record<string, string>> = {
  tamil: {
    "Please enter your Aadhaar number.": "தயவுசெய்து உங்கள் ஆதார் எண்ணை உள்ளிடவும்.",
    "Please enter your mobile number.": "தயவுசெய்து உங்கள் மொபைல் எண்ணை உள்ளிடவும்.",
    "Please enter your full name.": "தயவுசெய்து உங்கள் முழு பெயரை உள்ளிடவும்.",
    "Please enter your address.": "தயவுசெய்து உங்கள் முகவரியை உள்ளிடவும்.",
    "Please describe your issue.": "தயவுசெய்து உங்கள் புகாரை விவரிக்கவும்.",
    "Please enter payment amount.": "தயவுசெய்து கட்டண தொகையை உள்ளிடவும்.",
    "Please enter the verification code.": "தயவுசெய்து சரிபார்ப்பு குறியீட்டை உள்ளிடவும்.",
    "Dropdown menu. Please select an option.": "கீழ்தோன்றும் மெனு. தயவுசெய்து ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்.",
    "Please select an option.": "தயவுசெய்து ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்.",
    "Please select a date.": "தயவுசெய்து ஒரு தேதியைத் தேர்ந்தெடுக்கவும்.",
    "Please enter a number.": "தயவுசெய்து ஒரு எண்ணை உள்ளிடவும்.",
    "Please enter text.": "தயவுசெய்து உரையை உள்ளிடவும்."
  },
  hindi: {
    "Please enter your Aadhaar number.": "कृपया अपना आधार नंबर दर्ज करें।",
    "Please enter your mobile number.": "कृपया अपना मोबाइल नंबर दर्ज करें।",
    "Please enter your full name.": "कृपया अपना पूरा नाम दर्ज करें।",
    "Please enter your address.": "कृपया अपना पता दर्ज करें।",
    "Please describe your issue.": "कृपया अपनी समस्या का विवरण दें।",
    "Please enter payment amount.": "कृपया भुगतान राशि दर्ज करें।",
    "Please enter the verification code.": "कृपया सत्यापन कोड दर्ज करें।",
    "Dropdown menu. Please select an option.": "ड्रॉपडाउन मेनू। कृपया एक विकल्प चुनें।",
    "Please select an option.": "कृपया एक विकल्प चुनें।",
    "Please select a date.": "कृपया एक तारीख चुनें।",
    "Please enter a number.": "कृपया एक संख्या दर्ज करें।",
    "Please enter text.": "कृपया टेक्स्ट दर्ज करें।"
  },
  kannada: {
    "Please enter your Aadhaar number.": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆಧಾರ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.",
    "Please enter your mobile number.": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.",
    "Please enter your full name.": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.",
    "Please enter your address.": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ.",
    "Please describe your issue.": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ.",
    "Please enter payment amount.": "ದಯವಿಟ್ಟು ಪಾವತಿ ಮೊತ್ತವನ್ನು ನಮೂದಿಸಿ.",
    "Please enter the verification code.": "ದಯವಿಟ್ಟು ಪರಿಶೀಲನಾ ಕೋಡ್ ಅನ್ನು ನಮೂದಿಸಿ.",
    "Dropdown menu. Please select an option.": "ಡ್ರಾಪ್‌ಡೌನ್ ಮೆನು. ದಯವಿಟ್ಟು ಒಂದು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ.",
    "Please select an option.": "ದಯವಿಟ್ಟು ಒಂದು ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ.",
    "Please select a date.": "ದಯವಿಟ್ಟು ದಿನಾಂಕವನ್ನು ಆರಿಸಿ.",
    "Please enter a number.": "ದಯವಿಟ್ಟು ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.",
    "Please enter text.": "ದಯವಿಟ್ಟು ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ."
  },
  telugu: {
    "Please enter your Aadhaar number.": "దయచేసి మీ ఆదార్ నంబర్‌ను నమోదు చేయండి.",
    "Please enter your mobile number.": "దయచేసి మీ మొబైల్ నంబర్‌ను నమోదు చేయండి.",
    "Please enter your full name.": "దయచేసి మీ పూర్తి పేరును నమోదు చేయండి.",
    "Please enter your address.": "దయచేసి మీ చిరునామాను నమోదు చేయండి.",
    "Please describe your issue.": "దయచేసి మీ సమస్యను వివరించండి.",
    "Please enter payment amount.": "దయచేసి చెల్లింపు మొత్తాన్ని నమోదు చేయండి.",
    "Please enter the verification code.": "దయచేసి ధృవీకరణ కోడ్‌ను నమోదు చేయండి.",
    "Dropdown menu. Please select an option.": "డ్రాప్‌డౌన్ మెనూ. దయచేసి ఒక ఎంపికను ఎంచుకోండి.",
    "Please select an option.": "దయచేసి ఒక ఎంపికను ఎంచుకోండి.",
    "Please select a date.": "దయచేసి తేదీని ఎంచుకోండి.",
    "Please enter a number.": "దయచేసి ఒక సంఖ్యను నమోదు చేయండి.",
    "Please enter text.": "దయచేసి వచనాన్ని నమోదు చేయండి."
  },
  malayalam: {
    "Please enter your Aadhaar number.": "ദയവായി നിങ്ങളുടെ ആധാർ നമ്പർ നൽകുക.",
    "Please enter your mobile number.": "ദയവായി നിങ്ങളുടെ മൊബൈൽ നമ്പർ നൽകുക.",
    "Please enter your full name.": "ദയവായി നിങ്ങളുടെ മുഴുവൻ പേര് നൽകുക.",
    "Please enter your address.": "ദയവായി നിങ്ങളുടെ വിലാസം നൽകുക.",
    "Please describe your issue.": "ദയവായി നിങ്ങളുടെ പ്രശ്നം വിവരിക്കുക.",
    "Please enter payment amount.": "ദയവായി പേയ്‌മെന്റ് തുക നൽകുക.",
    "Please enter the verification code.": "ദയവായി വെരിഫിക്കേഷൻ കോഡ് നൽകുക.",
    "Dropdown menu. Please select an option.": "ഡ്രോപ്പ്ഡൗൺ മെനു. ദയവായി ഒരു ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക.",
    "Please select an option.": "ദയവായി ഒരു ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക.",
    "Please select a date.": "ദയവായി തീയതി തിരഞ്ഞെടുക്കുക.",
    "Please enter a number.": "ദയവായി ഒരു നമ്പർ നൽകുക.",
    "Please enter text.": "ദയവായി ടെക്സ്റ്റ് നൽകുക."
  }
};

const humanize = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')   // camelCase → camel Case
    .replace(/[_-]+/g, ' ')        // snake_case → snake case
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first
};

const getLocalizedRole = (role: 'button' | 'link' | 'dropdown', lang: string): string => {
  const roles: Record<string, Record<string, string>> = {
    tamil: {
      button: "பொத்தான்",
      link: "இணைப்பு",
      dropdown: "கீழ்தோன்றும் மெனு"
    },
    hindi: {
      button: "बटन",
      link: "लिंक",
      dropdown: "ड्रॉपडाउन मेनू"
    },
    kannada: {
      button: "ಬಟನ್",
      link: "ಲಿಂಕ್",
      dropdown: "ಡ್ರಾಪ್‌ಡೌನ್ ಮೆನು"
    },
    telugu: {
      button: "బటన్",
      link: "లింక్",
      dropdown: "డ్రాప్‌డౌన్ మెనూ"
    },
    malayalam: {
      button: "ബട്ടൺ",
      link: "ലിങ്ക്",
      dropdown: "ഡ്രോപ്പ്ഡൗൺ മെനു"
    }
  };

  return roles[lang.toLowerCase()]?.[role] || role;
};

const getButtonGuidance = (el: HTMLElement, lang: string): string => {
  const ariaLabel = el.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const text = el.textContent?.trim() || el.getAttribute('title')?.trim();
  if (text) return text;

  const name = el.getAttribute('name')?.trim();
  if (name) return humanize(name);

  const id = el.getAttribute('id')?.trim();
  if (id) return humanize(id);

  return "";
};

const getLinkGuidance = (el: HTMLElement, lang: string): string => {
  const ariaLabel = el.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const text = el.textContent?.trim() || el.getAttribute('title')?.trim();
  if (text) return text;

  return "";
};

const getSelectGuidance = (el: HTMLSelectElement, lang: string): string => {
  const ariaLabel = el.getAttribute('aria-label')?.trim();
  
  let labelText = '';
  const id = el.getAttribute('id') || '';
  if (id) {
    const labelEl = document.querySelector(`label[for="${id}"]`);
    if (labelEl) labelText = labelEl.textContent?.trim() || '';
  }
  if (!labelText) {
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, select, textarea').forEach(c => c.remove());
      labelText = clone.textContent?.trim() || '';
    }
  }

  const name = el.getAttribute('name')?.trim() || '';

  const candidates = [ariaLabel, labelText, name, id];
  for (const val of candidates) {
    if (!val) continue;
    const normalized = val.toLowerCase();
    for (const [key, value] of Object.entries(accessibilityMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
  }

  const finalLabel = ariaLabel || labelText || humanize(name) || humanize(id);
  if (finalLabel) {
    return finalLabel;
  }
  return `Please select an option.`;
};

const getSpokenGuidance = (el: HTMLElement): string => {
  const ariaLabel = el.getAttribute('aria-label')?.trim() || '';
  
  let labelText = '';
  const id = el.getAttribute('id') || '';
  if (id) {
    const labelEl = document.querySelector(`label[for="${id}"]`);
    if (labelEl) labelText = labelEl.textContent?.trim() || '';
  }
  if (!labelText) {
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('input, select, textarea').forEach(c => c.remove());
      labelText = clone.textContent?.trim() || '';
    }
  }

  const name = el.getAttribute('name')?.trim() || '';

  // Priority check in accessibility map
  const candidates = [ariaLabel, labelText, name, id];
  for (const val of candidates) {
    if (!val) continue;
    const normalized = val.toLowerCase();
    for (const [key, value] of Object.entries(accessibilityMap)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
  }

  // Fallbacks in priority order
  if (ariaLabel) return `Please enter ${ariaLabel}.`;
  if (labelText) return `Please enter ${labelText}.`;
  if (name) return `Please enter ${humanize(name)}.`;
  if (id) return `Please enter ${humanize(id)}.`;

  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute('type')?.toLowerCase() || '';

  if (tag === 'textarea') return "Please describe your issue.";
  if (tag === 'select') return "Dropdown menu. Please select an option.";
  if (type === 'number') return "Please enter a number.";
  if (type === 'date') return "Please select a date.";
  
  return "Please enter text.";
};

const buildAnnouncement = (el: HTMLElement, lang: string): string | null => {
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute('type')?.toLowerCase() || '';

  if (tag === 'input') {
    if (['hidden', 'submit', 'reset', 'image'].includes(type)) {
      return null;
    }
    if (type === 'button') {
      return getButtonGuidance(el, lang);
    }
    return getSpokenGuidance(el);
  }

  if (tag === 'textarea') {
    return getSpokenGuidance(el);
  }

  if (tag === 'select') {
    return getSelectGuidance(el as HTMLSelectElement, lang);
  }

  if (tag === 'button' || el.getAttribute('role') === 'button') {
    return getButtonGuidance(el, lang);
  }

  if (tag === 'a') {
    return getLinkGuidance(el, lang);
  }

  return null;
};

let audioCtx: AudioContext | null = null;

const playKeypressSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime); // Gentle key click volume (4%)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    console.warn('Web Audio keypress sound failed', e);
  }
};

const VoiceFeedbackController: React.FC = () => {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const lastSpokenRef = useRef<string | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);
  const debounceRef = useRef<number | null>(null);

  const getLanguageName = () => {
    const config = LANGUAGES_CONFIG.find(l => l.code === language);
    return config ? config.name : 'English';
  };

  const speakAccessibility = useCallback((text: string) => {
    const isVoiceEnabled = localStorage.getItem('voice_enabled') === 'true';
    if (!isVoiceEnabled || !text) return;

    const now = Date.now();
    // Prevent repeating the same speech within 2 seconds
    if (lastSpokenRef.current === text && (now - lastSpokenTimeRef.current) < 2000) {
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      const languageName = getLanguageName();
      const translatedText = GUIDANCE_TRANSLATIONS[languageName.toLowerCase()]?.[text] || text;

      globalSpeak(translatedText, languageName);
      lastSpokenRef.current = text;
      lastSpokenTimeRef.current = Date.now();
    }, 200);
  }, [language]);

  const handlePointerDown = useCallback((e: PointerEvent | MouseEvent | TouchEvent) => {
    const isVoiceEnabled = localStorage.getItem('voice_enabled') === 'true';
    if (!isVoiceEnabled) return;

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
      // ─── IF CLICKED INSIDE KEYBOARD CONTAINER: PLAY KEYPRESS SOUND & SKIP TTS ───
      if (
        targetElement.closest('[data-keyboard-container]') ||
        targetElement.hasAttribute('data-keyboard-key') ||
        targetElement.closest('[data-keyboard-key]')
      ) {
        playKeypressSound();
        return;
      }

      // Highlight the focused element temporarily for visual accessibility
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

      const languageName = getLanguageName();
      let textToSpeak = buildAnnouncement(targetElement, languageName);
      if (!textToSpeak) {
        textToSpeak = targetElement.getAttribute('aria-label') || targetElement.innerText || targetElement.textContent || '';
      }

      textToSpeak = textToSpeak.replace(/[\n\r\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

      if (textToSpeak) {
        speakAccessibility(textToSpeak);
      }
    }
  }, [speakAccessibility]);

  const handleFocus = useCallback((e: FocusEvent) => {
    const isVoiceEnabled = localStorage.getItem('voice_enabled') === 'true';
    if (!isVoiceEnabled) return;

    const target = e.target as HTMLElement;
    if (!target) return;

    const tag = target.tagName.toLowerCase();
    const interactiveTags = ['input', 'textarea', 'select', 'button', 'a'];

    if (!interactiveTags.includes(tag) && !target.getAttribute('role')) {
      return;
    }

    const languageName = getLanguageName();
    const announcement = buildAnnouncement(target, languageName);
    if (announcement) {
      speakAccessibility(announcement);
    }
  }, [speakAccessibility]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isVoiceEnabled = localStorage.getItem('voice_enabled') === 'true';
    if (!isVoiceEnabled) return;

    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      if (e.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(e.key)) {
        playKeypressSound();
      }
    }
  }, []);

  useEffect(() => {
    // We bind event listeners in capture phase so we catch them first
    window.addEventListener('pointerdown', handlePointerDown as any, true);
    window.addEventListener('focusin', handleFocus as any, true);
    window.addEventListener('keydown', handleKeyDown as any, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown as any, true);
      window.removeEventListener('focusin', handleFocus as any, true);
      window.removeEventListener('keydown', handleKeyDown as any, true);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [handlePointerDown, handleFocus, handleKeyDown]);

  return null; // This component provides global accessibility behavior, no UI.
};

export default VoiceFeedbackController;
