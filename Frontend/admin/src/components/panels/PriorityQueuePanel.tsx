import React from 'react'
import { UserCheck, Clock } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { deptKey } from '../../utils/deptFilter'
import { useLanguage } from '../../context/LanguageContext'
import { formatTimestamp } from '../../utils/formatTimestamp'

const PRIORITY_STYLES = {
  'P0 — Emergency': { border: '#FF4D4F', badge: 'badge-danger' },
  'P1 — Critical':  { border: '#FFA940', badge: 'badge-warning' },
  'P2 — High':      { border: '#2F6BFF', badge: 'badge-info' },
}

export default function PriorityQueuePanel() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const myDept = user ? deptKey(user.department) : ''
  const [issues, setIssues] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  const [isFetching, setIsFetching] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    
    const fetchWrapper = async () => {
      if (isFetching) return;
      await loadIssues(controller.signal)
    }

    fetchWrapper()

    // Safe Polling every 15 seconds
    const interval = setInterval(async () => {
       if (!isFetching) { 
         await loadIssues(controller.signal); 
       }
    }, 15000)

    return () => {
      clearInterval(interval)
      controller.abort() // Cancel any pending request on unmount/re-render
    }
  }, []) // Empty dependency array ensures this matches once per mount

  async function loadIssues(signal?: AbortSignal) {
    setIsFetching(true)
    try {
      // Assuming 'critical' is the priority string in backend
      const res = await adminApi.getAllComplaints({ priority: 'critical', limit: 20 }) // pass signal here if API client supports it
      const mapped = res.data.map((c: any) => ({
        id: c.ticket_number || c.id,
        title: c.subject || c.category || t('critical_q.critical_issue') || 'Critical Issue',
        dept: c.department,
        ward: c.ward || t('critical_q.unknown_ward') || 'Unknown Ward',
        priority: 'P1 — Critical',
        icon: '🚨',
        officer: c.assigned_to_name || null,
        reportedAt: formatTimestamp(c.created_at || c.createdAt),
        raw: c
      }))
      setIssues(mapped)
    } catch (err: any) {
      if (err.name === 'AbortError') {
         console.log('⚠️ [Admin] Fetch aborted due to component unmount.');
      } else {
         console.error('❌ [Admin] Failed to fetch critical issues:', err)
      }
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  // Enforce dept isolation
  const deptIssues = issues.filter(i => 
    i.dept?.toLowerCase().includes(myDept.toLowerCase()) || myDept === ''
  )
  
  const emergency = deptIssues.filter(i => i.priority.includes('Critical')).length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--alert)' }} />
          {t('critical_q.title') || 'Critical Issue Queue'}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="badge badge-danger pulse-alert">
            🚨 {emergency} {t('critical_q.emergency') || 'Emergency'}
          </span>
          <span className="live-dot">{t('common.live') || 'Live'}</span>
        </div>
      </div>

      {/* Cards Stack */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: loading ? 0.6 : 1 }}>
        {deptIssues.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('critical_q.no_issues') || 'No critical issues found.'}</div>
        ) : deptIssues.map(issue => {
          const style = PRIORITY_STYLES[issue.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES['P1 — Critical']
          return (
            <div key={issue.id} style={{
              background: '#ffffff',
              border: `1px solid var(--border)`,
              borderLeft: `4px solid ${style.border}`,
              borderRadius: 12,
              padding: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform .15s, box-shadow .15s',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{issue.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{issue.title}</div>
                    <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{issue.dept} · {issue.ward}</div>
                  </div>
                </div>
                <span className={`badge ${style.badge}`} style={{ flexShrink: 0, padding: '.35rem .6rem', fontSize: '.8rem' }}>
                  {t('critical_q.critical') || 'Critical'}
                </span>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginTop: '.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', color: 'var(--text-secondary)' }}>
                  <UserCheck size={14} />
                  <span>{t('critical_q.assigned') || 'Assigned:'} <strong>{issue.officer || t('critical_q.unassigned') || 'Unassigned'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', color: 'var(--text-secondary)' }}>
                  <Clock size={14} />
                  <span>{t('critical_q.reported') || 'Reported'} {issue.reportedAt}</span>
                </div>
              </div>

              {/* Action */}
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '.75rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '.5rem', fontSize: '.85rem', height: 'auto' }}
                  onClick={() => setExpanded(prev => ({ ...prev, [issue.id]: !prev[issue.id] }))}
                >
                  {expanded[issue.id] ? (t('critical_q.hide_details') || 'Hide Details') : (t('critical_q.view_details') || 'View Details')}
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, justifyContent: 'center', padding: '.5rem', fontSize: '.85rem', height: 'auto' }}
                  onClick={() => {
                    const name = window.prompt(t('critical_q.enter_officer') || 'Enter officer name to assign:')
                    if (name && name.trim()) {
                      const updated = issues.map(i => i.id === issue.id ? { ...i, officer: name.trim() } : i)
                      setIssues(updated)
                    }
                  }}
                >
                  {t('critical_q.assign_officer') || 'Assign Officer'}
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ flex: 1, justifyContent: 'center', padding: '.5rem', fontSize: '.85rem', height: 'auto', color: 'var(--success)' }}
                  onClick={async () => {
                    await adminApi.updateComplaintStatus(issue.raw.id, { status: 'resolved' });
                    loadIssues();
                  }}
                >
                  {t('critical_q.mark_resolved') || 'Mark Resolved'}
                </button>
              </div>

              {/* Expanded Details */}
              {expanded[issue.id] && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '.5rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    Complaint Details
                  </div>
                  <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {issue.raw.description || 'No description provided.'}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '.75rem', fontSize: '.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span><strong>Ticket:</strong> {issue.raw.ticket_number || issue.id}</span>
                    <span><strong>Priority:</strong> {issue.raw.priority || 'critical'}</span>
                    <span><strong>Status:</strong> {issue.raw.status || 'submitted'}</span>
                    {issue.raw.citizen_name && <span><strong>Citizen:</strong> {issue.raw.citizen_name}</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
