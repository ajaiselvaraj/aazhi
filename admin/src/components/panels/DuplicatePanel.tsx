import React from 'react'
import { Copy, GitMerge, Users } from 'lucide-react'
import { duplicateClusters, DuplicateCluster } from '../../data/mockData'

function StatusChip({ s }: { s: DuplicateCluster['status'] }) {
  if (s === 'Merged Into Master Ticket') return <span className="badge badge-success">✓ Merged</span>
  if (s === 'Under Review') return <span className="badge badge-warning">Under Review</span>
  return <span className="badge badge-info">Open</span>
}

const DEPT_COLORS: Record<string, string> = {
  'Electricity':      '#FFA940',
  'Water Supply':     '#2F6BFF',
  'Municipal':        '#2ECC71',
  'Gas Distribution': '#FF4D4F',
}

export default function DuplicatePanel() {
  const total = duplicateClusters.reduce((a, c) => a + c.reportCount, 0)
  const merged = duplicateClusters.filter(c => c.status === 'Merged Into Master Ticket').length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" />
          Duplicate Issue Detection
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
            {merged}/{duplicateClusters.length} merged
          </span>
          <span className="badge badge-info">
            <Copy size={10} /> {total} Total Reports
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {duplicateClusters.map(cluster => {
          const deptColor = DEPT_COLORS[cluster.dept] || 'var(--primary)'
          return (
            <div key={cluster.id} style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${deptColor}`,
              borderRadius: 12,
              padding: '1.125rem',
              transition: 'box-shadow .2s',
              cursor: 'default',
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              {/* Top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                <div>
                  <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.2rem' }}>
                    Issue Cluster · {cluster.id}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)' }}>
                    {cluster.title} — {cluster.ward}
                  </div>
                </div>
                <StatusChip s={cluster.status} />
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.82rem', color: 'var(--text-secondary)' }}>
                  <Users size={13} color={deptColor} />
                  <span><strong style={{ color: deptColor }}>{cluster.reportCount}</strong> Citizens Reported</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.82rem', color: 'var(--text-secondary)' }}>
                  <GitMerge size={13} color="var(--text-muted)" />
                  <span>{cluster.masterTicket}</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
                  {cluster.dept} · {cluster.timeAgo}
                </span>
                <button className="btn btn-ghost" style={{ padding: '.3rem .75rem', fontSize: '.72rem', height: 'auto' }}>
                  View Master
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
