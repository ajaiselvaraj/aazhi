// ═══════════════════════════════════════════════════════════════
// SUVIDHA KIOSK — Account Lockout Middleware
// Tracks failed login attempts and temporarily locks accounts
// ═══════════════════════════════════════════════════════════════

const failedAttempts = new Map(); // In-memory store: { email -> { count, lockedUntil } }

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Records a failed login attempt for a given identifier (email/userId).
 * Locks the account after MAX_ATTEMPTS failures.
 */
export function recordFailedAttempt(identifier) {
  const now = Date.now();
  const record = failedAttempts.get(identifier) || { count: 0, lockedUntil: null };

  // Reset if previous lockout has expired
  if (record.lockedUntil && now > record.lockedUntil) {
    record.count = 0;
    record.lockedUntil = null;
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  failedAttempts.set(identifier, record);
}

/**
 * Resets failed attempt count on successful login.
 */
export function resetFailedAttempts(identifier) {
  failedAttempts.delete(identifier);
}

/**
 * Checks if an account is currently locked.
 * Returns { locked: boolean, remainingMs: number }
 */
export function isAccountLocked(identifier) {
  const record = failedAttempts.get(identifier);
  if (!record || !record.lockedUntil) return { locked: false, remainingMs: 0 };

  const now = Date.now();
  if (now < record.lockedUntil) {
    return { locked: true, remainingMs: record.lockedUntil - now };
  }

  // Lockout expired — clean up
  failedAttempts.delete(identifier);
  return { locked: false, remainingMs: 0 };
}

/**
 * Express middleware — checks account lockout status before processing login.
 * Expects req.body.email or req.body.identifier to be present.
 */
export function accountLockout(req, res, next) {
  const identifier = req.body?.email || req.body?.identifier || req.ip;

  const { locked, remainingMs } = isAccountLocked(identifier);

  if (locked) {
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return res.status(429).json({
      success: false,
      message: `Account temporarily locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`,
      data: { lockedUntilMinutes: remainingMinutes },
    });
  }

  next();
}

export default accountLockout;
