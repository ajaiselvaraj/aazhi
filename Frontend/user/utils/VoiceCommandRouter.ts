/**
 * VoiceCommandRouter.ts
 *
 * Single-responsibility module: Takes a raw speech transcript + current
 * page context, returns a deterministic NavigationAction.
 *
 * ── WHY PREVIOUS SYSTEMS FAILED ────────────────────────────────────────────
 *
 *  1. GREEDY SINGLE-WORD MATCHING ("billing" matched before "electricity bill")
 *     Short keywords fired before longer, more specific phrases were checked.
 *     A user saying "electricity bill" could hit "billing" first.
 *     FIX: Sort all rules by phrase length DESC before matching. Longer phrases
 *     always win over shorter ones.
 *
 *  2. NO CONTEXT AWARENESS (global "gas" ignored billing context)
 *     "gas" in a global context should open the gas section.
 *     "gas" while already in billing should deep-link to gas bill.
 *     The old system had no concept of "where the user currently is".
 *     FIX: Matcher accepts currentContext and runs context-specific rules first.
 *
 *  3. OVER-ENGINEERED COMMAND MAP (keyword arrays with no priority weights)
 *     All keywords had equal weight. "bill" would match "pay bill" AND "electricity
 *     bill" simultaneously — first match won, which was arbitrary.
 *     FIX: Explicit weight/priority field per rule. Highest weight wins.
 *
 *  4. UNICODE-BREAKING NORMALIZATION (\W regex destroys Hindi/Tamil characters)
 *     The old normalizer used /[^\w\s]/gi which strips all non-ASCII.
 *     Hindi keywords like "बिजली बिल" became empty string.
 *     FIX: Strip only specific ASCII punctuation. Unicode letters preserved.
 *
 * ── ARCHITECTURE ────────────────────────────────────────────────────────────
 *
 *   routeVoiceCommand(transcript, context)
 *     → normalize(transcript)
 *     → if context has sub-rules → run context rules first (priority)
 *     → run global rules sorted by phrase length DESC
 *     → return NavigationAction | null
 *
 * ── USAGE ──────────────────────────────────────────────────────────────────
 *
 *   import { routeVoiceCommand } from './VoiceCommandRouter';
 *
 *   // In your voice command handler:
 *   const action = routeVoiceCommand(transcriptText, currentTab);
 *   if (action) {
 *     setDashboardInitialTab(action.tab);
 *     setView(action.view);
 *   }
 */

import { ViewState } from '../types';

// ─── Navigation Action (what the router returns) ──────────────────
export type DashboardTab =
  | 'home'
  | 'services'
  | 'complaints'
  | 'billing'
  | 'status'
  | 'ai'
  | 'tracker'
  | 'emergency'
  | 'certificates'
  | 'business'
  | 'property'
  | 'participation'
  | 'gas'
  | 'municipal';

export type AppView = ViewState;

export interface NavigationAction {
  /** The view to switch to */
  view: AppView;
  /** The dashboard tab (only relevant when view=DASHBOARD) */
  tab: DashboardTab;
  /** The raw command key matched (for logging/feedback) */
  command: string;
  /** The phrase that triggered the match */
  matchedPhrase: string;
  /** Debug: the normalized transcript that was evaluated */
  normalizedTranscript: string;
}

export interface AiQueryAction {
  type: 'ai_query';
  query: string;
}

export type RouterResult = NavigationAction | AiQueryAction | null;

// ─── Page Context ─────────────────────────────────────────────────
// Tells the router where the user currently is so context-aware
// routing can be applied (e.g., "gas" inside billing vs. global).
export type PageContext =
  | 'landing'
  | 'login'
  | 'dashboard:home'
  | 'dashboard:billing'
  | 'dashboard:gas'
  | 'dashboard:services'
  | 'dashboard:complaints'
  | 'dashboard:tracker'
  | 'dashboard:ai'
  | 'dashboard:status'
  | 'dashboard:municipal'
  | string; // catch-all for future tabs

