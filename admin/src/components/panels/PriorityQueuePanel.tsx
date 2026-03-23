import React from 'react'
import { ListOrdered, UserCheck, Clock } from 'lucide-react'
import { priorityIssues, PriorityIssue } from '../../data/mockData'

const PRIORITY_STYLES = {
  'P0 — Emergency': { bg: '#fff1f0', border: '#FF4D4F', color: '#c0392b', badge: 'badge-danger' },
  'P1 — Critical':  { bg: '#fff7e6', border: '#FFA940', color: '#b36300', badge: 'badge-warning' },
  'P2 — High':      { bg: '#f0f5ff', border: '#2F6BFF', color: '#1a55e8', badge: 'badge-info' },
}

export default function PriorityQueuePanel() {
  const emergency = priorityIssues.filter(i => i.priority === 'P0 — Emergency').length

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

      {/* Cards Grid */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {priorityIssues.map(issue => {
          const style = PRIORITY_STYLES[issue.priority]
          return (
            <div key={issue.id} style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              borderLeft: `4px solid ${style.border}`,
              borderRadius: 12,
              padding: '1.125rem',
              transition: 'transform .15s, box-shadow .15s',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{issue.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)' }}>{issue.title}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{issue.ward}</div>
                  </div>
                </div>
                <span className={`badge ${style.badge}`} style={{ flexShrink: 0 }}>
                  {issue.priority.split(' ')[0]}
                </span>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', marginTop: '.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                  <UserCheck size={12} />
                  <span>Assigned: <strong>{issue.officer}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                  <Clock size={12} />
                  <span>{issue.dept} · Reported {issue.reportedAt}</span>
                </div>
              </div>

              {/* Action */}
              <div style={{ marginTop: '.875rem', display: 'flex', gap: '.5rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '.45rem', fontSize: '.75rem', height: 'auto' }}>
                  Track Issue
                </button>
                <button className="btn btn-ghost" style={{ padding: '.45rem .75rem', fontSize: '.75rem', height: 'auto' }}>
                  Reassign
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
