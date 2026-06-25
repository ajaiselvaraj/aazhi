import React, { useState } from 'react'
import {
  Fingerprint, ShieldAlert, ShieldCheck,
  ArrowUp, ArrowDown, Eye, Filter, ChevronRight,
  UserCog, Ban, Wifi, Key, AlertTriangle
} from 'lucide-react'

const interactionEvents = [
  { time: '2023-10-27 14:32:01', citizenId: 'XXXX-XXXX-8901', event: 'Service Request (Kiosk A)', status: 'Success' },
  { time: '2023-10-27 14:30:45', citizenId: 'XXXX-XXXX-4211', event: 'Biometric Auth', status: 'Success' },
  { time: '2023-10-27 14:28:12', citizenId: 'XXXX-XXXX-9932', event: 'Profile Update', status: 'Failed' },
  { time: '2023-10-27 14:25:00', citizenId: 'XXXX-XXXX-1120', event: 'Document Download', status: 'Success' },
  { time: '2023-10-27 14:20:33', citizenId: 'XXXX-XXXX-5567', event: 'Initial Onboarding', status: 'Pending' },
]

const sessionAudits = [
  {
    icon: UserCog, iconBg: '#E8F0FF', iconColor: '#2F6BFF',
    title: 'Role Modification', time: '10 mins ago',
    desc: 'Admin User elevated privileges for Operator_ID: 442 to Level 2.',
    ip: '192.168.1.45', auth: 'Secure Token',
  },
  {
    icon: Ban, iconBg: '#fff1f0', iconColor: '#FF4D4F',
    title: 'Failed Admin Login', time: '45 mins ago',
    desc: 'Multiple invalid credential attempts for User: sys_admin_2.',
    ip: '45.22.19.102', auth: 'IP Blocked', authDanger: true,
  },
]

export default function SecurityAuditPanel() {
  return (
    <div className="section-gap">
      {/* Page Header */}
      <div className="page-header">
        <h1>Security Audit & Identity Logs</h1>
        <p>Comprehensive monitoring of citizen interactions and administrative access.</p>
      </div>

      {/* Stats Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.1rem', marginBottom: '2rem' }}>
        <div className="stat-card animate-in">
          <div className="stat-icon" style={{ background: '#E8F0FF' }}>
            <Fingerprint size={22} color="#2F6BFF" />
          </div>
          <div>
            <div className="stat-value">124,592</div>
            <div className="stat-label">Total Auth Requests (24h)</div>
            <div className="stat-delta up" style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
              <ArrowUp size={14} /> 12.5%
            </div>
          </div>
        </div>
        <div className="stat-card animate-in" style={{ animationDelay: '.05s' }}>
          <div className="stat-icon" style={{ background: '#fff1f0' }}>
            <ShieldAlert size={22} color="#FF4D4F" />
          </div>
          <div>
            <div className="stat-value">843</div>
            <div className="stat-label">Failed MFA Attempts</div>
            <div className="stat-delta down" style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
              <ArrowDown size={14} /> 2.1%
            </div>
          </div>
        </div>
        <div className="stat-card animate-in" style={{ animationDelay: '.1s' }}>
          <div className="stat-icon" style={{ background: '#eafaf1' }}>
            <ShieldCheck size={22} color="#2ECC71" />
          </div>
          <div>
            <div className="stat-value">18</div>
            <div className="stat-label">Active Admin Sessions</div>
            <div className="stat-delta up" style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2ECC71', boxShadow: '0 0 8px #2ECC71' }} />
              All Secure
            </div>
          </div>
        </div>
      </div>

      {/* Two-column: Events Table + MFA Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Citizen Interaction Events */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <div className="section-title" style={{ marginBottom: 0 }}><span className="icon-dot" /> Citizen Interaction Events</div>
            <button className="btn btn-ghost" style={{ padding: '.4rem .6rem' }}><Filter size={16} /></button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Citizen ID (Masked)</th>
                <th>Event Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {interactionEvents.map((ev, i) => (
                <tr key={i}>
                  <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)', fontSize: '.8rem' }}>{ev.time}</td>
                  <td style={{ fontWeight: 600 }}>{ev.citizenId}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{ev.event}</td>
                  <td>
                    <span className={`badge ${ev.status === 'Success' ? 'badge-success' : ev.status === 'Failed' ? 'badge-danger' : 'badge-warning'}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '.75rem 1.5rem', textAlign: 'right', borderTop: '1px solid var(--border-light)' }}>
            <button className="btn btn-ghost" style={{ fontSize: '.78rem' }}>
              View All Logs <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* MFA Delivery Status */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: '1rem' }}><span className="icon-dot" /> MFA Delivery Status</div>
          {/* Donut Chart */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-light)" strokeWidth="4" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2ECC71" strokeDasharray="85, 100" strokeWidth="4" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF4D4F" strokeDasharray="5, 100" strokeDashoffset="-85" strokeWidth="4" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FFA940" strokeDasharray="10, 100" strokeDashoffset="-90" strokeWidth="4" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>85%</span>
                <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Success</span>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {[
              { label: 'Delivered', count: '105,432', color: '#2ECC71' },
              { label: 'Delayed >5s', count: '12,400', color: '#FFA940' },
              { label: 'Failed', count: '843', color: '#FF4D4F' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '.85rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: '.85rem', fontVariantNumeric: 'tabular-nums' }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Administrative Session Audits */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div className="section-title" style={{ marginBottom: 0 }}><span className="icon-dot" /> Administrative Session Audits</div>
          <button className="btn btn-primary" style={{ fontSize: '.78rem' }}>Export Report</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {sessionAudits.map((audit, i) => (
            <div key={i} style={{
              background: 'var(--bg)', borderRadius: 'var(--radius-md)',
              padding: '1rem', border: '1px solid var(--border-light)',
              display: 'flex', gap: '1rem',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: audit.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <audit.icon size={18} color={audit.iconColor} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text-primary)' }}>{audit.title}</span>
                  <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{audit.time}</span>
                </div>
                <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginBottom: '.5rem' }}>{audit.desc}</p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}><Wifi size={12} /> IP: {audit.ip}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '.25rem', color: audit.authDanger ? '#FF4D4F' : 'var(--text-muted)' }}>
                    {audit.authDanger ? <AlertTriangle size={12} /> : <Key size={12} />} {audit.auth}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
