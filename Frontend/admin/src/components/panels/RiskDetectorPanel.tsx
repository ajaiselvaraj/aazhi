import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Clock, RefreshCw, Inbox } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'

interface RiskEvent {
  id: number
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  title: string
  description: string
  ward: string
  time: string
  resolved: boolean
}

const SEVERITY_CONFIG: Record<string, any> = {
  'Critical': { color: 'var(--alert)',   bg: '#fff1f0', lineColor: '#FF4D4F' },
  'High':     { color: 'var(--warning)', bg: '#fff7e6', lineColor: '#FFA940' },
  'Medium':   { color: 'var(--primary)', bg: '#f0f5ff', lineColor: '#2F6BFF' },
  'Low':      { color: 'var(--success)', bg: '#eafaf1', lineColor: '#2ECC71' },
}

function generateRiskEvents(analytics: any, complaints: any[]): RiskEvent[] {
  const events: RiskEvent[] = []
  let id = 1

  // Generate risk events from real complaints
  // 1. Critical/High priority unresolved complaints = active risks
  const highPriorityComplaints = complaints
    .filter((c: any) => (c.priority === 'critical' || c.priority === 'high') && c.status !== 'resolved' && c.status !== 'rejected')
    .slice(0, 5)

  for (const c of highPriorityComplaints) {
    events.push({
      id: id++,
      severity: c.priority === 'critical' ? 'Critical' : 'High',
      title: c.subject || c.category || 'Unresolved Issue',
      description: c.description?.substring(0, 150) + (c.description?.length > 150 ? '...' : '') || 'No description',
      ward: c.ward || c.department || 'N/A',
      time: getTimeAgo(c.created_at),
      resolved: false,
    })
  }

  // 2. Recently resolved critical complaints
  const resolvedHigh = complaints
    .filter((c: any) => (c.priority === 'critical' || c.priority === 'high') && c.status === 'resolved')
    .slice(0, 3)

  for (const c of resolvedHigh) {
    events.push({
      id: id++,
      severity: c.priority === 'critical' ? 'Critical' : 'High',
      title: c.subject || c.category || 'Resolved Issue',
      description: c.description?.substring(0, 150) + (c.description?.length > 150 ? '...' : '') || 'Issue resolved',
      ward: c.ward || c.department || 'N/A',
      time: getTimeAgo(c.updated_at || c.created_at),
      resolved: true,
    })
  }

  // 3. Department with growing backlog = medium risk
  if (analytics?.departmentDistribution?.length > 0) {
    const topDept = analytics.departmentDistribution[0]
    if (topDept.count > 5) {
      events.push({
        id: id++,
        severity: 'Medium',
        title: `${topDept.department} — High Complaint Volume`,
        description: `${topDept.count} complaints concentrated in this department. May indicate systemic infrastructure issues requiring broader intervention.`,
        ward: topDept.department || 'N/A',
        time: 'Ongoing',
        resolved: false,
      })
    }
  }

  // 4. Rejected complaints = low risk signals
  const rejected = complaints
    .filter((c: any) => c.status === 'rejected')
    .slice(0, 2)

  for (const c of rejected) {
    events.push({
      id: id++,
      severity: 'Low',
      title: `Rejected: ${c.subject || c.category || 'Unknown'}`,
      description: c.rejection_reason || c.description?.substring(0, 120) || 'Complaint rejected',
      ward: c.ward || c.department || 'N/A',
      time: getTimeAgo(c.updated_at || c.created_at),
      resolved: true,
    })
  }

  return events
}

function getTimeAgo(dateStr: string) {
  if (!dateStr) return 'Unknown'
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function RiskDetectorPanel() {
  const { t } = useLanguage()
  const [events, setEvents] = useState<RiskEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRiskEvents()
  }, [])

  async function loadRiskEvents() {
    setLoading(true)
    try {
      const [analytics, complaintsRes] = await Promise.all([
        adminApi.getComplaintAnalytics(),
        adminApi.getAllComplaints({ limit: 50 }),
      ])
      const complaints = complaintsRes.data || []
      setEvents(generateRiskEvents(analytics, complaints))
    } catch (err) {
      console.error('Failed to load risk events', err)
    } finally {
      setLoading(false)
    }
  }

  const active = events.filter(e => !e.resolved).length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--warning)' }} />
          {t('risk.title') || 'Infrastructure Risk Monitoring'}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button onClick={loadRiskEvents} className="btn btn-ghost" style={{ padding: '.3rem' }} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="badge badge-danger">{active} {t('risk.active_risks') || 'Active Risks'}</span>
          <span className="badge badge-success">
            <CheckCircle size={10} /> {events.length - active} {t('risk.resolved') || 'Resolved'}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <p>Scanning complaints for risk events...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Risk Events</p>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>No critical or high-priority complaints detected. System is operating safely.</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 20, top: 8, bottom: 8, width: 2, background: 'var(--border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {events.map((evt, i) => {
                const cfg = SEVERITY_CONFIG[evt.severity] || SEVERITY_CONFIG.Medium
                return (
                  <div key={evt.id} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', animationDelay: `${i * .08}s` }} className="animate-in">
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: evt.resolved ? 'var(--bg)' : cfg.bg,
                      border: `2px solid ${evt.resolved ? 'var(--border)' : cfg.lineColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1, position: 'relative', opacity: evt.resolved ? .65 : 1,
                    }}>
                      {evt.resolved ? <CheckCircle size={16} color="var(--success)" /> : <AlertTriangle size={14} color={cfg.color} />}
                    </div>
                    <div style={{
                      flex: 1, background: evt.resolved ? 'var(--bg)' : cfg.bg,
                      border: `1px solid ${evt.resolved ? 'var(--border)' : cfg.lineColor}`,
                      borderRadius: 10, padding: '1rem',
                      opacity: evt.resolved ? .75 : 1,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem', flexWrap: 'wrap', gap: '.5rem' }}>
                        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: cfg.color, background: 'rgba(255,255,255,.6)', padding: '.2rem .6rem', borderRadius: 100 }}>
                            {evt.severity}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text-primary)' }}>{evt.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
                          <Clock size={11} /> {evt.time}
                        </div>
                      </div>
                      <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '.625rem' }}>{evt.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
                        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>📍 {evt.ward}</span>
                        <span className={`badge ${evt.resolved ? 'badge-success' : 'badge-danger'}`}>
                          {evt.resolved ? '✓ Resolved' : '● Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
