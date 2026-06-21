// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Officer Accountability Panel (Admin)
// Shows officer leaderboard with metrics and accountability scores
// Follows existing admin design patterns exactly
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react'
import { Award, RefreshCw, User, TrendingUp, AlertTriangle, CheckCircle, ArrowUp, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface OfficerMetrics {
  officer_id: string
  officer_name: string
  officer_role: string
  department: string
  complaints_assigned: number
  complaints_resolved: number
  avg_resolution_hours: number
  sla_breaches: number
  escalations_received: number
  escalations_caused: number
  accountability_score: number
  last_computed_at: string
}

function getScoreColor(score: number): { bg: string; color: string; bar: string; label: string } {
  if (score >= 80) return { bg: '#dcfce7', color: '#166534', bar: '#22c55e', label: 'Excellent' }
  if (score >= 60) return { bg: '#fef9c3', color: '#854d0e', bar: '#eab308', label: 'Good'      }
  if (score >= 40) return { bg: '#fff7ed', color: '#9a3412', bar: '#f97316', label: 'Average'   }
  return                   { bg: '#fee2e2', color: '#991b1b', bar: '#ef4444', label: 'Poor'      }
}

function fmtHours(h: number): string {
  if (!h || h === 0) return '—'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d ${Math.round(h % 24)}h`
}

export default function OfficerAccountabilityPanel() {
  const { user } = useAuth()
  const [officers, setOfficers] = useState<OfficerMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'resolved' | 'breaches'>('score')

  const token = (user as any)?.token || localStorage.getItem('accessToken')
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/officer-accountability`, { headers })
      const json = await res.json()
      if (json.success) setOfficers(json.data || [])
    } catch { /* non-critical */ } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const sorted = [...officers].sort((a, b) => {
    if (sortBy === 'score')    return b.accountability_score - a.accountability_score
    if (sortBy === 'resolved') return b.complaints_resolved - a.complaints_resolved
    return b.sla_breaches - a.sla_breaches
  })

  const avgScore = officers.length ? Math.round(officers.reduce((s, o) => s + o.accountability_score, 0) / officers.length) : 0
  const topPerformer = officers.reduce((best, o) => (!best || o.accountability_score > best.accountability_score) ? o : best, null as OfficerMetrics | null)
  const worstBreaches = officers.reduce((w, o) => (!w || o.sla_breaches > w.sla_breaches) ? o : w, null as OfficerMetrics | null)

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={22} style={{ color: 'var(--primary)' }} />
          Officer Accountability
        </h1>
        <p>Officer performance metrics and accountability scores. Score range: 0 (poor) — 100 (excellent).</p>
      </div>

      {/* Summary Cards */}
      <div className="grid-3 mb-6">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: 'var(--primary)' }}><Shield size={20} /></div>
          <div>
            <div className="stat-value">{officers.length}</div>
            <div className="stat-label">Total Officers</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: getScoreColor(avgScore).bg, color: getScoreColor(avgScore).color }}><TrendingUp size={20} /></div>
          <div>
            <div className="stat-value" style={{ color: getScoreColor(avgScore).color }}>{avgScore}</div>
            <div className="stat-label">Avg Accountability Score</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}><Award size={20} /></div>
          <div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{topPerformer?.officer_name || '—'}</div>
            <div className="stat-label">Top Performer</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Sort by:</span>
            {[
              { key: 'score',    label: 'Score'     },
              { key: 'resolved', label: 'Resolved'  },
              { key: 'breaches', label: 'SLA Breach' },
            ].map(s => (
              <button
                key={s.key}
                className={`pill-tab${sortBy === s.key ? ' active' : ''}`}
                onClick={() => setSortBy(s.key as any)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Computing officer metrics…</div>
        ) : officers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <User size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No officer data yet. Officers appear after complaints are assigned.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Officer</th>
                <th>Department</th>
                <th>Assigned</th>
                <th>Resolved</th>
                <th>Avg Time</th>
                <th>SLA Breaches</th>
                <th>Escalations</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((officer, idx) => {
                const sc = getScoreColor(officer.accountability_score)
                const isExpanded = expanded === officer.officer_id
                const resolutionRate = officer.complaints_assigned
                  ? Math.round((officer.complaints_resolved / officer.complaints_assigned) * 100)
                  : 0

                return (
                  <React.Fragment key={officer.officer_id}>
                    <tr
                      onClick={() => setExpanded(isExpanded ? null : officer.officer_id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Rank */}
                      <td>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: idx === 0 ? '#fef9c3' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#fff7ed' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, fontSize: 13,
                          color: idx === 0 ? '#854d0e' : 'var(--text-muted)',
                        }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                        </div>
                      </td>

                      {/* Officer */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, var(--primary), #1a55e8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0
                          }}>
                            {(officer.officer_name || 'O').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{officer.officer_name || 'Unknown Officer'}</div>
                            <span className="badge badge-info" style={{ fontSize: 9, marginTop: 2 }}>{officer.officer_role}</span>
                          </div>
                        </div>
                      </td>

                      <td><span className="badge badge-dark">{officer.department || '—'}</span></td>
                      <td style={{ fontWeight: 700 }}>{officer.complaints_assigned}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--success)' }}>{officer.complaints_resolved}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{resolutionRate}% rate</div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtHours(officer.avg_resolution_hours)}</td>
                      <td>
                        <span className={`badge ${officer.sla_breaches > 0 ? 'badge-danger' : 'badge-success'}`}>
                          {officer.sla_breaches}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${officer.escalations_caused > 0 ? 'badge-warning' : 'badge-success'}`}>
                          {officer.escalations_caused}
                        </span>
                      </td>

                      {/* Score */}
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${officer.accountability_score}%`,
                                background: sc.bar,
                                borderRadius: 99,
                                transition: 'width 0.5s ease',
                              }} />
                            </div>
                          </div>
                          <span style={{
                            fontWeight: 900, fontSize: 14, color: sc.color,
                            background: sc.bg, padding: '2px 8px', borderRadius: 8, minWidth: 36, textAlign: 'center'
                          }}>
                            {Math.round(officer.accountability_score)}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: sc.color, fontWeight: 700, marginTop: 2 }}>{sc.label}</div>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr className="expand-row">
                        <td colSpan={9}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: '8px 0' }}>
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px' }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Score Breakdown</div>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <div>Base Score: <strong>100</strong></div>
                                <div style={{ color: '#dc2626' }}>SLA Breaches: <strong>−{officer.sla_breaches * 15}</strong></div>
                                <div style={{ color: '#dc2626' }}>Escalations: <strong>−{officer.escalations_caused * 10}</strong></div>
                                <div style={{ color: '#16a34a' }}>
                                  Resolution Bonus: <strong>+{officer.complaints_assigned ? Math.round((officer.complaints_resolved / officer.complaints_assigned) * 20) : 0}</strong>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6, color: sc.color }}>
                                  Final: {Math.round(officer.accountability_score)} / 100
                                </div>
                              </div>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px' }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Metrics</div>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <div>Assigned: <strong>{officer.complaints_assigned}</strong></div>
                                <div>Resolved: <strong style={{ color: 'var(--success)' }}>{officer.complaints_resolved}</strong></div>
                                <div>Resolution Rate: <strong>{resolutionRate}%</strong></div>
                                <div>Avg Time: <strong>{fmtHours(officer.avg_resolution_hours)}</strong></div>
                              </div>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px' }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Accountability</div>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <div>SLA Breaches: <strong style={{ color: officer.sla_breaches > 0 ? '#dc2626' : 'var(--success)' }}>{officer.sla_breaches}</strong></div>
                                <div>Escalations Received: <strong>{officer.escalations_received}</strong></div>
                                <div>Escalations Caused: <strong>{officer.escalations_caused}</strong></div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Last updated: {new Date(officer.last_computed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
