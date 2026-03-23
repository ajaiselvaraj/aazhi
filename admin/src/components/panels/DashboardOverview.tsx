import React from 'react'
import { overviewStats } from '../../data/mockData'
import {
  MessageSquare, CheckCircle, AlertTriangle, Cpu,
  Copy, ShieldAlert, Clock, TrendingUp
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const stats = [
  { label: 'Total Complaints',     value: overviewStats.totalComplaints.toLocaleString(), icon: MessageSquare, color: '#2F6BFF', bg: '#E8F0FF', delta: '+14% this week', up: false },
  { label: 'Resolved',             value: overviewStats.resolved.toLocaleString(),         icon: CheckCircle,  color: '#2ECC71', bg: '#eafaf1', delta: '73% resolution rate', up: true },
  { label: 'Critical Issues',      value: overviewStats.critical.toLocaleString(),         icon: AlertTriangle,color: '#FF4D4F', bg: '#fff1f0', delta: '+3 today', up: false },
  { label: 'AI Routed',            value: overviewStats.aiRouted.toLocaleString(),         icon: Cpu,          color: '#9b59b6', bg: '#f5eef8', delta: '85.8% auto-routing', up: true },
  { label: 'Duplicates Caught',    value: overviewStats.duplicatesDetected.toLocaleString(),icon: Copy,        color: '#FFA940', bg: '#fff7e6', delta: 'Saved 189 tickets', up: true },
  { label: 'Fraud Flagged',        value: overviewStats.fraudFlagged.toLocaleString(),     icon: ShieldAlert,  color: '#FF4D4F', bg: '#fff1f0', delta: '2 new today', up: false },
  { label: 'Avg Resolution (hrs)', value: overviewStats.avgResolutionHrs.toFixed(1),       icon: Clock,        color: '#2ECC71', bg: '#eafaf1', delta: '-0.4h vs last week', up: true },
  { label: 'Pending',              value: overviewStats.pending.toLocaleString(),          icon: TrendingUp,   color: '#FFA940', bg: '#fff7e6', delta: 'Needs attention', up: false },
]

export default function DashboardOverview() {
  const { user } = useAuth()
  const dept = user?.department ?? 'All Departments'
  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="page-header">
        <h1>{dept} — Dashboard Overview</h1>
        <p>Real-time summary of {dept.toLowerCase()} complaints, AI processing, and infrastructure health.</p>
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
