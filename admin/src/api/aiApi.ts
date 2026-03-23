/**
 * AAZHI AI Service API Client
 * Shared fetch helpers for the FastAPI backend on port 5005
 */

const AI_BASE = 'http://localhost:5005'

/* ── Types ───────────────────────────────────────────────────── */

export interface ClassifyResult {
  department: string
  priority: string
  confidence: number
  keywords_matched: string[]
  all_departments_detected: string[]
}

export interface SentimentResult {
  sentiment: string
  urgency: number
  key_phrases: string[]
  tone_indicators: string[]
  caps_ratio: number
}

export interface HealthResult {
  status: string
  service: string
  model_loaded: boolean
}

interface APIResponse<T> {
  success: boolean
  message: string
  data: T
}

/* ── Helpers ─────────────────────────────────────────────────── */

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`AI API ${res.status}: ${res.statusText}`)
  const json: APIResponse<T> = await res.json()
  if (!json.success) throw new Error(json.message)
  return json.data
}

/* ── Public API ──────────────────────────────────────────────── */

/** Classify complaint → department + priority */
export async function classifyComplaint(text: string): Promise<ClassifyResult> {
  return post<ClassifyResult>('/api/ai/classify-complaint', { text })
}

/** Analyze sentiment → sentiment, urgency, key phrases */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  return post<SentimentResult>('/api/ai/analyze-sentiment', { text })
}

/** Full analysis: classify + sentiment in parallel */
export async function analyzeComplaint(text: string) {
  const [classification, sentiment] = await Promise.all([
    classifyComplaint(text),
    analyzeSentiment(text),
  ])
  return { ...classification, ...sentiment }
}

/** Health check */
export async function checkHealth(): Promise<HealthResult> {
  const res = await fetch(`${AI_BASE}/health`)
  if (!res.ok) throw new Error('AI service unreachable')
  return res.json()
}
