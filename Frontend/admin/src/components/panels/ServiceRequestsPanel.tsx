import React, { useState, useEffect, useRef } from 'react'
import { Search, Filter, RefreshCw, Eye, MoreVertical, Calendar, Phone, User, Clock, ChevronDown, BarChart2, AlertTriangle, CheckCircle2, Circle, Globe } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { deptKey } from '../../utils/deptFilter'

import { useLanguage } from '../../context/LanguageContext'
import { formatTimestamp } from '../../utils/formatTimestamp'

/* ── Status Badge ────────────────────────────────────────────── */
function RequestStatusBadge({ s }: { s: string }) {
  const { t } = useLanguage()
  const map: any = {
    'active': { label: t('service_req.hierarchy_status_active') || 'Active', class: 'badge-info' },
    'pending': { label: 'Pending', class: 'badge-info' },
    'resolved': { label: t('service_req.hierarchy_status_resolved') || 'Resolved', class: 'badge-success' },
    'completed': { label: 'Completed', class: 'badge-success' },
    'rejected': { label: t('service_req.hierarchy_status_rejected') || 'Rejected', class: 'badge-danger' },
  }
  const status = map[s?.toLowerCase()] || { label: s, class: 'badge-info' }
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
  const display = p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Medium'
  return <span className={`badge ${map[p?.toLowerCase()] || 'badge-info'}`}>{display}</span>
}

const HIERARCHY_STAGES = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'created', label: 'Created' },
  { id: 'officer_assigned', label: 'Officer Assigned' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'working', label: 'In Progress' },
  { id: 'manager_review', label: 'Manager Review' },
  { id: 'gm_approval', label: 'GM Approval' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'completed', label: 'Completed' }
];

