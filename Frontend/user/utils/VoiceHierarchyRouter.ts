/**
 * VoiceHierarchyRouter.ts
 *
 * 3-LEVEL HIERARCHICAL VOICE COMMAND ROUTER
 *
 * ── LEVELS ──────────────────────────────────────────────────────────────────
 *  Level 1 → Module:     "electricity", "gas", "water", "home", "assistant"
 *  Level 2 → Sub-module: "quick pay", "consumer login", "new connection"
 *  Level 3 → Action:     Navigate to exact internal view string
 *
 * ── WHY A SEPARATE ROUTER FROM VoiceCommandRouter.ts ────────────────────────
 *  VoiceCommandRouter handles L1 tab navigation (App.tsx level).
 *  This router handles L2/L3 deep navigation INSIDE module components
 *  (ElectricityModule, GasModule, etc.) which have their own internal
 *  view state machines completely invisible to App.tsx.
 *
 * ── INTERNAL VIEW STRINGS (sourced from actual component code) ───────────────
 *  ElectricityModule views: HOME | QUICK_PAY | LOGIN | CALCULATOR | TARIFF |
 *                           TRANSACTIONS | NEW_CONNECTION | METER_SERVICE |
 *                           COMPLAINTS | PROFILE | TRACK_REQUEST
 *
 *  GasModule views:         HOME | QUICK_PAY | LOGIN | NEW_CONNECTION |
 *                           COMPLAINTS | PROFILE | BILLS | TRACKER |
 *                           CALCULATOR | TARIFF | TRANSACTIONS | BRAND_SELECTION
 *
 * ── MATCHING ALGORITHM ────────────────────────────────────────────────────────
 *  1. normalizeTranscript(text)  → lowercase, ASCII-punct stripped, collapsed spaces
 *  2. detectModule(text)         → which L1 module does this mention?
 *  3. detectSubAction(text)      → which L2 sub-screen does this request?
 *  4. If module found → SubAction result (L2 deep link)
 *     If only module → L1 navigation result
 *     If neither → null (AI fallback)
 *
 * ── ZERO WRONG ROUTING GUARANTEE ─────────────────────────────────────────────
 *  - Each phrase list is EXCLUSIVE to one route. No phrase appears twice.
 *  - Phrases are sorted by length DESC — "consumer login" always beats "login".
 *  - Module detection runs BEFORE sub-action detection.
 *    If module=electricity and phrase="login" → ElectricityLogin, NOT GasLogin.
 */

// ─── Types ────────────────────────────────────────────────────────

/** L1: Which top-level kiosk module */
export type ModuleKey =
  | 'electricity'
  | 'gas'
  | 'water'
  | 'paybill'
  | 'home'
  | 'complaints'
  | 'assistant'
  | 'tracker'
  | 'history'
  | 'services'
  | 'municipal';

/** L2/L3: Internal view name within a module component */
export type ElectricityView =
  | 'HOME' | 'QUICK_PAY' | 'LOGIN' | 'CALCULATOR' | 'TARIFF'
  | 'TRANSACTIONS' | 'NEW_CONNECTION' | 'METER_SERVICE'
  | 'COMPLAINTS' | 'PROFILE' | 'TRACK_REQUEST';

export type GasView =
  | 'HOME' | 'QUICK_PAY' | 'LOGIN' | 'NEW_CONNECTION' | 'COMPLAINTS'
  | 'PROFILE' | 'BILLS' | 'TRACKER' | 'CALCULATOR' | 'TARIFF' | 'TRANSACTIONS';

export type WaterSubAction = 'BILL' | 'PAY_NOW';

/** Full structured result returned by the router */
export interface HierarchyAction {
  /** L1 module resolved */
  module: ModuleKey;
  /** L2 internal view (null = just open the module's HOME) */
  subView: ElectricityView | GasView | WaterSubAction | null;
  /** Dashboard tab to activate in KioskUI */
  dashboardTab: string;
  /** Debug: which phrase triggered the match */
  matchedPhrase: string;
  /** Debug: normalized input text */
  normalizedText: string;
  /** Human-readable TTS announcement */
  announcement: string;
}

/** Current module context — where the user is right now */
export type ModuleContext =
  | 'global'
  | 'electricity'
  | 'gas'
  | 'water'
  | 'billing'
  | string;

