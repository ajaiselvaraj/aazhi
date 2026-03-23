import React from 'react'
import { UserCheck, Clock } from 'lucide-react'
import { priorityIssues, PriorityIssue } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { filterByDept } from '../../utils/deptFilter'

const PRIORITY_STYLES = {
  'P0 — Emergency': { border: '#FF4D4F', badge: 'badge-danger' },
  'P1 — Critical':  { border: '#FFA940', badge: 'badge-warning' },
  'P2 — High':      { border: '#2F6BFF', badge: 'badge-info' },
}

export default function PriorityQueuePanel() {
  const { user } = useAuth()
  const issues = user ? filterByDept(priorityIssues, user.department) : priorityIssues
  const emergency = issues.filter(i => i.priority === 'P0 — Emergency').length

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
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {issues.map(issue => {
          const style = PRIORITY_STYLES[issue.priority]
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
                  {issue.priority.split(' ')[0]}
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
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '.5rem', fontSize: '.85rem', height: 'auto', color: 'var(--success)' }}>
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
