import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, Calendar, Clock, Inbox, Archive } from 'lucide-react'
import { adminApi } from '../../services/adminApi'

/* ── Badge Components ────────────────────────────────────────── */
function StatusBadge({ s, type }: { s: string, type: 'complaint' | 'service' }) {
  if (type === 'complaint') {
    const map: any = {
      'submitted': { label: 'New', class: 'badge-info' },
      'acknowledged': { label: 'Pending', class: 'badge-warning' },
      'in_progress': { label: 'In Progress', class: 'badge-warning' },
      'resolved': { label: 'Resolved', class: 'badge-success' },
      'rejected': { label: 'Rejected', class: 'badge-danger' },
    }
    const status = map[s] || { label: s, class: 'badge-info' }
    return <span className={`badge ${status.class}`}>{status.label}</span>
  } else {
    const map: any = {
      'submitted': { label: 'New', class: 'badge-info' },
      'under_review': { label: 'Review', class: 'badge-warning' },
      'verification': { label: 'Verify', class: 'badge-warning' },
      'approval_pending': { label: 'Pending', class: 'badge-warning' },
      'completed': { label: 'Closed', class: 'badge-success' },
      'resolved': { label: 'Resolved', class: 'badge-success' },
      'rejected': { label: 'Rejected', class: 'badge-danger' },
    }
    const status = map[s] || { label: s, class: 'badge-info' }
    return <span className={`badge ${status.class}`}>{status.label}</span>
  }
}

function PriorityBadge({ p }: { p: string }) {
  const map: any = { 
    'critical': 'badge-danger', 
    'high': 'badge-warning', 
    'medium': 'badge-info', 
    'low': 'badge-success' 
  }
  const display = p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Medium'
  return <span className={`badge ${map[p] || 'badge-info'}`}>{display}</span>
}

export default function HistoryPanel() {
  const [activeTab, setActiveTab] = useState<'complaints' | 'service-requests'>('complaints')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadItems()
  }, [activeTab, page])

  useEffect(() => {
    setPage(1)
    setSearch('')
  }, [activeTab])

  async function loadItems() {
    setLoading(true)
    try {
      if (activeTab === 'complaints') {
        // Fetch only resolved complaints
        const res = await adminApi.getAllComplaints({ page, limit: 50, status: 'resolved' })
        setItems(res.data || [])
        setTotal(res.pagination?.total || 0)
      } else {
        // Fetch resolved service requests
        const res = await adminApi.getAllServiceRequests({ page, limit: 50 }) // Since API doesn't fully support custom status query, let's fetch and filter frontend if necessary, or pass status
        // Some APIs support status: 'completed' instead of resolved, but we'll try API with status: 'completed' first
        // Let's filter on frontend since we might have 'resolved' and 'completed'
        // But for pagination, it's better to fetch resolved/completed if possible. Given `getAllServiceRequests` supports `status`, let's just pass nothing and filter, or try `status: 'completed'`.
        // I will do full fetch and filter locally just to be safe if `status` query param is strict.
        const resAll = await adminApi.getAllServiceRequests({ page, limit: 100 })
        const resolvedItems = (resAll.data || []).filter((r: any) => r.status === 'resolved' || r.status === 'completed')
        setItems(resolvedItems)
        setTotal(resolvedItems.length) // this is approx since backend pagination
      }
    } catch (err) {
      console.error('❌ [Admin] Failed to fetch history items:', err)
    } finally {
      setLoading(false)
    }
  }

  // Frontend filtering for search
  const filtered = items.filter(item => {
    const id = item.ticket_number?.toLowerCase() || ''
    const name = item.citizen_name?.toLowerCase() || ''
    const desc = item.description?.toLowerCase() || item.request_type?.toLowerCase() || ''
    const q = search.toLowerCase()
    return id.includes(q) || name.includes(q) || desc.includes(q)
  })

  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Archive size={28} /> History
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>View all resolved complaints and completed service requests.</p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button
          className="btn btn-ghost"
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: activeTab === 'complaints' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'complaints' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'complaints' ? 700 : 500,
            borderRadius: '8px 8px 0 0'
          }}
          onClick={() => setActiveTab('complaints')}
        >
          Resolved Complaints
        </button>
        <button
          className="btn btn-ghost"
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: activeTab === 'service-requests' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'service-requests' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'service-requests' ? 700 : 500,
            borderRadius: '8px 8px 0 0'
          }}
          onClick={() => setActiveTab('service-requests')}
        >
          Completed Service Requests
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder={`Search ${activeTab === 'complaints' ? 'complaints' : 'requests'}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '.75rem 1rem .75rem 2.5rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>

        <button 
          onClick={() => loadItems()}
          className="btn btn-outline" 
          style={{ padding: '.75rem', borderRadius: 12 }}
          title="Refresh list"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Data Grid ───────────────────────────────────────────── */}
      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)', opacity: 0.5, margin: '0 auto' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Fetching history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Inbox size={48} color="var(--border)" /></div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No history available</p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>There are no resolved items matching your criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filtered.map(item => (
            <div key={item.id} className="card hover-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '.85rem', marginBottom: '0.25rem' }}>
                    #{item.ticket_number || item.id.substring(0,8).toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {activeTab === 'complaints' ? (item.category || 'General Issue') : (item.request_type || 'Service Request')}
                  </h3>
                </div>
                <StatusBadge s={item.status} type={activeTab === 'complaints' ? 'complaint' : 'service'} />
              </div>

              <div style={{ fontSize: '.9rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.description || "No description provided."}
              </div>

              {activeTab === 'complaints' && item.priority && (
                <div>
                  <PriorityBadge p={item.priority}  />
                </div>
              )}

              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 800 }}>
                    {item.citizen_name?.charAt(0) || 'C'}
                  </div>
                  <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {item.citizen_name || 'Anonymous'}
                  </span>
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                  <Calendar size={12} /> {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filtered.length}</strong> {activeTab === 'complaints' ? 'complaints' : 'requests'}
          </div>
          {/* Add pagination controls if fully implemented via API, currently static mapping */}
        </div>
      )}
    </div>
  )
}