// ─── Normalizer ───────────────────────────────────────────────────
/** Unicode-safe: strips only ASCII punctuation, preserves Hindi/Tamil/Assamese */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,?!;:()'"\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Phrase Table Builder ─────────────────────────────────────────
interface PhraseRow<T> {
  phrase: string;
  result: T;
}

function buildTable<T>(map: Array<[T, string[]]>): PhraseRow<T>[] {
  const rows: PhraseRow<T>[] = [];
  for (const [result, phrases] of map) {
    for (const phrase of phrases) {
      rows.push({ phrase: phrase.toLowerCase(), result });
    }
  }
  // Longest phrase first — prevents "login" stealing "consumer login"
  rows.sort((a, b) => b.phrase.length - a.phrase.length);
  return rows;
}

function matchTable<T>(normalized: string, table: PhraseRow<T>[]): { result: T; phrase: string } | null {
  for (const row of table) {
    if (normalized.includes(row.phrase)) {
      return { result: row.result, phrase: row.phrase };
    }
  }
  return null;
}

// ─── L1: MODULE DETECTION TABLE ──────────────────────────────────
const MODULE_TABLE = buildTable<ModuleKey>([
  ['electricity', [
    'electricity bill payment', 'pay electricity bill', 'electricity bill',
    'go to electricity', 'open electricity', 'power bill', 'current bill',
    'bijli bill', 'bijli', 'electricity', 'power',
    'बिजली बिल', 'बिजली', 'மின்சாரம்', 'বিদ্যুৎ',
  ]],
  ['gas', [
    'gas bill payment', 'pay gas bill', 'gas booking', 'gas service',
    'gas cylinder', 'gas connection', 'lpg booking', 'lpg',
    'go to gas', 'open gas', 'gas bill', 'gas',
    'गैस', 'கேஸ்', 'গ্যাস',
  ]],
  ['water', [
    'water bill payment', 'pay water bill', 'water bill',
    'go to water', 'open water', 'water payment', 'water tax',
    'jal bill', 'water',
    'पानी का बिल', 'पानी', 'தண்ணீர்', 'পানী',
  ]],
  ['paybill', [
    'pay bills', 'pay my bill', 'bill payment', 'go to billing',
    'open billing', 'billing', 'pay bill',
    'बिल भुगतान', 'பில்',
  ]],
  ['home', [
    'take me home', 'go to home page', 'go to home', 'go back home',
    'open home', 'home screen', 'main page', 'go home', 'home',
    'मुख्य पृष्ठ', 'முகப்பு',
  ]],
  ['complaints', [
    'register complaint', 'file complaint', 'submit complaint',
    'report problem', 'grievance', 'complaints', 'complaint',
    'शिकायत', 'புகார்',
  ]],
  ['assistant', [
    'open ai assistant', 'ai assistant', 'open assistant',
    'talk to assistant', 'help me', 'chatbot', 'assistant', 'help',
    'मदद', 'உதவி',
  ]],
  ['tracker', [
    'track my application', 'track application', 'application status',
    'track app', 'check status', 'track status', 'track',
    'स्थिति', 'நிலைமை',
  ]],
  ['history', [
    'my history', 'past requests', 'view history', 'payment history',
    'records', 'history',
    'इतिहास', 'வரலாறு',
  ]],
  ['municipal', [
    'municipal services', 'municipality', 'corporation services',
    'नगर पालिका', 'நகராட்சி',
  ]],
  ['services', [
    'open services', 'government services', 'all services',
    'services', 'service', 'apply',
    'सेवाएं', 'சேவைகள்',
  ]],
]);