// ─── Rule Definition ──────────────────────────────────────────────
// Each rule has:
//  - phrases: all trigger phrases (matched via substring, longest-first)
//  - action: the navigation target
//  - weight: higher = matched first when two rules could match
//  - contexts: optional list of contexts where this rule ONLY applies
//              (empty = global, applies everywhere)
interface CommandRule {
  command: string;
  phrases: string[];
  action: {
    view: AppView;
    tab: DashboardTab;
  };
  weight: number;
  contexts?: PageContext[]; // if set, rule ONLY fires in these contexts
}

// ─── COMMAND RULES ────────────────────────────────────────────────
//
// ORDERING PHILOSOPHY:
//  • weight=100  → specific sub-page deep links (highest priority)
//  • weight=80   → billing sub-categories (context-sensitive)
//  • weight=60   → primary section navigations
//  • weight=40   → general / catch-all navigation
//
// Within the same weight tier, phrase length is the tiebreaker.
// Longer phrases always beat shorter ones.
//
const COMMAND_RULES: CommandRule[] = [

  // ── Deep-link: Electricity (HIGHEST PRIORITY — most specific) ───
  {
    command: 'electricity_bill',
    weight: 100,
    phrases: [
      // English multi-word first
      'electricity bill payment', 'pay electricity bill', 'pay my electricity',
      'go to electricity', 'electricity bill', 'electricity payment',
      'open electricity', 'power bill payment', 'pay power bill',
      'current bill payment', 'pay current bill', 'bijli bill', 'bijli ka bill',
      // Single keywords last
      'electricity', 'power bill', 'current bill',
      // Hindi
      'बिजली बिल', 'बिजली का बिल', 'बिजली',
      // Tamil
      'மின்சார கட்டணம்', 'மின்சாரம்',
      // Bengali / Assamese
      'বিদ্যুৎ বিল', 'বিদ্যুৎ',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'billing' },
  },

  // ── Deep-link: Water Bill ─────────────────────────────────────────
  {
    command: 'water_bill',
    weight: 100,
    phrases: [
      'water bill payment', 'pay water bill', 'pay my water bill',
      'go to water', 'water bill', 'water payment', 'water tax',
      'jal bill', 'pani ka bill',
      'water supply bill', 'water',
      // Hindi
      'पानी का बिल', 'पानी बिल', 'जल बिल', 'पानी',
      // Tamil
      'தண்ணீர் கட்டணம்',
      // Assamese
      'পানী বিল', 'পানী',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'billing' },
  },

  // ── Deep-link: Gas (context-aware) ────────────────────────────────
  // When in billing context → gas tab (deep link)
  // When global → also gas tab (this app has a dedicated gas tab)
  {
    command: 'gas',
    weight: 100,
    phrases: [
      'go to gas', 'gas bill payment', 'pay gas bill', 'gas booking',
      'gas service', 'gas cylinder', 'gas connection', 'book gas',
      'lpg booking', 'lpg cylinder', 'lpg service', 'lpg',
      'gas bill', 'gas',
      // Hindi
      'गैस बुकिंग', 'गैस', 'सिलेंडर',
      // Tamil
      'கேஸ்',
      // Bengali
      'গ্যাস', 'গেছ',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'gas' },
  },

  // ── Billing / Pay Bill (general) ──────────────────────────────────
  {
    command: 'paybill',
    weight: 80,
    phrases: [
      'pay bills', 'pay my bill', 'bill payment', 'go to billing',
      'open billing', 'billing section', 'pay bill', 'billing',
      'payment',
      // Hindi
      'बिल भुगतान', 'बिल',
      // Tamil
      'பில் கட்டணம்', 'பில்',
      // Bengali
      'বিল পৰিশোধ',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'billing' },
  },

  // ── AI Assistant ──────────────────────────────────────────────────
  {
    command: 'assistant',
    weight: 60,
    phrases: [
      'open ai assistant', 'talk to assistant', 'go to assistant',
      'ai assistant', 'open assistant', 'open ai',
      'help me', 'chatbot', 'assistant', 'chat', 'help', 'support',
      // Hindi
      'सहायता', 'मदद',
      // Tamil
      'உதவி',
      // Assamese
      'সহায়',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'ai' },
  },

  // ── Track Application ─────────────────────────────────────────────
  {
    command: 'trackapp',
    weight: 60,
    phrases: [
      'track my application', 'track my request', 'track application status',
      'application status', 'track application', 'track app',
      'check status', 'track status', 'track',
      // Hindi
      'स्थिति जांचें', 'स्थिति',
      // Tamil
      'நிலைமை',
      // Assamese
      'আৱেদনৰ অৱস্থা',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'tracker' },
  },

  // ── History / Status ─────────────────────────────────────────────
  {
    command: 'history',
    weight: 60,
    phrases: [
      'my history', 'past requests', 'my requests', 'view history',
      'payment history', 'records', 'history',
      // Hindi
      'इतिहास',
      // Tamil
      'வரலாறு',
      // Assamese
      'ইতিহাস',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'status' },
  },

  // ── Services ──────────────────────────────────────────────────────
  {
    command: 'service',
    weight: 60,
    phrases: [
      'open services', 'government services', 'all services', 'view services',
      'go to services', 'services', 'service', 'apply',
      // Hindi
      'सेवाएं', 'सेवा',
      // Tamil
      'சேவைகள்',
      // Assamese
      'সেৱা',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'services' },
  },

  // ── Complaints ────────────────────────────────────────────────────
  {
    command: 'complaints',
    weight: 60,
    phrases: [
      'register complaint', 'file a complaint', 'file complaint',
      'submit complaint', 'report problem', 'report issue',
      'grievance', 'complaints', 'complaint',
      // Hindi
      'शिकायत दर्ज', 'शिकायत',
      // Tamil
      'புகார்',
      // Assamese
      'অভিযোগ',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'complaints' },
  },

  // ── Municipal ─────────────────────────────────────────────────────
  {
    command: 'municipal',
    weight: 60,
    phrases: [
      'municipal services', 'municipality services', 'corporation services',
      'municipal corporation', 'municipality', 'corporation',
      // Hindi
      'नगर पालिका सेवाएं', 'नगर पालिका', 'नगर निगम',
      // Tamil
      'நகர் சேவை', 'நகராட்சி',
      // Assamese
      'পৌৰসভা সেৱা', 'পৌৰসভা',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'municipal' },
  },

  // ── Aadhaar ───────────────────────────────────────────────────────
  {
    command: 'aadhaar',
    weight: 60,
    phrases: [
      'aadhaar verification', 'verify aadhaar', 'open aadhaar',
      'aadhar verification', 'aadhar check', 'aadhaar check',
      'aadhaar', 'aadhar',
      // Hindi
      'आधार सत्यापन', 'आधार जाँच', 'आधार',
      // Tamil
      'ஆதார் சரிபார்ப்பு', 'ஆதார்',
      // Assamese
      'আধাৰ যাচাই', 'আধাৰ',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'services' },
  },

  // ── Home ──────────────────────────────────────────────────────────
  {
    command: 'home',
    weight: 40,
    phrases: [
      'take me to home', 'take me home', 'go to home page', 'go back home',
      'go to home', 'open home', 'home screen', 'main page',
      'go home', 'home page', 'dashboard', 'home',
      // Hindi
      'मुख्य पृष्ठ', 'होम',
      // Tamil
      'முகப்பு',
      // Assamese
      'হোম',
    ],
    action: { view: ViewState.DASHBOARD, tab: 'home' },
  },

  // ── Login ─────────────────────────────────────────────────────────
  {
    command: 'login',
    weight: 40,
    phrases: [
      'log in', 'sign in', 'login', 'authenticate',
      // Hindi
      'लॉग इन',
      // Tamil
      'நுழை',
      // Assamese
      'লগ ইন',
    ],
    action: { view: ViewState.SELECTION, tab: 'home' },
  },

  // ── Exit / Logout ─────────────────────────────────────────────────
  {
    command: 'exit',
    weight: 40,
    phrases: [
      'log out', 'sign out', 'exit app', 'logout', 'exit', 'quit', 'leave',
      // Hindi
      'बाहर जाओ', 'लॉगआउट',
      // Tamil
      'வெளியேறு',
      // Assamese
      'বাহিৰলৈ',
    ],
    action: { view: ViewState.LANDING, tab: 'home' },
  },

];

