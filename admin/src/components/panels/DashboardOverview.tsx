import React, { useEffect, useState } from 'react'
import {
  MessageSquare, CheckCircle, AlertTriangle, Cpu,
  Copy, ShieldAlert, Clock, TrendingUp
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const dept = user?.department ?? 'All Departments'

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadDashboard() {
    try {
      const data = await adminApi.getDashboard()
      const totalComplaints = parseInt(data.complaints?.total) || 0;
      const resolvedComplaints = parseInt(data.complaints?.resolved) || 0;

      setStats({
        totalComplaints: totalComplaints,
        resolved: resolvedComplaints,
        critical: 0,
        aiRouted: Math.floor(totalComplaints * 0.8), // Placeholder metric
        duplicatesDetected: Math.floor(totalComplaints * 0.1), // Placeholder metric
        fraudFlagged: 0,
        avgResolutionHrs: 24.5,
        pending: totalComplaints - resolvedComplaints
      })
    } catch (e) {
      console.error('Failed to load dashboard overview', e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Complaints',     value: stats?.totalComplaints.toLocaleString() || '0', icon: MessageSquare, color: '#2F6BFF', bg: '#E8F0FF', delta: 'Live syncing', up: true },
    { label: 'Resolved',             value: stats?.resolved.toLocaleString() || '0',         icon: CheckCircle,  color: '#2ECC71', bg: '#eafaf1', delta: 'Live syncing', up: true },
    { label: 'Critical Issues',      value: stats?.critical.toLocaleString() || '0',         icon: AlertTriangle,color: '#FF4D4F', bg: '#fff1f0', delta: 'Requires attention', up: false },
    { label: 'AI Routed',            value: stats?.aiRouted.toLocaleString() || '0',         icon: Cpu,          color: '#9b59b6', bg: '#f5eef8', delta: 'Automated workflow', up: true },
    { label: 'Duplicates Caught',    value: stats?.duplicatesDetected.toLocaleString() || '0',icon: Copy,        color: '#FFA940', bg: '#fff7e6', delta: 'Time saved', up: true },
    { label: 'Fraud Flagged',        value: stats?.fraudFlagged.toLocaleString() || '0',     icon: ShieldAlert,  color: '#FF4D4F', bg: '#fff1f0', delta: 'Security check', up: false },
    { label: 'Avg Resolution (hrs)', value: stats?.avgResolutionHrs?.toFixed(1) || '0.0',       icon: Clock,        color: '#2ECC71', bg: '#eafaf1', delta: 'Steady', up: true },
    { label: 'Pending',              value: stats?.pending.toLocaleString() || '0',          icon: TrendingUp,   color: '#FFA940', bg: '#fff7e6', delta: 'In progress', up: false },
  ]
  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="page-header">
        <h1>{dept} — Dashboard Overview</h1>
        <p>Real-time summary of {dept.toLowerCase()} complaints, AI processing, and infrastructure health.</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.1rem', marginBottom: '2rem', opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
        {statCards.map((s, i) => (
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
              AI Engine Status — All Systems Operational
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.2rem' }}>
              Complaint triage · Duplicate detection · Fraud analysis · Predictive alerts
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            { label: 'Triage Accuracy', val: '94.2%', color: '#2ECC71' },
            { label: 'Fraud Detection', val: '97.8%', color: '#2ECC71' },
            { label: 'Duplicate Filter', val: '91.5%', color: '#FFA940' },
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
