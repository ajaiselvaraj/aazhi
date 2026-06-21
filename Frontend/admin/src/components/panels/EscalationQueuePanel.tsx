// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Escalation Queue Panel (Admin)
// Shows all citizen escalation requests with approve/reject actions
// Follows existing admin panel design patterns exactly
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Clock, User, FileText, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface EscalationRequest {
  id: string
  complaint_id: string
  ticket_number: string
  subject: string
  department: string
  complaint_status: string
  citizen_name: string
  citizen_mobile: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  reviewed_by_name: string | null
  created_at: string
  reviewed_at: string | null
}

interface Analytics {
  total_requests: number
  pending_requests: number
  approved_requests: number
  rejected_requests: number
  sla_breached_complaints: number
  escalated_complaints: number
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending'  },
  approved: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EscalationQueuePanel() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<EscalationRequest[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [actionModal, setActionModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = (user as any)?.token || localStorage.getItem('accessToken')
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/escalations${filter !== 'all' ? `?status=${filter}` : ''}`, { headers }),
        fetch(`${API_BASE}/api/admin/escalation-analytics`, { headers }),
      ])
      const reqJson = await reqRes.json()
      const analyticsJson = await analyticsRes.json()

      if (reqJson.success) setRequests(reqJson.data || [])
      if (analyticsJson.success) setAnalytics(analyticsJson.data)
    } catch { /* non-critical */ } finally {
      setLoading(false)
    }
  }, [filter, token])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleAction = async () => {
    if (!actionModal) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/escalations/${actionModal.id}/${actionModal.action}`,
        { method: 'POST', headers, body: JSON.stringify({ admin_note: adminNote }) }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Action failed')
      setActionModal(null)
      setAdminNote('')
      await fetchAll()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const statCards = analytics ? [
    { label: 'Pending Review', value: analytics.pending_requests,        color: '#854d0e', bg: '#fef9c3', icon: <Clock size={18} /> },
    { label: 'SLA Breached',  value: analytics.sla_breached_complaints,  color: '#991b1b', bg: '#fee2e2', icon: <AlertTriangle size={18} /> },
    { label: 'Escalated',     value: analytics.escalated_complaints,      color: '#1e40af', bg: '#dbeafe', icon: <AlertTriangle size={18} /> },
    { label: 'Total Requests', value: analytics.total_requests,           color: '#166534', bg: '#dcfce7', icon: <FileText size={18} /> },
  ] : []

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={22} style={{ color: 'var(--warning)' }} />
          Escalation Queue
        </h1>
        <p>Review and action citizen escalation requests. Approved requests trigger an immediate escalation.</p>
      </div>

      {/* Stat Cards */}
      {analytics && (
        <div className="grid-4 mb-6">
          {statCards.map(c => (
            <div key={c.label} className="stat-card">
              <div className="stat-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
              <div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs + Refresh */}
      <div className="card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="pill-tabs" style={{ padding: 0, border: 'none', gap: 6 }}>
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button key={f} className={`pill-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && analytics?.pending_requests ? (
                  <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>
                    {analytics.pending_requests}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={fetchAll} style={{ gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading escalation requests…</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <CheckCircle size={40} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No {filter !== 'all' ? filter : ''} escalation requests</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Citizen</th>
                <th>Reason</th>
                <th>Department</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const badge = STATUS_BADGE[req.status]
                return (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--primary)' }}>{req.ticket_number}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{req.subject?.slice(0, 30)}{req.subject?.length > 30 ? '…' : ''}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{req.citizen_name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.citizen_mobile}</div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{req.reason}</div>
                      {req.admin_note && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>Admin: {req.admin_note}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{req.department}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(req.created_at)}</td>
                    <td>
                      <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </td>
                    <td>
                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            onClick={() => { setActionModal({ id: req.id, action: 'approve' }); setAdminNote('') }}
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            onClick={() => { setActionModal({ id: req.id, action: 'reject' }); setAdminNote('') }}
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '2rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: actionModal.action === 'approve' ? 'var(--success)' : 'var(--alert)' }}>
              {actionModal.action === 'approve' ? '✅ Approve Escalation' : '❌ Reject Escalation'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {actionModal.action === 'approve'
                ? 'This will immediately escalate the complaint to the next officer level.'
                : 'The escalation request will be marked as rejected.'}
            </p>
            <div className="form-group">
              <label className="form-label">Admin Note (optional)</label>
              <textarea
                className="form-input"
                style={{ resize: 'vertical', minHeight: 80 }}
                placeholder={actionModal.action === 'approve' ? 'e.g. Approved — verified urgent case' : 'e.g. Not urgent enough, officer is active'}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
              />
            </div>
            {error && <p style={{ color: 'var(--alert)', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setActionModal(null); setError(null) }}>Cancel</button>
              <button
                className={`btn ${actionModal.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                onClick={handleAction}
                disabled={submitting}
              >
                {submitting ? 'Processing…' : actionModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
