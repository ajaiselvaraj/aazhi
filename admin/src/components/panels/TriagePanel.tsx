import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, Eye, MoreVertical, Calendar, Clock, BarChart2, AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { deptKey } from '../../utils/deptFilter'

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ s }: { s: string }) {
  const map: any = {
    'submitted': { label: 'New', class: 'badge-info' },
    'acknowledged': { label: 'Pending', class: 'badge-warning' },
    'in_progress': { label: 'In Progress', class: 'badge-warning' },
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
  { id: 'submitted', label: 'Submitted' },
  { id: 'acknowledged', label: 'Officer Assigned' },
  { id: 'assigned', label: 'Manager Review' },
  { id: 'in_progress', label: 'GM Approval' },
  { id: 'resolved', label: 'Resolved' }
];

function ProcessingHierarchy({ currentStatus, createdAt }: { currentStatus: string, createdAt: string }) {
  let currentIndex = 0;
  if (currentStatus === 'acknowledged') currentIndex = 1;
  else if (currentStatus === 'assigned') currentIndex = 2;
  else if (currentStatus === 'in_progress') currentIndex = 3;
  else if (currentStatus === 'resolved' || currentStatus === 'closed') currentIndex = 4;

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingBottom: '1rem', flexWrap: 'nowrap', overflowX: 'auto' }}>
      {/* Background Track Line */}
      <div style={{ position: 'absolute', top: '13px', left: '10%', right: '10%', height: '2px', background: 'var(--border)', zIndex: 0 }}></div>
      
      {/* Active Fill Line */}
      <div style={{ 
        position: 'absolute', top: '13px', left: '10%', height: '2px', background: 'var(--primary)', zIndex: 0, 
        width: `${(currentIndex / (HIERARCHY_STAGES.length - 1)) * 80}%`, 
        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' 
      }}></div>

      {HIERARCHY_STAGES.map((stage, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <div key={stage.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1, minWidth: '120px' }}>
            <div style={{ 
              width: 28, height: 28, borderRadius: '50%', 
              background: isCompleted ? 'var(--primary)' : isCurrent ? 'var(--bg)' : 'var(--bg)',
              border: isCompleted ? 'none' : isCurrent ? '3px solid var(--primary)' : '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isCompleted ? '#FFF' : 'var(--border)',
              boxShadow: isCurrent ? '0 0 0 4px var(--primary-light)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {isCompleted ? <CheckCircle2 size={16} /> : isCurrent ? <Circle size={10} fill="var(--primary)" color="var(--primary)" /> : <Circle size={10} />}
            </div>
            
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '.75rem', fontWeight: isCurrent ? 800 : 700, color: isCurrent || isCompleted ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stage.label}
              </div>
              {isCurrent && (
                <div style={{ fontSize: '.7rem', color: 'var(--primary)', marginTop: '.35rem', fontWeight: 700 }}>
                  Current Level
                </div>
              )}
              {isCompleted && idx === 0 && (
                <div style={{ fontSize: '.65rem', color: 'var(--text-secondary)', marginTop: '.35rem' }}>
                  {new Date(createdAt).toLocaleDateString()}
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
  const myDept = user ? deptKey(user.department) : ''

  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    loadComplaints()
    const interval = setInterval(() => {
      loadComplaints(true); // silent refresh (pass true to avoid spinner jump if we want, currently will just re-fire)
    }, 30000)
    return () => clearInterval(interval)
  }, [page, statusFilter])

  async function loadComplaints(silent = false) {
    if (!silent) setLoading(true)
    try {
      const params: any = { page, limit: 100 }
      if (statusFilter !== 'All') params.status = statusFilter
      
      const res = await adminApi.getAllComplaints(params)
      setComplaints(res.data || [])
      setTotal(res.pagination?.total || 0)
    } catch (err) {
      console.error('❌ [Admin] Failed to fetch complaints:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function handleUpdateStatus(id: string, newStatus: string) {
    try {
      setLoading(true) // UI feedback
      await adminApi.updateComplaintStatus(id, newStatus)
      await loadComplaints(true) // silent refresh to pull updated stages
      setLoading(false)
    } catch (err) {
      console.error(err)
      alert('Failed to update status. Ensure you have proper admin permissions.')
      setLoading(false)
    }
  }

  // Frontend filtering for search and department isolation
  const filtered = complaints.filter(c => 
    (c.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
     c.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
     c.description?.toLowerCase().includes(search.toLowerCase()) ||
     c.category?.toLowerCase().includes(search.toLowerCase()))
  )

  const criticalCount = complaints.filter(c => c.priority === 'critical').length
  const pendingCount = complaints.filter(c => ['submitted', 'acknowledged', 'in_progress'].includes(c.status)).length

  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Page Header & Stats ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            All Complaints
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and triage citizen complaints across all departments.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="card" style={{ padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 140 }}>
            <div style={{ padding: '.5rem', borderRadius: 8, background: '#FF4D4F15', color: '#FF4D4F' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{criticalCount}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Critical Priority</div>
            </div>
          </div>
          <div className="card" style={{ padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 140 }}>
            <div style={{ padding: '.5rem', borderRadius: 8, background: '#FFA94015', color: '#FFA940' }}>
              <BarChart2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>{pendingCount}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Issues</div>
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
            placeholder="Search by ID, name, or description..."
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
            <option value="All">All Statuses</option>
            <option value="submitted">New / Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
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
                <th>Ticket ID</th>
                <th>Citizen Details</th>
                <th>Category / Details</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Submitted On</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                        <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', maxWidth: 200, WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', display: '-webkit-box' }}>
                          {c.description}
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
                            
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                              <div>
                                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '.25rem' }}>Processing Hierarchy Tracker</h4>
                                <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Real-time progression path mirroring the Citizen portal view.</p>
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {c.status === 'submitted' && (
                                  <button onClick={() => handleUpdateStatus(c.id, 'acknowledged')} className="btn btn-primary" style={{ fontSize: '.85rem', padding: '.5rem 1rem' }}>
                                    Assign Officer
                                  </button>
                                )}
                                {c.status === 'acknowledged' && (
                                  <button onClick={() => handleUpdateStatus(c.id, 'assigned')} className="btn btn-primary" style={{ fontSize: '.85rem', padding: '.5rem 1rem' }}>
                                    Pass to Manager Review
                                  </button>
                                )}
                                {c.status === 'assigned' && (
                                  <button onClick={() => handleUpdateStatus(c.id, 'in_progress')} className="btn btn-primary" style={{ fontSize: '.85rem', padding: '.5rem 1rem' }}>
                                    Approve for GM
                                  </button>
                                )}
                                {c.status === 'in_progress' && (
                                  <button onClick={() => handleUpdateStatus(c.id, 'resolved')} className="btn btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)', fontSize: '.85rem', padding: '.5rem 1rem' }}>
                                    Mark as Resolved
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="card" style={{ padding: '0 2rem 1rem 2rem', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                              <ProcessingHierarchy currentStatus={c.status} createdAt={c.created_at} />
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
