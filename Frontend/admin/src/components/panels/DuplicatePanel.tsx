import React, { useState, useEffect } from 'react'
import { Copy, GitMerge, Users, RefreshCw, Inbox } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

interface DuplicateCluster {
  id: string
  title: string
  dept: string
  ward: string
  masterTicket: string
  reportCount: number
  status: 'Open' | 'Under Review' | 'Merged Into Master Ticket'
  timeAgo: string
  tickets: string[]
}

function StatusChip({ s }: { s: DuplicateCluster['status'] }) {
  const { t } = useLanguage()
  if (s === 'Merged Into Master Ticket') return <span className="badge badge-success">{t('dup_det.state_merged') || '✓ Merged'}</span>
  if (s === 'Under Review') return <span className="badge badge-warning">{t('dup_det.state_under_review') || 'Under Review'}</span>
  return <span className="badge badge-info">{t('dup_det.state_open') || 'Open'}</span>
}

const DEPT_COLORS: Record<string, string> = {
  'Electricity Department': '#FFA940',
  'Electricity': '#FFA940',
  'Water Supply Department': '#2F6BFF',
  'Water Supply': '#2F6BFF',
  'Municipal Services': '#2ECC71',
  'Municipal': '#2ECC71',
  'Gas Distribution': '#FF4D4F',
  'Roads': '#9b59b6',
}

export default function DuplicatePanel() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [clusters, setClusters] = useState<DuplicateCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClusters()
  }, [user])

  async function fetchClusters() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getDuplicateClusters()
      setClusters(data || [])
    } catch (err: any) {
      console.error("Failed to fetch duplicate clusters:", err)
      setError(err.message || 'An error occurred while loading data.')
    } finally {
      setLoading(false)
    }
  }

  const total = clusters.reduce((a, c) => a + c.reportCount, 0)
  const merged = clusters.filter(c => c.status === 'Merged Into Master Ticket').length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" />
          {t('dup_det.title') || 'Duplicate Issue Detection'}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button onClick={fetchClusters} className="btn btn-ghost" style={{ padding: '.3rem' }} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {!loading && (
            <>
              <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                {merged}/{clusters.length} {t('dup_det.merged') || 'merged'}
              </span>
              <span className="badge badge-info">
                <Copy size={10} /> {total} {t('dup_det.total_reports') || 'Total Reports'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <p>Analyzing complaint similarity...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)', gridColumn: '1 / -1' }}>
            <strong>Error:</strong> {error}
          </div>
        ) : clusters.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Duplicate Clusters Found</p>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>All complaints appear to be unique. The TF-IDF similarity engine found no matches above the threshold.</p>
          </div>
        ) : (
          clusters.map(cluster => {
            const deptColor = DEPT_COLORS[cluster.dept] || 'var(--primary)'
            return (
              <div key={cluster.id} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${deptColor}`,
                borderRadius: 12,
                padding: '1.125rem',
                transition: 'box-shadow .2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
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
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '.75rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>🔍 String Similarity Engine — Real-time duplicate clustering from complaint database</span>
        <span style={{ color: 'var(--success)' }}>✓ Threshold: 45% similarity</span>
      </div>
    </div>
  )
}
