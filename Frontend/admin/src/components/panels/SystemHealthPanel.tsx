import React from 'react'
import { Printer, ScanLine, QrCode, MousePointerClick, Fingerprint, AlertTriangle } from 'lucide-react'

interface NodeData {
  id: string
  location: string
  status: 'optimal' | 'degraded' | 'offline'
  uptime: string
  latency: string
  peripherals: { name: string; icon: any; status: 'ok' | 'error' | 'offline' }[]
}

const nodes: NodeData[] = [
  {
    id: 'ND-DEL-Central-01', location: 'Connaught Place Kiosk', status: 'optimal',
    uptime: '99.98%', latency: '12 ms',
    peripherals: [
      { name: 'Printer', icon: Printer, status: 'ok' },
      { name: 'Scanner', icon: ScanLine, status: 'ok' },
      { name: 'QR Reader', icon: QrCode, status: 'ok' },
      { name: 'Touch', icon: MousePointerClick, status: 'ok' },
      { name: 'Biometric', icon: Fingerprint, status: 'ok' },
    ],
  },
  {
    id: 'ND-MUM-South-44', location: 'Churchgate Terminal', status: 'degraded',
    uptime: '94.20%', latency: '145 ms',
    peripherals: [
      { name: 'Printer', icon: Printer, status: 'error' },
      { name: 'Scanner', icon: ScanLine, status: 'ok' },
      { name: 'QR Reader', icon: QrCode, status: 'ok' },
      { name: 'Touch', icon: MousePointerClick, status: 'ok' },
      { name: 'Biometric', icon: Fingerprint, status: 'ok' },
    ],
  },
  {
    id: 'ND-BLR-Tech-12', location: 'Whitefield Hub', status: 'offline',
    uptime: '--.--%', latency: '4h ago',
    peripherals: [],
  },
  {
    id: 'ND-HYD-Cyber-08', location: 'Hitec City Node', status: 'optimal',
    uptime: '100.0%', latency: '8 ms',
    peripherals: [
      { name: 'Printer', icon: Printer, status: 'ok' },
      { name: 'Scanner', icon: ScanLine, status: 'ok' },
      { name: 'QR Reader', icon: QrCode, status: 'ok' },
      { name: 'Touch', icon: MousePointerClick, status: 'ok' },
      { name: 'Biometric', icon: Fingerprint, status: 'ok' },
    ],
  },
]

const statusConfig = {
  optimal:  { label: 'Optimal',  color: '#2ECC71', bg: '#eafaf1', borderColor: 'var(--border)' },
  degraded: { label: 'Degraded', color: '#FF4D4F', bg: '#fff1f0', borderColor: '#FF4D4F' },
  offline:  { label: 'Offline',  color: 'var(--text-muted)', bg: 'var(--border-light)', borderColor: 'var(--border)' },
}

export default function SystemHealthPanel() {
  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Physical Node Health Grid</h1>
          <p>Real-time telemetry and peripheral diagnostic status for deployed public utility kiosks across the network.</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '.5rem .75rem',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px rgba(46,204,113,0.6)' }} />
            <span style={{ fontSize: '.8rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>142 Online</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '.5rem .75rem',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4D4F', boxShadow: '0 0 8px rgba(255,77,79,0.6)' }} />
            <span style={{ fontSize: '.8rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>3 Offline / Degraded</span>
          </div>
        </div>
      </div>

      {/* Node Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {nodes.map((node) => {
          const cfg = statusConfig[node.status]
          return (
            <div key={node.id} className="card" style={{
              borderColor: cfg.borderColor,
              borderLeftWidth: node.status === 'degraded' ? 4 : 1,
              borderLeftColor: node.status === 'degraded' ? '#FF4D4F' : cfg.borderColor,
              opacity: node.status === 'offline' ? 0.6 : 1,
              transition: 'all .3s',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{node.id}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.15rem', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 600 }}>{node.location}</div>
                </div>
                <span className={`badge ${node.status === 'optimal' ? 'badge-success' : node.status === 'degraded' ? 'badge-danger' : 'badge-dark'}`} style={{
                  display: 'flex', alignItems: 'center', gap: '.35rem',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0,
                    ...(node.status === 'degraded' ? { animation: 'livePulse 1.5s infinite' } : {}),
                    ...(node.status === 'optimal' ? { boxShadow: `0 0 4px ${cfg.color}` } : {}),
                  }} />
                  {cfg.label}
                </span>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '.75rem', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.25rem' }}>
                    {node.status === 'offline' ? 'Uptime (30d)' : 'Uptime (30d)'}
                  </div>
                  <div style={{
                    fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: node.status === 'degraded' ? '#FF4D4F' : node.status === 'optimal' ? 'var(--primary)' : 'var(--text-primary)',
                  }}>
                    {node.uptime}
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '.75rem', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.25rem' }}>
                    {node.status === 'offline' ? 'Last Sync' : 'Sync Latency'}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                    {node.latency}
                  </div>
                </div>
              </div>

              {/* Peripherals */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '.75rem' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>
                  Peripheral Status
                </div>
                {node.peripherals.length > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {node.peripherals.map((p, pi) => {
                      const periColor = p.status === 'ok' ? '#2ECC71' : '#FF4D4F'
                      return (
                        <div key={pi} title={`${p.name}: ${p.status === 'ok' ? 'Online' : 'Error'}`} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem', cursor: 'help',
                        }}>
                          <p.icon size={18} color={periColor} style={p.status === 'error' ? { animation: 'livePulse 1s infinite' } : {}} />
                          <span style={{
                            fontSize: '.65rem', fontWeight: 600,
                            color: p.status === 'error' ? '#FF4D4F' : 'var(--text-muted)',
                          }}>
                            {p.status === 'error' ? `${p.name} Error` : p.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No telemetry data available</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
