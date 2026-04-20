import React, { useState, useEffect } from 'react'
import { ShieldAlert, AlertTriangle, CheckCircle, Ban, RefreshCw, Inbox } from 'lucide-react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'

interface FraudUser {
  odUserId: string
  userId: string
  submitted: number
  pattern: string
  riskScore: number
  status: 'Flagged' | 'Banned' | 'Under Review' | 'Cleared'
  dept: string
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--alert)' : score >= 60 ? 'var(--warning)' : score >= 40 ? '#FFA940' : 'var(--success)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
      <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: '.8rem', fontWeight: 700, color, minWidth: 28 }}>{score}</span>
    </div>
  )
}

function StatusIcon({ s }: { s: FraudUser['status'] }) {
  const { t } = useLanguage()
  if (s === 'Flagged') return <span className="badge badge-danger"><AlertTriangle size={10} /> {t('fraud_mon.state_suspicious') || 'Suspicious Activity'}</span>
  if (s === 'Banned')  return <span className="badge badge-dark"><Ban size={10} /> {t('fraud_mon.state_banned') || 'Banned'}</span>
  if (s === 'Under Review') return <span className="badge badge-warning">{t('fraud_mon.state_under_review') || 'Under Review'}</span>
  return <span className="badge badge-success"><CheckCircle size={10} /> {t('fraud_mon.state_cleared') || 'Cleared'}</span>
}

export default function FraudPanel() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<FraudUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFraudSignals()
  }, [])

  async function loadFraudSignals() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.getFraudSignals()
      setUsers(data || [])
    } catch (err: any) {
      console.error('Failed to load fraud signals:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const flagged = users.filter(u => u.status === 'Flagged' || u.status === 'Banned').length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--alert)' }} />
          {t('fraud_mon.title') || 'User Behavior Monitoring'}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button onClick={loadFraudSignals} className="btn btn-ghost" style={{ padding: '.3rem' }} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="badge badge-danger">
            <ShieldAlert size={10} /> {flagged} {t('fraud_mon.high_risk_users') || 'High Risk Users'}
          </span>
          <span className="live-dot">{t('common.live') || 'Live'}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <p>Analyzing citizen behavior patterns...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
            <strong>Error:</strong> {error}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Suspicious Activity</p>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>All citizens have normal activity patterns. Risk scoring is based on complaint frequency, rejection rate, and spam flags.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('fraud_mon.table_user_id') || 'Citizen'}</th>
                <th>{t('fraud_mon.table_complaints') || 'Complaints Submitted'}</th>
                <th>{t('fraud_mon.table_pattern') || 'Activity Pattern'}</th>
                <th>{t('fraud_mon.table_risk') || 'Risk Score'}</th>
                <th>{t('fraud_mon.table_status') || 'Status'}</th>
                <th>{t('fraud_mon.table_action') || 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.odUserId} style={{ background: u.riskScore >= 80 ? 'rgba(255,77,79,.03)' : undefined }}>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '.85rem', color: u.riskScore >= 60 ? 'var(--alert)' : 'var(--text-primary)' }}>
                      {u.userId}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)' }}>
                      {u.submitted}
                    </span>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: '.35rem' }}>{t('fraud_mon.complaints') || 'complaints'}</span>
                  </td>
                  <td style={{ fontSize: '.82rem', color: 'var(--text-secondary)', maxWidth: 200 }}>
                    {u.pattern}
                  </td>
                  <td><RiskBar score={u.riskScore} /></td>
                  <td><StatusIcon s={u.status} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <button className="btn btn-ghost" style={{ padding: '.3rem .65rem', fontSize: '.72rem', height: 'auto' }}>
                        {t('fraud_mon.btn_review') || 'Review'}
                      </button>
                      {(u.status === 'Flagged') && (
                        <button className="btn btn-danger" style={{ padding: '.3rem .65rem', fontSize: '.72rem', height: 'auto' }}>
                          {t('fraud_mon.btn_ban') || 'Ban'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ padding: '.75rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{t('fraud_mon.ai_engine') || 'AI Fraud Detection — Risk scores based on complaint frequency, rejection rate & spam flags'}</span>
        <span style={{ color: 'var(--success)' }}>{t('fraud_mon.auto_ban') || '✓ Real-time analysis from complaint database'}</span>
      </div>
    </div>
  )
}
