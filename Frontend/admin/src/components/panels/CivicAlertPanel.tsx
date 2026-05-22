/**
 * CivicAlertPanel — Admin-controlled Civic Alert Management (ADD-ON PANEL)
 * Design: matches existing Admin dashboard design tokens (card, btn, badge, form-input, etc.)
 * No existing panels are modified.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  BellRing, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, X, CheckCircle, AlertTriangle, Zap, Droplets, Construction,
  Cloud, Info, Save, Clock
} from 'lucide-react'
import { alertApi, CivicAlert, CreateAlertPayload } from '../../api/alertApi'

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPES   = ['Civic', 'Power', 'Water', 'Road', 'Weather'] as const
const SEVERITIES = ['Info', 'Warning', 'Critical'] as const

const SEVERITY_BADGE: Record<string, string> = {
  Critical: 'badge-danger',
  Warning:  'badge-warning',
  Info:     'badge-info',
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  Power:   <Zap          size={14} />,
  Water:   <Droplets     size={14} />,
  Road:    <Construction size={14} />,
  Weather: <Cloud        size={14} />,
  Civic:   <Info         size={14} />,
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM: CreateAlertPayload & { is_active?: boolean } = {
  title:      '',
  message:    '',
  type:       'Civic',
  severity:   'Info',
  priority:   3,
  ward:       'Global',
  expires_at: null,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CivicAlertPanel() {
  const [alerts, setAlerts]           = useState<CivicAlert[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState<string | null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [editingAlert, setEditingAlert] = useState<CivicAlert | null>(null)
  const [form, setForm]               = useState({ ...EMPTY_FORM })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await alertApi.getAll()
      setAlerts(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  // ── Notification helpers ───────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3500)
  }

  // ── Form helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditingAlert(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
  }

  function openEdit(alert: CivicAlert) {
    setEditingAlert(alert)
    setForm({
      title:      alert.title,
      message:    alert.message,
      type:       alert.type,
      severity:   alert.severity,
      priority:   alert.priority,
      ward:       alert.ward,
      expires_at: alert.expires_at,
      is_active:  alert.is_active,
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingAlert(null)
    setForm({ ...EMPTY_FORM })
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        priority:   Number(form.priority),
        expires_at: form.expires_at || null,
      }
      if (editingAlert) {
        const updated = await alertApi.update(editingAlert.id, payload)
        setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a))
        showSuccess('Alert updated successfully.')
      } else {
        const created = await alertApi.create(payload)
        setAlerts(prev => [created, ...prev])
        showSuccess('Alert created successfully.')
      }
      closeForm()
    } catch (err: any) {
      setError(err?.message || 'Failed to save alert.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(alert: CivicAlert) {
    try {
      const updated = await alertApi.toggleActive(alert.id, !alert.is_active)
      setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a))
      showSuccess(`Alert "${alert.title}" ${updated.is_active ? 'activated' : 'deactivated'}.`)
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle alert.')
    }
  }

  async function handleDelete(id: number) {
    try {
      await alertApi.delete(id)
      setAlerts(prev => prev.filter(a => a.id !== id))
      setDeleteConfirm(null)
      showSuccess('Alert deleted.')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete alert.')
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const activeCount   = alerts.filter(a => a.is_active).length
  const criticalCount = alerts.filter(a => a.severity === 'Critical' && a.is_active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
              <BellRing size={22} style={{ color: 'var(--alert)' }} />
              Civic Alert Management
            </h1>
            <p>Create and manage public-facing alerts that appear in the Citizen Kiosk.</p>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
            <button
              className="btn btn-ghost"
              onClick={loadAlerts}
              disabled={loading}
              title="Refresh"
              style={{ padding: '.5rem' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button className="btn btn-primary" onClick={openCreate} id="create-alert-btn">
              <Plus size={15} /> New Alert
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Row ──────────────────────────────────────────────────────── */}
      <div className="grid-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--secondary)', color: 'var(--primary)' }}>
            <BellRing size={22} />
          </div>
          <div>
            <div className="stat-value">{alerts.length}</div>
            <div className="stat-label">Total Alerts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active (Visible to Citizens)</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--alert-light)', color: 'var(--alert)' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="stat-value">{criticalCount}</div>
            <div className="stat-label">Critical Active Alerts</div>
          </div>
        </div>
      </div>

      {/* ── Toast notifications ────────────────────────────────────────────── */}
      {success && (
        <div style={{
          background: 'var(--success-light)', border: '1px solid var(--success)',
          color: '#1a8a4a', borderRadius: 'var(--radius-md)', padding: '.75rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '.75rem', fontWeight: 600,
          animation: 'fade-in-up .3s ease'
        }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div style={{
          background: 'var(--alert-light)', border: '1px solid var(--alert)',
          color: '#c0392b', borderRadius: 'var(--radius-md)', padding: '.75rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '.75rem', fontWeight: 600,
        }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Alert Table ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>
            <div className="icon-dot" style={{ background: 'var(--alert)' }} />
            All Alerts
          </div>
          <span className="live-dot">Live</span>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <BellRing size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No alerts yet</p>
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>
              Create your first civic alert. It will appear in the Citizen Kiosk.
            </p>
            <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: '1.25rem' }}>
              <Plus size={14} /> Create Alert
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th>Ward</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 220 }}>{alert.title}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.25rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.message}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
                        {TYPE_ICON[alert.type]} {alert.type}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${SEVERITY_BADGE[alert.severity] || 'badge-info'}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: i < alert.priority ? 'var(--alert)' : 'var(--border)',
                          }} />
                        ))}
                        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginLeft: '.25rem' }}>P{alert.priority}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>{alert.ward}</td>
                    <td style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                      {alert.expires_at
                        ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                            <Clock size={11} /> {new Date(alert.expires_at).toLocaleDateString()}
                          </span>
                        )
                        : <span style={{ color: 'var(--success)', fontWeight: 600 }}>No Expiry</span>
                      }
                    </td>
                    <td>
                      <button
                        id={`toggle-alert-${alert.id}`}
                        onClick={() => handleToggleActive(alert)}
                        title={alert.is_active ? 'Deactivate alert' : 'Activate alert'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.25rem', display: 'flex', alignItems: 'center' }}
                      >
                        {alert.is_active
                          ? <ToggleRight size={24} style={{ color: 'var(--success)' }} />
                          : <ToggleLeft  size={24} style={{ color: 'var(--text-muted)' }} />
                        }
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button
                          id={`edit-alert-${alert.id}`}
                          className="btn btn-ghost"
                          onClick={() => openEdit(alert)}
                          style={{ padding: '.4rem .7rem', fontSize: '.78rem' }}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === alert.id ? (
                          <>
                            <button
                              id={`confirm-delete-alert-${alert.id}`}
                              className="btn btn-danger"
                              onClick={() => handleDelete(alert.id)}
                              style={{ padding: '.4rem .7rem', fontSize: '.78rem' }}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => setDeleteConfirm(null)}
                              style={{ padding: '.4rem .7rem', fontSize: '.78rem' }}
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <button
                            id={`delete-alert-${alert.id}`}
                            className="btn btn-ghost"
                            onClick={() => setDeleteConfirm(alert.id)}
                            style={{ padding: '.4rem .7rem', fontSize: '.78rem', color: 'var(--alert)' }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Form Modal ───────────────────────────────────────── */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1.5rem',
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: 560, maxHeight: '90vh',
            overflowY: 'auto', padding: '2rem',
            animation: 'fade-in-up .25s ease'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {editingAlert ? <><Pencil size={18} /> Edit Alert</> : <><Plus size={18} /> Create Alert</>}
              </h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Title */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="alert-title">Alert Title *</label>
                <input
                  id="alert-title"
                  className="form-input"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Water Supply Disruption — Ward 12"
                  required
                  minLength={3}
                />
              </div>

              {/* Message */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="alert-message">Message *</label>
                <textarea
                  id="alert-message"
                  className="form-input"
                  name="message"
                  value={form.message}
                  onChange={handleFormChange}
                  placeholder="Describe the alert in detail for citizens..."
                  rows={3}
                  required
                  minLength={5}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Type + Severity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="alert-type">Type</label>
                  <select id="alert-type" className="form-select" name="type" value={form.type} onChange={handleFormChange}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="alert-severity">Severity</label>
                  <select id="alert-severity" className="form-select" name="severity" value={form.severity} onChange={handleFormChange}>
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority + Ward */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="alert-priority">Priority (1 = Highest)</label>
                  <select id="alert-priority" className="form-select" name="priority" value={String(form.priority)} onChange={handleFormChange}>
                    {[1, 2, 3, 4, 5].map(p => <option key={p} value={String(p)}>P{p} — {p === 1 ? 'Critical' : p === 2 ? 'High' : p === 3 ? 'Medium' : p === 4 ? 'Low' : 'Minimal'}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="alert-ward">Ward / Area</label>
                  <input
                    id="alert-ward"
                    className="form-input"
                    name="ward"
                    value={form.ward ?? ''}
                    onChange={handleFormChange}
                    placeholder="e.g. Ward 7 or Global"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="alert-expires">Expiry Date & Time (optional)</label>
                <input
                  id="alert-expires"
                  className="form-input"
                  type="datetime-local"
                  name="expires_at"
                  value={form.expires_at ? form.expires_at.slice(0, 16) : ''}
                  onChange={handleFormChange}
                />
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.25rem', display: 'block' }}>
                  Leave blank for a permanent alert.
                </span>
              </div>

              {/* Active toggle (edit only) */}
              {editingAlert && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '.75rem', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={!!form.is_active}
                    onChange={handleFormChange}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                  />
                  Active (visible to citizens)
                </label>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: 'var(--alert-light)', color: '#c0392b', borderRadius: 'var(--radius-sm)', padding: '.6rem 1rem', fontSize: '.875rem', fontWeight: 600 }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
                <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                <button
                  id="submit-alert-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> {editingAlert ? 'Update Alert' : 'Create Alert'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
