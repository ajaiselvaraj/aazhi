/**
 * AAZHI AI Service API Client
 * Shared fetch helpers for the FastAPI backend on port 5005 / Render
 */

export function getAiBaseUrl(): string {
  const localOverride = localStorage.getItem('aazhi_ai_endpoint_override');
  if (localOverride) return localOverride;
  
  // Auto-detect localhost environment vs. production env vars
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5005';
  }
  
  return import.meta.env.VITE_AI_SERVICE_URL || import.meta.env.VITE_AI_API_URL || 'https://ai-service-aazhi.onrender.com';
}

/* ── Types ───────────────────────────────────────────────────── */

export interface ClassifyResult {
  department: string;
  priority: string;
  confidence: number;
  keywords_matched: string[];
  all_departments_detected: string[];
}

export interface SentimentResult {
  sentiment: string;
  urgency: number;
  key_phrases: string[];
  tone_indicators: string[];
  caps_ratio: number;
}

export interface HealthResult {
  status: string;
  service: string;
  model_loaded: boolean;
  models: {
    spam: boolean;
    router: boolean;
    sentiment: boolean;
    forecaster: boolean;
    fraud: boolean;
  };
}

export interface DiagnosticsResult {
  spam_model_loaded: boolean;
  router_model_loaded: boolean;
  sentiment_model_loaded: boolean;
  fraud_model_loaded: boolean;
  sla_model_loaded: boolean;
  resolution_time_model_loaded: boolean;
  volume_forecaster_loaded: boolean;
  system_memory_mb: number;
  inference_latency_avg_ms: number;
}

interface APIResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/* ── Helpers ─────────────────────────────────────────────────── */

async function post<T>(path: string, body: Record<string, any>): Promise<T> {
  const url = `${getAiBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI API ${res.status}: ${res.statusText}`);
  const json: APIResponse<T> = await res.json();
  // Legacy endpoints return success inside payload, newer direct ones return success too
  if (json.success === false) {
    throw new Error(json.message || 'API request failed');
  }
  return json.data || (json as any);
}

/* ── Public API ──────────────────────────────────────────────── */

/** Classify complaint → department + priority */
export async function classifyComplaint(text: string): Promise<ClassifyResult> {
  return post<ClassifyResult>('/predict/route', { text });
}

/** Analyze sentiment → sentiment, urgency, key phrases */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  return post<SentimentResult>('/predict/sentiment', { text });
}

/** Full analysis: classify + sentiment in parallel */
export async function analyzeComplaint(text: string) {
  const [classification, sentiment] = await Promise.all([
    classifyComplaint(text),
    analyzeSentiment(text),
  ]);
  return { ...classification, ...sentiment };
}

/** Duplicate detection cosine check */
export async function checkDuplicate(text: string, existingComplaints: any[], threshold = 0.45): Promise<any> {
  return post<any>('/predict/duplicate', {
    text,
    existing_complaints: existingComplaints,
    threshold
  });
}

/** SLA Breach Predictor */
export async function predictSla(department: string, priority: string, ward: string, description: string): Promise<any> {
  return post<any>('/predict/sla', {
    department,
    priority,
    ward,
    description
  });
}

/** Resolution Time Predictor */
export async function predictResolutionTime(department: string, priority: string, ward: string, description: string): Promise<any> {
  return post<any>('/predict/resolution-time', {
    department,
    priority,
    ward,
    description
  });
}

/** Ward hotspot forecasting */
export async function predictHotspot(complaints: any[]): Promise<any> {
  return post<any>('/predict/hotspot', { complaints });
}

/** Group clusters and summarize */
export async function summarizeClusters(complaints: any[], threshold = 0.40): Promise<any> {
  return post<any>('/api/ai/summarize-clusters', { complaints, threshold });
}

/** Daily volume forecast */
export async function getVolumeForecast(dailyCounts: any[], forecastDays = 7): Promise<any> {
  return post<any>('/api/ai/forecast', { daily_counts: dailyCounts, forecast_days: forecastDays });
}

/** Sentiment Pulse aggregates */
export async function getSentimentPulse(complaints: any[]): Promise<any> {
  return post<any>('/api/ai/sentiment-pulse', { complaints });
}

/** System diagnostic memory/latency logs */
export async function getDiagnostics(): Promise<DiagnosticsResult> {
  return post<DiagnosticsResult>('/api/ai/diagnostics', { run_full: true });
}

/** Generate a summary of multiple text blocks */
export async function generateSummary(texts: string[], maxSentences = 3): Promise<any> {
  return post<any>('/generate/summary', { texts, max_sentences: maxSentences });
}

/** Health check */
export async function checkHealth(): Promise<HealthResult> {
  const res = await fetch(`${getAiBaseUrl()}/health`);
  if (!res.ok) throw new Error('AI service unreachable');
  return res.json();
}
