import React, { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle, Minus,
  Sparkles, Clock, BarChart2, Inbox, Zap
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'

interface ForecastDay {
  day_offset: number
  predicted_count: number
  confidence: number
  lower_bound: number
  upper_bound: number
}

interface Anomaly {
  day_index: number
  actual: number
  expected: number
  deviation: number
}

interface ForecastData {
  forecast: ForecastDay[]
  trend: string
  slope: number
  avg_daily: number
  total_historical_days: number
  anomalies: Anomaly[]
  smoothed_history: number[]
  processing_time_ms: number
  ml_method: string
  historical: { date: string; total: number; resolved: number }[]
}

export default function MLForecastPanel() {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadForecast() }, [])

  async function loadForecast() {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApi.getMLForecast()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load forecast')
    } finally {
      setLoading(false)
    }
  }

  const trendIcon = (t: string) => {
    if (t === 'increasing') return <TrendingUp size={18} color="#FF4D4F" />
    if (t === 'decreasing') return <TrendingDown size={18} color="#2ECC71" />
    return <Minus size={18} color="#2F6BFF" />
  }

  const trendColor = (t: string) => {
    if (t === 'increasing') return '#FF4D4F'
    if (t === 'decreasing') return '#2ECC71'
    return '#2F6BFF'
  }

  return (
    <div className="section-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ═══ Header Banner ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2040 50%, #1a1040 100%)',
        borderRadius: 16, padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
        border: '1px solid rgba(99,102,241,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,.4)',
          }}>
            <Zap size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              🔮 ML Complaint Forecaster
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.15rem' }}>
              Linear regression + exponential smoothing • Predicts next 7 days
            </div>
          </div>
        </div>
        {data && (
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: trendColor(data.trend), display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                {trendIcon(data.trend)} {data.trend.toUpperCase()}
              </div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)' }}>Trend</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFA940' }}>{data.avg_daily}</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)' }}>Avg/Day</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2F6BFF' }}>{data.total_historical_days}d</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)' }}>History</div>
            </div>
          </div>
        )}
        <button onClick={loadForecast} className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,.15)', color: '#fff' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
          <p>Running ML forecast regression analysis...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#FF4D4F', background: '#fff1f0', border: '1px solid #FF4D4F' }}>
          <AlertTriangle size={24} style={{ margin: '0 auto .5rem' }} />
          <p><strong>Error:</strong> {error}</p>
        </div>
      ) : !data?.historical?.length ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Not Enough Data</p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Need at least 3 days of complaint data for forecasting.</p>
        </div>
      ) : (
        <>
          {/* ═══ ML Method badge ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem 1rem',
            background: 'rgba(99,102,241,.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,.15)',
            fontSize: '.78rem', color: '#6366f1', fontWeight: 600,
          }}>
            <Sparkles size={14} /> ML Method: {data.ml_method} • Slope: {data.slope > 0 ? '+' : ''}{data.slope.toFixed(2)} complaints/day
          </div>

          {/* ═══ Historical + Forecast Chart ═══ */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.25rem' }}>
              <BarChart2 size={18} color="#6366f1" />
              <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Historical Data + 7-Day ML Forecast</span>
            </div>

            {/* Chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.2rem', height: 160, padding: '.5rem 0' }}>
              {/* Historical bars */}
              {data.historical.map((d, i) => {
                const allVals = [...data.historical.map(h => h.total), ...data.forecast.map(f => f.predicted_count)]
                const max = Math.max(...allVals, 1)
                const h = Math.max((d.total / max) * 140, 4)
                return (
                  <div key={`h-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.15rem' }}>
                    <div style={{ fontSize: '.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.total}</div>
                    <div style={{
                      width: '80%', height: h, borderRadius: '4px 4px 0 0',
                      background: 'linear-gradient(180deg, #2F6BFF, #6366f1)',
                    }} />
                    <div style={{ fontSize: '.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                )
              })}

              {/* Divider */}
              <div style={{ width: 2, height: 160, background: 'var(--border)', borderRadius: 1, margin: '0 .15rem', flexShrink: 0 }} />

              {/* Forecast bars */}
              {data.forecast.map((f, i) => {
                const allVals = [...data.historical.map(h => h.total), ...data.forecast.map(fc => fc.predicted_count)]
                const max = Math.max(...allVals, 1)
                const h = Math.max((f.predicted_count / max) * 140, 4)
                const opacity = 0.4 + f.confidence * 0.5
                return (
                  <div key={`f-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.15rem' }}>
                    <div style={{ fontSize: '.6rem', fontWeight: 700, color: '#FFA940' }}>{f.predicted_count}</div>
                    <div style={{
                      width: '80%', height: h, borderRadius: '4px 4px 0 0',
                      background: `linear-gradient(180deg, rgba(255,169,64,${opacity}), rgba(255,122,0,${opacity}))`,
                      border: '1px dashed rgba(255,169,64,.4)',
                    }} />
                    <div style={{ fontSize: '.5rem', color: '#FFA940', whiteSpace: 'nowrap' }}>
                      +{f.day_offset}d
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '.75rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#2F6BFF' }} /> Historical
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#FFA940', border: '1px dashed rgba(255,169,64,.6)' }} /> ML Forecast
              </span>
            </div>
          </div>

          {/* ═══ Forecast Details ═══ */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '1rem' }}>📊 7-Day Forecast Details</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '.5rem' }}>Day</th>
                    <th style={{ padding: '.5rem' }}>Predicted</th>
                    <th style={{ padding: '.5rem' }}>Confidence</th>
                    <th style={{ padding: '.5rem' }}>Range</th>
                    <th style={{ padding: '.5rem' }}>Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forecast.map(f => (
                    <tr key={f.day_offset}>
                      <td style={{ padding: '.4rem .5rem', fontWeight: 600 }}>Day +{f.day_offset}</td>
                      <td style={{ padding: '.4rem .5rem', fontWeight: 700, color: '#FFA940' }}>{f.predicted_count}</td>
                      <td style={{ padding: '.4rem .5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                          <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${f.confidence * 100}%`, height: '100%', background: f.confidence > 0.7 ? '#2ECC71' : f.confidence > 0.5 ? '#FFA940' : '#FF4D4F', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '.68rem', fontWeight: 600 }}>{Math.round(f.confidence * 100)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '.4rem .5rem', fontSize: '.72rem', color: 'var(--text-muted)' }}>{f.lower_bound} – {f.upper_bound}</td>
                      <td style={{ padding: '.4rem .5rem' }}>
                        <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((f.predicted_count / Math.max(data.avg_daily * 2, 1)) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #FFA940, #ff7a00)', borderRadius: 4, transition: 'width .5s' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ Anomalies ═══ */}
          {data.anomalies?.length > 0 && (
            <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(255,77,79,.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
                <AlertTriangle size={18} color="#FF4D4F" />
                <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#FF4D4F' }}>Anomalies Detected</span>
              </div>
              {data.anomalies.map((a, i) => (
                <div key={i} style={{ padding: '.6rem', background: '#fff1f0', borderRadius: 8, marginBottom: '.5rem', fontSize: '.8rem' }}>
                  Day {a.day_index + 1}: <strong>{a.actual}</strong> complaints (expected ~{a.expected}) — <strong>{a.deviation}x</strong> deviation
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      {data && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0 .5rem' }}>
          <span>🧠 Powered by ML linear regression + exponential smoothing</span>
          <span><Clock size={10} /> Processed in {data.processing_time_ms}ms</span>
        </div>
      )}
    </div>
  )
}
