import React, { useState, useEffect } from 'react'
import {
  Bell, MessageSquare, Send, CheckCircle2, XCircle, Clock,
  Smartphone, Mail, RefreshCw, Search, Smile, AlertTriangle,
  TrendingDown, Layers, ShieldCheck, CheckSquare, Filter
} from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'

export default function NotificationCenterPanel() {
  const { t } = useLanguage()

  // State
  const [analytics, setAnalytics] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'feedback'>('overview')

  // Search & Filter State (Logs)
  const [logSearch, setLogSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Search State (Feedback)
  const [feedbackSearch, setFeedbackSearch] = useState('')

  // Load Data
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [analyticsData, logsData] = await Promise.all([
        adminApi.getSubscriptionAnalytics(),
        adminApi.getSubscriptionLogs()
      ])
      setAnalytics(analyticsData)
      setLogs(logsData || [])
    } catch (err: any) {
      console.error('Failed to load status subscription data:', err)
      setError(err.message || 'Failed to load data from backend server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const ticketMatch = log.ticket_number?.toLowerCase().includes(logSearch.toLowerCase()) ||
                        log.citizen_name?.toLowerCase().includes(logSearch.toLowerCase()) ||
                        log.message?.toLowerCase().includes(logSearch.toLowerCase())
    const channelMatch = channelFilter === 'all' || log.channel === channelFilter
    const statusMatch = statusFilter === 'all' || log.delivery_status === statusFilter
    return ticketMatch && channelMatch && statusMatch
  })

  // Filter feedbacks based on search
  const confirmations = analytics?.confirmations || []
  const filteredConfirmations = confirmations.filter((c: any) => {
    return c.ticket_number?.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
           c.citizen_name?.toLowerCase().includes(feedbackSearch.toLowerCase()) ||
           c.department?.toLowerCase().includes(feedbackSearch.toLowerCase())
  })

  // Rendering Channel Icon
  const renderChannelIcon = (channel: string) => {
    switch (channel?.toLowerCase()) {
      case 'sms':
        return <Smartphone size={16} className="text-blue-400" />
      case 'whatsapp':
        return <MessageSquare size={16} className="text-green-400" />
      case 'email':
        return <Mail size={16} className="text-purple-400" />
      default:
        return <Bell size={16} className="text-gray-400" />
    }
  }

  // Rendering Status Badge
  const renderStatusBadge = (status: string) => {
    const map: Record<string, { label: string, color: string, bg: string, border: string }> = {
      delivered: { label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
      sent: { label: 'Sent', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
      queued: { label: 'Queued (Quiet Hours)', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
      failed: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    }
    const s = map[status?.toLowerCase()] || { label: status || 'Unknown', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' }
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.6rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`
      }}>
        {status?.toLowerCase() === 'queued' && <Clock size={12} style={{ marginRight: '0.25rem' }} />}
        {status?.toLowerCase() === 'delivered' && <CheckCircle2 size={12} style={{ marginRight: '0.25rem' }} />}
        {status?.toLowerCase() === 'failed' && <XCircle size={12} style={{ marginRight: '0.25rem' }} />}
        {s.label}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ── Header Area ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '1.25rem 1.5rem',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <Bell size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              {t('nav.notification_center', 'Notification & Alert Center')}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              Proactive citizen update status subscriptions, delivery logs, quiet-hours rules, and post-resolution satisfaction feedback.
            </p>
          </div>
        </div>

        <button 
          onClick={loadData}
          disabled={loading}
          className="btn btn-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Feed'}
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 12,
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={20} />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        gap: '1.5rem',
        paddingBottom: '0.25rem'
      }}>
        {[
          { id: 'overview', label: 'Analytics & Impact', count: null },
          { id: 'logs', label: 'Delivery Logs', count: filteredLogs.length },
          { id: 'feedback', label: 'Citizen Satisfaction Confirmations', count: filteredConfirmations.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '0.75rem 0.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
            {tab.count !== null && (
              <span style={{
                background: 'var(--border)',
                color: 'var(--text-primary)',
                fontSize: '0.7rem',
                padding: '0.1rem 0.4rem',
                borderRadius: 10,
                fontWeight: 600
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1.25rem'
          }}>
            {[
              {
                title: 'Active Subscriptions',
                value: analytics?.metrics?.subscriptionsCreated ?? 0,
                desc: 'Subscribed citizens receiving push notifications',
                icon: Bell,
                color: '#3b82f6',
                bg: 'rgba(59, 130, 246, 0.1)'
              },
              {
                title: 'Delivered Notifications',
                value: analytics?.metrics?.notificationsDelivered ?? 0,
                desc: 'Successful WhatsApp, SMS & Email updates sent',
                icon: Send,
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.1)'
              },
              {
                title: 'WhatsApp Engagement',
                value: analytics?.metrics?.whatsappEngagement ?? 0,
                desc: 'Notifications delivered via official WhatsApp Business',
                icon: MessageSquare,
                color: '#22c55e',
                bg: 'rgba(34, 197, 94, 0.1)'
              },
              {
                title: 'Citizen Confirmation Rate',
                value: analytics?.metrics?.confirmationRate ?? '0%',
                desc: 'Rate of closed issues reviewed by citizens',
                icon: CheckSquare,
                color: '#8b5cf6',
                bg: 'rgba(139, 92, 246, 0.1)'
              },
              {
                title: 'Citizen Satisfaction Rate',
                value: analytics?.metrics?.citizenSatisfactionRate ?? '0%',
                desc: 'Percentage of confirmed resolved cases',
                icon: Smile,
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.1)'
              },
              {
                title: 'Kiosk Visits Avoided',
                value: analytics?.metrics?.repeatKioskVisitsAvoided ?? 0,
                desc: 'Estimated physical kiosk visits avoided',
                icon: ShieldCheck,
                color: '#14b8a6',
                bg: 'rgba(20, 184, 166, 0.1)'
              }
            ].map((card, i) => (
              <div 
                key={i} 
                className="card" 
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 130,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{card.title}</span>
                    <h3 style={{ margin: '0.4rem 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{card.value}</h3>
                  </div>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <card.icon size={20} color={card.color} />
                  </div>
                </div>
                <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Core Impact & Projections */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            
            {/* Impact Metric Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <TrendingDown size={18} color="#ef4444" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Friction Reduction Metrics</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                  { label: 'Repeat Status-Check Tracking Reduction', value: analytics?.metrics?.repeatTrackingReduction ?? '0%', target: '60% Target', progress: parseInt(analytics?.metrics?.repeatTrackingReduction || '0') },
                  { label: 'Citizen Grievance Support Call Reduction', value: analytics?.metrics?.supportCallReduction ?? '0%', target: '40% Target', progress: parseInt(analytics?.metrics?.supportCallReduction || '0') }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981' }}>{item.value}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({item.target})</span>
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(item.progress, 100)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                        borderRadius: 4,
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Notification Policy Guard */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <ShieldCheck size={18} color="#3b82f6" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Quiet-Hours Guard & Policies</span>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The status subscription notification system is secured under **Quiet-Hours Protection** to prevent alert fatigue.
                </p>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginTop: '1.25rem',
                  background: 'var(--bg)',
                  padding: '1rem',
                  borderRadius: 12,
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Active Window</span>
                    <strong style={{ fontSize: '1.15rem', color: '#10b981', marginTop: '0.25rem', display: 'block' }}>08:00 AM - 09:00 PM</strong>
                  </div>
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Quiet Hours Queue</span>
                    <strong style={{ fontSize: '1.15rem', color: '#f59e0b', marginTop: '0.25rem', display: 'block' }}>Active (IST)</strong>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '1.25rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
                padding: '0.6rem 0.8rem',
                borderRadius: 8
              }}>
                <Clock size={14} className="text-blue-400" />
                <span>All messages scheduled during quiet hours are queued and dispatched on the hour.</span>
              </div>
            </div>

          </div>

          {/* Quick List: Recent satisfaction confirmations */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smile size={18} color="#f59e0b" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recent Citizen Confirmations</span>
              </div>
              <button 
                onClick={() => setActiveTab('feedback')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                View All feedback
              </button>
            </div>

            {filteredConfirmations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No satisfaction responses received yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ticket</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Citizen</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Department</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Resolved Correctly?</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConfirmations.slice(0, 5).map((c: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', fontWeight: 700 }}>{c.ticket_number}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.citizen_name || 'Anonymous'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.department || 'N/A'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 100,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: c.satisfaction_response === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: c.satisfaction_response === 1 ? '#10b981' : '#ef4444'
                          }}>
                            {c.satisfaction_response === 1 ? '👍 Yes, Fixed' : '👎 No, Still Broken'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(c.satisfaction_responded_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: LOGS ── */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            background: 'var(--bg)',
            padding: '1rem',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            
            {/* Search Input */}
            <div style={{ flex: '1 1 250px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                placeholder="Search ticket, name, message content..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Channel Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Channel:</span>
              <select
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value)}
                style={{
                  padding: '0.45rem 1.5rem 0.45rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Channels</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.45rem 1.5rem 0.45rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No notification logs matched the filter constraints.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ticket</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Citizen</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Channel</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Event Type</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Message Sent</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Delivery Status</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Dispatched At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                      {/* Ticket */}
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', fontWeight: 700 }}>
                        {log.ticket_number}
                      </td>
                      
                      {/* Citizen */}
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>
                          {log.citizen_name || 'Anonymous'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {log.department || 'General'}
                        </span>
                      </td>
                      
                      {/* Channel */}
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {renderChannelIcon(log.channel)}
                          <span style={{ textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                            {log.channel}
                          </span>
                        </div>
                      </td>
                      
                      {/* Event Type */}
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace'
                        }}>
                          {log.notification_type}
                        </span>
                      </td>
                      
                      {/* Message */}
                      <td style={{
                        padding: '0.75rem 0.5rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        maxWidth: 250,
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.4
                      }}>
                        {log.message}
                      </td>
                      
                      {/* Delivery Status */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {renderStatusBadge(log.delivery_status)}
                      </td>
                      
                      {/* Dispatched At */}
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.sent_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: FEEDBACK ── */}
      {activeTab === 'feedback' && (
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            background: 'var(--bg)',
            padding: '1rem',
            borderRadius: 12,
            border: '1px solid var(--border)'
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                value={feedbackSearch}
                onChange={e => setFeedbackSearch(e.target.value)}
                placeholder="Search ticket number, citizen name, department..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Feedback list */}
          {filteredConfirmations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No satisfaction confirmations matched the filter constraints.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ticket</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Citizen Name</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Department</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Feedback Response</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Responded At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConfirmations.map((c: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', fontWeight: 700 }}>
                        {c.ticket_number}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {c.citizen_name || 'Anonymous'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {c.department || 'General'}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 100,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: c.satisfaction_response === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: c.satisfaction_response === 1 ? '#10b981' : '#ef4444'
                        }}>
                          {c.satisfaction_response === 1 ? '👍 Yes, Fixed' : '👎 No, Still Broken'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(c.satisfaction_responded_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
