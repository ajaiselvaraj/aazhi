import React, { useState } from 'react'
import { Search, ChevronDown, ChevronRight, Zap, AlertTriangle, Eye, BarChart2, Send } from 'lucide-react'
import { triageComplaints, TriageComplaint } from '../../data/mockData'
import { analyzeComplaint } from '../../api/aiApi'

/* ── Badge Helpers ────────────────────────────────────────────── */

function PriorityBadge({ p }: { p: TriageComplaint['priority'] }) {
  const map = { Critical: 'badge-danger', High: 'badge-warning', Medium: 'badge-info', Low: 'badge-success' }
  return <span className={`badge ${map[p]}`}>{p}</span>
}

function StatusBadge({ s }: { s: TriageComplaint['status'] }) {
  if (s === 'Review Needed') return <span className="badge badge-review">⚠ Review</span>
  const map = { Routed: 'badge-success', Pending: 'badge-warning', Resolved: 'badge-dark' }
  return <span className={`badge ${map[s as keyof typeof map] || 'badge-info'}`}>{s}</span>
}

const SENTIMENT_MAP: Record<string, { emoji: string; color: string; bg: string }> = {
  Angry:      { emoji: '😡', color: '#FF4D4F', bg: '#fff1f0' },
  Frustrated: { emoji: '😤', color: '#FFA940', bg: '#fff7e6' },
  Neutral:    { emoji: '😐', color: '#94a3b8', bg: '#f1f5f9' },
  Positive:   { emoji: '😊', color: '#2ECC71', bg: '#eafaf1' },
}

function SentimentBadge({ s }: { s: TriageComplaint['sentiment'] }) {
  const meta = SENTIMENT_MAP[s]
  return (
    <span className="sentiment-badge" style={{ color: meta.color, background: meta.bg }}>
      {meta.emoji} {s}
    </span>
  )
}

function UrgencyDots({ level }: { level: number }) {
  return (
    <span className="urgency-dots">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={`urgency-dot${n <= level ? ' active' : ''}`}
          style={{ background: n <= level ? (level >= 4 ? '#FF4D4F' : level >= 3 ? '#FFA940' : '#94a3b8') : 'var(--border)' }}
        />
      ))}
    </span>
  )
}

/* ── Stat Card ────────────────────────────────────────────────── */

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 170 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</div>
      </div>
    </div>
  )
}

/* ── Main Panel ───────────────────────────────────────────────── */

