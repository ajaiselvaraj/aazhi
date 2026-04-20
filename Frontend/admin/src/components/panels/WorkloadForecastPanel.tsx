import React, { useState, useEffect } from 'react'
import { TrendingUp, RefreshCw, Inbox } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'

const DEPT_COLORS: Record<string, string> = {
  'Electricity Department': '#FFA940',
  'Water Supply Department': '#2F6BFF',
  'Gas Distribution': '#FF4D4F',
  'Municipal Services': '#2ECC71',
}

export default function WorkloadForecastPanel() {
  const { t } = useLanguage()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkload()
  }, [])

  async function loadWorkload() {
    setLoading(true)
    try {
      const data = await adminApi.getComplaintAnalytics()
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to load workload data', err)
    } finally {
      setLoading(false)
    }
  }

  const dailyTrend = analytics?.dailyTrend || []
  const deptDist = analytics?.departmentDistribution || []
  const stats = analytics?.stats || {}

  // Build per-department workload data from daily trends + dept distribution
  const deptWorkload = deptDist.slice(0, 6).map((d: any) => ({
    department: d.department || 'Unknown',
    count: d.count,
    color: DEPT_COLORS[d.department] || '#9b59b6',
    isHigh: d.count > (stats.total || 1) * 0.25,
  }))

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" />
          {t('workload.title') || 'Department Workload Analysis'}
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button onClick={loadWorkload} className="btn btn-ghost" style={{ padding: '.3rem' }} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="badge badge-info"><TrendingUp size={10} /> {t('workload.forecast_badge') || 'Real Data'}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
          <p>Loading workload data...</p>
        </div>
      ) : !analytics || deptDist.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Workload Data</p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Workload data will appear once complaints are submitted.</p>
        </div>
      ) : (
        <>
          {/* Department snapshot */}
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${Math.min(deptWorkload.length, 4)}, 1fr)`,
            borderBottom: '1px solid var(--border)',
          }}>
            {deptWorkload.slice(0, 4).map((d: any, i: number) => (
              <div key={d.department} style={{
                padding: '.875rem 1.25rem',
                borderRight: i < Math.min(deptWorkload.length, 4) - 1 ? '1px solid var(--border)' : 'none',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.3rem' }}>
                  {d.department}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: d.color, fontFamily: 'Poppins,sans-serif' }}>
                  {d.count}
                </div>
                <div style={{ fontSize: '.72rem', marginTop: '.2rem', color: d.isHigh ? 'var(--alert)' : 'var(--success)', fontWeight: 600 }}>
                  {d.isHigh ? '↑ High Load' : '✓ Normal'}
                </div>
              </div>
            ))}
          </div>

          {/* Daily Trend Chart */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              14-Day Complaint Volume
            </div>
            {dailyTrend.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.35rem', height: 160, padding: '.5rem 0' }}>
                {dailyTrend.map((d: any, i: number) => {
                  const max = Math.max(...dailyTrend.map((x: any) => x.total), 1)
                  const totalH = Math.max((d.total / max) * 140, 4)
                  const resolvedH = Math.max((d.resolved / max) * 140, 0)
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.2rem' }}>
                      <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.total}</div>
                      <div style={{ width: '80%', position: 'relative' }}>
                        <div style={{
                          width: '100%', height: totalH,
                          background: 'linear-gradient(180deg, #2F6BFF, #6366f1)',
                          borderRadius: '4px 4px 2px 2px',
                          position: 'relative',
                        }}>
                          {resolvedH > 0 && (
                            <div style={{
                              position: 'absolute', bottom: 0, left: 0, right: 0,
                              height: resolvedH, background: '#2ECC71', opacity: 0.6,
                              borderRadius: '0 0 2px 2px',
                            }} />
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '.55rem', color: 'var(--text-muted)' }}>
                        {new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                No daily trend data available
              </div>
            )}

            {dailyTrend.length > 0 && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '.75rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2F6BFF' }} /> Total Complaints
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2ECC71' }} /> Resolved
                </span>
              </div>
            )}
          </div>

          {/* Department breakdown bar */}
          {deptWorkload.length > 0 && (
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <div style={{ marginBottom: '.75rem', fontSize: '.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Complaint Distribution by Department
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {deptWorkload.map((d: any) => {
                  const max = Math.max(...deptWorkload.map((x: any) => x.count), 1)
                  const pct = (d.count / max) * 100
                  return (
                    <div key={d.department} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <div style={{ width: 150, fontSize: '.78rem', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.department}
                      </div>
                      <div style={{ flex: 1, height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: `linear-gradient(90deg, ${d.color}, ${d.color}dd)`,
                          borderRadius: 6, transition: 'width 1s ease-in-out',
                        }} />
                      </div>
                      <div style={{ width: 36, textAlign: 'right', fontSize: '.8rem', fontWeight: 700, color: d.color }}>
                        {d.count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
