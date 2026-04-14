import React from 'react'
import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react'
import { aiInsights, AIInsight } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { filterByDept } from '../../utils/deptFilter'
import { useLanguage } from '../../context/LanguageContext'

const CATEGORY_COLORS = {
  'Trend':    '#2F6BFF',
  'Anomaly':  '#FF4D4F',
  'Pattern':  '#FFA940',
  'Forecast': '#2ECC71',
}
const CATEGORY_BG = {
  'Trend':    '#E8F0FF',
  'Anomaly':  '#fff1f0',
  'Pattern':  '#fff7e6',
  'Forecast': '#eafaf1',
}

export default function InsightsPanel() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const insights = user ? filterByDept(aiInsights, user.department) : aiInsights
  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--primary)' }} />
          {t('insights.title') || 'AI Insights Engine'}
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <span className="badge badge-info"><BarChart2 size={10} /> {insights.length} {t('insights.active') || 'Active Insights'}</span>
          <span className="live-dot">{t('common.live') || 'Live'}</span>
        </div>
      </div>

      {/* Insight Cards */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '1rem' }}>
        {insights.map(ins => {
          const catColor = CATEGORY_COLORS[ins.category]
          const catBg    = CATEGORY_BG[ins.category]
          return (
            <div key={ins.id} className="insight-card" style={{ borderLeftColor: catColor }}>
              {/* Top: Category + Change */}
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

              {/* Insight text */}
              <p style={{ fontSize: '.875rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6, marginBottom: '.625rem' }}>
                "{ins.text}"
              </p>

              {/* Footer */}
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
        })}
      </div>
    </div>
  )
}
