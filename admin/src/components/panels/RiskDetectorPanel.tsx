import React from 'react'
import { ShieldAlert, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { riskEvents, RiskEvent } from '../../data/mockData'

const SEVERITY_CONFIG = {
  'Critical': { color: 'var(--alert)',   bg: '#fff1f0', icon: '🔴', lineColor: '#FF4D4F' },
  'High':     { color: 'var(--warning)', bg: '#fff7e6', icon: '🟠', lineColor: '#FFA940' },
  'Medium':   { color: 'var(--primary)', bg: '#f0f5ff', icon: '🟡', lineColor: '#2F6BFF' },
  'Low':      { color: 'var(--success)', bg: '#eafaf1', icon: '🟢', lineColor: '#2ECC71' },
}

export default function RiskDetectorPanel() {
  const active = riskEvents.filter(e => !e.resolved).length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--warning)' }} />
          Infrastructure Risk Monitoring
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="badge badge-danger">{active} Active Risks</span>
          <span className="badge badge-success">
            <CheckCircle size={10} /> {riskEvents.length - active} Resolved
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{
            position: 'absolute', left: 20, top: 8, bottom: 8,
            width: 2, background: 'var(--border)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {riskEvents.map((evt, i) => {
              const cfg = SEVERITY_CONFIG[evt.severity]
              return (
                <div key={evt.id} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', animationDelay: `${i * .08}s` }} className="animate-in">
                  {/* Timeline dot */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: evt.resolved ? 'var(--bg)' : cfg.bg,
                    border: `2px solid ${evt.resolved ? 'var(--border)' : cfg.lineColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1, position: 'relative',
                    fontSize: '1rem',
                    opacity: evt.resolved ? .65 : 1,
                  }}>
                    {evt.resolved
                      ? <CheckCircle size={16} color="var(--success)" />
                      : <AlertTriangle size={14} color={cfg.color} />
                    }
                  </div>

                  {/* Content card */}
                  <div style={{
                    flex: 1, background: evt.resolved ? 'var(--bg)' : cfg.bg,
                    border: `1px solid ${evt.resolved ? 'var(--border)' : cfg.lineColor}`,
                    borderRadius: 10, padding: '1rem',
                    opacity: evt.resolved ? .75 : 1,
                    transition: 'opacity .2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem', flexWrap: 'wrap', gap: '.5rem' }}>
                      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '.05em', color: cfg.color,
                          background: 'rgba(255,255,255,.6)', padding: '.2rem .6rem', borderRadius: 100,
                        }}>
                          {evt.severity}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text-primary)' }}>
                          {evt.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
                        <Clock size={11} /> {evt.time}
                      </div>
                    </div>

                    <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '.625rem' }}>
                      {evt.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
                      <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
                        📍 {evt.ward}
                      </span>
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
      </div>
    </div>
  )
}