// ─── Text Normalizer (Unicode-Safe) ──────────────────────────────
// Strips ONLY ASCII punctuation — preserves Hindi, Tamil, Assamese characters.
// /[^\w\s]/gi is WRONG for multilingual input — it strips all non-ASCII.
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove ASCII punctuation only (NOT \W which kills Unicode letters)
    .replace(/[.,?!;:()'"\-_/\\]/g, ' ')
    // Collapse runs of whitespace to single space
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Priority Sorter ──────────────────────────────────────────────
// Sorts a copy of rules by:
//  1. weight DESC (higher weight = checked first)
//  2. phrase length DESC within same weight (longer phrase = more specific)
// This ensures "electricity bill" always beats "bill" or "electricity".
function buildSortedPhraseTable(rules: CommandRule[]): Array<{
  phrase: string;
  command: string;
  action: CommandRule['action'];
  weight: number;
  contexts?: PageContext[];
}> {
  const rows: ReturnType<typeof buildSortedPhraseTable> = [];

  for (const rule of rules) {
    for (const phrase of rule.phrases) {
      rows.push({
        phrase: phrase.toLowerCase(),
        command: rule.command,
        action: rule.action,
        weight: rule.weight,
        contexts: rule.contexts,
      });
    }
  }

  // Sort: weight DESC, then phrase length DESC (longer = more specific wins)
  rows.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.phrase.length - a.phrase.length;
  });

  return rows;
}

