// ── Department Filter Utility ─────────────────────────────────────────
// Maps full department names (as stored in AuthUser.department) to the
// short keys used in mock data (dept / predictedDept fields).

export type DeptKey =
  | 'Electricity'
  | 'Water Supply'
  | 'Gas Distribution'
  | 'Municipal'

const DEPT_MAP: Record<string, DeptKey> = {
  'Electricity Department':  'Electricity',
  'Water Supply Department': 'Water Supply',
  'Gas Distribution':        'Gas Distribution',
  'Municipal Services':      'Municipal',
}

/**
 * Convert the full department name stored in the session to the short key
 * used in mock data records.
 */
export function deptKey(department: string): DeptKey {
  return DEPT_MAP[department] ?? (department as DeptKey)
}

/**
 * Return only the items whose `dept` field matches (partial, case-insensitive)
 * the logged-in admin's department key.
 */
export function filterByDept<T extends { dept: string }>(
  items: T[],
  department: string,
): T[] {
  const key = deptKey(department).toLowerCase()
  return items.filter(item => item.dept.toLowerCase().includes(key))
}
