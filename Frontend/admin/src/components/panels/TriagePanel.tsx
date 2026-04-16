import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, Eye, MoreVertical, Calendar, Clock, BarChart2, AlertTriangle, CheckCircle2, Circle, Globe } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { deptKey } from '../../utils/deptFilter'

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ s }: { s: string }) {
  const map: any = {
    'active': { label: 'Active', class: 'badge-info' },
    'resolved': { label: 'Resolved', class: 'badge-success' },
    'rejected': { label: 'Rejected', class: 'badge-danger' },
  }
  const status = map[s] || { label: s, class: 'badge-info' }
  return <span className={`badge ${status.class}`}>{status.label}</span>
}

/* ── Priority Badge ──────────────────────────────────────────── */
function PriorityBadge({ p }: { p: string }) {
  const map: any = { 
    'critical': 'badge-danger', 
    'high': 'badge-warning', 
    'medium': 'badge-info', 
    'low': 'badge-success' 
  }
  // Convert DB value to Title Case for display
  const display = p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Medium'
  return <span className={`badge ${map[p] || 'badge-info'}`}>{display}</span>
}

/* ── Processing Hierarchy Component ──────────────────────────── */
const HIERARCHY_STAGES = [
  { id: 'pending', label: 'Pending' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'closed', label: 'Closed' }
];

