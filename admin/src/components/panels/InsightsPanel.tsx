import React, { useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { BarChart2, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react'

export default function InsightsPanel() {
  const [srAnalytics, setSrAnalytics] = useState<any>(null)
  const [payStats, setPayStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState(30)

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [sr, pay] = await Promise.all([
        adminApi.getServiceRequestAnalytics(period),
        adminApi.getPaymentStats(period),
      ])
      setSrAnalytics(sr)
      setPayStats(pay)
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [period])

  if (loading) {
    return (
      <div className="section-gap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading analytics…</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="section-gap">
        <div className="page-header"><h1>Insights & Analytics</h1></div>
        <div className="card card-danger" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <AlertTriangle size={24} color="var(--alert)" />
          <div>
            <div style={{ fontWeight: 700 }}>Failed to load analytics</div>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{error}</p>
          </div>
          <button className="btn btn-primary" onClick={fetchData} style={{ marginLeft: 'auto' }}><RefreshCw size={16} /> Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="section-gap animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Insights & Analytics</h1>
          <p>Service request and payment analytics from the backend (last {period} days).</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {[7, 30, 90].map(p => (
            <button key={p} className={`btn ${period === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPeriod(p)} style={{ padding: '.5rem 1rem', fontSize: '.8rem' }}>
              {p}D
            </button>
          ))}
          <button className="btn btn-ghost" onClick={fetchData}><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Service Requests by Department */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="section-title"><BarChart2 size={18} color="var(--primary)" /> Requests by Department</div>
          {srAnalytics?.by_department?.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Department</th><th>Count</th></tr></thead>
              <tbody>
                {srAnalytics.by_department.map((row: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.department || 'Unknown'}</td>
                    <td><span className="badge badge-info">{row.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No data for this period.</p>}
        </div>

        <div className="card">
          <div className="section-title"><TrendingUp size={18} color="var(--success)" /> Requests by Status</div>
          {srAnalytics?.by_status?.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Status</th><th>Count</th></tr></thead>
              <tbody>
                {srAnalytics.by_status.map((row: any, i: number) => {
                  const badgeClass = row.status === 'completed' ? 'badge-success' : row.status === 'submitted' ? 'badge-warning' : 'badge-info'
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{row.status}</td>
                      <td><span className={`badge ${badgeClass}`}>{row.count}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No data for this period.</p>}
        </div>
      </div>

      {/* Payment Stats */}
      {payStats?.summary && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="section-title"><BarChart2 size={18} color="var(--warning)" /> Payment Summary (Last {period} days)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Total Transactions', value: parseInt(payStats.summary.total_transactions).toLocaleString(), color: 'var(--primary)' },
              { label: 'Successful', value: parseInt(payStats.summary.successful).toLocaleString(), color: 'var(--success)' },
              { label: 'Failed', value: parseInt(payStats.summary.failed).toLocaleString(), color: 'var(--alert)' },
              { label: 'Revenue Collected', value: `₹${parseFloat(payStats.summary.total_collected).toLocaleString()}`, color: 'var(--success)' },
              { label: 'Avg Amount', value: `₹${parseFloat(payStats.summary.avg_amount).toFixed(2)}`, color: 'var(--primary)' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--bg)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'Poppins,sans-serif' }}>{s.value}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.25rem', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Trend */}
      {srAnalytics?.daily_trend?.length > 0 && (
        <div className="card">
          <div className="section-title"><TrendingUp size={18} color="var(--primary)" /> Daily Request Trend</div>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Requests</th></tr></thead>
            <tbody>
              {srAnalytics.daily_trend.slice(0, 14).map((row: any, i: number) => (
                <tr key={i}>
                  <td>{new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td><span className="badge badge-info">{row.count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
