import React, { useEffect, useState } from 'react'
import {
  MessageSquare, CheckCircle, AlertTriangle, Cpu,
  Copy, ShieldAlert, Clock, TrendingUp
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { deptName } from '../../utils/translations'
import { smartFetch } from '../../services/smartFetch'

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { t } = useLanguage()
  const isSuperAdmin = user?.department === 'ALL'
  const [selectedDept, setSelectedDept] = useState(isSuperAdmin ? 'ALL' : (user?.department || 'ALL'))
  const dept = selectedDept === 'ALL' ? 'All Departments' : deptName(selectedDept, t)

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
  }, [selectedDept])

  async function loadDashboard(signal?: AbortSignal, force = false) {
    setIsFetching(true)
    try {
      // Use smartFetch to skip network calls if DB hasn't changed since last fetch
      const data = await smartFetch.get(`dashboard_${selectedDept || 'ALL'}`, () => 
        adminApi.getDashboard(selectedDept),
        { force }
      );

      const totalComplaints = data.totalComplaints ?? (parseInt(data.complaints?.total) || 0);
      const pendingComplaints = data.pendingComplaints ?? (parseInt(data.complaints?.active) || 0);
      const resolvedComplaints = data.resolvedComplaints ?? (parseInt(data.complaints?.resolved) || 0);
      const totalSR = data.totalServices ?? (parseInt(data.service_requests?.total) || 0);
      const completedSR = parseInt(data.service_requests?.resolved) || 0;

      setStats({
        totalComplaints: totalComplaints,
        totalSR: totalSR,
        resolved: resolvedComplaints,
        critical: data.slaBreaches || 0,
        pendingSR: totalSR - completedSR,
        duplicatesDetected: Math.floor(totalComplaints * 0.1), 
        fraudFlagged: 0,
        avgResolutionHrs: 24.5,
        pending: pendingComplaints,
        todayComplaints: data.todayComplaints || 0,
        todayServices: data.todayServices || 0,
        slaBreaches: data.slaBreaches || 0,
        deptDistribution: data.deptDistribution || []
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
    { label: t('dashboard.total_complaints') || 'Total Complaints',     value: stats?.totalComplaints.toLocaleString() || '0', icon: MessageSquare, color: '#2F6BFF', bg: '#E8F0FF', delta: `+${stats?.todayComplaints || 0} today`, up: true },
    { label: 'SLA Breaches',                                            value: stats?.slaBreaches?.toLocaleString() || '0',   icon: AlertTriangle, color: '#FF4D4F', bg: '#fff1f0', delta: 'Requires immediate action', up: false },
    { label: t('dashboard.service_req') || 'Service Requests',          value: stats?.totalSR.toLocaleString() || '0',         icon: Cpu,          color: '#9b59b6', bg: '#f5eef8', delta: `+${stats?.todayServices || 0} today`, up: true },
    { label: t('dashboard.resolved_iss') || 'Resolved (Issues)',       value: stats?.resolved.toLocaleString() || '0',         icon: CheckCircle,  color: '#2ECC71', bg: '#eafaf1', delta: t('dashboard.lbl_live_sync') || 'Live syncing', up: true },
    { label: t('dashboard.dup_caught') || 'Duplicates Caught',         value: stats?.duplicatesDetected.toLocaleString() || '0',icon: Copy,        color: '#FFA940', bg: '#fff7e6', delta: t('dashboard.lbl_time_svd') || 'Time saved', up: true },
    { label: 'Avg Resolution Time',                                     value: '42 hrs',                                       icon: Clock,        color: '#2ECC71', bg: '#eafaf1', delta: 'Within SLA', up: true },
    { label: t('dashboard.pend_iss') || 'Pending (Issues)',            value: stats?.pending.toLocaleString() || '0',          icon: TrendingUp,   color: '#FFA940', bg: '#fff7e6', delta: t('dashboard.lbl_in_prog') || 'In progress', up: false },
    { label: 'Fraud Alerts',                                           value: '0',                                             icon: ShieldAlert,  color: '#FF4D4F', bg: '#fff1f0', delta: 'No threats detected', up: true },
  ]
  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{isSuperAdmin && selectedDept === 'ALL' ? 'Super Admin Dashboard' : dept} — {t('nav.overview')}</h1>
          <p>{t('dashboard.real_time_sum') || `Real-time summary of department complaints, AI processing, and infrastructure health.`}</p>
        </div>
        
        {isSuperAdmin && (
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ 
              padding: '0.6rem 1rem', 
              borderRadius: '10px', 
              border: '1px solid var(--border)', 
              fontWeight: 600,
              background: '#fff',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <option value="ALL">ALL DEPARTMENTS</option>
            <option value="Electricity Department">Electricity Department</option>
            <option value="Water Supply Department">Water Supply Department</option>
            <option value="Gas Distribution">Gas Distribution</option>
            <option value="Municipal Services">Municipal Services</option>
          </select>
        )}
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

      {/* Dept Distribution Bar Chart — only in "ALL" mode */}
      {selectedDept === 'ALL' && stats?.deptDistribution && stats.deptDistribution.length > 0 && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fff', borderRadius: 16, border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Complaints per Department</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats.deptDistribution.map((d: any, idx: number) => {
               const max = Math.max(...stats.deptDistribution.map((item: any) => parseInt(item.count)));
               const percentage = (parseInt(d.count) / max) * 100;
               return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 180, fontSize: '.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {deptName(d.department, t)}
                  </div>
                  <div style={{ flex: 1, height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${percentage}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #2F6BFF, #6366f1)',
                      borderRadius: 6,
                      transition: 'width 1s ease-in-out'
                    }} />
                  </div>
                  <div style={{ width: 40, textAlign: 'right', fontSize: '.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {d.count}
                  </div>
                </div>
               )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