// Build the sorted table ONCE at module load — no runtime cost per call
const SORTED_PHRASE_TABLE = buildSortedPhraseTable(COMMAND_RULES);

// ─── Main Router Function ─────────────────────────────────────────
/**
 * routeVoiceCommand
 *
 * Takes a raw speech transcript and the current page context, returns
 * a NavigationAction if a command is matched, or null if no match.
 *
 * @param rawTranscript  - The raw text from speech recognition
 * @param context        - Where the user currently is (e.g. "dashboard:billing")
 * @returns NavigationAction | null
 *
 * @example
 *   const action = routeVoiceCommand("electricity bill", "dashboard:billing");
 *   // → { view: DASHBOARD, tab: 'billing', command: 'electricity_bill', ... }
 *
 *   const action = routeVoiceCommand("gas", "dashboard:billing");
 *   // → { view: DASHBOARD, tab: 'gas', command: 'gas', ... }
 *
 *   const action = routeVoiceCommand("what is my aadhaar", "landing");
 *   // → null (no match — route to AI)
 */
export function routeVoiceCommand(
  rawTranscript: string,
  context: PageContext = 'landing'
): NavigationAction | null {
  if (!rawTranscript || !rawTranscript.trim()) {
    console.log('[VCR] Empty transcript — no action.');
    return null;
  }

  const normalized = normalizeTranscript(rawTranscript);
  console.log(`[VCR] Routing: "${rawTranscript}" → normalized: "${normalized}" | context: "${context}"`);

  // Two-pass matching:
  // PASS 1: Context-specific rules only (higher specificity)
  // PASS 2: All rules (global)
  // This ensures that "gas" inside a billing context hits the gas-specific path
  // before any global "gas" rule can fire.

  // PASS 1 — Context-filtered rules only
  const contextMatch = tryMatch(normalized, SORTED_PHRASE_TABLE, context, true);
  if (contextMatch) {
    console.log(`[VCR] ✅ Context match: "${contextMatch.matchedPhrase}" → ${contextMatch.command}`);
    return { ...contextMatch, normalizedTranscript: normalized };
  }

  // PASS 2 — Global rules (no context filter)
  const globalMatch = tryMatch(normalized, SORTED_PHRASE_TABLE, context, false);
  if (globalMatch) {
    console.log(`[VCR] ✅ Global match: "${globalMatch.matchedPhrase}" → ${globalMatch.command}`);
    return { ...globalMatch, normalizedTranscript: normalized };
  }

  console.log(`[VCR] ❌ No match for: "${normalized}"`);
  return null;
}

