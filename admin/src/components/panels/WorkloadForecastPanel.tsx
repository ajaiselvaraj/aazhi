import React, { useEffect, useState } from 'react'
import { adminApi } from '../../services/adminApi'
import { TrendingUp, RefreshCw, AlertTriangle, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react'

export default function WorkloadForecastPanel() {
  const [citizens, setCitizens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const limit = 20

  const fetchCitizens = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.getAllCitizens({ page, limit, search: search || undefined })
      if (Array.isArray(result)) {
        setCitizens(result)
        setTotal(result.length)
      } else {
        setCitizens(result.data || result.rows || [])
        setTotal(result.pagination?.total || result.total || 0)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load citizens')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCitizens() }, [page, search])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="section-gap animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Citizens & Workload</h1>
          <p>Registered citizens from the database. Total: {total}</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchCitizens}><RefreshCw size={16} /> Refresh</button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 350 }}>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or mobile…"
            className="form-input"
            style={{ borderRadius: 10, paddingLeft: '2.5rem', fontSize: '.85rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
        <button className="btn btn-primary" onClick={handleSearch}><Search size={16} /> Search</button>
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
          <button className="btn btn-primary" onClick={fetchCitizens} style={{ marginLeft: 'auto' }}><RefreshCw size={16} /> Retry</button>
        </div>
      ) : citizens.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto .75rem' }} />
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No citizens found</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Ward</th>
                  <th>Zone</th>
                  <th>Active</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((c: any) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '.85rem' }}>{c.mobile || '—'}</td>
                    <td><span className={`badge ${c.role === 'admin' ? 'badge-danger' : c.role === 'staff' ? 'badge-warning' : 'badge-info'}`}>{c.role}</span></td>
                    <td>{c.ward || '—'}</td>
                    <td>{c.zone || '—'}</td>
                    <td>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: c.is_active ? 'var(--success)' : 'var(--alert)',
                        display: 'inline-block'
                      }} />
                    </td>
                    <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
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
    </div>
  )
}
