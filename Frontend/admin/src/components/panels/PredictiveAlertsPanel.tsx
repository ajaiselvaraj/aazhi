import React from 'react'
import { BellRing, Clock } from 'lucide-react'
import { predictiveAlerts, PredictiveAlert } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { filterByDept } from '../../utils/deptFilter'

const SEVERITY_STYLES = {
  'Critical': { bg: '#fff1f0', border: '#FF4D4F', text: '#c0392b', badge: 'badge-danger', iconText: '🚨 Critical Infrastructure Risk' },
  'High':     { bg: '#fff7e6', border: '#FFA940', text: '#b36300', badge: 'badge-warning', iconText: '⚠ Warning Alert' },
  'Medium':   { bg: '#f0f5ff', border: '#2F6BFF', text: '#1a55e8', badge: 'badge-info', iconText: 'ℹ System Notification' },
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
          System Alerts
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
              padding: '1.25rem',
              display: 'flex', gap: '1.25rem', alignItems: 'flex-start',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                background: '#ffffff', border: `1px solid ${sty.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', boxShadow: 'var(--shadow-sm)'
              }}>
                {alert.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{sty.iconText}</span>
                    <span className={`badge ${sty.badge}`}>Active</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Clock size={12} />
                    Detected {alert.time}
                  </div>
                </div>
                
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '.4rem', marginTop: 0 }}>
                  {alert.title}
                </h4>
                
                <p style={{ fontSize: '.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '.75rem', marginTop: 0 }}>
                  {alert.description}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <span>🤖 AI Risk Detection System</span>
                  <span>•</span>
                  <span>📍 {alert.ward}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                  <button className="btn btn-primary" style={{ padding: '.45rem .85rem', fontSize: '.8rem', height: 'auto' }}>
                    View Incident
                  </button>
                  <button className="btn btn-outline" style={{ padding: '.45rem .85rem', fontSize: '.8rem', height: 'auto' }}>
                    Assign Team
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '.45rem .75rem', fontSize: '.8rem', height: 'auto', color: 'var(--text-muted)' }}>
                    Dismiss Alert
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
