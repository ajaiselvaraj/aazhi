/**
 * SUVIDHA — Civic Alert Service for User Kiosk (ADD-ON)
 *
 * Fetches admin-published alerts from the backend.
 * Falls back to cached localStorage alerts if API fails.
 * Polls every 30 seconds automatically.
 *
 * SAFETY: This module does NOT import anything from existing services.
 * It is purely additive. The existing AlertsPanel still works if this
 * module is never called — the caller decides.
 */

import { CityAlert } from '../types'

// ── Config ────────────────────────────────────────────────────────────────────

const CACHE_KEY       = 'suvidha_civic_alerts_cache'
const POLL_INTERVAL   = 30_000 // 30 seconds

const getApiBase = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!envUrl && isLocal) return 'http://localhost:8000/api'
  }
  return envUrl || 'https://aazhi-9gj2.onrender.com/api'
}

// ── Type mapping ──────────────────────────────────────────────────────────────
// Backend returns {id, title, message, type, severity, ward}
// Frontend CityAlert expects {id, type, severity, message, ward}
// 'type' maps directly; severity: Critical|Warning|Info maps directly.

function mapBackendAlert(raw: any): CityAlert {
  return {
    id:       String(raw.id),
    type:     (['Power','Water','Road','Weather','Civic'].includes(raw.type) ? raw.type : 'Civic') as CityAlert['type'],
    severity: (['Critical','Warning','Info'].includes(raw.severity) ? raw.severity : 'Info') as CityAlert['severity'],
    message:  raw.message || raw.title || 'Civic update',
    ward:     raw.ward    || 'Global',
  }
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function saveCacheAlerts(alerts: CityAlert[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), alerts }))
  } catch {
    /* storage quota — silently ignore */
  }
}

function loadCacheAlerts(): CityAlert[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { alerts } = JSON.parse(raw)
    return Array.isArray(alerts) ? alerts : null
  } catch {
    return null
  }
}

// ── Fetch from backend ────────────────────────────────────────────────────────

async function fetchActiveAlerts(): Promise<CityAlert[]> {
  const base = getApiBase()
  const url  = `${base}/alerts/active?_t=${Date.now()}`
  const res  = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`[civicAlertService] HTTP ${res.status}`)
  const json = await res.json()
  // Response shape: { success: true, data: [...] }
  const raw: any[] = json?.data ?? []
  return raw.map(mapBackendAlert)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch active alerts with localStorage fallback.
 * Never throws — always returns an array (possibly empty).
 */
export async function getActiveAlertsSafe(fallback: CityAlert[] = []): Promise<CityAlert[]> {
  try {
    const alerts = await fetchActiveAlerts()
    if (alerts.length > 0) {
      saveCacheAlerts(alerts)
      return alerts
    }
    // API returned empty — check cache before returning empty
    const cached = loadCacheAlerts()
    return cached && cached.length > 0 ? cached : fallback
  } catch (err) {
    console.warn('[civicAlertService] API unavailable, using cache/fallback:', (err as Error).message)
    const cached = loadCacheAlerts()
    return cached && cached.length > 0 ? cached : fallback
  }
}

// ── Polling manager ───────────────────────────────────────────────────────────

type AlertsListener = (alerts: CityAlert[]) => void

let pollTimer: ReturnType<typeof setInterval> | null = null
let listeners: AlertsListener[] = []
let lastAlerts: CityAlert[] = []

async function runPoll(fallback: CityAlert[]) {
  const alerts = await getActiveAlertsSafe(fallback)
  lastAlerts = alerts
  listeners.forEach(fn => {
    try { fn(alerts) } catch { /* listener error — isolate */ }
  })
}

/**
 * Start background polling. Returns a cleanup function.
 * Safe to call multiple times — won't create duplicate timers.
 */
export function startAlertPolling(
  onUpdate: AlertsListener,
  fallback: CityAlert[] = [],
): () => void {
  listeners.push(onUpdate)

  // Immediately fire with last known data (or fetch fresh)
  if (lastAlerts.length > 0) {
    onUpdate(lastAlerts)
  } else {
    runPoll(fallback)
  }

  if (!pollTimer) {
    pollTimer = setInterval(() => runPoll(fallback), POLL_INTERVAL)
  }

  // Cleanup function — call on component unmount
  return () => {
    listeners = listeners.filter(fn => fn !== onUpdate)
    if (listeners.length === 0 && pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }
}
