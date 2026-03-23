import React from 'react'
import { BellRing, Clock } from 'lucide-react'
import { predictiveAlerts, PredictiveAlert } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { filterByDept } from '../../utils/deptFilter'

const SEVERITY_STYLES = {
  'Critical': { bg: '#fff1f0', border: '#FF4D4F', text: '#c0392b', badge: 'badge-danger' },
  'High':     { bg: '#fff7e6', border: '#FFA940', text: '#b36300', badge: 'badge-warning' },
  'Medium':   { bg: '#f0f5ff', border: '#2F6BFF', text: '#1a55e8', badge: 'badge-info' },
}

export default function PredictiveAlertsPanel() {
  const { user } = useAuth()
  const alerts = user ? filterByDept(predictiveAlerts, user.department) : predictiveAlerts
  const critical = alerts.filter(a => a.severity === 'Critical').length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--alert)' }} />
          Predictive Alerts
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="badge badge-danger pulse-alert">
            <BellRing size={10} /> {critical} Critical
          </span>
          <span className="live-dot">Live</span>
        </div>
      </div>

      {/* Alert Cards */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
        {alerts.map(alert => {
          const sty = SEVERITY_STYLES[alert.severity]
          return (
            <div key={alert.id} style={{
              background: sty.bg,
              border: `1px solid ${sty.border}`,
              borderLeft: `4px solid ${sty.border}`,
              borderRadius: 12,
              padding: '1.125rem 1.25rem',
              display: 'flex', gap: '1rem', alignItems: 'flex-start',
            }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: sty.border, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                {alert.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.35rem', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span className={`badge ${sty.badge}`}>⚠ Risk Detected</span>
                    <span style={{ fontWeight: 700, fontSize: '.9rem', color: sty.text }}>{alert.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Clock size={11} />
                    {alert.time}
                  </div>
                </div>
                <p style={{ fontSize: '.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  "{alert.description}"
                </p>
                <div style={{ display: 'flex', gap: '.75rem', marginTop: '.625rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '.73rem', color: 'var(--text-muted)', fontWeight: 500 }}>📍 {alert.ward}</span>
                  <button className="btn btn-primary" style={{ padding: '.3rem .85rem', fontSize: '.73rem', height: 'auto' }}>
                    Investigate
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '.3rem .75rem', fontSize: '.73rem', height: 'auto' }}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