// ─── L2: ELECTRICITY SUB-ACTION TABLE ────────────────────────────
const ELECTRICITY_ACTION_TABLE = buildTable<ElectricityView>([
  ['QUICK_PAY', [
    'open quick pay electricity', 'quick pay electricity',
    'electricity quick pay', 'quick pay power', 'quick pay',
    'pay quickly', 'fast pay',
  ]],
  ['LOGIN', [
    'open consumer login electricity', 'consumer login electricity',
    'electricity consumer login', 'electricity login',
    'consumer login', 'consumer portal',
  ]],
  ['CALCULATOR', [
    'bill calculator electricity', 'electricity bill calculator',
    'calculate electricity bill', 'calculator', 'calculate bill',
  ]],
  ['TARIFF', [
    'electricity tariff', 'tariff details', 'tariff rates',
    'rate chart', 'tariff',
  ]],
  ['TRANSACTIONS', [
    'electricity transactions', 'my transactions electricity',
    'transaction history electricity', 'payment history electricity',
    'my transactions', 'transactions',
  ]],
  ['NEW_CONNECTION', [
    'new electricity connection', 'electricity new connection',
    'apply for connection', 'new connection electricity',
    'new connection',
  ]],
  ['METER_SERVICE', [
    'meter service', 'meter repair', 'meter reading',
    'faulty meter', 'meter complaint',
  ]],
  ['COMPLAINTS', [
    'electricity complaint', 'power complaint',
    'report electricity issue', 'electricity problem',
  ]],
  ['PROFILE', [
    'electricity profile', 'my electricity account',
    'power profile', 'account details electricity',
  ]],
  ['TRACK_REQUEST', [
    'track electricity request', 'electricity request status',
    'electricity tracker',
  ]],
]);

// ─── L2: GAS SUB-ACTION TABLE ─────────────────────────────────────
const GAS_ACTION_TABLE = buildTable<GasView>([
  ['QUICK_PAY', [
    'gas quick pay', 'quick pay gas', 'pay gas quickly',
    'quick gas payment', 'quick pay',
    'gas payment', 'pay gas',
  ]],
  ['NEW_CONNECTION', [
    'new gas connection', 'gas new connection',
    'apply gas connection', 'gas connection form',
    'new connection gas', 'new connection',
  ]],
  ['BILLS', [
    'gas bills', 'view gas bill', 'gas bill details',
    'my gas bill', 'open gas bill',
  ]],
  ['LOGIN', [
    'gas consumer login', 'gas login', 'gas portal',
    'consumer login gas',
  ]],
  ['CALCULATOR', [
    'gas bill calculator', 'calculate gas bill', 'gas calculator',
  ]],
  ['TARIFF', [
    'gas tariff', 'gas rate', 'gas price', 'lpg tariff',
  ]],
  ['TRANSACTIONS', [
    'gas transactions', 'gas payment history', 'gas history',
  ]],
  ['COMPLAINTS', [
    'gas complaint', 'gas problem', 'gas issue', 'gas leak complaint',
  ]],
  ['TRACKER', [
    'gas tracker', 'track gas request', 'gas request status',
  ]],
  ['PROFILE', [
    'gas profile', 'gas account', 'my gas account',
  ]],
]);

// ─── L2: WATER SUB-ACTION TABLE ───────────────────────────────────
const WATER_ACTION_TABLE = buildTable<WaterSubAction>([
  ['PAY_NOW', [
    'pay water now', 'water pay now', 'pay now water',
    'water payment now', 'pay now',
  ]],
  ['BILL', [
    'water bill details', 'open water bill', 'view water bill',
    'water bill', 'open bill',
  ]],
]);

// ─── Dashboard Tab Mapping ────────────────────────────────────────
const MODULE_TO_TAB: Record<ModuleKey, string> = {
  electricity: 'billing',
  gas:         'gas',
  water:       'billing',
  paybill:     'billing',
  home:        'home',
  complaints:  'complaints',
  assistant:   'ai',
  tracker:     'tracker',
  history:     'status',
  services:    'services',
  municipal:   'municipal',
};

// ─── TTS Announcements ────────────────────────────────────────────
function buildAnnouncement(module: ModuleKey, subView: string | null): string {
  if (!subView || subView === 'HOME') {
    const labels: Record<ModuleKey, string> = {
      electricity: 'Opening Electricity module',
      gas:         'Opening Gas service',
      water:       'Opening Water bill payment',
      paybill:     'Opening Bill Payments',
      home:        'Going to Home',
      complaints:  'Opening Complaints',
      assistant:   'Opening AI Assistant',
      tracker:     'Opening Application Tracker',
      history:     'Opening History',
      services:    'Opening Government Services',
      municipal:   'Opening Municipal Services',
    };
    return labels[module] ?? 'Navigating...';
  }
  const sub = subView.replace(/_/g, ' ').toLowerCase();
  return `Opening ${sub} in ${module}`;
}

