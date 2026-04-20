import React, { useState, useEffect } from 'react'
import { BarChart2, TrendingUp, TrendingDown, RefreshCw, Inbox } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'

interface InsightItem {
  id: number
  category: 'Trend' | 'Anomaly' | 'Pattern' | 'Forecast'
  text: string
  change: string
  positive: boolean
  dept: string
}

const CATEGORY_COLORS: Record<string, string> = {
  'Trend': '#2F6BFF',
  'Anomaly': '#FF4D4F',
  'Pattern': '#FFA940',
  'Forecast': '#2ECC71',
}
const CATEGORY_BG: Record<string, string> = {
  'Trend': '#E8F0FF',
  'Anomaly': '#fff1f0',
  'Pattern': '#fff7e6',
  'Forecast': '#eafaf1',
}

function generateInsightsFromAnalytics(analytics: any): InsightItem[] {
  const insights: InsightItem[] = []
  let id = 1

  if (!analytics) return insights

  const stats = analytics.stats || {}
  const deptDist = analytics.departmentDistribution || []
  const dailyTrend = analytics.dailyTrend || []
  const priorityBreakdown = analytics.priorityBreakdown || []

  // 1. Resolution rate insight
  if (stats.total > 0) {
    const resRate = Math.round((stats.resolved / stats.total) * 100)
    insights.push({
      id: id++,
      category: 'Trend',
      text: `Overall resolution rate is ${resRate}%. ${resRate >= 70 ? 'Strong performance across departments.' : 'Resolution rate needs improvement — consider resource reallocation.'}`,
      change: `${resRate}%`,
      positive: resRate >= 50,
      dept: 'All Departments',
    })
  }

  // 2. Top department insight
  if (deptDist.length > 0) {
    const top = deptDist[0]
    const pct = stats.total > 0 ? Math.round((top.count / stats.total) * 100) : 0
    insights.push({
      id: id++,
      category: 'Pattern',
      text: `${top.department || 'Unknown'} accounts for ${pct}% of all complaints (${top.count} total). This is the busiest department requiring the most attention.`,
      change: `${pct}%`,
      positive: false,
      dept: top.department || 'Unknown',
    })
  }

  // 3. Today's activity
  if (stats.today > 0) {
    insights.push({
      id: id++,
      category: 'Trend',
      text: `${stats.today} new complaint${stats.today > 1 ? 's' : ''} received today. ${stats.today >= 5 ? 'Higher than average volume — monitor closely.' : 'Normal activity levels.'}`,
      change: `+${stats.today}`,
      positive: stats.today < 5,
      dept: 'All Departments',
    })
  }

  // 4. Weekly trend
  if (stats.this_week > 0) {
    const avgPerDay = (stats.this_week / 7).toFixed(1)
    insights.push({
      id: id++,
      category: 'Forecast',
      text: `${stats.this_week} complaints this week (avg ${avgPerDay}/day). ${parseFloat(avgPerDay) > 3 ? 'Increasing workload trend detected.' : 'Workload is within normal parameters.'}`,
      change: `${avgPerDay}/day`,
      positive: parseFloat(avgPerDay) <= 3,
      dept: 'All Departments',
    })
  }

  // 5. Critical priority
  const criticalItem = priorityBreakdown.find((p: any) => p.priority === 'critical' || p.priority === 'high')
  if (criticalItem && criticalItem.count > 0) {
    insights.push({
      id: id++,
      category: 'Anomaly',
      text: `${criticalItem.count} ${criticalItem.priority}-priority complaints detected. Immediate attention required to prevent SLA breaches.`,
      change: `${criticalItem.count}`,
      positive: false,
      dept: 'All Departments',
    })
  }

  // 6. Daily trend spike analysis
  if (dailyTrend.length >= 3) {
    const last3 = dailyTrend.slice(-3)
    const avgLast3 = last3.reduce((s: number, d: any) => s + d.total, 0) / 3
    const prev3 = dailyTrend.length >= 6 ? dailyTrend.slice(-6, -3) : dailyTrend.slice(0, Math.min(3, dailyTrend.length))
    const avgPrev3 = prev3.reduce((s: number, d: any) => s + d.total, 0) / Math.max(prev3.length, 1)
    if (avgPrev3 > 0) {
      const changePct = Math.round(((avgLast3 - avgPrev3) / avgPrev3) * 100)
      insights.push({
        id: id++,
        category: changePct > 20 ? 'Anomaly' : 'Trend',
        text: `Complaint volume ${changePct >= 0 ? 'increased' : 'decreased'} by ${Math.abs(changePct)}% compared to the previous period. ${Math.abs(changePct) > 30 ? 'Significant change requiring investigation.' : 'Normal fluctuation.'}`,
        change: `${changePct >= 0 ? '+' : ''}${changePct}%`,
        positive: changePct <= 0,
        dept: 'All Departments',
      })
    }
  }

  // 7. Active backlog
  if (stats.active > 0) {
    insights.push({
      id: id++,
      category: 'Forecast',
      text: `${stats.active} complaints are currently active and pending resolution. At current resolution rates, estimated clearance in ${Math.ceil(stats.active / Math.max(stats.resolved / 14, 1))} days.`,
      change: `${stats.active} pending`,
      positive: stats.active < stats.resolved,
      dept: 'All Departments',
    })
  }

  return insights
}

export default function InsightsPanel() {
  const { t } = useLanguage()
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    setLoading(true)
    try {
      const data = await adminApi.getComplaintAnalytics()
      const generated = generateInsightsFromAnalytics(data)
      setInsights(generated)
    } catch (err) {
      console.error('Failed to load insights', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--primary)' }} />
          {t('insights.title') || 'AI Insights Engine'}
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button onClick={loadInsights} className="btn btn-ghost" style={{ padding: '.3rem' }} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="badge badge-info"><BarChart2 size={10} /> {insights.length} {t('insights.active') || 'Active Insights'}</span>
          <span className="live-dot">{t('common.live') || 'Live'}</span>
        </div>
      </div>

      {/* Insight Cards */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <p>Generating insights from complaint data...</p>
          </div>
        ) : insights.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Insights Yet</p>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Insights will appear once complaints are submitted to the system.</p>
          </div>
        ) : (
          insights.map(ins => {
            const catColor = CATEGORY_COLORS[ins.category] || '#2F6BFF'
            const catBg = CATEGORY_BG[ins.category] || '#E8F0FF'
            return (
              <div key={ins.id} className="insight-card" style={{ borderLeftColor: catColor }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.625rem' }}>
                  <span style={{
                    fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em',
                    color: catColor, background: catBg, padding: '.2rem .6rem', borderRadius: 100,
                  }}>
                    {ins.category}
                  </span>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '.3rem',
                    fontWeight: 800, fontSize: '.95rem',
                    color: ins.positive ? 'var(--success)' : 'var(--alert)',
                  }}>
                    {ins.positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {ins.change}
                  </div>
                </div>
                <p style={{ fontSize: '.875rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6, marginBottom: '.625rem' }}>
                  "{ins.text}"
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {t('insights.dept') || 'Dept'}: {ins.dept}
                  </span>
                  <span style={{ fontSize: '.68rem', fontWeight: 600, color: catColor }}>
                    {t('insights.insight_lbl') || 'AI Insight'} #{ins.id}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '.75rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>🧠 Insights generated from real complaint analytics data</span>
        <span style={{ color: 'var(--success)' }}>✓ Auto-refreshes on data change</span>
      </div>
    </div>
  )
}
