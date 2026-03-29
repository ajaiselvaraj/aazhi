/**
 * API Logger Utility — Per-Minute Request Tracking
 * Tracks outgoing API calls, warns when approaching limits, and provides
 * a `shouldPauseRequests()` signal consumed by the throttle.
 */

const MAX_PER_MINUTE = parseInt(
  (import.meta as any).env?.VITE_MAX_API_CALLS_PER_MINUTE || '30',
  10
);

// Warn when usage reaches this fraction of the limit (80 %)
const WARN_THRESHOLD = 0.8;

// ── Internal state ────────────────────────────────────────────────────────
interface RequestRecord {
  timestamp: number;
}

const requestLog: RequestRecord[] = [];

/**
 * Remove entries older than 60 s from the rolling window.
 */
function pruneOldEntries(): void {
  const cutoff = Date.now() - 60_000;
  while (requestLog.length > 0 && requestLog[0].timestamp < cutoff) {
    requestLog.shift();
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Record one outgoing API request. Called by the throttle layer.
 */
function logRequest(): void {
  pruneOldEntries();
  requestLog.push({ timestamp: Date.now() });

  const count = requestLog.length;

  if (count >= MAX_PER_MINUTE) {
    console.error(
      `[API Logger] ⛔ Limit REACHED: ${count}/${MAX_PER_MINUTE} calls this minute.`
    );
  } else if (count >= Math.floor(MAX_PER_MINUTE * WARN_THRESHOLD)) {
    console.warn(
      `[API Logger] ⚠️ Approaching limit: ${count}/${MAX_PER_MINUTE} calls this minute.`
    );
  }
}

/**
 * Returns the number of API calls made in the last 60 seconds.
 */
function getCallsThisMinute(): number {
  pruneOldEntries();
  return requestLog.length;
}

/**
 * Returns `true` if the per-minute cap has been reached—the throttle
 * should pause new requests until the window rolls over.
 */
function shouldPauseRequests(): boolean {
  pruneOldEntries();
  return requestLog.length >= MAX_PER_MINUTE;
}

/**
 * Pretty-print current usage (call from DevTools console for quick debugging).
 */
function printUsage(): void {
  pruneOldEntries();
  console.log(
    `[API Logger] API calls this minute: ${requestLog.length}/${MAX_PER_MINUTE}`
  );
}

export const apiLogger = {
  logRequest,
  getCallsThisMinute,
  shouldPauseRequests,
  printUsage,
};

export default apiLogger;