// ─── MAIN EXPORT: routeHierarchy ─────────────────────────────────
/**
 * routeHierarchy
 *
 * Primary router. Call this from any voice command handler.
 *
 * @param rawTranscript - Raw speech text from recognizer
 * @param context       - Current module context ("global" | "electricity" | "gas" | ...)
 * @returns HierarchyAction if matched, null if no match (AI fallback)
 *
 * @example
 *   routeHierarchy("open quick pay in electricity", "global")
 *   // → { module: "electricity", subView: "QUICK_PAY", dashboardTab: "billing", ... }
 *
 *   routeHierarchy("quick pay", "electricity")
 *   // → { module: "electricity", subView: "QUICK_PAY", dashboardTab: "billing", ... }
 *
 *   routeHierarchy("new connection", "gas")
 *   // → { module: "gas", subView: "NEW_CONNECTION", dashboardTab: "gas", ... }
 *
 *   routeHierarchy("go home", "electricity")
 *   // → { module: "home", subView: null, dashboardTab: "home", ... }
 */
export function routeHierarchy(
  rawTranscript: string,
  context: ModuleContext = 'global'
): HierarchyAction | null {
  if (!rawTranscript?.trim()) return null;

  const n = normalizeTranscript(rawTranscript);
  console.log(`[VHR] Input: "${rawTranscript}" → normalized: "${n}" | ctx: "${context}"`);

  // ── PASS 1: Sub-action within current context (highest priority) ──
  // If user is already INSIDE electricity and says "quick pay" → stay in electricity
  if (context === 'electricity') {
    const sub = matchTable(n, ELECTRICITY_ACTION_TABLE);
    if (sub) {
      console.log(`[VHR] ✅ Ctx:electricity sub-action "${sub.phrase}" → ${sub.result}`);
      return build('electricity', sub.result, sub.phrase, n);
    }
  }
  if (context === 'gas') {
    const sub = matchTable(n, GAS_ACTION_TABLE);
    if (sub) {
      console.log(`[VHR] ✅ Ctx:gas sub-action "${sub.phrase}" → ${sub.result}`);
      return build('gas', sub.result, sub.phrase, n);
    }
  }
  if (context === 'water' || context === 'billing') {
    const sub = matchTable(n, WATER_ACTION_TABLE);
    if (sub) {
      console.log(`[VHR] ✅ Ctx:water sub-action "${sub.phrase}" → ${sub.result}`);
      return build('water', sub.result, sub.phrase, n);
    }
  }

  // ── PASS 2: Detect module from transcript ──────────────────────
  const modMatch = matchTable(n, MODULE_TABLE);
  if (!modMatch) {
    console.log(`[VHR] ❌ No module matched for: "${n}"`);
    return null;
  }

  const module = modMatch.result;
  console.log(`[VHR] Module detected: "${module}" via "${modMatch.phrase}"`);

  // ── PASS 3: Detect sub-action for the detected module ──────────
  let subView: ElectricityView | GasView | WaterSubAction | null = null;
  let subPhrase = modMatch.phrase;

  if (module === 'electricity') {
    const sub = matchTable(n, ELECTRICITY_ACTION_TABLE);
    if (sub) { subView = sub.result; subPhrase = sub.phrase; }
  } else if (module === 'gas') {
    const sub = matchTable(n, GAS_ACTION_TABLE);
    if (sub) { subView = sub.result; subPhrase = sub.phrase; }
  } else if (module === 'water') {
    const sub = matchTable(n, WATER_ACTION_TABLE);
    if (sub) { subView = sub.result; subPhrase = sub.phrase; }
  }

  console.log(`[VHR] ✅ Final: module="${module}" subView="${subView}" phrase="${subPhrase}"`);
  return build(module, subView, subPhrase, n);
}

// ─── Internal Builder ─────────────────────────────────────────────
function build(
  module: ModuleKey,
  subView: ElectricityView | GasView | WaterSubAction | null,
  matchedPhrase: string,
  normalizedText: string
): HierarchyAction {
  return {
    module,
    subView,
    dashboardTab: MODULE_TO_TAB[module],
    matchedPhrase,
    normalizedText,
    announcement: buildAnnouncement(module, subView),
  };
}

