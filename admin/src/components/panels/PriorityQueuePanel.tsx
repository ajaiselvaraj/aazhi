import React from 'react'
import { UserCheck, Clock } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { deptKey } from '../../utils/deptFilter'

const PRIORITY_STYLES = {
  'P0 — Emergency': { border: '#FF4D4F', badge: 'badge-danger' },
  'P1 — Critical':  { border: '#FFA940', badge: 'badge-warning' },
  'P2 — High':      { border: '#2F6BFF', badge: 'badge-info' },
}

export default function PriorityQueuePanel() {
  const { user } = useAuth()
  const myDept = user ? deptKey(user.department) : ''
  const [issues, setIssues] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadIssues()
    const interval = setInterval(loadIssues, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadIssues() {
    try {
      // Assuming 'critical' is the priority string in backend
      const res = await adminApi.getAllComplaints({ priority: 'critical', limit: 20 })
      const mapped = res.data.map((c: any) => ({
        id: c.ticket_number || c.id,
        title: c.subject || c.category || 'Critical Issue',
        dept: c.department,
        ward: c.ward || 'Unknown Ward',
        priority: 'P1 — Critical',
        icon: '🚨',
        officer: c.assigned_to_name || null,
        reportedAt: new Date(c.created_at).toLocaleString(),
        raw: c
      }))
      setIssues(mapped)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
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
          Critical Issue Queue
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="badge badge-danger pulse-alert">
            🚨 {emergency} Emergency
          </span>
          <span className="live-dot">Live</span>
        </div>
      </div>

      {/* Cards Stack */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: loading ? 0.6 : 1 }}>
        {deptIssues.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No critical issues found.</div>
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
                  Critical
                </span>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginTop: '.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', color: 'var(--text-secondary)' }}>
                  <UserCheck size={14} />
                  <span>Assigned: <strong>{issue.officer || 'Unassigned'}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', color: 'var(--text-secondary)' }}>
                  <Clock size={14} />
                  <span>Reported {issue.reportedAt}</span>
                </div>
              </div>

              {/* Action */}
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '.75rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '.5rem', fontSize: '.85rem', height: 'auto' }}>
                  View Details
                </button>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', padding: '.5rem', fontSize: '.85rem', height: 'auto' }}>
                  Assign Officer
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ flex: 1, justifyContent: 'center', padding: '.5rem', fontSize: '.85rem', height: 'auto', color: 'var(--success)' }}
                  onClick={async () => {
                    await adminApi.updateComplaintStatus(issue.raw.id, 'resolved');
                    loadIssues();
                  }}
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