function ProcessingHierarchy({ stage, status, createdAt, rejectionReason }: { stage: string, status: string, createdAt: string, rejectionReason?: string }) {
  const isRejected = status === 'rejected';
  let currentIndex = HIERARCHY_STAGES.findIndex(s => s.id === stage);
  if (currentIndex === -1) currentIndex = 0;
  if (status === 'resolved') currentIndex = 4;

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingBottom: '1rem', flexWrap: 'nowrap', overflowX: 'auto' }}>
      {/* Background Track Line */}
      <div style={{ position: 'absolute', top: '13px', left: '10%', right: '10%', height: '2px', background: 'var(--border)', zIndex: 0 }}></div>
      
      {/* Active Fill Line */}
      <div style={{ 
        position: 'absolute', top: '13px', left: '10%', height: '2px', 
        background: isRejected ? 'var(--danger)' : 'var(--primary)', zIndex: 0, 
        width: `${(currentIndex / (HIERARCHY_STAGES.length - 1)) * 80}%`, 
        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
      }}></div>

      {HIERARCHY_STAGES.map((s, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const stageColor = isRejected && isCurrent ? 'var(--danger)' : 'var(--primary)';

        return (
          <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1, minWidth: '120px' }}>
            <div style={{ 
              width: 28, height: 28, borderRadius: '50%', 
              background: isCompleted ? (isRejected ? 'var(--danger)' : 'var(--primary)') : isCurrent ? 'var(--bg)' : 'var(--bg)',
              border: isCompleted ? 'none' : isCurrent ? `3px solid ${stageColor}` : '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isCompleted ? '#FFF' : 'var(--border)',
              boxShadow: isCurrent ? `0 0 0 4px ${isRejected ? 'rgba(255, 77, 79, 0.2)' : 'var(--primary-light)'}` : 'none',
              transition: 'all 0.3s ease'
            }}>
              {isCompleted ? <CheckCircle2 size={16} /> : isCurrent ? (isRejected ? <AlertTriangle size={16} color="var(--danger)" /> : <Circle size={10} fill="var(--primary)" color="var(--primary)" />) : <Circle size={10} />}
            </div>
            
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '.75rem', fontWeight: isCurrent ? 800 : 700, color: isCurrent || isCompleted ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </div>
              {isCurrent && (
                <div style={{ fontSize: '.7rem', color: stageColor, marginTop: '.35rem', fontWeight: 700 }}>
                  {isRejected ? 'Rejected Here' : 'Current Level'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TriagePanel() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const myDept = user ? deptKey(user.department) : ''

  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const [isFetching, setIsFetching] = useState(false) // New lock for safe polling

  useEffect(() => {
    const controller = new AbortController() // AbortController to manage duplicate inflight requests
    
    const fetchWrapper = async () => {
      if (isFetching) return;
      await loadComplaints(false, controller.signal)
    }

    fetchWrapper()

    // Safe Polling every 10 seconds
    const interval = setInterval(async () => {
       if (!isFetching) { 
         await loadComplaints(true, controller.signal); 
       }
    }, 10000)

    return () => {
      clearInterval(interval)
      controller.abort() // Cancel any pending request on unmount/re-render
    }
  }, [page, statusFilter]) // Keep dependencies tight

  async function loadComplaints(silent = false, signal?: AbortSignal) {
    if (!silent) setLoading(true)
    setIsFetching(true)
    try {
      const params: any = { page, limit: 100 }
      // If "All" is selected, we don't send a specific status filter to get all active-like items
      if (statusFilter !== 'All') {
        params.status = statusFilter
      }
      
      console.log('📡 [Admin] Fetching complaints...', params)
      // Remove the hard-coded { ..., status: 'active' } which was overriding everything
      const res = await adminApi.getAllComplaints(params)
      console.log('✅ [Admin] Received complaints:', res.data?.length)
      
      setComplaints(res.data || [])
      setTotal(res.pagination?.total || 0)
    } catch (err: any) {
      if (err.name === 'AbortError') {
         console.log('⚠️ [Admin] Fetch aborted due to component unmount.');
      } else {
         console.error('❌ [Admin] Failed to fetch complaints:', err)
      }
    } finally {
      setLoading(false)
      setIsFetching(false)
    }
  }

  // Frontend filtering for search and department isolation
  const filtered = complaints.filter(c => {
    // Show all if 'All' is selected, or exact match if a filter is set
    const matchesStatus = statusFilter === 'All' 
       ? (c.status !== 'resolved' && c.status !== 'rejected') 
       : c.status === statusFilter;

    return matchesStatus &&
    (c.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
     c.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
     c.description?.toLowerCase().includes(search.toLowerCase()) ||
     c.category?.toLowerCase().includes(search.toLowerCase()));
  })

  async function handleUpdateStage(id: string, newStatus: string) {
    try {
      setLoading(true)
      await adminApi.updateComplaintStatus(id, { status: newStatus })
      await loadComplaints(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return;
    try {
      setLoading(true)
      await adminApi.updateComplaintStatus(id, { status: 'rejected', rejection_reason: reason })
      await loadComplaints(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(id: string) {
    if (!confirm("Are you sure you want to resolve this complaint?")) return;
    try {
      setLoading(true)
      await adminApi.updateComplaintStatus(id, { status: 'resolved' })
      await loadComplaints(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const criticalCount = complaints.filter(c => c.priority === 'critical').length
  const pendingCount = complaints.filter(c => c.status !== 'resolved' && c.status !== 'rejected').length

  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Page Header & Stats ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {t('nav.complaints') || 'All Complaints'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('triage.desc') || 'Manage and triage citizen complaints across all departments.'}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="card" style={{ padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 140 }}>
            <div style={{ padding: '.5rem', borderRadius: 8, background: '#FF4D4F15', color: '#FF4D4F' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{criticalCount}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('triage.critical_iss') || 'Critical Priority'}</div>
            </div>
          </div>
          <div className="card" style={{ padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 140 }}>
            <div style={{ padding: '.5rem', borderRadius: 8, background: '#FFA94015', color: '#FFA940' }}>
              <BarChart2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{pendingCount}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('triage.active_complaints') || 'Active Issues'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder={t('common.search') || "Search by ID, name, or description..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '.75rem 1rem .75rem 2.5rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '.75rem' }}>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '.75rem 1rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Active Issues</option>
            <option value="active">Active (New)</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button 
            onClick={() => loadComplaints()}
            className="btn btn-outline" 
            style={{ padding: '.75rem', borderRadius: 12 }}
            title="Refresh list"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Data Table ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('triage.ticket_id') || 'Ticket ID'}</th>
                <th>{t('triage.citizen') || 'Citizen Details'}</th>
                <th>{t('triage.category') || 'Category / Details'}</th>
                <th>{t('triage.department') || 'Department'}</th>
                <th>{t('triage.priority') || 'Priority'}</th>
                <th>{t('triage.submitted_on') || 'Submitted On'}</th>
                <th>{t('triage.status') || 'Status'}</th>
                <th style={{ textAlign: 'right' }}>{t('triage.actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '4rem' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', opacity: 0.5 }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Fetching all complaints...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No complaints found</p>
                    <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '.85rem' }}>
                          {c.ticket_number || c.id.substring(0,8).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 800 }}>
                            {c.citizen_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{c.citizen_name || 'Anonymous'}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{c.citizen_mobile || 'No Phone'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text-primary)' }}>
                          {c.category || 'General Issue'}
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', maxWidth: 200, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {c.description}
                        </div>
                        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {c.language && (
                            <span style={{ fontSize: '0.65rem', background: '#F3F4F6', color: '#4B5563', padding: '0.15rem 0.4rem', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                              <Globe size={10} />
                              Lang: {c.language === 'hi' ? 'Hindi' : c.language === 'as' ? 'Assamese' : 'English'}
                            </span>
                          )}
                          <a 
                            href={`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(c.description || '')}&op=translate`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ fontSize: '0.65rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            Translate
                          </a>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                          {c.department || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <PriorityBadge p={c.priority} />
                      </td>
                      <td>
                        <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                            <Calendar size={12} /> {new Date(c.created_at).toLocaleDateString()}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginTop: '.1rem' }}>
                            <Clock size={12} /> {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusBadge s={c.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '.4rem', background: expandedRow === c.id ? 'var(--primary-light)' : 'transparent' }} 
                            title={expandedRow === c.id ? "Close Details" : "View Processing Hierarchy"}
                            onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                          >
                            <Eye size={16} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '.4rem' }}>
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === c.id && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ padding: '2rem', animation: 'fadeIn 0.2s ease-in-out' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                              <div>
                                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '.25rem' }}>Processing Hierarchy Tracker</h4>
                                <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Real-time progression path mirroring the Citizen portal view.</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg)', padding: '0.5rem 1rem', borderRadius: 12, border: '1px solid var(--border)' }}>
                                <label style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status Update:</label>
                                <select 
                                  value={c.status || 'pending'}
                                  onChange={(e) => handleUpdateStage(c.id, e.target.value)}
                                  disabled={loading}
                                  style={{ padding: '.4rem .5rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  {HIERARCHY_STAGES.map(s => (
                                    <option key={s.id} value={s.id}>{s.label}</option>
                                  ))}
                                </select>
                                <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 0.5rem' }}></div>
                                <button 
                                  onClick={() => handleResolve(c.id)}
                                  className="btn btn-success" 
                                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                  disabled={loading}
                                >
                                  ✅ Resolve
                                </button>
                                <button 
                                  onClick={() => handleReject(c.id)}
                                  className="btn btn-danger" 
                                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                  disabled={loading}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            </div>
                            
                            <div className="card" style={{ padding: '0 2rem 1rem 2rem', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                              <ProcessingHierarchy stage={c.status || 'pending'} status={c.status} createdAt={c.created_at} rejectionReason={c.rejection_reason} />
                              {c.rejection_reason && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: '#FF4D4F10', borderRadius: 12, border: '1px solid #FF4D4F30', color: '#FF4D4F', fontSize: '0.85rem' }}>
                                  <strong>Rejection Reason:</strong> {c.rejection_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filtered.length}</strong> of <strong>{complaints.length}</strong> complaints
          </div>
        </div>
      </div>
    </div>
  )
}
