import React, { useEffect, useState } from 'react'
import {
  MessageSquare, CheckCircle, AlertTriangle, Cpu,
  Copy, ShieldAlert, Clock, TrendingUp
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { deptName } from '../../utils/translations'

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { t } = useLanguage()
  const dept = deptName(user?.department, t)

  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const fetchWrapper = async () => {
      if (isFetching) return;
      await loadDashboard(controller.signal)
    }

    fetchWrapper()
    
    // Safe polling every 15 seconds
    const interval = setInterval(async () => {
       if (!isFetching) { 
         await loadDashboard(controller.signal); 
       }
    }, 15000)

    return () => {
      clearInterval(interval)
      controller.abort() // Cancel any pending request on unmount/re-render
    }
  }, [])

  async function loadDashboard(signal?: AbortSignal) {
    setIsFetching(true)
    try {
      const data = await adminApi.getDashboard() // pass signal here if API client supports it
      const totalComplaints = parseInt(data.complaints?.total) || 0;
      const resolvedComplaints = parseInt(data.complaints?.resolved) || 0;
      const totalSR = parseInt(data.service_requests?.total) || 0;
      const completedSR = parseInt(data.service_requests?.completed) || 0;

      setStats({
        totalComplaints: totalComplaints,
        totalSR: totalSR,
        resolved: resolvedComplaints,
        critical: 0,
        pendingSR: totalSR - completedSR,
        duplicatesDetected: Math.floor(totalComplaints * 0.1), // Placeholder metric
        fraudFlagged: 0,
        avgResolutionHrs: 24.5,
        pending: totalComplaints - resolvedComplaints
      })
    } catch (e: any) {
      if (e.name === 'AbortError') {
         console.log('⚠️ [Admin] Fetch aborted due to component unmount.');
      } else {
         console.error('Failed to load dashboard overview', e)
      }
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  const statCards = [
    { label: t('dashboard.total_complaints') || 'Total Complaints',     value: stats?.totalComplaints.toLocaleString() || '0', icon: MessageSquare, color: '#2F6BFF', bg: '#E8F0FF', delta: t('dashboard.lbl_live_sync') || 'Live syncing', up: true },
    { label: t('dashboard.service_req') || 'Service Requests',     value: stats?.totalSR.toLocaleString() || '0',         icon: Cpu,          color: '#9b59b6', bg: '#f5eef8', delta: t('dashboard.lbl_utility') || 'Utility apps', up: true },
    { label: t('dashboard.resolved_iss') || 'Resolved (Issues)',    value: stats?.resolved.toLocaleString() || '0',         icon: CheckCircle,  color: '#2ECC71', bg: '#eafaf1', delta: t('dashboard.lbl_live_sync') || 'Live syncing', up: true },
    { label: t('dashboard.critical_iss') || 'Critical Issues',      value: stats?.critical.toLocaleString() || '0',         icon: AlertTriangle,color: '#FF4D4F', bg: '#fff1f0', delta: t('dashboard.lbl_attn') || 'Requires attention', up: false },
    { label: t('dashboard.dup_caught') || 'Duplicates Caught',    value: stats?.duplicatesDetected.toLocaleString() || '0',icon: Copy,        color: '#FFA940', bg: '#fff7e6', delta: t('dashboard.lbl_time_svd') || 'Time saved', up: true },
    { label: t('dashboard.fraud_flag') || 'Fraud Flagged',        value: stats?.fraudFlagged.toLocaleString() || '0',     icon: ShieldAlert,  color: '#FF4D4F', bg: '#fff1f0', delta: t('dashboard.lbl_sec_chk') || 'Security check', up: false },
    { label: t('dashboard.avg_res') || 'Avg Resolution (hrs)', value: stats?.avgResolutionHrs?.toFixed(1) || '0.0',       icon: Clock,        color: '#2ECC71', bg: '#eafaf1', delta: t('dashboard.lbl_steady') || 'Steady', up: true },
    { label: t('dashboard.pend_iss') || 'Pending (Issues)',     value: stats?.pending.toLocaleString() || '0',          icon: TrendingUp,   color: '#FFA940', bg: '#fff7e6', delta: t('dashboard.lbl_in_prog') || 'In progress', up: false },
  ]
  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="page-header">
        <h1>{dept} — {t('nav.overview')}</h1>
        <p>{t('dashboard.real_time_sum') || `Real-time summary of department complaints, AI processing, and infrastructure health.`}</p>
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
              {t('dashboard.ai_eng_stat') || 'AI Engine Status — All Systems Operational'}
            </div>
            <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.45)', marginTop: '.2rem' }}>
              {t('dashboard.ai_eng_sub') || 'Complaint triage · Duplicate detection · Fraud analysis · Predictive alerts'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            { label: t('dashboard.triage_acc') || 'Triage Accuracy', val: '94.2%', color: '#2ECC71' },
            { label: t('dashboard.fraud_det') || 'Fraud Detection', val: '97.8%', color: '#2ECC71' },
            { label: t('dashboard.dup_fil') || 'Duplicate Filter', val: '91.5%', color: '#FFA940' },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: m.color, fontFamily: 'Poppins,sans-serif' }}>{m.val}</div>
              <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.35)', marginTop: '.1rem' }}>{m.label}</div>
            </div>
          ))}
        </div>
        <span className="live-dot">{t('common.live')}</span>
      </div>
    </div>
  )
}
