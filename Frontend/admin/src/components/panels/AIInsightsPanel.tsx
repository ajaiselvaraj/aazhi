import React, { useState, useEffect } from 'react'
import {
  Brain, Activity, Cpu, RefreshCw, Send, Zap,
  BarChart2, Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Sparkles, Search, Tag
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'

const AI_SERVICE_URL = 'http://127.0.0.1:5005'

/* ── Tiny inline bar chart ──────────────────────────────── */
function MiniBar({ data, colorMap }: { data: { label: string; value: number }[]; colorMap?: Record<string, string> }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const defaultColors = ['#2F6BFF', '#FFA940', '#2ECC71', '#FF4D4F', '#9b59b6', '#00b894', '#fdcb6e']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ width: 100, fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{d.label}</div>
          <div style={{ flex: 1, height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: colorMap?.[d.label] || defaultColors[i % defaultColors.length], borderRadius: 5, transition: 'width .6s ease' }} />
          </div>
          <div style={{ width: 32, textAlign: 'right', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.value}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Sentiment badge ────────────────────────────────────── */
function SentimentBadge({ sentiment }: { sentiment: string }) {
  const map: Record<string, { color: string; bg: string; icon: string }> = {
    frustrated: { color: '#FF4D4F', bg: '#fff1f0', icon: '😤' },
    angry: { color: '#FF4D4F', bg: '#fff1f0', icon: '😡' },
    concerned: { color: '#FFA940', bg: '#fff7e6', icon: '😟' },
    worried: { color: '#FFA940', bg: '#fff7e6', icon: '😰' },
    neutral: { color: '#2F6BFF', bg: '#f0f5ff', icon: '😐' },
    satisfied: { color: '#2ECC71', bg: '#eafaf1', icon: '😊' },
    hopeful: { color: '#2ECC71', bg: '#eafaf1', icon: '🙏' },
  }
  const s = map[sentiment?.toLowerCase()] || map.neutral
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', padding: '.25rem .6rem', borderRadius: 100, fontSize: '.78rem', fontWeight: 700, color: s.color, background: s.bg }}>
      {s.icon} {sentiment || 'Unknown'}
    </span>
  )
}

export default function AIInsightsPanel() {
  const { t } = useLanguage()

  /* ── Health state ─────────────────────────────────────── */
  const [health, setHealth] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  /* ── Analytics state ──────────────────────────────────── */
  const [analytics, setAnalytics] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  /* ── ML Playground state ──────────────────────────────── */
  const [playgroundText, setPlaygroundText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [playgroundError, setPlaygroundError] = useState<string | null>(null)

  /* ── Fetch health ─────────────────────────────────────── */
  useEffect(() => {
    checkHealth()
    const iv = setInterval(checkHealth, 30000)
    return () => clearInterval(iv)
  }, [])

  async function checkHealth() {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/health`)
      const data = await res.json()
      setHealth(data)
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }

  /* ── Fetch analytics ──────────────────────────────────── */
  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    setAnalyticsLoading(true)
    try {
      const data = await adminApi.getComplaintAnalytics()
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to load complaint analytics', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  /* ── ML Playground ────────────────────────────────────── */
  async function runFullAnalysis(text: string) {
    const headers = { 'Content-Type': 'application/json' }
    const body = JSON.stringify({ text })

    // Call all 3 real AI endpoints in parallel
    const [spamRes, deptRes, sentRes] = await Promise.all([
      fetch(`${AI_SERVICE_URL}/api/ai/validate-complaint`, { method: 'POST', headers, body }),
      fetch(`${AI_SERVICE_URL}/api/ai/classify-complaint`, { method: 'POST', headers, body }),
      fetch(`${AI_SERVICE_URL}/api/ai/analyze-sentiment`, { method: 'POST', headers, body }),
    ])

    const [spamJson, deptJson, sentJson] = await Promise.all([
      spamRes.json(), deptRes.json(), sentRes.json(),
    ])

    return {
      validation: spamJson.success ? spamJson.data : null,
      department: deptJson.success ? deptJson.data : null,
      sentiment: sentJson.success ? sentJson.data : null,
      duplicate: { is_duplicate: false, similarity: 0, reason: 'No previous complaints compared.' },
    }
  }

  async function analyzeText() {
    if (!playgroundText.trim()) return
    setAnalyzing(true)
    setPlaygroundError(null)
    setResult(null)

    try {
      const data = await runFullAnalysis(playgroundText.trim())
      setResult(data)
    } catch (err: any) {
      setPlaygroundError(`AI Service unavailable: ${err.message}. Make sure the service is running on port 5005.`)
    } finally {
      setAnalyzing(false)
    }
  }

  async function analyzeRandomComplaint() {
    try {
      setAnalyzing(true)
      setPlaygroundError(null)
      setResult(null)
      const complaints = await adminApi.getAllComplaints({ limit: 20 })
      const list = complaints.data || []
      if (list.length === 0) {
        setPlaygroundError('No complaints in database to analyze.')
        setAnalyzing(false)
        return
      }
      const random = list[Math.floor(Math.random() * list.length)]
      const text = `${random.subject || ''} ${random.description || ''}`.trim()
      setPlaygroundText(text)

      const data = await runFullAnalysis(text)
      setResult(data)
    } catch (err: any) {
      setPlaygroundError(`Failed: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const isOnline = health?.status === 'healthy'
  const modelLoaded = health?.model_loaded === true

  return (
    <div className="section-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ═══ SECTION 1: AI Engine Health Banner ═══════════════════ */}
      <div style={{
        background: isOnline
          ? 'linear-gradient(135deg, #0a1628 0%, #162240 100%)'
          : 'linear-gradient(135deg, #2d1515 0%, #3d1c1c 100%)',
        borderRadius: 16, padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
        border: `1px solid ${isOnline ? 'rgba(47,107,255,.2)' : 'rgba(255,77,79,.2)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: isOnline
              ? 'linear-gradient(135deg, #2F6BFF, #1a55e8)'
              : 'linear-gradient(135deg, #FF4D4F, #c0392b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: isOnline ? '0 4px 20px rgba(47,107,255,.4)' : '0 4px 20px rgba(255,77,79,.4)',
          }}>
            <Brain size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              {isOnline ? 'AAZHI AI Engine — Online' : 'AI Engine — Offline'}
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.15rem' }}>
              {isOnline
                ? `Spam Filter: ${modelLoaded ? '✅ ML Model' : '⚠️ Rules Only'} · Dept Router · Sentiment · Duplicate Detection`
                : 'Start the AI service: cd ai-service && python main.py'}
            </div>
          </div>
        </div>
        {isOnline && health && (
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[
              { label: 'Status', val: 'Healthy', color: '#2ECC71' },
              { label: 'Spam Filter', val: modelLoaded ? 'ML Active' : 'Rules', color: modelLoaded ? '#2ECC71' : '#FFA940' },
              { label: 'Service', val: health.service || 'aazhi-ai', color: '#2F6BFF' },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: m.color }}>{m.val}</div>
                <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
        <span className="live-dot">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* ═══ SECTION 2: ML Playground ════════════════════════════ */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            <div className="icon-dot" style={{ background: 'linear-gradient(135deg, #2F6BFF, #9b59b6)' }} />
            🧪 {t('ai_insights.playground') || 'Live ML Playground'} — Demonstrate AI in Action
          </div>
          <span className="badge badge-info"><Sparkles size={10} /> Real-time Analysis</span>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Input Area */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <textarea
              value={playgroundText}
              onChange={e => setPlaygroundText(e.target.value)}
              placeholder="Type or paste a citizen complaint here to see the AI analyze it in real-time...&#10;&#10;Example: 'The water supply in Ward 7 has been disrupted for 3 days. My family is suffering and nobody from the department is responding to our calls.'"
              style={{
                flex: 1, minHeight: 100, padding: '1rem', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-primary)', fontSize: '.9rem', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem' }}>
            <button
              onClick={analyzeText}
              disabled={analyzing || !playgroundText.trim()}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.6rem 1.25rem' }}
            >
              {analyzing ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              {analyzing ? 'Analyzing...' : 'Analyze with AI'}
            </button>
            <button
              onClick={analyzeRandomComplaint}
              disabled={analyzing}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.6rem 1.25rem' }}
            >
              <Search size={16} />
              Analyze Random Complaint from DB
            </button>
          </div>

          {/* Error */}
          {playgroundError && (
            <div style={{ padding: '1rem', background: '#fff1f0', border: '1px solid #FF4D4F', borderRadius: 12, marginBottom: '1rem', color: '#c0392b', fontSize: '.85rem' }}>
              <strong>⚠️ Error:</strong> {playgroundError}
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

              {/* Spam Detection */}
              <div style={{
                padding: '1.25rem', borderRadius: 14,
                background: result.validation?.is_spam ? '#fff1f0' : '#eafaf1',
                border: `1px solid ${result.validation?.is_spam ? '#FF4D4F' : '#2ECC71'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                  {result.validation?.is_spam ? <XCircle size={20} color="#FF4D4F" /> : <CheckCircle size={20} color="#2ECC71" />}
                  <span style={{ fontWeight: 800, fontSize: '.95rem', color: result.validation?.is_spam ? '#c0392b' : '#27ae60' }}>
                    {result.validation?.is_spam ? '🚫 SPAM DETECTED' : '✅ LEGITIMATE COMPLAINT'}
                  </span>
                </div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div><strong>Classification:</strong> {result.validation?.classification || 'N/A'}</div>
                  <div><strong>Confidence:</strong> {result.validation?.confidence != null ? `${Math.round(result.validation.confidence * 100)}%` : 'N/A'}</div>
                  <div style={{ marginTop: '.4rem', fontSize: '.78rem', color: 'var(--text-muted)' }}>{result.validation?.reason}</div>
                </div>
              </div>

              {/* Department Routing */}
              {result.department && (
                <div style={{ padding: '1.25rem', borderRadius: 14, background: '#f0f5ff', border: '1px solid #2F6BFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                    <Cpu size={20} color="#2F6BFF" />
                    <span style={{ fontWeight: 800, fontSize: '.95rem', color: '#1a55e8' }}>
                      🏢 DEPARTMENT: {result.department.department?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div><strong>Priority:</strong> <span style={{ fontWeight: 700, color: result.department.priority === 'Critical' ? '#FF4D4F' : result.department.priority === 'High' ? '#FFA940' : '#2F6BFF' }}>{result.department.priority || 'N/A'}</span></div>
                    <div><strong>Confidence:</strong> {result.department.confidence || 0}%</div>
                    {result.department.keywords_matched?.length > 0 && (
                      <div style={{ marginTop: '.4rem' }}>
                        <strong>Keywords:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.25rem' }}>
                          {result.department.keywords_matched.map((kw: string) => (
                            <span key={kw} style={{ fontSize: '.68rem', padding: '.15rem .4rem', borderRadius: 4, background: 'rgba(47,107,255,.1)', color: '#2F6BFF', fontWeight: 600 }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.department.all_departments_detected?.length > 1 && (
                      <div style={{ marginTop: '.5rem' }}>
                        <strong style={{ fontSize: '.72rem' }}>Also Detected:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.3rem' }}>
                          {result.department.all_departments_detected.map((dept: string) => (
                            <span key={dept} style={{ fontSize: '.68rem', padding: '.15rem .4rem', borderRadius: 4, background: 'rgba(47,107,255,.1)', color: '#2F6BFF', fontWeight: 600 }}>
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sentiment Analysis */}
              {result.sentiment && (
                <div style={{ padding: '1.25rem', borderRadius: 14, background: '#fff7e6', border: '1px solid #FFA940' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                    <Activity size={20} color="#FFA940" />
                    <span style={{ fontWeight: 800, fontSize: '.95rem', color: '#b36300' }}>
                      🎭 SENTIMENT ANALYSIS
                    </span>
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                      <strong>Sentiment:</strong> <SentimentBadge sentiment={result.sentiment.sentiment} />
                    </div>
                    <div><strong>Urgency:</strong>
                      <span style={{ marginLeft: '.3rem' }}>
                        {'🔴'.repeat(Math.min(result.sentiment.urgency || 0, 5))}
                        {'⚪'.repeat(5 - Math.min(result.sentiment.urgency || 0, 5))}
                        <strong style={{ marginLeft: '.3rem' }}>{result.sentiment.urgency}/5</strong>
                      </span>
                    </div>
                    {result.sentiment.tone_indicators?.length > 0 && (
                      <div style={{ marginTop: '.4rem' }}>
                        <strong>Tone:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.25rem' }}>
                          {result.sentiment.tone_indicators.map((tone: string) => (
                            <span key={tone} style={{ fontSize: '.7rem', padding: '.15rem .5rem', borderRadius: 100, background: 'rgba(255,169,64,.15)', color: '#b36300', fontWeight: 600 }}>
                              {tone}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.sentiment.key_phrases?.length > 0 && (
                      <div style={{ marginTop: '.4rem' }}>
                        <strong>Key Phrases:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.25rem' }}>
                          {result.sentiment.key_phrases.map((phrase: string) => (
                            <span key={phrase} style={{ fontSize: '.7rem', padding: '.15rem .5rem', borderRadius: 100, background: 'rgba(47,107,255,.1)', color: '#2F6BFF', fontWeight: 600 }}>
                              "{phrase}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duplicate Check */}
              {result.duplicate && (
                <div style={{ padding: '1.25rem', borderRadius: 14, background: result.duplicate.is_duplicate ? '#fff1f0' : '#f0f5ff', border: `1px solid ${result.duplicate.is_duplicate ? '#FF4D4F' : '#2F6BFF'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.75rem' }}>
                    <Shield size={20} color={result.duplicate.is_duplicate ? '#FF4D4F' : '#2F6BFF'} />
                    <span style={{ fontWeight: 800, fontSize: '.95rem', color: result.duplicate.is_duplicate ? '#c0392b' : '#1a55e8' }}>
                      {result.duplicate.is_duplicate ? '⚠️ DUPLICATE FOUND' : '✅ NO DUPLICATE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)' }}>
                    <div><strong>Similarity:</strong> {Math.round((result.duplicate.similarity || 0) * 100)}%</div>
                    <div style={{ marginTop: '.3rem', fontSize: '.78rem', color: 'var(--text-muted)' }}>{result.duplicate.reason}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 3: Real Analytics Charts ═══════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem' }}>

        {/* Department Distribution */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <BarChart2 size={18} color="#2F6BFF" />
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Complaints by Department</span>
          </div>
          {analyticsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : analytics?.departmentDistribution?.length > 0 ? (
            <MiniBar data={analytics.departmentDistribution.map((d: any) => ({ label: d.department || 'Unknown', value: d.count }))} />
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>No complaint data available</div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <AlertTriangle size={18} color="#FFA940" />
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Priority Breakdown</span>
          </div>
          {analyticsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : analytics?.priorityBreakdown?.length > 0 ? (
            <MiniBar
              data={analytics.priorityBreakdown.map((d: any) => ({ label: (d.priority || 'medium').charAt(0).toUpperCase() + (d.priority || 'medium').slice(1), value: d.count }))}
              colorMap={{ Critical: '#FF4D4F', High: '#FFA940', Medium: '#2F6BFF', Low: '#2ECC71' }}
            />
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>No priority data</div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={18} color="#2ECC71" />
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Complaint Statistics</span>
          </div>
          {analyticsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : analytics?.stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }}>
              {[
                { label: 'Total', value: analytics.stats.total, color: '#2F6BFF' },
                { label: 'Active', value: analytics.stats.active, color: '#FFA940' },
                { label: 'Resolved', value: analytics.stats.resolved, color: '#2ECC71' },
                { label: 'Rejected', value: analytics.stats.rejected, color: '#FF4D4F' },
                { label: 'Today', value: analytics.stats.today, color: '#9b59b6' },
                { label: 'This Week', value: analytics.stats.this_week, color: '#00b894' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '.5rem', background: 'var(--bg)', borderRadius: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>No data</div>
          )}
        </div>

        {/* Top Keywords */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <Tag size={18} color="#9b59b6" />
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Top Keywords from Complaints</span>
          </div>
          {analyticsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : analytics?.topKeywords?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
              {analytics.topKeywords.map((kw: any, i: number) => (
                <span key={kw.word} style={{
                  padding: '.3rem .65rem', borderRadius: 100,
                  fontSize: Math.max(0.7, Math.min(1, 0.7 + (analytics.topKeywords.length - i) * 0.02)) + 'rem',
                  fontWeight: 600,
                  background: i < 3 ? 'rgba(47,107,255,.1)' : i < 8 ? 'rgba(155,89,182,.08)' : 'var(--bg)',
                  color: i < 3 ? '#2F6BFF' : i < 8 ? '#9b59b6' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}>
                  {kw.word} <strong>({kw.count})</strong>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>No keywords extracted yet</div>
          )}
        </div>

        {/* Daily Trend */}
        <div className="card" style={{ padding: '1.25rem', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <Zap size={18} color="#2F6BFF" />
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>14-Day Complaint Trend</span>
          </div>
          {analyticsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          ) : analytics?.dailyTrend?.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.3rem', height: 120, padding: '.5rem 0' }}>
              {analytics.dailyTrend.map((d: any, i: number) => {
                const max = Math.max(...analytics.dailyTrend.map((x: any) => x.total), 1)
                const h = Math.max((d.total / max) * 100, 4)
                const rh = Math.max((d.resolved / max) * 100, 0)
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }}>
                    <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.total}</div>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '70%', height: h, background: 'linear-gradient(180deg, #2F6BFF, #6366f1)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                        {rh > 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: rh, background: '#2ECC71', borderRadius: '0 0 0 0', opacity: 0.7 }} />}
                      </div>
                    </div>
                    <div style={{ fontSize: '.55rem', color: 'var(--text-muted)', writingMode: 'horizontal-tb' }}>
                      {new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>No trend data yet</div>
          )}
          {analytics?.dailyTrend?.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '.5rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2F6BFF' }} /> Total
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2ECC71' }} /> Resolved
              </span>
            </div>
          )}
        </div>

        {/* Sentiment Distribution */}
        {analytics?.sentimentDistribution?.length > 0 && (
          <div className="card" style={{ padding: '1.25rem', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
              <Activity size={18} color="#FFA940" />
              <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Sentiment Distribution (from AI Analysis)</span>
            </div>
            <MiniBar
              data={analytics.sentimentDistribution.map((d: any) => ({ label: (d.sentiment || 'Unknown').charAt(0).toUpperCase() + (d.sentiment || 'Unknown').slice(1), value: d.count }))}
              colorMap={{ Frustrated: '#FF4D4F', Angry: '#FF4D4F', Concerned: '#FFA940', Worried: '#FFA940', Neutral: '#2F6BFF', Satisfied: '#2ECC71', Hopeful: '#2ECC71', Unknown: '#999' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