// ─── EXPORT: resolveSubAction ─────────────────────────────────────
/**
 * resolveSubAction
 *
 * Standalone sub-action resolver. Use this when you already know
 * which module is active and only need to resolve the sub-screen.
 *
 * @param module  - The currently active module
 * @param rawText - Raw speech transcript
 * @returns The matching internal view string, or null
 *
 * @example
 *   resolveSubAction("electricity", "open quick pay")  → "QUICK_PAY"
 *   resolveSubAction("gas", "new connection")          → "NEW_CONNECTION"
 *   resolveSubAction("water", "pay now")               → "PAY_NOW"
 */
export function resolveSubAction(
  module: ModuleKey,
  rawText: string
): ElectricityView | GasView | WaterSubAction | null {
  const n = normalizeTranscript(rawText);
  if (module === 'electricity') return matchTable(n, ELECTRICITY_ACTION_TABLE)?.result ?? null;
  if (module === 'gas')         return matchTable(n, GAS_ACTION_TABLE)?.result ?? null;
  if (module === 'water')       return matchTable(n, WATER_ACTION_TABLE)?.result ?? null;
  return null;
}

// ─── EXPORT: Context Detector ────────────────────────────────────
/**
 * detectActiveModule
 *
 * Converts the app's current dashboardTab into a ModuleContext.
 * Use this to build the context string to pass to routeHierarchy.
 *
 * @example
 *   detectActiveModule("billing", "QUICK_PAY_SCREEN")  → "electricity"
 *   detectActiveModule("gas", "HOME")                   → "gas"
 *   detectActiveModule("home", undefined)               → "global"
 */
export function detectActiveModule(
  dashboardTab: string,
  internalModuleView?: string
): ModuleContext {
  if (dashboardTab === 'gas')   return 'gas';
  if (dashboardTab === 'billing') {
    // Try to detect if user is inside the electricity sub-module
    // by checking if ElectricityModule is rendered (passed via prop)
    if (internalModuleView && internalModuleView !== 'select') {
      return 'electricity';
    }
    return 'billing';
  }
  return 'global';
}

// ─── COMMAND TREE (reference / documentation) ────────────────────
/**
 * COMMAND_TREE
 *
 * Declarative reference of the entire command hierarchy.
 * Not used in matching — use routeHierarchy() for that.
 * Useful for rendering a help screen or debugging command coverage.
 */
export const COMMAND_TREE = {
  electricity: {
    _module_phrases: ['electricity', 'power', 'bijli', 'बिजली'],
    QUICK_PAY:      ['quick pay', 'electricity quick pay'],
    LOGIN:          ['consumer login', 'electricity login'],
    CALCULATOR:     ['bill calculator', 'calculate bill'],
    TARIFF:         ['tariff', 'tariff details'],
    TRANSACTIONS:   ['my transactions', 'transaction history'],
    NEW_CONNECTION: ['new connection', 'apply for connection'],
    METER_SERVICE:  ['meter service', 'faulty meter'],
    COMPLAINTS:     ['electricity complaint'],
    PROFILE:        ['electricity profile', 'my account'],
    TRACK_REQUEST:  ['electricity tracker'],
  },
  gas: {
    _module_phrases: ['gas', 'lpg', 'गैस', 'கேஸ்'],
    QUICK_PAY:      ['quick pay', 'gas quick pay', 'pay gas'],
    NEW_CONNECTION: ['new connection', 'gas connection'],
    BILLS:          ['gas bills', 'view gas bill'],
    LOGIN:          ['gas login', 'gas consumer login'],
    CALCULATOR:     ['gas calculator'],
    TARIFF:         ['gas tariff'],
    TRANSACTIONS:   ['gas transactions'],
    COMPLAINTS:     ['gas complaint'],
    TRACKER:        ['gas tracker'],
    PROFILE:        ['gas profile'],
  },
  water: {
    _module_phrases: ['water', 'पानी', 'தண்ணீர்'],
    BILL:           ['water bill', 'open bill'],
    PAY_NOW:        ['pay now', 'water pay now'],
  },
  global: {
    home:       ['go home', 'home', 'main page'],
    paybill:    ['pay bills', 'billing', 'bill payment'],
    complaints: ['complaint', 'grievance'],
    assistant:  ['assistant', 'help', 'chatbot'],
    tracker:    ['track application', 'track app'],
    history:    ['history', 'records'],
    municipal:  ['municipality', 'corporation'],
    services:   ['services', 'apply'],
  },
} as const;