function ProcessingHierarchy({ stage, status, createdAt, rejectionReason }: { stage: string, status: string, createdAt: string, rejectionReason?: string }) {
  const { t } = useLanguage()
  const isRejected = status === 'rejected';
  
  // Condense the stages for display
  const displayStages = [
    { id: 'created', label: t('service_req.hierarchy_stage_submitted') || 'Submitted' },
    { id: 'assigned', label: t('service_req.hierarchy_stage_officer') || 'Assigned' },
    { id: 'working', label: t('service_req.hierarchy_stage_manager') || 'In Progress' },
    { id: 'completed', label: t('service_req.hierarchy_stage_resolved') || 'Completed' }
  ];

  let currentIndex = displayStages.findIndex(s => s.id === stage);
  if (currentIndex === -1) currentIndex = 0;
  if (status === 'resolved' || status === 'completed') currentIndex = 3;

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingBottom: '1rem', flexWrap: 'nowrap', overflowX: 'auto' }}>
      <div style={{ position: 'absolute', top: '13px', left: '10%', right: '10%', height: '2px', background: 'var(--border)', zIndex: 0 }}></div>
      <div style={{ 
        position: 'absolute', top: '13px', left: '10%', height: '2px', 
        background: isRejected ? 'var(--danger)' : 'var(--primary)', zIndex: 0, 
        width: `${(currentIndex / (displayStages.length - 1)) * 80}%`, 
        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
      }}></div>

      {displayStages.map((s, idx) => {
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
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ServiceRequestsPanel() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const myDept = user ? deptKey(user.department) : ''

  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)



  const requestCounterRef = useRef(0)

  const loadRequests = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    
    const currentReqId = ++requestCounterRef.current;

    try {
      const params: any = { page, limit: 50 }
      if (statusFilter !== 'All') {
        params.status = statusFilter
      }
      
      console.log('📡 [Admin] Fetching service requests...', params)
      const res = await adminApi.getAllServiceRequests(params)
      
      // Ignore if a newer request was initiated
      if (currentReqId !== requestCounterRef.current) return;

      console.log("REQUESTS RECEIVED:", res.data?.length);
      
      setRequests(res.data || [])
      setTotal(res.pagination?.total || 0)
    } catch (err: any) {
       if (currentReqId !== requestCounterRef.current) return;
       console.error('❌ [Admin] Failed to fetch service requests:', err)
    } finally {
      if (currentReqId === requestCounterRef.current) {
        setLoading(false)
      }
    }
  }, [page, statusFilter])

  useEffect(() => {
    loadRequests()

    // Safe Polling every 10 seconds
    const interval = setInterval(() => {
         loadRequests(true); 
    }, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [loadRequests])

  // Frontend filtering for search
  // ✅ FIX: 'All Active Requests' now shows pending + submitted + in_progress.
  // This ensures utility service requests (stored as 'submitted') are visible.
  const ACTIVE_STATUSES = ['pending', 'submitted', 'in_progress'];

  const filtered = requests.filter(r => {
    const matchesStatus = statusFilter === 'All'
       ? ACTIVE_STATUSES.includes(r.status)
       : r.status === statusFilter;

    const tkt = (r.ticket_number || '').toLowerCase();
    const name = (r.citizen_name || '').toLowerCase();
    const type = (r.request_type || '').toLowerCase();
    const s = search.toLowerCase();

    return matchesStatus && (tkt.includes(s) || name.includes(s) || type.includes(s));
  })

  async function handleUpdateStage(id: string, newStage: string) {
    try {
      setLoading(true)
      await adminApi.updateServiceRequestStatus(id, { current_stage: newStage })
      await loadRequests(false)
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
      await adminApi.updateServiceRequestStatus(id, { status: 'rejected', rejection_reason: reason })
      await loadRequests()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(id: string) {
    if (!confirm("Are you sure you want to resolve this request?")) return;
    try {
      setLoading(true)
      await adminApi.updateServiceRequestStatus(id, { current_stage: 'completed', status: 'completed' })
      await loadRequests(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const criticalCount = requests.filter(r => r.priority === 'critical').length
  const pendingCount = requests.filter(r => r.status !== 'resolved' && r.status !== 'rejected' && r.status !== 'completed').length
  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Page Header & Stats ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {t('nav.service_req') || 'Service Requests'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('service_req.desc') || 'Manage and track all utility service applications and technical requests.'}</p>
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
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('service_req.active_requests') || 'Active Requests'}</div>
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
            placeholder={t('service_req.search_placeholder') || "Search by ticket, name, or request type..."}
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
            <option value="All">{t('service_req.status_filter_all') || 'All Active Requests'}</option>
            <option value="pending">{t('service_req.status_filter_active') || 'Pending'}</option>
            {/* ✅ FIX: Explicit filter option for utility requests (Electricity, Gas, Municipal) */}
            <option value="submitted">{t('service_req.status_filter_submitted') || 'Submitted (Utility)'}</option>
            <option value="working">{t('service_req.status_filter_in_progress') || 'In Progress'}</option>
            <option value="completed">{t('service_req.status_filter_resolved') || 'Completed'}</option>
            <option value="rejected">{t('service_req.status_filter_rejected') || 'Rejected'}</option>
          </select>

          <button 
            onClick={() => loadRequests()}
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
                <th>{t('service_req.table_ticket') || 'Ticket ID'}</th>
                <th>{t('service_req.table_citizen') || 'Citizen Details'}</th>
                <th>{t('service_req.table_service') || 'Service & Description'}</th>
                <th>{t('service_req.table_dept') || 'Department'}</th>
                <th>{t('triage.priority') || 'Priority'}</th>
                <th>{t('service_req.table_submitted') || 'Submitted'}</th>
                <th>{t('service_req.table_status') || 'Status'}</th>
                <th style={{ textAlign: 'right' }}>{t('service_req.table_actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '4rem' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', opacity: 0.5 }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{t('service_req.fetching') || 'Fetching latest requests...'}</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('service_req.no_requests') || 'No requests found'}</p>
                    <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{t('service_req.no_requests_sub') || 'Try adjusting your search or filters.'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  let aiData: any = null;
                  try {
                    if (r.metadata && typeof r.metadata === 'string') {
                      const parsed = JSON.parse(r.metadata);
                      aiData = parsed.ai_analysis;
                    } else if (r.metadata && typeof r.metadata === 'object') {
                      aiData = r.metadata.ai_analysis;
                    }
                  } catch(e) {}

                  return (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '.85rem' }}>
                          {r.ticket_number}
                        </span>
                        {aiData?.duplicate?.is_duplicate && (
                           <div style={{ fontSize: '0.65rem', color: '#FF4D4F', fontWeight: 700, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                             <AlertTriangle size={10} /> Duplicate {Math.round(aiData.duplicate.similarity*100)}%
                           </div>
                        )}
                        {aiData?.validation?.is_spam && (
                           <div style={{ fontSize: '0.65rem', background: '#FF4D4F', color: 'white', padding: '1px 4px', borderRadius: 4, fontWeight: 700, marginTop: '0.2rem', display: 'inline-block' }}>
                             SPAM
                           </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 800 }}>
                            {r.citizen_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{r.citizen_name || 'No Name Provided'}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{r.citizen_mobile || t('service_req.no_phone') || 'No Phone'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text-primary)' }}>
                          {r.request_type || 'General Service'}
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', maxWidth: 200, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.description}
                        </div>
                        <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <a 
                            href={`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(r.description || '')}&op=translate`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ fontSize: '0.65rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <Globe size={10} /> Translate
                          </a>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{r.department}</span>
                        {aiData?.sentiment && (
                           <div style={{ marginTop: '0.2rem' }}>
                             <span style={{ fontSize: '0.65rem', background: '#F3F4F6', color: '#4B5563', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                               AI: {aiData.sentiment.sentiment}
                             </span>
                           </div>
                        )}
                      </td>
                      <td>
                        <PriorityBadge p={r.priority} />
                      </td>
                      <td>
                        <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                             <Calendar size={12} /> {formatTimestamp(r.created_at || r.createdAt)}
                           </div>
                        </div>
                      </td>
                      <td>
                        <RequestStatusBadge s={r.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '.4rem', background: expandedRow === r.id ? 'var(--primary-light)' : 'transparent' }} 
                            title="View Tracker"
                            onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                          >
                            <Eye size={16} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '.4rem' }}>
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRow === r.id && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                              <div>
                                <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{t('service_req.workflow_title') || 'Workflow Progression'}</h4>
                                <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{t('service_req.workflow_desc') || 'Stage-based lifecycle for service applications.'}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg)', padding: '0.5rem 1rem', borderRadius: 12, border: '1px solid var(--border)' }}>
                                <label style={{ fontSize: '.85rem', fontWeight: 700 }}>{t('service_req.stage') || 'Stage:'}</label>
                                <select 
                                  value={r.current_stage || 'created'}
                                  onChange={(e) => handleUpdateStage(r.id, e.target.value)}
                                  disabled={loading || ['resolved', 'completed', 'rejected'].includes(r.status)}
                                  style={{ padding: '.4rem .5rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '.85rem', background: 'var(--bg-light)', fontWeight: 600 }}
                                >
                                  {HIERARCHY_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                                <button onClick={() => handleResolve(r.id)} className="btn btn-success" disabled={loading || ['resolved', 'completed', 'rejected'].includes(r.status)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>{t('service_req.btn_resolve') || '✅ Resolve'}</button>
                                <button onClick={() => handleReject(r.id)} className="btn btn-danger" disabled={loading || ['resolved', 'completed', 'rejected'].includes(r.status)} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>{t('service_req.btn_reject') || '❌ Reject'}</button>
                              </div>
                            </div>
                            <div className="card" style={{ padding: '0 2rem 1rem 2rem', background: 'var(--bg)' }}>
                              <ProcessingHierarchy stage={r.current_stage || 'created'} status={r.status} createdAt={r.created_at} rejectionReason={r.rejection_reason} />
                              {r.rejection_reason && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: '#FF4D4F10', borderRadius: 12, border: '1px solid #FF4D4F30', color: '#FF4D4F', fontSize: '0.85rem' }}>
                                  <strong>{t('service_req.rejection_reason') || 'Rejection Reason:'}</strong> {r.rejection_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
            {t('service_req.showing') || 'Showing'} <strong>{filtered.length}</strong> {t('service_req.of') || 'of'} <strong>{total}</strong> {t('service_req.service_requests') || 'service requests'}
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="btn btn-outline" 
              style={{ padding: '.4rem .8rem', fontSize: '.8rem' }}
            >
              {t('service_req.prev') || 'Previous'}
            </button>
            <button 
              disabled={requests.length < 50}
              onClick={() => setPage(p => p + 1)}
              className="btn btn-outline" 
              style={{ padding: '.4rem .8rem', fontSize: '.8rem' }}
            >
              {t('service_req.next') || 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
