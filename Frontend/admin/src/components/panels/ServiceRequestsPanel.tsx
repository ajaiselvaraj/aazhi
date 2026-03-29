import React, { useState, useEffect } from 'react'
import { Search, Filter, RefreshCw, Eye, MoreVertical, Calendar, Phone, User, Clock, ChevronDown } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useAuth } from '../../context/AuthContext'
import { deptKey } from '../../utils/deptFilter'

/* ── Status Badge ────────────────────────────────────────────── */
function RequestStatusBadge({ s }: { s: string }) {
  const map: any = {
    'submitted': { label: 'New', class: 'badge-info' },
    'under_review': { label: 'Review', class: 'badge-warning' },
    'verification': { label: 'Verify', class: 'badge-warning' },
    'approval_pending': { label: 'Pending', class: 'badge-warning' },
    'completed': { label: 'Closed', class: 'badge-success' },
    'rejected': { label: 'Rejected', class: 'badge-danger' },
  }
  const status = map[s] || { label: s, class: 'badge-info' }
  return <span className={`badge ${status.class}`}>{status.label}</span>
}

export default function ServiceRequestsPanel() {
  const { user } = useAuth()
  const myDept = user ? deptKey(user.department) : ''

  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadRequests()
  }, [page, statusFilter])

  async function loadRequests() {
    setLoading(true)
    try {
      const params: any = { page, limit: 15 }
      if (statusFilter !== 'All') params.status = statusFilter
      
      console.log('📡 [Admin] Fetching service requests...', params)
      const res = await adminApi.getAllServiceRequests(params)
      console.log('✅ [Admin] Received requests:', res.data?.length)
      
      setRequests(res.data || [])
      setTotal(res.pagination?.total || 0)
    } catch (err) {
      console.error('❌ [Admin] Failed to fetch service requests:', err)
    } finally {
      setLoading(false)
    }
  }

  // Frontend filtering for search
  const filtered = requests.filter(r => 
    r.status !== 'resolved' && r.status !== 'completed' &&
    (r.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
    r.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.request_type.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Service Requests
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage and track all utility service applications and technical requests.</p>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by ticket, name, or request type..."
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
            <option value="All">All Active Statuses</option>
            <option value="submitted">New Requests</option>
            <option value="under_review">Under Review</option>
            <option value="rejected">Rejected</option>
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
                <th>Ticket ID</th>
                <th>Citizen Details</th>
                <th>Service Type</th>
                <th>Department</th>
                <th>Submitted On</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '4rem' }}>
                    <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', opacity: 0.5 }} />
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Fetching latest requests...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📭</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No requests found</p>
                    <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '.85rem' }}>
                        {r.ticket_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 800 }}>
                          {r.citizen_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{r.citizen_name || 'Anonymous'}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{r.citizen_mobile || 'No Phone'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '.85rem' }}>{r.request_type}</td>
                    <td>
                      <span style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>{r.department}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                          <Calendar size={12} /> {new Date(r.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginTop: '.1rem' }}>
                          <Clock size={12} /> {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td>
                      <RequestStatusBadge s={r.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" style={{ padding: '.4rem' }} title="View Details">
                          <Eye size={16} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '.4rem' }}>
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────── */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filtered.length}</strong> of <strong>{total}</strong> service requests
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="btn btn-outline" 
              style={{ padding: '.4rem .8rem', fontSize: '.8rem' }}
            >
              Previous
            </button>
            <button 
              disabled={requests.length < 15}
              onClick={() => setPage(p => p + 1)}
              className="btn btn-outline" 
              style={{ padding: '.4rem .8rem', fontSize: '.8rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
