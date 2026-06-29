/**
 * IntentMapper.ts — Demo-Optimized Intent Navigation Layer (JUDGE TEST EDITION)
 *
 * ── DESIGN PRINCIPLES ───────────────────────────────────────────────────────
 *  • ZERO latency: pure JS substring matching, no async, no network, no ML.
 *  • EXACT match → KEYWORD match → SYNONYM match (priority order).
 *  • Returns in < 1ms for any input under 200 chars.
 *  • Carries DIRECT NAV metadata: targetTab + targetSubView for INSTANT routing.
 */

import { VoiceAction } from './VoiceCommands';

export type IntentConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface IntentResult {
  action: VoiceAction;
  confidence: IntentConfidence;
  serviceName: string;
  score: number;
  targetTab?: string;
  targetSubView?: string;
}

interface IntentRule {
  action: VoiceAction;
  serviceName: string;
  targetTab?: string;
  targetSubView?: string;
  primary: string[];
  secondary: string[];
}

const INTENT_RULES: IntentRule[] = [

  // ── 1. ELECTRICITY BILL (Direct to Login) ──
  {
    action: VoiceAction.OPEN_BILLING,
    serviceName: 'Power Login Page',
    targetTab: 'eb',
    targetSubView: 'LOGIN',
    primary: [
      'pay electricity bill', 'electricity bill', 'pay my electricity bill',
      'pay power bill', 'power bill', 'pay my power bill',
      'current bill', 'eb bill', 'pay eb bill', 'electricity payment',
      'current bill pay pannanum', 'eb bill pay pannanum' // Tanglish additions
    ],
    secondary: ['electricity', 'power', 'eb', 'current bill', 'bijli'],
  },

  // ── 2. WATER BILL (Direct to Login) ──
  {
    action: VoiceAction.OPEN_BILLING,
    serviceName: 'Water Login Page',
    targetTab: 'municipal',
    targetSubView: 'LOGIN',
    primary: [
      'pay water bill', 'water bill', 'pay my water bill',
      'water tax', 'pay water tax', 'water service bill',
      'water tax status paakanum' // Tanglish
    ],
    secondary: ['water', 'municipal'],
  },

  // ── 3. BIRTH CERTIFICATE ──
  {
    action: VoiceAction.OPEN_DOCUMENTS,
    serviceName: 'Birth Certificate Application',
    targetTab: 'certificates',
    primary: [
      'i need a birth certificate', 'birth certificate', 'apply for birth certificate',
      'get birth certificate', 'birth certificate download',
      'birth certificate apply pannanum' // Tanglish
    ],
    secondary: ['birth', 'certificate'],
  },

  // ── 4. TRACK COMPLAINT ──
  {
    action: VoiceAction.OPEN_TRACKER,
    serviceName: 'Complaint Tracking',
    targetTab: 'tracker',
    primary: [
      'track my complaint', 'track complaint', 'check complaint status',
      'where is my complaint', 'complaint tracking', 'track my application'
    ],
    secondary: ['track', 'status'],
  },

  // ── 5. GARBAGE COMPLAINT (Preselects category) ──
  {
    action: VoiceAction.OPEN_COMPLAINTS,
    serviceName: 'Garbage Collection Complaint',
    targetTab: 'complaints',
    targetSubView: 'civic_garbage',
    primary: [
      'garbage not collected', 'garbage collection', 'garbage issue',
      'waste dumping', 'no garbage collection', 'sanitation complaint'
    ],
    secondary: ['garbage', 'trash', 'waste', 'sanitation'],
  },

  // ── 6. STREET LIGHT COMPLAINT (Preselects category) ──
  {
    action: VoiceAction.OPEN_COMPLAINTS,
    serviceName: 'Street Light Complaint',
    targetTab: 'complaints',
    targetSubView: 'civic_streetLight',
    primary: [
      'street light not working', 'street light', 'streetlight not working',
      'light pole damaged', 'broken street light', 'no street light',
      'street light work aagala' // Tanglish
    ],
    secondary: ['street light', 'streetlight', 'light pole'],
  },

  // ── 7. ROAD / POTHOLE COMPLAINT (Preselects category) ──
  {
    action: VoiceAction.OPEN_COMPLAINTS,
    serviceName: 'Road Maintenance Complaint',
    targetTab: 'complaints',
    targetSubView: 'civic_potholes',
    primary: [
      'road damaged', 'pothole', 'road is damaged', 'road broken',
      'broken road', 'road repair', 'road in bad condition',
      'road la periya kuzhai iruku' // Tanglish
    ],
    secondary: ['road', 'pothole'],
  },

  // ── 8. SCHOLARSHIP SCHEMES ──
  {
    action: VoiceAction.OPEN_SCHEMES,
    serviceName: 'Student Scholarship Schemes',
    targetTab: 'ai',
    targetSubView: 'Show me student scholarship schemes and education benefits',
    primary: [
      'show scholarship schemes', 'scholarship schemes', 'student benefits',
      'education schemes', 'student scholarship', 'college scholarship'
    ],
    secondary: ['scholarship', 'student', 'education'],
  },

  // ── 9. OPEN AI ASSISTANT ──
  {
    action: VoiceAction.ASK_AI,
    serviceName: 'AI Assistant',
    targetTab: 'ai',
    primary: [
      'open assistant', 'ai assistant', 'voice assistant', 'open ai',
      'help me', 'i need help', 'talk to assistant', 'open help desk'
    ],
    secondary: ['assistant', 'ai', 'help'],
  },

  // ── 10. PUBLIC NOTICES ──
  {
    action: VoiceAction.GO_HOME,
    serviceName: 'Public Notices',
    targetTab: 'home',
    targetSubView: 'NOTICES',
    primary: [
      'public notices', 'show public notices', 'notice board',
      'announcements', 'government notices', 'city notices'
    ],
    secondary: ['notice', 'announcement', 'public notice'],
  },

  // ── 11. EMERGENCY SERVICES ──
  {
    action: VoiceAction.OPEN_HELP, // fallback action, but deep nav overrides
    serviceName: 'Emergency Services',
    targetTab: 'emergency',
    primary: [
      'emergency services', 'emergency', 'help me', 'sos',
      'ambulance', 'police', 'fire', 'fire engine', 'dangerous fire'
    ],
    secondary: ['emergency', 'urgent', 'help', 'fire'],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,?!;:()'"\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function score(normalized: string, rule: IntentRule): number {
  let pts = 0;
  for (const phrase of rule.primary) {
    if (normalized.includes(phrase.toLowerCase())) pts += 4; // High weight for exact demo matches
  }
  for (const kw of rule.secondary) {
    if (normalized.includes(kw.toLowerCase())) pts += 1;
  }
  return pts;
}

function toConfidence(pts: number): IntentConfidence {
  if (pts >= 4) return 'HIGH';
  if (pts >= 2) return 'MEDIUM';
  return 'LOW';
}

export function detectIntent(raw: string, _language = 'English'): IntentResult | null {
  try {
    if (!raw?.trim()) return null;

    const norm = normalize(raw);
    let best = 0;
    let bestRule: IntentRule | null = null;

    for (const rule of INTENT_RULES) {
      const pts = score(norm, rule);
      if (pts > best) { best = pts; bestRule = rule; }
    }

    if (!bestRule || best < 2) {
      console.log(`[IntentMapper] No match (best score: ${best}) for: "${raw}"`);
      return null;
    }

    const confidence = toConfidence(best);
    console.log(`[IntentMapper] ✅ "${bestRule.serviceName}" | ${confidence} | score: ${best}`);

    return {
      action: bestRule.action,
      confidence,
      serviceName: bestRule.serviceName,
      score: best,
      targetTab: bestRule.targetTab,
      targetSubView: bestRule.targetSubView,
    };
  } catch (err) {
    console.error('[IntentMapper] Error:', err);
    return null;
  }
}

export function buildConfirmationPrompt(serviceName: string, language: string): string {
  switch (language) {
    case 'Hindi': return `क्या आप ${serviceName} पर जाना चाहते हैं? हाँ या नहीं बोलें।`;
    case 'Assamese': return `আপুনি ${serviceName}লৈ যাব বিচাৰেনে? হয় বা নহয় কওক।`;
    default: return `Did you mean ${serviceName}? Say yes or no.`;
  }
}

export function isConfirmation(t: string): boolean {
  const n = normalize(t);
  return ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'confirm', 'correct',
    'हाँ', 'हां', 'ठीक है', 'হয়', 'ঠিক আছে'].some(w => n.includes(w));
}

export function isDenial(t: string): boolean {
  const n = normalize(t);
  return ['no', 'nope', 'cancel', 'stop', 'wrong', 'nevermind',
    'नहीं', 'नही', 'রোকা', 'নহয়'].some(w => n.includes(w));
}
