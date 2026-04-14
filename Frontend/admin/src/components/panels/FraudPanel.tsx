import React from 'react'
import { ShieldAlert, AlertTriangle, CheckCircle, Ban } from 'lucide-react'
import { fraudUsers, FraudUser } from '../../data/mockData'

import { useLanguage } from '../../context/LanguageContext'

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--alert)' : score >= 60 ? 'var(--warning)' : 'var(--success)'
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
  const flagged = fraudUsers.filter(u => u.status === 'Flagged' || u.status === 'Banned').length

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--alert)' }} />
          {t('fraud_mon.title') || 'User Behavior Monitoring'}
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="badge badge-danger">
            <ShieldAlert size={10} /> {flagged} {t('fraud_mon.high_risk_users') || 'High Risk Users'}
          </span>
          <span className="live-dot">{t('common.live') || 'Live'}</span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('fraud_mon.table_user_id') || 'User ID'}</th>
              <th>{t('fraud_mon.table_complaints') || 'Complaints Submitted'}</th>
              <th>{t('fraud_mon.table_pattern') || 'Activity Pattern'}</th>
              <th>{t('fraud_mon.table_risk') || 'Risk Score'}</th>
              <th>{t('fraud_mon.table_status') || 'Status'}</th>
              <th>{t('fraud_mon.table_action') || 'Action'}</th>
            </tr>
          </thead>
          <tbody>
            {fraudUsers.map(u => (
              <tr key={u.userId} style={{ background: u.riskScore >= 80 ? 'rgba(255,77,79,.03)' : undefined }}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '.82rem', color: u.riskScore >= 80 ? 'var(--alert)' : 'var(--text-primary)' }}>
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
      </div>
      <div style={{ padding: '.75rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{t('fraud_mon.ai_engine') || 'AI Fraud Detection Engine v2.1 — Pattern Analysis Active'}</span>
        <span style={{ color: 'var(--success)' }}>{t('fraud_mon.auto_ban') || '✓ Auto-ban rules enabled'}</span>
      </div>
    </div>
  )
}
