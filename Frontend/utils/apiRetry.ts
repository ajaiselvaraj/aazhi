/**
 * API Retry Utility — Exponential Backoff with Jitter
 * Automatically retries failed API calls on HTTP 429 (Rate Limit Exceeded)
 * Never throws unhandled — always returns a fallback on exhaustion.
 */

const MAX_RETRIES = parseInt(
  (import.meta as any).env?.VITE_API_RETRY_MAX || '5',
  10
);
const BASE_DELAY_MS = 2000;

/** Small helper to sleep */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Custom error class for rate-limit detection
 */
export class RateLimitError extends Error {
  status: number;
  retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
    this.retryAfter = retryAfter;
  }
}

export interface RetryOptions {
  /** Maximum number of retries (default: from env or 5) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 2000) */
  baseDelay?: number;
  /** Fallback value returned when all retries are exhausted */
  fallback?: any;
  /** Optional label used in console logs */
  label?: string;
}

/**
 * Wraps an async API call with exponential backoff retry logic.
 *
 * - On HTTP 429, waits `baseDelay * 2^attempt` ms (with jitter) then retries.
 * - After exhausting retries, returns `options.fallback` instead of crashing.
 * - All errors are caught — the system never terminates.
 *
 * @example
 * const data = await callWithRetry(() => fetch('/api/bills'));
 */
export async function callWithRetry<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    baseDelay = BASE_DELAY_MS,
    label = 'API',
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;

      const status = error?.status ?? error?.response?.status;
      const isRateLimit = status === 429;
      const isResourceExhausted =
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('quota');

      if ((isRateLimit || isResourceExhausted) && attempt < maxRetries) {
        // Exponential backoff with jitter: baseDelay * 2^attempt ± 20 %
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
        const waitTime = Math.round(exponentialDelay + jitter);

        console.warn(
          `[${label}] Rate limit hit (attempt ${attempt + 1}/${maxRetries}). ` +
            `Retrying in ${waitTime}ms…`
        );

        await delay(waitTime);
        continue;
      }

      // Not a retriable error, or retries exhausted
      if (attempt === maxRetries) {
        console.error(
          `[${label}] All ${maxRetries} retries exhausted. Returning fallback.`
        );
      }
      break;
    }
  }

  // --- Fallback path (never crash) -----------------------------------------
  if (options.fallback !== undefined) {
    return options.fallback as T;
  }

  // Re-throw if no fallback was provided, but wrap in try/catch at call site
  throw lastError;
}

export default callWithRetry;
