import React, { useState } from 'react'

/* ─── Node Data ─── */
const nodes = [
  {
    id: 'ND-DEL-Central-01',
    location: 'Delhi — Central Zone',
    status: 'Optimal',
    uptime: '30d 22h',
    syncLatency: '12ms',
    peripherals: [
      { name: 'Printer', icon: 'print', ok: true },
      { name: 'Scanner', icon: 'document_scanner', ok: true },
      { name: 'QR Reader', icon: 'qr_code_scanner', ok: true },
      { name: 'Touch', icon: 'touch_app', ok: true },
      { name: 'Biometric', icon: 'fingerprint', ok: true },
    ],
  },
  {
    id: 'ND-MUM-South-44',
    location: 'Mumbai — South Zone',
    status: 'Degraded',
    uptime: '12d 6h',
    syncLatency: '240ms',
    peripherals: [
      { name: 'Printer', icon: 'print', ok: false },
      { name: 'Scanner', icon: 'document_scanner', ok: true },
      { name: 'QR Reader', icon: 'qr_code_scanner', ok: true },
      { name: 'Touch', icon: 'touch_app', ok: true },
      { name: 'Biometric', icon: 'fingerprint', ok: false },
    ],
  },
  {
    id: 'ND-BLR-Tech-12',
    location: 'Bengaluru — Tech Park',
    status: 'Offline',
    uptime: '0d 0h',
    syncLatency: '—',
    peripherals: [
      { name: 'Printer', icon: 'print', ok: false },
      { name: 'Scanner', icon: 'document_scanner', ok: false },
      { name: 'QR Reader', icon: 'qr_code_scanner', ok: false },
      { name: 'Touch', icon: 'touch_app', ok: false },
      { name: 'Biometric', icon: 'fingerprint', ok: false },
    ],
  },
  {
    id: 'ND-HYD-Cyber-08',
    location: 'Hyderabad — Cyber Hub',
    status: 'Optimal',
    uptime: '28d 14h',
    syncLatency: '18ms',
    peripherals: [
      { name: 'Printer', icon: 'print', ok: true },
      { name: 'Scanner', icon: 'document_scanner', ok: true },
      { name: 'QR Reader', icon: 'qr_code_scanner', ok: true },
      { name: 'Touch', icon: 'touch_app', ok: true },
      { name: 'Biometric', icon: 'fingerprint', ok: true },
    ],
  },
]

const statusColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Optimal:  { bg: 'rgba(16,185,129,.1)',  text: '#059669', dot: '#10b981', border: 'rgba(16,185,129,.2)' },
  Degraded: { bg: 'rgba(245,158,11,.1)',  text: '#d97706', dot: '#f59e0b', border: 'rgba(245,158,11,.2)' },
  Offline:  { bg: 'var(--surface-container-high)', text: 'var(--outline)', dot: 'var(--outline)', border: 'var(--outline-variant)' },
}

export default function TerminalNetworkStatus() {
  const [filter, setFilter] = useState('all')

  const online  = nodes.filter(n => n.status === 'Optimal').length
  const degraded = nodes.filter(n => n.status === 'Degraded').length
  const offline  = nodes.filter(n => n.status === 'Offline').length

  const filtered = filter === 'all' ? nodes : nodes.filter(n => n.status.toLowerCase() === filter)

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>
            Terminal & Network Status
          </h1>
          <p style={{ fontSize: 16, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
            Live monitoring of all kiosk terminals, peripheral health, and network sync.
          </p>
        </div>
        <button onClick={() => alert('Terminal statuses refreshed.')} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* ─── Summary Badges ─── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
        {[
          { label: 'Online', count: online + degraded, color: 'var(--success-text)', bg: 'rgba(16,185,129,.08)', dot: 'var(--success)' },
          { label: 'Offline / Degraded', count: offline + degraded, color: 'var(--outline)', bg: 'var(--surface-container-high)', dot: 'var(--outline)' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{
            padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, boxShadow: `0 0 6px ${s.dot}` }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: s.color }}>{s.count}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--on-surface-variant)' }}>{s.label}</span>
          </div>
        ))}

        {/* Filter Tabs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {['all', 'optimal', 'degraded', 'offline'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--outline-variant)',
              background: filter === f ? 'rgba(0,51,153,.08)' : 'transparent',
              color: filter === f ? 'var(--primary)' : 'var(--on-surface-variant)',
              fontSize: 12, fontWeight: 600, letterSpacing: '.05em',
              cursor: 'pointer', textTransform: 'capitalize',
              transition: 'all .2s',
              boxShadow: filter === f ? '0 0 15px rgba(14,165,233,.3)' : 'none',
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* ─── Node Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--card-gap)' }}>
        {filtered.map(node => {
          const sc = statusColors[node.status] || statusColors.Optimal
          return (
            <div key={node.id} className="glass-card" style={{
              padding: 24, position: 'relative', overflow: 'hidden',
              borderColor: sc.border,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--on-surface-variant)', marginBottom: 2 }}>{node.id}</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 600, color: 'var(--on-surface)' }}>{node.location}</div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 'var(--radius-full)',
                  background: sc.bg, color: sc.text,
                  fontSize: 12, fontWeight: 600, letterSpacing: '.05em',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, boxShadow: `0 0 4px ${sc.dot}` }} />
                  {node.status}
                </span>
              </div>

              {/* Metrics */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Uptime (30d)</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: node.status === 'Offline' ? 'var(--outline)' : 'var(--on-surface)' }}>{node.uptime}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Sync Latency</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
                    color: node.syncLatency === '—' ? 'var(--outline)' : parseInt(node.syncLatency) > 100 ? 'var(--warning-text)' : 'var(--success-text)',
                  }}>{node.syncLatency}</div>
                </div>
              </div>

              {/* Peripherals */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Peripheral Status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {node.peripherals.map((p, i) => (
                  <div key={i} title={p.name} style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: p.ok ? 'rgba(16,185,129,.08)' : 'rgba(186,26,26,.08)',
                    border: `1px solid ${p.ok ? 'rgba(16,185,129,.2)' : 'rgba(186,26,26,.2)'}`,
                    cursor: 'pointer', transition: 'all .2s',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 20,
                      color: p.ok ? 'var(--success-text)' : 'var(--error)',
                    }}>{p.icon}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
