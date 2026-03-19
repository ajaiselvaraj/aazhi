/**
 * API Throttle Utility — Concurrency-Limited Request Queue
 * Ensures the kiosk never exceeds the allowed number of concurrent or
 * per-minute API requests, preventing HTTP 429 errors proactively.
 */

import { apiLogger } from './apiLogger';

// ── Configuration (from env vars with sensible defaults) ──────────────────
const MAX_CONCURRENT = parseInt(
  (import.meta as any).env?.VITE_MAX_CONCURRENT_REQUESTS || '2',
  10
);
const MAX_PER_MINUTE = parseInt(
  (import.meta as any).env?.VITE_MAX_API_CALLS_PER_MINUTE || '30',
  10
);

// ── Internal State ────────────────────────────────────────────────────────
interface QueueItem<T = any> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

const queue: QueueItem[] = [];
let activeRequests = 0;

/** Small helper to sleep */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ── Queue Processor ───────────────────────────────────────────────────────
async function processQueue(): Promise<void> {
  if (activeRequests >= MAX_CONCURRENT || queue.length === 0) return;

  // If per-minute cap is already hit, wait until the next window opens
  if (apiLogger.shouldPauseRequests()) {
    console.warn(
      `[Throttle] Per-minute limit (${MAX_PER_MINUTE}) reached — pausing requests.`
    );
    await delay(5000); // wait 5 s, then re-check
    processQueue();
    return;
  }

  const item = queue.shift();
  if (!item) return;

  activeRequests++;
  apiLogger.logRequest(); // track the outgoing request

  try {
    const result = await item.task();
    item.resolve(result);
  } catch (error) {
    item.reject(error);
  } finally {
    activeRequests--;
    processQueue(); // drain the queue
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Enqueue an async task so it respects concurrency & per-minute limits.
 *
 * @example
 * const data = await enqueue(() => fetch('/api/bills'));
 */
export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ task, resolve, reject });
    processQueue();
  });
}

/**
 * Returns current queue depth (useful for debugging / logging).
 */
export function getQueueDepth(): number {
  return queue.length;
}

/**
 * Returns number of in-flight requests right now.
 */
export function getActiveRequests(): number {
  return activeRequests;
}

export default { enqueue, getQueueDepth, getActiveRequests };
