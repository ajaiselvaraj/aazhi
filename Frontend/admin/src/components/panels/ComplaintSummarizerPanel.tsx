import React, { useState, useEffect } from 'react'
import {
  Layers, RefreshCw, ChevronDown, ChevronUp, Users, MapPin,
  AlertTriangle, Tag, Inbox, Sparkles, Clock
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { smartFetch } from '../../services/smartFetch'

interface ClusterMember {
  id: string | number
  ticket: string
  subject: string
  department: string
  status: string
  citizen: string
}

interface Cluster {
  cluster_id: string
  count: number
  summary: string
  representative_ticket: string
  keywords: string[]
  departments: string[]
  wards: string[]
  avg_urgency: number
  tickets: string[]
  members: ClusterMember[]
}

interface ClusterData {
  clusters: Cluster[]
  total_complaints: number
  clustered_complaints: number
  unique_clusters: number
  processing_time_ms: number
  ml_method: string
  threshold: number
}

export default function ComplaintSummarizerPanel() {
  const [data, setData] = useState<ClusterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => { loadClusters() }, [])

  async function loadClusters(force = false) {
    setLoading(true)
    setError(null)
    try {
      // Optimized: Only run ML clustering if there are new complaints since last run
      const result = await smartFetch.get('ml_clusters', () => 
        adminApi.getMLComplaintClusters(),
        { force }
      );
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load clusters')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const urgencyColor = (u: number) => {
    if (u >= 4) return '#FF4D4F'
    if (u >= 3) return '#FFA940'
    if (u >= 2) return '#2F6BFF'
    return '#2ECC71'
  }

  return (
    <div className="section-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ═══ Header Banner ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #162240 100%)',
        borderRadius: 16, padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
        border: '1px solid rgba(47,107,255,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(155,89,182,.4)',
          }}>
            <Layers size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              📋 Smart Complaint Summarizer
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.15rem' }}>
              ML clusters similar complaints into unified groups • Auto-generated summaries
            </div>
          </div>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[
              { label: 'Clusters', val: data.unique_clusters, color: '#9b59b6' },
              { label: 'Grouped', val: data.clustered_complaints, color: '#2F6BFF' },
              { label: 'Total', val: data.total_complaints, color: '#2ECC71' },
              { label: 'Speed', val: `${data.processing_time_ms}ms`, color: '#FFA940' },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: m.color }}>{m.val}</div>
                <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)' }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => loadClusters(true)} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.15)', color: '#fff' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ═══ ML Method Badge ═══ */}
      {data?.ml_method && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem 1rem',
          background: 'rgba(155,89,182,.08)', borderRadius: 10, border: '1px solid rgba(155,89,182,.15)',
          fontSize: '.78rem', color: '#9b59b6', fontWeight: 600,
        }}>
          <Sparkles size={14} /> ML Method: {data.ml_method} • Threshold: {((data.threshold || 0.4) * 100).toFixed(0)}% similarity
        </div>
      )}

      {/* ═══ Cluster Cards ═══ */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
          <p>Clustering complaints using ML similarity analysis...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#FF4D4F', background: '#fff1f0', border: '1px solid #FF4D4F' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto .5rem' }} />
          <p><strong>Error:</strong> {error}</p>
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>Make sure AI service is running on port 5005</p>
        </div>
      ) : !data?.clusters?.length ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Clusters Found</p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Not enough similar complaints to form clusters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.clusters.map(cluster => (
            <div key={cluster.cluster_id} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'box-shadow .2s', border: expanded[cluster.cluster_id] ? '1px solid rgba(155,89,182,.3)' : undefined }}>

              {/* Cluster Header */}
              <div
                onClick={() => toggleExpand(cluster.cluster_id)}
                style={{
                  padding: '1.25rem 1.5rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: expanded[cluster.cluster_id] ? 'rgba(155,89,182,.04)' : 'transparent',
                  transition: 'background .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  {/* Count badge */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0,
                  }}>
                    {cluster.count}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--text-primary)' }}>
                        {cluster.cluster_id}
                      </span>
                      <span style={{
                        fontSize: '.68rem', padding: '.15rem .5rem', borderRadius: 100,
                        background: urgencyColor(cluster.avg_urgency) + '20',
                        color: urgencyColor(cluster.avg_urgency), fontWeight: 700,
                      }}>
                        Urgency: {cluster.avg_urgency.toFixed(1)}/5
                      </span>
                    </div>
                    <p style={{ fontSize: '.82rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                      {cluster.summary}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                  {/* Departments */}
                  <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                    {cluster.departments.slice(0, 2).map(d => (
                      <span key={d} style={{
                        fontSize: '.68rem', padding: '.15rem .5rem', borderRadius: 4,
                        background: 'rgba(47,107,255,.1)', color: '#2F6BFF', fontWeight: 600,
                      }}>{d}</span>
                    ))}
                  </div>
                  {expanded[cluster.cluster_id] ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expanded[cluster.cluster_id] && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem 1.5rem' }}>
                  {/* Keywords */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                      <Tag size={12} /> KEY THEMES
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                      {cluster.keywords.map(kw => (
                        <span key={kw} style={{
                          padding: '.2rem .6rem', borderRadius: 100, fontSize: '.72rem', fontWeight: 600,
                          background: 'rgba(155,89,182,.1)', color: '#9b59b6', border: '1px solid rgba(155,89,182,.15)',
                        }}>{kw}</span>
                      ))}
                    </div>
                  </div>

                  {/* Wards */}
                  {cluster.wards.length > 0 && (
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={12} /> Wards affected: {cluster.wards.join(', ')}
                    </div>
                  )}

                  {/* Members Table */}
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    <Users size={12} /> ALL GROUPED COMPLAINTS ({cluster.count})
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '.78rem' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '.5rem' }}>Ticket</th>
                          <th style={{ padding: '.5rem' }}>Subject</th>
                          <th style={{ padding: '.5rem' }}>Department</th>
                          <th style={{ padding: '.5rem' }}>Status</th>
                          <th style={{ padding: '.5rem' }}>Citizen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cluster.members.map(m => (
                          <tr key={m.ticket}>
                            <td style={{ padding: '.4rem .5rem', fontWeight: 600, color: '#2F6BFF' }}>{m.ticket}</td>
                            <td style={{ padding: '.4rem .5rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject || '—'}</td>
                            <td style={{ padding: '.4rem .5rem' }}>{m.department || '—'}</td>
                            <td style={{ padding: '.4rem .5rem' }}>
                              <span style={{
                                padding: '.1rem .4rem', borderRadius: 4, fontSize: '.68rem', fontWeight: 600,
                                background: m.status === 'resolved' ? '#eafaf1' : m.status === 'rejected' ? '#fff1f0' : '#f0f5ff',
                                color: m.status === 'resolved' ? '#27ae60' : m.status === 'rejected' ? '#c0392b' : '#2F6BFF',
                              }}>{m.status}</span>
                            </td>
                            <td style={{ padding: '.4rem .5rem' }}>{m.citizen || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {data && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0 .5rem' }}>
          <span>🧠 Powered by ML text similarity clustering</span>
          <span><Clock size={10} /> Processed in {data.processing_time_ms}ms</span>
        </div>
      )}
    </div>
  )
}
