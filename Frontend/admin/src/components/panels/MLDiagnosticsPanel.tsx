import React, { useState, useEffect } from 'react'
import {
  Stethoscope, RefreshCw, CheckCircle, XCircle, Cpu, Activity,
  Shield, Clock, Play, AlertTriangle, Sparkles, Zap
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'

const AI_SERVICE_URL = 'https://aazhi-ai-service.onrender.com'

interface TestResult {
  test_id: number
  description: string
  input_preview: string
  spam_detection: { expected: boolean; actual: boolean; correct: boolean; confidence: number; classification: string }
  department_routing: { expected: string | null; actual: string; correct: boolean | null; confidence: number }
  sentiment_analysis: { expected: string; actual: string; correct: boolean; urgency: number }
  response_time_ms: number
  all_passed: boolean
}

interface DiagData {
  summary: { total_tests: number; passed: number; failed: number; accuracy_pct: number; all_green: boolean }
  model_status: Record<string, { loaded: boolean; type: string }>
  test_results: TestResult[]
  total_processing_time_ms: number
}

export default function MLDiagnosticsPanel() {
  const [health, setHealth] = useState<any>(null)
  const [diagData, setDiagData] = useState<DiagData | null>(null)
  const [loading, setLoading] = useState(false)
  const [healthLoading, setHealthLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { checkHealth() }, [])

  async function checkHealth() {
    setHealthLoading(true)
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

  async function runDiagnostics() {
    setLoading(true)
    setError(null)
    try {
      // Try backend proxy first, fall back to direct
      let result
      try {
        result = await adminApi.getMLDiagnostics()
      } catch {
        const res = await fetch(`${AI_SERVICE_URL}/api/ai/diagnostics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_full: true }),
        })
        const json = await res.json()
        result = json.data
      }
      setDiagData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to run diagnostics')
    } finally {
      setLoading(false)
    }
  }

  const isOnline = health?.status === 'healthy'
  const modelLoaded = health?.model_loaded === true

  return (
    <div className="section-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ═══ Health Banner ═══ */}
      <div style={{
        background: isOnline
          ? 'linear-gradient(135deg, #0a2618 0%, #0f3d2a 50%, #162a40 100%)'
          : 'linear-gradient(135deg, #2d1515 0%, #3d1c1c 100%)',
        borderRadius: 16, padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
        border: `1px solid ${isOnline ? 'rgba(46,204,113,.2)' : 'rgba(255,77,79,.2)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: isOnline
              ? 'linear-gradient(135deg, #2ECC71, #27ae60)'
              : 'linear-gradient(135deg, #FF4D4F, #c0392b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isOnline ? '0 4px 20px rgba(46,204,113,.4)' : '0 4px 20px rgba(255,77,79,.4)',
          }}>
            <Stethoscope size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              🩺 ML Health Monitor & Live Diagnostics
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.15rem' }}>
              {isOnline
                ? `AI Engine Online • BERT Spam Filter: ${modelLoaded ? '✅ Loaded' : '⚠️ Fallback'} • Run diagnostics to verify ML pipeline`
                : 'AI Service is OFFLINE — Start it to run diagnostics'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button onClick={checkHealth} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.15)', color: '#fff', padding: '.5rem .8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={runDiagnostics}
            disabled={loading || !isOnline}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.55rem 1.25rem' }}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? 'Running Tests...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* ═══ Model Status Cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {(diagData?.model_status ? Object.entries(diagData.model_status) : [
          ['spam_classifier', { loaded: modelLoaded, type: modelLoaded ? 'BERT-tiny spam filter' : 'Checking...' }],
          ['department_router', { loaded: isOnline, type: 'Keyword-based NLP' }],
          ['sentiment_analyzer', { loaded: isOnline, type: 'Rule-based + urgency' }],
          ['duplicate_detector', { loaded: isOnline, type: 'SequenceMatcher' }],
        ] as [string, any][]).map(([name, info]) => (
          <div key={name} className="card" style={{
            padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
            border: `1px solid ${info.loaded ? 'rgba(46,204,113,.2)' : 'rgba(255,77,79,.2)'}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: info.loaded ? 'rgba(46,204,113,.1)' : 'rgba(255,77,79,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {info.loaded ? <CheckCircle size={20} color="#2ECC71" /> : <XCircle size={20} color="#FF4D4F" />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {name.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{info.type}</div>
              <div style={{
                fontSize: '.65rem', fontWeight: 700, marginTop: '.2rem',
                color: info.loaded ? '#2ECC71' : '#FF4D4F',
              }}>
                {info.loaded ? '● ONLINE' : '● OFFLINE'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Error ═══ */}
      {error && (
        <div style={{ padding: '1rem', background: '#fff1f0', border: '1px solid #FF4D4F', borderRadius: 12, color: '#c0392b', fontSize: '.85rem' }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* ═══ Diagnostic Results ═══ */}
      {diagData && (
        <>
          {/* Summary Banner */}
          <div className="card" style={{
            padding: '1.5rem', textAlign: 'center',
            background: diagData.summary.all_green
              ? 'linear-gradient(135deg, #eafaf1, #d5f5e3)'
              : 'linear-gradient(135deg, #fff1f0, #fde8e8)',
            border: `1px solid ${diagData.summary.all_green ? '#2ECC71' : '#FF4D4F'}`,
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>
              {diagData.summary.all_green ? '✅' : '⚠️'}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: diagData.summary.all_green ? '#27ae60' : '#c0392b' }}>
              {diagData.summary.all_green ? 'ALL TESTS PASSED' : `${diagData.summary.failed} TEST(S) FAILED`}
            </div>
            <div style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginTop: '.3rem' }}>
              {diagData.summary.passed}/{diagData.summary.total_tests} passed • Accuracy: {diagData.summary.accuracy_pct}% • Total time: {diagData.total_processing_time_ms}ms
            </div>
          </div>

          {/* Test Result Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {diagData.test_results.map(test => (
              <div key={test.test_id} className="card" style={{
                padding: '1.25rem', overflow: 'hidden',
                borderLeft: `4px solid ${test.all_passed ? '#2ECC71' : '#FF4D4F'}`,
              }}>
                {/* Test Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {test.all_passed ? <CheckCircle size={18} color="#2ECC71" /> : <XCircle size={18} color="#FF4D4F" />}
                    <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Test #{test.test_id}: {test.description}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '.2rem' }}>
                      <Clock size={10} /> {test.response_time_ms}ms
                    </span>
                    <span style={{
                      padding: '.15rem .5rem', borderRadius: 100, fontSize: '.68rem', fontWeight: 700,
                      background: test.all_passed ? '#eafaf1' : '#fff1f0',
                      color: test.all_passed ? '#27ae60' : '#c0392b',
                    }}>
                      {test.all_passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>

                {/* Input preview */}
                <div style={{
                  marginBottom: '1rem', padding: '.6rem .8rem', borderRadius: 8,
                  background: 'var(--bg)', fontSize: '.78rem', color: 'var(--text-secondary)',
                  fontStyle: 'italic', lineHeight: 1.4,
                }}>
                  "{test.input_preview}"
                </div>

                {/* Results Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.75rem' }}>
                  {/* Spam Detection */}
                  <div style={{ padding: '.75rem', borderRadius: 10, background: test.spam_detection.correct ? '#eafaf122' : '#fff1f022', border: `1px solid ${test.spam_detection.correct ? 'rgba(46,204,113,.2)' : 'rgba(255,77,79,.2)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.4rem' }}>
                      <Shield size={12} color="#9b59b6" />
                      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>SPAM DETECTION</span>
                      {test.spam_detection.correct ? <CheckCircle size={12} color="#2ECC71" /> : <XCircle size={12} color="#FF4D4F" />}
                    </div>
                    <div style={{ fontSize: '.75rem' }}>
                      <div>Expected: <strong>{test.spam_detection.expected ? '🚫 Spam' : '✅ Legit'}</strong></div>
                      <div>Actual: <strong style={{ color: test.spam_detection.correct ? '#2ECC71' : '#FF4D4F' }}>{test.spam_detection.actual ? '🚫 Spam' : '✅ Legit'}</strong></div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '.2rem' }}>Confidence: {Math.round(test.spam_detection.confidence * 100)}%</div>
                    </div>
                  </div>

                  {/* Department Routing */}
                  <div style={{ padding: '.75rem', borderRadius: 10, background: test.department_routing.correct !== false ? '#eafaf122' : '#fff1f022', border: `1px solid ${test.department_routing.correct !== false ? 'rgba(46,204,113,.2)' : 'rgba(255,77,79,.2)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.4rem' }}>
                      <Cpu size={12} color="#2F6BFF" />
                      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>ROUTING</span>
                      {test.department_routing.correct === null ? <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>N/A</span>
                        : test.department_routing.correct ? <CheckCircle size={12} color="#2ECC71" /> : <XCircle size={12} color="#FF4D4F" />}
                    </div>
                    <div style={{ fontSize: '.75rem' }}>
                      <div>Expected: <strong>{test.department_routing.expected || 'N/A'}</strong></div>
                      <div>Actual: <strong style={{ color: test.department_routing.correct !== false ? '#2ECC71' : '#FF4D4F' }}>{test.department_routing.actual}</strong></div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '.2rem' }}>Confidence: {test.department_routing.confidence}%</div>
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div style={{ padding: '.75rem', borderRadius: 10, background: test.sentiment_analysis.correct ? '#eafaf122' : '#fff1f022', border: `1px solid ${test.sentiment_analysis.correct ? 'rgba(46,204,113,.2)' : 'rgba(255,77,79,.2)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.4rem' }}>
                      <Activity size={12} color="#FFA940" />
                      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>SENTIMENT</span>
                      {test.sentiment_analysis.correct ? <CheckCircle size={12} color="#2ECC71" /> : <XCircle size={12} color="#FF4D4F" />}
                    </div>
                    <div style={{ fontSize: '.75rem' }}>
                      <div>Expected: <strong>{test.sentiment_analysis.expected}</strong></div>
                      <div>Actual: <strong style={{ color: test.sentiment_analysis.correct ? '#2ECC71' : '#FF4D4F' }}>{test.sentiment_analysis.actual}</strong></div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '.2rem' }}>Urgency: {'🔴'.repeat(test.sentiment_analysis.urgency)}{'⚪'.repeat(5 - test.sentiment_analysis.urgency)} {test.sentiment_analysis.urgency}/5</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ Initial prompt if no diagnostics run ═══ */}
      {!diagData && !loading && !error && isOnline && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Sparkles size={40} style={{ color: '#2ECC71', margin: '0 auto 1rem', opacity: 0.6 }} />
          <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Ready to Test ML Pipeline</p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Click "Run Diagnostics" to execute 5 predefined test cases through the ML models and verify that spam detection, department routing, and sentiment analysis are all working correctly.
          </p>
          <button onClick={runDiagnostics} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
            <Play size={16} /> Run Diagnostics Now
          </button>
        </div>
      )}
    </div>
  )
}
