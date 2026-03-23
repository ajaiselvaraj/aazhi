import React, { useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { MessageSquare, RefreshCw, AlertTriangle, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

export default function TriagePanel() {
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null)
  const limit = 15

  const fetchComplaints = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.getAllComplaints({
        page,
        limit,
        status: statusFilter || undefined,
        department: deptFilter || undefined,
      })
      // Handle paginated response — result might have .data and .pagination
      if (Array.isArray(result)) {
        setComplaints(result)
        setTotal(result.length)
      } else {
        setComplaints(result.data || result.rows || [])
        setTotal(result.pagination?.total || result.total || 0)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComplaints() }, [page, statusFilter, deptFilter])

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await adminApi.updateComplaintStatus(id, newStatus)
      fetchComplaints()
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    }
  }

  const priorityBadge = (priority: string) => {
    const cls = priority === 'critical' ? 'badge-danger' : priority === 'high' ? 'badge-warning' : 'badge-info'
    return <span className={`badge ${cls}`}>{priority || 'normal'}</span>
  }

  const statusBadge = (status: string) => {
    const cls = status === 'resolved' ? 'badge-success' : status === 'submitted' ? 'badge-warning' : status === 'in_progress' ? 'badge-info' : 'badge-dark'
    return <span className={`badge ${cls}`}>{status}</span>
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="section-gap animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Complaints Management</h1>
          <p>All citizen complaints from the database. Total: {total}</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchComplaints}><RefreshCw size={16} /> Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="form-select" style={{ width: 180, borderRadius: 10, padding: '.5rem .75rem', fontSize: '.85rem' }}>
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
          className="form-select" style={{ width: 200, borderRadius: 10, padding: '.5rem .75rem', fontSize: '.85rem' }}>
          <option value="">All Departments</option>
          <option value="electricity">Electricity</option>
          <option value="water">Water Supply</option>
          <option value="gas">Gas</option>
          <option value="municipal">Municipal</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <div style={{ textAlign: 'center' }}>
            <RefreshCw size={28} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading…</p>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div className="card card-danger" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <AlertTriangle size={24} color="var(--alert)" />
          <div><div style={{ fontWeight: 700 }}>Error</div><p style={{ fontSize: '.85rem' }}>{error}</p></div>
          <button className="btn btn-primary" onClick={fetchComplaints} style={{ marginLeft: 'auto' }}><RefreshCw size={16} /> Retry</button>
        </div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <MessageSquare size={40} color="var(--text-muted)" style={{ margin: '0 auto .75rem' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No complaints found</p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Try adjusting the filters above.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Citizen</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '.85rem' }}>{c.ticket_number || c.id?.slice(0, 8)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.citizen_name || '—'}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{c.citizen_mobile || ''}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{c.department || '—'}</td>
                    <td>{priorityBadge(c.priority)}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '.35rem .5rem', fontSize: '.75rem' }}
                          onClick={() => setSelectedComplaint(c)}>
                          <Eye size={14} /> View
                        </button>
                        {c.status !== 'resolved' && c.status !== 'closed' && (
                          <button className="btn btn-primary" style={{ padding: '.35rem .5rem', fontSize: '.75rem' }}
                            onClick={() => handleStatusUpdate(c.id, c.status === 'submitted' ? 'in_progress' : 'resolved')}>
                            {c.status === 'submitted' ? 'Accept' : 'Resolve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} ({total} total)
            </span>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={16} /> Prev
              </button>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedComplaint && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSelectedComplaint(null)}>
          <div className="card animate-in" style={{ maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Complaint Details</h3>
            {[
              ['Ticket', selectedComplaint.ticket_number || selectedComplaint.id],
              ['Citizen', selectedComplaint.citizen_name],
              ['Mobile', selectedComplaint.citizen_mobile],
              ['Department', selectedComplaint.department],
              ['Category', selectedComplaint.category],
              ['Priority', selectedComplaint.priority],
              ['Status', selectedComplaint.status],
              ['Description', selectedComplaint.description],
              ['Location', selectedComplaint.location],
              ['Created', selectedComplaint.created_at ? new Date(selectedComplaint.created_at).toLocaleString() : '—'],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ marginBottom: '.75rem' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                <div style={{ fontWeight: 500, marginTop: '.15rem' }}>{String(val || '—')}</div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => setSelectedComplaint(null)} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
