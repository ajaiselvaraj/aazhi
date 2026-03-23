import React from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import { workloadForecast, tomorrowForecast } from '../../data/mockData'

const SERIES = [
  { key: 'electricity', label: 'Electricity', color: '#FFA940' },
  { key: 'water',       label: 'Water Supply', color: '#2F6BFF' },
  { key: 'gas',         label: 'Gas Distribution', color: '#FF4D4F' },
  { key: 'municipal',   label: 'Municipal', color: '#2ECC71' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--dark)', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 10, padding: '.75rem 1rem', minWidth: 180,
    }}>
      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.75rem', marginBottom: '.5rem' }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '.2rem' }}>
          <span style={{ color: p.color, fontSize: '.8rem', fontWeight: 500 }}>{p.name}</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '.85rem' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function WorkloadForecastPanel() {
  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" />
          Department Workload Prediction
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <span className="badge badge-info"><TrendingUp size={10} /> 7-Day Forecast</span>
        </div>
      </div>

      {/* Tomorrow's snapshot */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid var(--border)',
      }}>
        {SERIES.map((s, i) => {
          const val = tomorrowForecast[s.key as keyof typeof tomorrowForecast]
          const isHigh = val > 60
          return (
            <div key={s.key} style={{
              padding: '.875rem 1.25rem',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.3rem' }}>
                Tomorrow · {s.label}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'Poppins,sans-serif' }}>
                {val}
              </div>
              <div style={{ fontSize: '.72rem', marginTop: '.2rem', color: isHigh ? 'var(--alert)' : 'var(--success)', fontWeight: 600 }}>
                {isHigh ? '↑ High Load' : '✓ Normal'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <div style={{ padding: '1.5rem', paddingTop: '1.25rem' }}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={workloadForecast} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <defs>
              {SERIES.map(s => (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '.78rem', paddingTop: '1rem' }}
              formatter={(v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
            />
            {SERIES.map(s => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
