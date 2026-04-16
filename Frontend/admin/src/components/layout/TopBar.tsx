import React, { useState, useEffect, useRef } from 'react'
import { Bell, Wifi, Globe, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { deptName } from '../../utils/translations'
import cdacLogo from '../../assets/cdac_logo.png'


function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface TopBarProps {
  pageTitle?: string
  onNotifications?: () => void
}

export default function TopBar({ pageTitle, onNotifications }: TopBarProps) {
  const { user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [time, setTime] = useState(new Date())
  const [showLangMenu, setShowLangMenu] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)

  const getDeptColor = (dept: string | undefined) => {
    if (!dept) return '#2F6BFF'
    const lower = dept.toLowerCase()
    if (lower === 'all') return '#8b5cf6' // Purple for Super Admin
    if (lower.includes('water')) return '#3b82f6' // Blue
    if (lower.includes('gas')) return '#f97316' // Orange
    if (lower.includes('electricity') || lower.includes('power')) return '#eab308' // Yellow
    if (lower.includes('municipal')) return '#10b981' // Green
    return '#2F6BFF'
  }
  
  const deptColor = getDeptColor(user?.department)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
          {user?.department === 'ALL' ? 'Super Admin Dashboard' : user?.department ? `${deptName(user.department, t)} Dashboard` : t('nav.admin_portal') || 'Admin Portal'}
        </div>
        <div style={{
          fontSize: '.74rem',
          color: deptColor,
          fontWeight: 600,
          marginTop: '.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '.35rem',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '2px',
            background: deptColor,
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ 
            background: `color-mix(in srgb, ${deptColor} 15%, transparent)`, 
            padding: '2px 6px', 
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '10px'
          }}>
            Logged in as: {user?.department === 'ALL' ? 'SUPER ADMIN (ALL DEPARTMENTS)' : user?.department ? deptName(user.department, t).toUpperCase() + ' ADMIN' : 'SUPER ADMIN'}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: 'var(--border)', marginLeft: '.5rem' }} />

      {/* Live indicator */}
      <span className="live-dot">{t('common.live')}</span>

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
          {t('common.online')}
        </div>

        {/* Language Switcher */}
        <div style={{ position: 'relative' }} ref={langMenuRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.35rem 0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #E5E7EB',
              background: '#F9FAFB',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            A / अ <ChevronDown size={14} />
          </button>
          
          {showLangMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '120px',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिंदी' },
                { code: 'as', label: 'অসমীয়া' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as any);
                    setShowLangMenu(false);
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    textAlign: 'left',
                    background: language === lang.code ? '#F3F4F6' : 'transparent',
                    color: language === lang.code ? '#2F6BFF' : '#374151',
                    border: 'none',
                    fontWeight: language === lang.code ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    borderBottom: '1px solid #F3F4F6',
                    width: '100%'
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification bell */}
        <button
          onClick={onNotifications}
          title={t('nav.notifications') || 'Notifications'}
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

        <div
          title={`${user?.name || 'Admin'} — ${t('nav.profile') || 'Profile'}`}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `linear-gradient(135deg, ${deptColor}, color-mix(in srgb, ${deptColor} 80%, black))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '.85rem',
            cursor: 'pointer', flexShrink: 0,
            boxShadow: `0 2px 8px color-mix(in srgb, ${deptColor} 30%, transparent)`,
          }}
        >
          {getInitials(user?.name || 'Admin')}
        </div>

        {/* CDAC Logo Section */}
        <div style={{ 
          marginLeft: '0.5rem', 
          paddingLeft: '1rem', 
          borderLeft: '1px solid #E5E7EB', 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <img src={cdacLogo} alt="CDAC Logo" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
        </div>
      </div>

    </header>
  )
}
