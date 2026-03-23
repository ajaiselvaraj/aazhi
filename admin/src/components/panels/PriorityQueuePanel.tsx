import React, { useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { ListOrdered, RefreshCw, AlertTriangle, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

export default function PriorityQueuePanel() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const limit = 15

  const fetchRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.getAllServiceRequests({
        page, limit,
        status: statusFilter || undefined,
        department: deptFilter || undefined,
      })
      if (Array.isArray(result)) {
        setRequests(result)
        setTotal(result.length)
      } else {
        setRequests(result.data || result.rows || [])
        setTotal(result.pagination?.total || result.total || 0)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load service requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [page, statusFilter, deptFilter])

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await adminApi.updateServiceRequestStatus(id, newStatus)
      fetchRequests()
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    }
  }

  const statusBadge = (status: string) => {
    const cls = status === 'completed' ? 'badge-success' : status === 'submitted' ? 'badge-warning' : status === 'in_progress' ? 'badge-info' : 'badge-dark'
    return <span className={`badge ${cls}`}>{status}</span>
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="section-gap animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Service Requests Queue</h1>
          <p>All citizen service requests from the database. Total: {total}</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchRequests}><RefreshCw size={16} /> Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="form-select" style={{ width: 180, borderRadius: 10, padding: '.5rem .75rem', fontSize: '.85rem' }}>
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
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
          <button className="btn btn-primary" onClick={fetchRequests} style={{ marginLeft: 'auto' }}><RefreshCw size={16} /> Retry</button>
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <ListOrdered size={40} color="var(--text-muted)" style={{ margin: '0 auto .75rem' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No service requests found</p>
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
                  <th>Request Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '.85rem' }}>{r.ticket_number || r.id?.slice(0, 8)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.citizen_name || '—'}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{r.citizen_mobile || ''}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{r.department || '—'}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '.85rem' }}>{r.request_type || r.category || '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '.35rem .5rem', fontSize: '.75rem' }}
                          onClick={() => setSelectedItem(r)}>
                          <Eye size={14} /> View
                        </button>
                        {r.status !== 'completed' && r.status !== 'rejected' && (
                          <button className="btn btn-primary" style={{ padding: '.35rem .5rem', fontSize: '.75rem' }}
                            onClick={() => handleStatusUpdate(r.id, r.status === 'submitted' ? 'in_progress' : 'completed')}>
                            {r.status === 'submitted' ? 'Accept' : 'Complete'}
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
            <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages} ({total} total)</span>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /> Prev</button>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={16} /></button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedItem(null)}>
          <div className="card animate-in" style={{ maxWidth: 500, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Service Request Details</h3>
            {[
              ['Ticket', selectedItem.ticket_number || selectedItem.id],
              ['Citizen', selectedItem.citizen_name],
              ['Mobile', selectedItem.citizen_mobile],
              ['Department', selectedItem.department],
              ['Request Type', selectedItem.request_type || selectedItem.category],
              ['Status', selectedItem.status],
              ['Description', selectedItem.description],
              ['Location', selectedItem.location || selectedItem.address],
              ['Created', selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : '—'],
              ['Updated', selectedItem.updated_at ? new Date(selectedItem.updated_at).toLocaleString() : '—'],
            ].map(([label, val]) => (
              <div key={String(label)} style={{ marginBottom: '.75rem' }}>
                <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                <div style={{ fontWeight: 500, marginTop: '.15rem' }}>{String(val || '—')}</div>
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => setSelectedItem(null)} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
