import React, { useState, useEffect } from 'react'
import { Bell, Wifi } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface TopBarProps {
  pageTitle?: string
  onNotifications?: () => void
}

export default function TopBar({ pageTitle, onNotifications }: TopBarProps) {
  const { user } = useAuth()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedTime = time.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })
  const formattedDate = time.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <header className="topbar">
      {/* Left: Dashboard title + department */}
      <div>
        <div style={{
          fontFamily: 'Poppins, Inter, sans-serif',
          fontWeight: 700,
          fontSize: '.975rem',
          color: '#1F2937',
          lineHeight: 1.2,
        }}>
          Smart City Admin Portal
        </div>
        <div style={{
          fontSize: '.74rem',
          color: '#2F6BFF',
          fontWeight: 600,
          marginTop: '.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '.35rem',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#2F6BFF',
            display: 'inline-block', flexShrink: 0,
          }} />
          {user?.department || 'All Departments'}
        </div>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: 'var(--border)', marginLeft: '.5rem' }} />

      {/* Live indicator */}
      <span className="live-dot">Live</span>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
        {/* Date & Time */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '.875rem',
            color: '#1F2937',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formattedTime}
          </div>
          <div style={{ fontSize: '.68rem', color: '#374151', marginTop: '.05rem' }}>
            {formattedDate}
          </div>
        </div>

        {/* Network status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '.35rem',
          fontSize: '.78rem', fontWeight: 600, color: 'var(--success)',
        }}>
          <Wifi size={14} className="text-icon" />
          Online
        </div>

        {/* Notification bell */}
        <button
          onClick={onNotifications}
          title="Notifications"
          style={{
            width: 36, height: 36,
            borderRadius: 'var(--radius-md)',
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: '#374151',
            position: 'relative',
            transition: 'all .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--secondary)'; e.currentTarget.style.color = '#2F6BFF'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#374151'; }}
        >
          <Bell size={16} />
          {/* Unread dot */}
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--alert)',
            border: '2px solid #fff',
          }} />
        </button>

        {/* Admin avatar */}
        <div
          title={`${user?.name || 'Admin'} — Profile`}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #1a55e8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '.85rem',
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(47,107,255,.3)',
          }}
        >
          {getInitials(user?.name || 'Admin')}
        </div>
      </div>
    </header>
  )
}
