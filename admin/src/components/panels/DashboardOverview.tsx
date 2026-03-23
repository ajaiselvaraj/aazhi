import React, { useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import {
  MessageSquare, CheckCircle, AlertTriangle, Cpu,
  Copy, ShieldAlert, Clock, TrendingUp, Users, CreditCard, RefreshCw
} from 'lucide-react'

interface DashboardData {
  citizens: { total: string; active: string }
  bills: { total: string; pending: string; paid: string; overdue: string; revenue: string }
  complaints: { total: string; new: string; in_progress: string; resolved: string }
  service_requests: { total: string; new: string; completed: string }
  transactions: { total: string; total_collected: string }
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const stats = await adminApi.getDashboardStats()
      setData(stats)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
      console.error('[DashboardOverview]', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (loading) {
    return (
      <div className="section-gap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading dashboard data from server…</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="section-gap">
        <div className="page-header"><h1>Dashboard Overview</h1></div>
        <div className="card card-danger" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <AlertTriangle size={24} color="var(--alert)" />
          <div>
            <div style={{ fontWeight: 700 }}>Failed to load dashboard</div>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: '.25rem' }}>{error}</p>
          </div>
          <button className="btn btn-primary" onClick={fetchStats} style={{ marginLeft: 'auto' }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    )
  }

  const d = data!
  const totalComplaints = parseInt(d.complaints.total) || 0
  const resolvedComplaints = parseInt(d.complaints.resolved) || 0
  const pendingSR = parseInt(d.service_requests.new) || 0
  const completedSR = parseInt(d.service_requests.completed) || 0
  const totalCitizens = parseInt(d.citizens.total) || 0
  const revenue = parseFloat(d.bills.revenue) || 0
  const totalTransactions = parseInt(d.transactions.total) || 0

  const stats = [
    { label: 'Total Complaints', value: totalComplaints.toLocaleString(), icon: MessageSquare, color: '#2F6BFF', bg: '#E8F0FF', delta: `${parseInt(d.complaints.new)} new` },
    { label: 'Resolved', value: resolvedComplaints.toLocaleString(), icon: CheckCircle, color: '#2ECC71', bg: '#eafaf1', delta: totalComplaints > 0 ? `${Math.round((resolvedComplaints / totalComplaints) * 100)}% rate` : 'N/A', up: true },
    { label: 'Critical (In Progress)', value: (parseInt(d.complaints.in_progress) || 0).toLocaleString(), icon: AlertTriangle, color: '#FF4D4F', bg: '#fff1f0', delta: 'Needs attention', up: false },
    { label: 'Service Requests', value: (parseInt(d.service_requests.total) || 0).toLocaleString(), icon: Cpu, color: '#9b59b6', bg: '#f5eef8', delta: `${completedSR} completed` },
    { label: 'Pending SR', value: pendingSR.toLocaleString(), icon: Clock, color: '#FFA940', bg: '#fff7e6', delta: 'Awaiting action', up: false },
    { label: 'Revenue Collected', value: `₹${revenue.toLocaleString()}`, icon: CreditCard, color: '#2ECC71', bg: '#eafaf1', delta: `${totalTransactions} transactions`, up: true },
    { label: 'Registered Citizens', value: totalCitizens.toLocaleString(), icon: Users, color: '#2F6BFF', bg: '#E8F0FF', delta: `${parseInt(d.citizens.active)} active`, up: true },
    { label: 'Pending Bills', value: (parseInt(d.bills.pending) || 0).toLocaleString(), icon: TrendingUp, color: '#FFA940', bg: '#fff7e6', delta: `${parseInt(d.bills.overdue)} overdue`, up: false },
  ]

  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p>Live data from the AAZHI backend server.</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchStats}><RefreshCw size={16} /> Refresh</button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.1rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card animate-in" style={{ animationDelay: `${i * .05}s` }}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-delta ${s.up ? 'up' : 'down'}`}>{s.delta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Status Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1c2e 0%, #1a2d45 100%)',
        borderRadius: 16, padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
        border: '1px solid rgba(47,107,255,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #2F6BFF, #1a55e8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 4px 20px rgba(47,107,255,.4)',
          }}>
            <Cpu size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
              Backend Connected — All Systems Operational
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.2rem' }}>
              Live data sync · Complaints · Service Requests · Billing · Citizens
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            { label: 'Total Bills', val: parseInt(d.bills.total).toLocaleString(), color: '#2ECC71' },
            { label: 'Paid Bills', val: parseInt(d.bills.paid).toLocaleString(), color: '#2ECC71' },
            { label: 'Overdue', val: parseInt(d.bills.overdue).toLocaleString(), color: '#FFA940' },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: m.color, fontFamily: 'Poppins,sans-serif' }}>{m.val}</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)', marginTop: '.1rem' }}>{m.label}</div>
            </div>
          ))}
        </div>
        <span className="live-dot">Live</span>
      </div>
    </div>
  )
}