export default function TriagePanel() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterDept, setFilterDept] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)

  const filtered = triageComplaints.filter(c => {
    const matchesSearch = c.text.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus
    const matchesDept = filterDept === 'All' || c.predictedDept.includes(filterDept)
    return matchesSearch && matchesStatus && matchesDept
  })

  const criticalCount = triageComplaints.filter(c => c.priority === 'Critical').length
  const reviewCount = triageComplaints.filter(c => c.status === 'Review Needed').length
  const avgConfidence = Math.round(triageComplaints.reduce((s, c) => s + c.confidence, 0) / triageComplaints.length)

  const deptTabs = ['All', 'Electricity', 'Water Supply', 'Gas', 'Municipal']

  async function handleTestAI() {
    if (!testText.trim()) return
    setTestLoading(true)
    setTestResult(null)
    try {
      // Combined classify + sentiment call via aiApi
      const data = await analyzeComplaint(testText)
      setTestResult({ ...data, _live: true })
    } catch {
      // Offline fallback — heuristic mock
      const lower = testText.toLowerCase()
      let dept = 'Municipal Services'
      if (lower.includes('electric') || lower.includes('power') || lower.includes('light')) dept = 'Electricity Department'
      else if (lower.includes('water') || lower.includes('pipe') || lower.includes('tap')) dept = 'Water Supply Department'
      else if (lower.includes('gas') || lower.includes('leak')) dept = 'Gas Distribution'
      setTestResult({
        department: dept,
        priority: lower.includes('emergency') || lower.includes('danger') ? 'Critical' : 'Medium',
        confidence: 72 + Math.floor(Math.random() * 20),
        keywords_matched: lower.split(' ').filter((w: string) => w.length > 4).slice(0, 3),
        sentiment: 'Neutral',
        urgency: 2,
        key_phrases: [],
        _live: false,
      })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div>
      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard label="Total Complaints" value={triageComplaints.length} icon={<BarChart2 size={18} />} color="#2F6BFF" />
        <StatCard label="Critical Issues" value={criticalCount} icon={<AlertTriangle size={18} />} color="#FF4D4F" />
        <StatCard label="Need Review" value={reviewCount} icon={<Eye size={18} />} color="#FFA940" />
        <StatCard label="Avg Confidence" value={`${avgConfidence}%`} icon={<Zap size={18} />} color="#2ECC71" />
      </div>

      {/* ── Main Card ──────────────────────────────────────────── */}
      <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            <div className="icon-dot" />
            AI Request Categorization
          </div>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text" placeholder="Search complaints..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '.5rem', paddingBottom: '.5rem', fontSize: '.8rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', width: 200 }}
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '.5rem .75rem', fontSize: '.8rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}>
              <option>All</option><option>Routed</option><option>Pending</option><option>Review Needed</option><option>Resolved</option>
            </select>
            <span className="live-dot">Live</span>
          </div>
        </div>

        {/* Department pills */}
        <div className="pill-tabs">
          {deptTabs.map(d => (
            <button key={d} className={`pill-tab${filterDept === d ? ' active' : ''}`} onClick={() => setFilterDept(d)}>
              {d === 'All' ? '🏛 All Depts' : d}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>ID</th>
                <th>Complaint Text</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Sentiment</th>
                <th>Urgency</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <React.Fragment key={c.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                    <td style={{ textAlign: 'center' }}>
                      {expandedId === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '.8rem', color: 'var(--primary)' }}>{c.id}</span>
                    </td>
                    <td style={{ maxWidth: 240, wordBreak: 'break-word', fontSize: '.82rem' }}>{c.text}</td>
                    <td><span style={{ fontSize: '.82rem', fontWeight: 500 }}>{c.predictedDept}</span></td>
                    <td><PriorityBadge p={c.priority} /></td>
                    <td><SentimentBadge s={c.sentiment} /></td>
                    <td><UrgencyDots level={c.urgency} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <div style={{ width: 60, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${c.confidence}%`, height: '100%', borderRadius: 3,
                            background: c.confidence >= 80 ? 'var(--success)' : c.confidence >= 60 ? 'var(--warning)' : 'var(--alert)',
                            transition: 'width .6s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '.78rem', fontWeight: 600, color: c.confidence >= 80 ? 'var(--success)' : c.confidence >= 60 ? 'var(--warning)' : 'var(--alert)' }}>
                          {c.confidence}%
                        </span>
                      </div>
                    </td>
                    <td><StatusBadge s={c.status} /></td>
                  </tr>

                  {/* Expandable row detail */}
                  {expandedId === c.id && (
                    <tr className="expand-row">
                      <td colSpan={9}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', padding: '.5rem 0' }}>
                          <div>
                            <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Key Phrases</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                              {c.keyPhrases.map(kp => <span key={kp} className="keyword-tag">{kp}</span>)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>AI Reasoning</div>
                            <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {c.aiClassified
                                ? `Classified to ${c.predictedDept} with ${c.confidence}% confidence based on keyword matching: "${c.keyPhrases.join('", "')}". Sentiment detected as ${c.sentiment.toLowerCase()} with urgency level ${c.urgency}/5.`
                                : 'Low confidence — multiple departments matched. Manual review recommended.'}
                            </p>
                          </div>
                          <div>
                            <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>Suggested Actions</div>
                            <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                              {c.priority === 'Critical' && <div>🚨 Immediate dispatch to field team</div>}
                              {c.urgency >= 4 && <div>⏱ Escalate — high urgency detected</div>}
                              {c.confidence < 70 && <div>👁 Needs manual department verification</div>}
                              {c.sentiment === 'Angry' && <div>💢 Prioritize — citizen frustration high</div>}
                              {c.confidence >= 80 && c.priority !== 'Critical' && <div>✅ Auto-route approved</div>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '.875rem' }}>
              No complaints match your filters.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '.75rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>
          <span>Showing {filtered.length} of {triageComplaints.length} complaints</span>
          <span style={{ color: 'var(--alert)', fontWeight: 600 }}>
            ⚠ {reviewCount} need manual review
          </span>
        </div>
      </div>

      {/* ── Test AI Classification ─────────────────────────────── */}
      <div className="card ai-test-section" style={{ marginTop: '1.5rem' }}>
        <div className="section-title" style={{ marginBottom: '.75rem' }}>
          <div className="icon-dot" style={{ background: 'var(--primary)' }} />
          Test AI Classification
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Enter a complaint text below to see how the AI engine classifies it in real-time.
        </p>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            placeholder="e.g. There has been no water supply for 3 days in our colony..."
            rows={2}
            style={{ flex: 1, padding: '.75rem 1rem', fontSize: '.82rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
          <button
            onClick={handleTestAI}
            disabled={testLoading || !testText.trim()}
            style={{
              padding: '.75rem 1.5rem', background: testLoading ? 'var(--border)' : 'var(--primary)',
              color: '#fff', border: 'none', borderRadius: 8, cursor: testLoading ? 'wait' : 'pointer',
              fontWeight: 600, fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: '.4rem', flexShrink: 0,
            }}
          >
            <Send size={14} />
            {testLoading ? 'Classifying...' : 'Classify'}
          </button>
        </div>

        {/* Result */}
        {testResult && (
          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
            {/* Live / Offline indicator */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.5rem' }}>
              <span style={{
                fontSize: '.65rem', fontWeight: 600, padding: '.15rem .5rem', borderRadius: 6,
                background: testResult._live ? '#2ECC7120' : '#FF4D4F20',
                color: testResult._live ? '#2ECC71' : '#FF4D4F',
              }}>
                {testResult._live ? '● Live API' : '○ Offline Mock'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Department</div>
                <div style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: '.25rem' }}>{testResult.department}</div>
              </div>
              <div>
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Priority</div>
                <div style={{ marginTop: '.25rem' }}><PriorityBadge p={testResult.priority} /></div>
              </div>
              <div>
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Confidence</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.25rem' }}>
                  <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${testResult.confidence}%`, height: '100%', borderRadius: 3,
                      background: testResult.confidence >= 80 ? 'var(--success)' : testResult.confidence >= 60 ? 'var(--warning)' : 'var(--alert)',
                      transition: 'width .8s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '.82rem', fontWeight: 700, color: testResult.confidence >= 80 ? 'var(--success)' : testResult.confidence >= 60 ? 'var(--warning)' : 'var(--alert)' }}>
                    {testResult.confidence}%
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Sentiment</div>
                <div style={{ marginTop: '.25rem' }}>
                  {testResult.sentiment && <SentimentBadge s={testResult.sentiment} />}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Urgency</div>
                <div style={{ marginTop: '.25rem' }}>
                  {testResult.urgency != null && <UrgencyDots level={testResult.urgency} />}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Keywords</div>
                <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', marginTop: '.35rem' }}>
                  {(testResult.keywords_matched || testResult.key_phrases || []).map((k: string) => <span key={k} className="keyword-tag">{k}</span>)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