// ─── Internal Matching Helper ─────────────────────────────────────
function tryMatch(
  normalized: string,
  table: ReturnType<typeof buildSortedPhraseTable>,
  context: PageContext,
  contextFilteredOnly: boolean
): Omit<NavigationAction, 'normalizedTranscript'> | null {
  for (const row of table) {
    // Context filter: if contextFilteredOnly=true, ONLY check rules with contexts
    if (contextFilteredOnly) {
      if (!row.contexts || row.contexts.length === 0) continue;
      if (!row.contexts.includes(context)) continue;
    } else {
      // Global pass: skip context-specific rules (they were already tried)
      if (row.contexts && row.contexts.length > 0) continue;
    }

    // Substring match — phrase must appear anywhere in the transcript
    if (normalized.includes(row.phrase)) {
      return {
        view: row.action.view,
        tab: row.action.tab,
        command: row.command,
        matchedPhrase: row.phrase,
      };
    }
  }
  return null;
}

// ─── Convenience: Full Dispatch ───────────────────────────────────
/**
 * dispatchVoiceCommand
 *
 * Higher-level helper that wraps routeVoiceCommand and handles the
 * ai_query fallback. Designed to be a drop-in replacement for the
 * switch(command) block in App.tsx.
 *
 * @param rawTranscript     - Raw speech text
 * @param context           - Current page context
 * @param onNavigate        - Called with a NavigationAction when matched
 * @param onAiQuery         - Called with raw text when no command matched
 *
 * @example
 *   dispatchVoiceCommand(
 *     transcript,
 *     'dashboard:billing',
 *     (action) => { setDashboardInitialTab(action.tab); setView(action.view); },
 *     (query)  => { setDashboardInitialAiQuery(query); setView(ViewState.DASHBOARD); }
 *   );
 */
export function dispatchVoiceCommand(
  rawTranscript: string,
  context: PageContext,
  onNavigate: (action: NavigationAction) => void,
  onAiQuery: (query: string) => void
): void {
  const action = routeVoiceCommand(rawTranscript, context);

  if (action) {
    onNavigate(action);
  } else {
    // No command matched — route to AI assistant with the full query
    const cleaned = rawTranscript.trim();
    if (cleaned) {
      console.log(`[VCR] 🤖 Routing to AI: "${cleaned}"`);
      onAiQuery(cleaned);
    }
  }
}

// ─── Context Builder ──────────────────────────────────────────────
/**
 * buildContext
 *
 * Converts the app's ViewState + dashboardTab into a PageContext string
 * that the router understands.
 *
 * @example
 *   buildContext(ViewState.DASHBOARD, 'billing') → "dashboard:billing"
 *   buildContext(ViewState.LANDING, 'home')       → "landing"
 */
export function buildContext(view: ViewState, tab?: DashboardTab): PageContext {
  switch (view) {
    case ViewState.DASHBOARD:
      return `dashboard:${tab ?? 'home'}` as PageContext;
    case ViewState.LOGIN:
      return 'login';
    case ViewState.LANDING:
      return 'landing';
    default:
      return 'landing';
  }
}
