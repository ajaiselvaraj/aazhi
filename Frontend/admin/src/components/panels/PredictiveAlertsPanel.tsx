import React, { useState, useEffect } from 'react'
import { BellRing, Clock, RefreshCw, Inbox } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'

interface SystemAlert {
  id: number
  severity: 'Critical' | 'High' | 'Medium'
  title: string
  description: string
  icon: string
  time: string
  ward: string
}

const SEVERITY_STYLES = {
  'Critical': { bg: '#fff1f0', border: '#FF4D4F', text: '#c0392b', badge: 'badge-danger', iconText: '🚨 Critical Alert' },
  'High':     { bg: '#fff7e6', border: '#FFA940', text: '#b36300', badge: 'badge-warning', iconText: '⚠ Warning Alert' },
  'Medium':   { bg: '#f0f5ff', border: '#2F6BFF', text: '#1a55e8', badge: 'badge-info', iconText: 'ℹ System Notification' },
}

function generateAlertsFromAnalytics(analytics: any): SystemAlert[] {
  const alerts: SystemAlert[] = []
  if (!analytics) return alerts
  let id = 1

  const stats = analytics.stats || {}
  const deptDist = analytics.departmentDistribution || []
  const dailyTrend = analytics.dailyTrend || []
  const priorityBreakdown = analytics.priorityBreakdown || []

  // 1. Critical priority complaints
  const critical = priorityBreakdown.find((p: any) => p.priority === 'critical')
  if (critical && critical.count > 0) {
    alerts.push({
      id: id++,
      severity: 'Critical',
      title: `${critical.count} Critical-Priority Complaints`,
      description: `There are ${critical.count} complaints marked as critical priority that require immediate attention. These may indicate urgent infrastructure failures or safety hazards.`,
      icon: '🔴',
      time: 'Now',
      ward: 'All Wards',
    })
  }

  // 2. High active backlog
  if (stats.active > 10) {
    alerts.push({
      id: id++,
      severity: stats.active > 30 ? 'Critical' : 'High',
      title: `Backlog Alert: ${stats.active} Active Complaints`,
      description: `${stats.active} complaints remain unresolved. At current resolution rates, backlog may grow. Consider allocating additional resources.`,
      icon: '📋',
      time: 'Updated now',
      ward: 'All Wards',
    })
  }

  // 3. Department overload
  if (deptDist.length > 0) {
    const topDept = deptDist[0]
    const pct = stats.total > 0 ? Math.round((topDept.count / stats.total) * 100) : 0
    if (pct > 40) {
      alerts.push({
        id: id++,
        severity: 'High',
        title: `Department Overload: ${topDept.department}`,
        description: `${topDept.department} is handling ${pct}% of all complaints (${topDept.count}). This imbalanced load may cause delays in resolution.`,
        icon: '⚡',
        time: 'Current',
        ward: topDept.department || 'N/A',
      })
    }
  }

  // 4. Spike detection
  if (dailyTrend.length >= 3) {
    const lastDay = dailyTrend[dailyTrend.length - 1]
    const avg = dailyTrend.reduce((s: number, d: any) => s + d.total, 0) / dailyTrend.length
    if (lastDay && lastDay.total > avg * 1.5 && lastDay.total > 3) {
      alerts.push({
        id: id++,
        severity: 'High',
        title: `Complaint Spike Detected`,
        description: `${lastDay.total} complaints on ${new Date(lastDay.date).toLocaleDateString()} — ${Math.round(((lastDay.total - avg) / avg) * 100)}% above average. Investigate potential widespread issues.`,
        icon: '📈',
        time: new Date(lastDay.date).toLocaleDateString(),
        ward: 'All Wards',
      })
    }
  }

  // 5. Low resolution rate
  if (stats.total > 5) {
    const resRate = Math.round((stats.resolved / stats.total) * 100)
    if (resRate < 40) {
      alerts.push({
        id: id++,
        severity: 'Medium',
        title: `Low Resolution Rate: ${resRate}%`,
        description: `Only ${stats.resolved} of ${stats.total} complaints have been resolved (${resRate}%). Target is 60%+. Process optimization recommended.`,
        icon: '📊',
        time: 'Current',
        ward: 'System-wide',
      })
    }
  }

  // 6. Today's volume
  if (stats.today >= 5) {
    alerts.push({
      id: id++,
      severity: 'Medium',
      title: `High Volume Today: ${stats.today} Complaints`,
      description: `${stats.today} complaints received today. This is above normal daily volume. Staff may need to prioritize triage.`,
      icon: '📬',
      time: 'Today',
      ward: 'All Wards',
    })
  }

  // Return empty-state friendly
  if (alerts.length === 0 && stats.total > 0) {
    alerts.push({
      id: id++,
      severity: 'Medium',
      title: 'All Systems Normal',
      description: `No critical alerts detected. ${stats.total} total complaints, ${stats.resolved} resolved. System is operating within normal parameters.`,
      icon: '✅',
      time: 'Now',
      ward: 'All Wards',
    })
  }

  return alerts
}

export default function PredictiveAlertsPanel() {
  const { t } = useLanguage()
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlerts()
  }, [])

  async function loadAlerts() {
    setLoading(true)
    try {
      const data = await adminApi.getComplaintAnalytics()
      setAlerts(generateAlertsFromAnalytics(data))
    } catch (err) {
      console.error('Failed to load alerts', err)
    } finally {
      setLoading(false)
    }
  }

  const critical = alerts.filter(a => a.severity === 'Critical').length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--alert)' }} />
          {t('pred_alerts.title') || 'System Alerts'}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button onClick={loadAlerts} className="btn btn-ghost" style={{ padding: '.3rem' }} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {critical > 0 && (
            <span className="badge badge-danger pulse-alert">
              <BellRing size={10} /> {critical} {t('pred_alerts.critical') || 'Critical'}
            </span>
          )}
          <span className="live-dot">{t('common.live') || 'Live'}</span>
        </div>
      </div>

      {/* Alert Cards */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <p>Analyzing complaint patterns for alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Alerts</p>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>System is operating normally. Alerts appear when complaint patterns indicate issues.</p>
          </div>
        ) : (
          alerts.map(alert => {
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
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: '#ffffff', border: `1px solid ${sty.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', boxShadow: 'var(--shadow-sm)'
                }}>
                  {alert.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.5rem', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{sty.iconText}</span>
                      <span className={`badge ${sty.badge}`}>{t('pred_alerts.active') || 'Active'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      <Clock size={12} />
                      {alert.time}
                    </div>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '.4rem', marginTop: 0 }}>
                    {alert.title}
                  </h4>
                  <p style={{ fontSize: '.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '.75rem', marginTop: 0 }}>
                    {alert.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                    <span>🤖 AI Risk Detection System</span>
                    <span>•</span>
                    <span>📍 {alert.ward}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
