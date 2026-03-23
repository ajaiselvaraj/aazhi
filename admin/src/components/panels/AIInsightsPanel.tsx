import React, { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Zap, Clock, Activity, Brain, Tag } from 'lucide-react'
import {
  aiComplaintTrend, aiDeptDistribution, aiPriorityBreakdown,
  aiSentimentDistribution, aiModelHealth,
} from '../../data/mockData'
import { checkHealth, type HealthResult } from '../../api/aiApi'

/* ── Metric Card ──────────────────────────────────────────────── */

function MetricCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.5rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
          <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
        </div>
      </div>
      <div style={{ fontSize: '.68rem', color, fontWeight: 600 }}>{sub}</div>
    </div>
  )
}

/* ── Live Health Banner ───────────────────────────────────────── */

function HealthBanner({ health }: { health: HealthResult | null }) {
  const online = health?.status === 'healthy'
  return (
    <div className="card" style={{
      padding: '.65rem 1.25rem', marginBottom: '1.25rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: online ? '#2ECC7108' : '#FF4D4F08',
      border: `1px solid ${online ? '#2ECC7130' : '#FF4D4F30'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: online ? '#2ECC71' : '#FF4D4F',
          boxShadow: online ? '0 0 6px #2ECC7180' : '0 0 6px #FF4D4F80',
          animation: online ? 'pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontSize: '.82rem', fontWeight: 700, color: online ? '#2ECC71' : '#FF4D4F' }}>
          AI Service — {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        {health && <>
          <span>Model: {health.model_loaded ? '✓ Loaded' : '✗ Not loaded'}</span>
          <span>Service: {health.service}</span>
        </>}
        {!health && <span>Checking…</span>}
      </div>
    </div>
  )
}

/* ── Chart Wrappers ───────────────────────────────────────────── */

function ChartCard({ title, children, span = 1 }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', gridColumn: `span ${span}` }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <div className="icon-dot" style={{ background: 'var(--primary)' }} />
        <span style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>
        {children}
      </div>
    </div>
  )
}

/* ── Main Panel ───────────────────────────────────────────────── */

export default function AIInsightsPanel() {
  const [health, setHealth] = useState<HealthResult | null>(null)

  useEffect(() => {
    let mounted = true
    async function poll() {
      try {
        const h = await checkHealth()
        if (mounted) setHealth(h)
      } catch {
        if (mounted) setHealth(null)
      }
    }
    poll()
    const id = setInterval(poll, 15_000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return (
    <div>
      {/* ── Live Health ───────────────────────────────────────── */}
      <HealthBanner health={health} />

      {/* ── Model Health Metrics ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <MetricCard label="Model Accuracy" value={`${aiModelHealth.accuracy}%`} sub="Last 7 days" icon={<Zap size={16} />} color="#2ECC71" />
        <MetricCard label="Avg Latency" value={`${aiModelHealth.avgLatency}ms`} sub="Per classification" icon={<Clock size={16} />} color="#2F6BFF" />
        <MetricCard label="Uptime" value={`${aiModelHealth.uptime}%`} sub="30-day rolling" icon={<Activity size={16} />} color="#FFA940" />
        <MetricCard label="Total Classified" value={aiModelHealth.totalClassified.toLocaleString()} sub={`Last retrained ${aiModelHealth.lastRetrained}`} icon={<Brain size={16} />} color="#9b59b6" />
      </div>

      {/* ── Chart Grid ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>

        {/* Complaint Trend */}
        <ChartCard title="Complaint Volume — 7 Day Trend" span={2}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={aiComplaintTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-complaints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F6BFF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2F6BFF" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="grad-resolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#162236', border: 'none', borderRadius: 10, fontSize: '.78rem', color: '#fff' }}
                cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '.74rem', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="complaints" stroke="#2F6BFF" fill="url(#grad-complaints)" strokeWidth={2} name="Complaints" dot={{ r: 3, fill: '#2F6BFF' }} />
              <Area type="monotone" dataKey="resolved" stroke="#2ECC71" fill="url(#grad-resolved)" strokeWidth={2} name="Resolved" dot={{ r: 3, fill: '#2ECC71' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Department Distribution */}
        <ChartCard title="Department Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={aiDeptDistribution} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                paddingAngle={4} strokeWidth={0}
              >
                {aiDeptDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#162236', border: 'none', borderRadius: 10, fontSize: '.78rem', color: '#fff' }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '.74rem', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Breakdown */}
        <ChartCard title="Priority Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aiPriorityBreakdown} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#162236', border: 'none', borderRadius: 10, fontSize: '.78rem', color: '#fff' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                {aiPriorityBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sentiment Distribution */}
        <ChartCard title="Citizen Sentiment Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={aiSentimentDistribution} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                paddingAngle={4} strokeWidth={0}
              >
                {aiSentimentDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#162236', border: 'none', borderRadius: 10, fontSize: '.78rem', color: '#fff' }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: '.74rem', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Keywords */}
        <ChartCard title="AI Top Extracted Keywords">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', padding: '.5rem 0' }}>
            {aiModelHealth.topKeywords.map((kw, i) => (
              <span key={kw} className="keyword-tag" style={{
                fontSize: i < 3 ? '.88rem' : '.78rem',
                padding: i < 3 ? '.4rem .9rem' : '.3rem .7rem',
                fontWeight: i < 3 ? 700 : 500,
                opacity: 1 - (i * 0.05),
              }}>
                <Tag size={12} style={{ marginRight: 4 }} />
                {kw}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
