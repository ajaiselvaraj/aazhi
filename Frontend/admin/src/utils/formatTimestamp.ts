/**
 * formatTimestamp — UTC-aware timestamp formatter for AAZHI Admin Panel
 *
 * Root cause of wrong times:
 *   PostgreSQL TIMESTAMP (without time zone) columns are returned by the pg driver
 *   as strings like "2026-05-14 17:43:35.123456" — no T separator, no Z suffix.
 *   JavaScript's new Date() treats strings without timezone info as LOCAL time on
 *   some browsers, causing a 5.5-hour offset for IST (UTC+05:30) users.
 *
 * Fix:
 *   Normalise every raw timestamp string to a fully-qualified UTC ISO string
 *   ("2026-05-14T17:43:35.123456Z") before passing it to new Date().
 *   This ensures correct local-time display regardless of server/client timezone.
 */
export function formatTimestamp(val: any): string {
  if (!val) return 'Date unavailable';

  const raw = String(val);

  // Step 1: Replace space separator with T (ISO 8601 canonical form)
  const withT = raw.includes('T') ? raw : raw.replace(' ', 'T');

  // Step 2: Append Z if no timezone indicator is present after the date part
  //         Detects: +05:30  -07:00  Z  (all count as timezone-aware)
  const utcStr = /[+\-Z]/i.test(withT.slice(10)) ? withT : withT + 'Z';

  const d = new Date(utcStr);
  if (isNaN(d.getTime())) return 'Date unavailable';

  // Format: "14 May 2026, 10:43 PM"
  return d
    .toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(/am|pm/i, (m) => m.toUpperCase());
}
