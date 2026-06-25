import React, { useState } from 'react'

/* ─── Demo Data ─── */
const interactionEvents = [
  { time: '2023-10-15 14:32', citizen: '****-1234', event: 'Login Success', channel: 'Mobile', status: 'success' },
  { time: '2023-10-15 14:28', citizen: '****-5678', event: 'MFA Challenge', channel: 'Web Portal', status: 'pending' },
  { time: '2023-10-15 14:15', citizen: '****-9012', event: 'Login Failed', channel: 'Kiosk T-42', status: 'danger' },
  { time: '2023-10-15 14:01', citizen: '****-3456', event: 'Complaint Filed', channel: 'Mobile', status: 'success' },
  { time: '2023-10-15 13:55', citizen: '****-7890', event: 'Password Reset', channel: 'Web Portal', status: 'success' },
  { time: '2023-10-15 13:42', citizen: '****-2345', event: 'MFA Failed', channel: 'Kiosk T-18', status: 'danger' },
]

const sessionAudits = [
  { title: 'Role Modification', desc: 'Admin "M. Iyer" elevated to Super Admin for Zone 4 operations.', time: '3 hours ago', type: 'warning', icon: 'manage_accounts' },
  { title: 'Failed Admin Login', desc: 'IP 192.168.44.12 — 3 consecutive failed attempts (Account: support_agent_04).', time: '5 hours ago', type: 'danger', icon: 'gpp_maybe' },
  { title: 'Audit Log Exported', desc: 'Super Admin "S. Nair" exported 30-day audit log (PDF, 12.4 MB).', time: '8 hours ago', type: 'success', icon: 'task' },
]

const mfaData = [
  { label: 'Delivered', value: 105432, pct: 85, color: 'var(--primary)' },
  { label: 'Delayed',   value: 12400,  pct: 10, color: 'var(--warning)' },
  { label: 'Failed',    value: 843,    pct: 5,  color: 'var(--error)' },
]

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: 'rgba(16,185,129,.1)', text: '#059669', dot: '#10b981' },
  pending: { bg: 'rgba(0,101,145,.12)', text: 'var(--secondary)', dot: 'var(--secondary)' },
  danger:  { bg: 'rgba(186,26,26,.1)', text: 'var(--error)', dot: 'var(--error)' },
}

export default function SecurityAuditIdentityLogs() {
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null)

  const totalMFA = mfaData.reduce((s, d) => s + d.value, 0)

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Timestamp,Citizen ID,Event Type,Channel,Status\n" + 
      interactionEvents.map(e => `${e.time},${e.citizen},${e.event},${e.channel},${e.status}`).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "security_audit_logs.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
            Security Audit & Identity Logs
          </h1>
          <p style={{ fontSize: 16, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            Citizen authentication events, MFA telemetry, and admin session audits.
          </p>
        </div>
        <button onClick={handleExport} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
          Export Report
        </button>
      </div>

      {/* ─── Stat Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--card-gap)', marginBottom: 'var(--card-gap)' }}>
        {[
          { label: 'Total Auth Requests', value: '124,592', icon: 'person_search', delta: '+8.2%', deltaColor: 'var(--success-text)', iconBg: 'rgba(0,32,104,.06)', iconColor: 'var(--primary)' },
          { label: 'Failed MFA Attempts', value: '843', icon: 'gpp_maybe', delta: '-2.1%', deltaColor: 'var(--success-text)', iconBg: 'rgba(186,26,26,.08)', iconColor: 'var(--error)' },
          { label: 'Active Admin Sessions', value: '18', icon: 'admin_panel_settings', delta: '3 new today', deltaColor: 'var(--secondary)', iconBg: 'rgba(0,101,145,.08)', iconColor: 'var(--secondary)' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -16, top: -16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,32,104,.02)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.deltaColor, marginTop: 6 }}>{s.delta}</div>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: s.iconColor }}>{s.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Bento Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--card-gap)', marginBottom: 'var(--card-gap)' }}>

        {/* Left: Citizen Interaction Events */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500 }}>Citizen Interaction Events</h3>
            <button onClick={() => alert('Filter panel coming soon.')} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)', padding: '6px 12px',
              fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)',
              cursor: 'pointer',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>filter_list</span>
              Filter
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Citizen ID</th>
                  <th>Event Type</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {interactionEvents.map((evt, i) => {
                  const ss = statusStyle[evt.status] || statusStyle.success
                  return (
                    <tr key={i} className="table-row-zebra">
                      <td style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em' }}>{evt.time}</td>
                      <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 13 }}>{evt.citizen}</td>
                      <td>{evt.event}</td>
                      <td style={{ color: 'var(--on-surface-variant)' }}>{evt.channel}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 'var(--radius-full)',
                          background: ss.bg, color: ss.text,
                          fontSize: 12, fontWeight: 600,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ss.dot, boxShadow: `0 0 4px ${ss.dot}` }} />
                          {evt.status === 'success' ? 'Success' : evt.status === 'pending' ? 'Pending' : 'Failed'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => alert(`Details for ${evt.citizen}:\nEvent: ${evt.event}\nChannel: ${evt.channel}\nTime: ${evt.time}`)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--primary)', fontSize: 12, fontWeight: 600,
                        }}>Details</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: MFA Delivery Status */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500, marginBottom: 20 }}>MFA Delivery Status</h3>

          {/* Donut visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, position: 'relative' }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              {(() => {
                let offset = 0
                const radius = 60
                const circumference = 2 * Math.PI * radius
                return mfaData.map((d, i) => {
                  const seg = (d.pct / 100) * circumference
                  const el = (
                    <circle
                      key={i}
                      cx="80" cy="80" r={radius}
                      fill="none" stroke={d.color} strokeWidth="16"
                      strokeDasharray={`${seg} ${circumference - seg}`}
                      strokeDashoffset={-offset}
                      strokeLinecap="round"
                      style={{ transition: 'all .3s', transform: 'rotate(-90deg)', transformOrigin: '80px 80px' }}
                    />
                  )
                  offset += seg
                  return el
                })
              })()}
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--primary)' }}>85%</div>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 500 }}>Success</div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mfaData.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{d.label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{d.value.toLocaleString()}</span>
                  <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginLeft: 6 }}>{d.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Administrative Session Audits ─── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 500, marginBottom: 20 }}>Administrative Session Audits</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {sessionAudits.map((audit, i) => {
            const ss = statusStyle[audit.type] || statusStyle.success
            return (
              <div key={i} style={{
                padding: 16, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--outline-variant)',
                transition: 'all .2s', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: ss.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: ss.text }}>{audit.icon}</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{audit.title}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.5, marginBottom: 8 }}>{audit.desc}</p>
                <span style={{ fontSize: 12, color: 'var(--outline)' }}>{audit.time}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
