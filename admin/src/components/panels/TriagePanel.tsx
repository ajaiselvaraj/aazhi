import React, { useState } from 'react'
import { Cpu, Search, Filter } from 'lucide-react'
import { triageComplaints, TriageComplaint } from '../../data/mockData'

function PriorityBadge({ p }: { p: TriageComplaint['priority'] }) {
  const map = {
    'Critical': 'badge-danger',
    'High':     'badge-warning',
    'Medium':   'badge-info',
    'Low':      'badge-success',
  }
  return <span className={`badge ${map[p]}`}>{p}</span>
}

function StatusBadge({ s }: { s: TriageComplaint['status'] }) {
  if (s === 'Review Needed') return <span className="badge badge-review">⚠ Review Needed</span>
  const map = {
    'Routed':   'badge-success',
    'Pending':  'badge-warning',
    'Resolved': 'badge-dark',
  }
  return <span className={`badge ${map[s as keyof typeof map] || 'badge-info'}`}>{s}</span>
}

export default function TriagePanel() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  const filtered = triageComplaints.filter(c => {
    const matchesSearch = c.text.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" />
          AI Request Categorization
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search complaints..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: '2.25rem', paddingRight: '1rem',
                paddingTop: '.5rem', paddingBottom: '.5rem',
                fontSize: '.8rem', border: '1px solid var(--border)',
                borderRadius: 8, background: 'var(--bg)', color: 'var(--text-primary)',
                outline: 'none', width: 200,
              }}
            />
          </div>
          {/* Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '.5rem .75rem', fontSize: '.8rem',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--bg)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none',
            }}
          >
            <option>All</option>
            <option>Routed</option>
            <option>Pending</option>
            <option>Review Needed</option>
            <option>Resolved</option>
          </select>
          <span className="live-dot">Live</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Complaint Text</th>
              <th>Predicted Department</th>
              <th>Priority</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '.8rem', color: 'var(--primary)' }}>
                    {c.id}
                  </span>
                </td>
                <td style={{ maxWidth: 280, wordBreak: 'break-word', fontSize: '.82rem' }}>
                  {c.text}
                </td>
                <td>
                  <span style={{ fontSize: '.82rem', fontWeight: 500 }}>{c.predictedDept}</span>
                </td>
                <td><PriorityBadge p={c.priority} /></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {/* Confidence bar */}
                    <div style={{ width: 60, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${c.confidence}%`, height: '100%',
                        borderRadius: 3,
                        background: c.confidence >= 80 ? 'var(--success)' : c.confidence >= 60 ? 'var(--warning)' : 'var(--alert)',
                      }} />
                    </div>
                    <span style={{ fontSize: '.78rem', fontWeight: 600, color: c.confidence >= 80 ? 'var(--success)' : c.confidence >= 60 ? 'var(--warning)' : 'var(--alert)' }}>
                      {c.confidence}%
                    </span>
                  </div>
                </td>
                <td><StatusBadge s={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '.875rem' }}>
            No complaints match your filters.
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={{
        padding: '.75rem 1.5rem', borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '.78rem', color: 'var(--text-muted)',
      }}>
        <span>Showing {filtered.length} of {triageComplaints.length} complaints</span>
        <span style={{ color: 'var(--alert)', fontWeight: 600 }}>
          ⚠ {triageComplaints.filter(c => c.status === 'Review Needed').length} need manual review
        </span>
      </div>
    </div>
  )
}
