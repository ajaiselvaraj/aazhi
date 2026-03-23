import React, { useState } from 'react'
import { ShieldCheck, LogIn, Eye, EyeOff, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DEPARTMENTS } from '../data/mockData'

const ADMIN_NAMES: Record<string, string> = {
  'Electricity Department':  'Ramprasad Krishnan',
  'Water Supply Department': 'Meena Rajagopal',
  'Gas Distribution':        'Suresh Venkatesan',
  'Municipal Services':      'Kavitha Murugan',
}

/* ── Emblem SVG ─────────────────────────────────────────────── */
function GovernmentEmblem() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="36" cy="36" r="34" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="rgba(255,255,255,0.08)" />
      {/* Inner ring */}
      <circle cx="36" cy="36" r="26" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="rgba(255,255,255,0.06)" />
      {/* Shield */}
      <path d="M36 16 L50 22 L50 38 C50 46 36 54 36 54 C36 54 22 46 22 38 L22 22 Z"
        fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Star */}
      <path d="M36 24 L37.8 29.5 H43.5 L38.9 32.9 L40.7 38.4 L36 35 L31.3 38.4 L33.1 32.9 L28.5 29.5 H34.2 Z"
        fill="rgba(255,255,255,0.9)" />
      {/* Gear/circuit dots around shield */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = 31
        const rad = (deg * Math.PI) / 180
        return <circle key={i} cx={36 + r * Math.sin(rad)} cy={36 - r * Math.cos(rad)} r="1.8"
          fill="rgba(255,255,255,0.4)" />
      })}
    </svg>
  )
}

/* ── City Skyline SVG ───────────────────────────────────────── */
function CitySkyline() {
  return (
    <svg viewBox="0 0 560 180" preserveAspectRatio="xMidYMax meet"
      style={{ width: '100%', maxWidth: 520, opacity: .22 }}
      xmlns="http://www.w3.org/2000/svg">
      {/* Buildings */}
      <rect x="0"   y="80"  width="40"  height="100" fill="white" rx="2"/>
      <rect x="10"  y="50"  width="20"  height="30"  fill="white" rx="1"/>
      <rect x="48"  y="100" width="30"  height="80"  fill="white" rx="2"/>
      <rect x="85"  y="55"  width="50"  height="125" fill="white" rx="2"/>
      <rect x="97"  y="30"  width="8"   height="25"  fill="white"/>   {/* Antenna */}
      <rect x="100" y="10"  width="2"   height="20"  fill="white"/>
      <rect x="143" y="90"  width="35"  height="90"  fill="white" rx="2"/>
      <rect x="185" y="40"  width="55"  height="140" fill="white" rx="2"/>
      <rect x="208" y="20"  width="10"  height="20"  fill="white"/>
      <rect x="248" y="70"  width="40"  height="110" fill="white" rx="2"/>
      <rect x="296" y="50"  width="60"  height="130" fill="white" rx="2"/>
      <rect x="316" y="25"  width="6"   height="25"  fill="white"/>
      <rect x="363" y="85"  width="45"  height="95"  fill="white" rx="2"/>
      <rect x="415" y="45"  width="50"  height="135" fill="white" rx="2"/>
      <rect x="436" y="20"  width="8"   height="25"  fill="white"/>
      <rect x="472" y="80"  width="40"  height="100" fill="white" rx="2"/>
      <rect x="518" y="60"  width="42"  height="120" fill="white" rx="2"/>
      {/* Windows */}
      {[
        [90,70,10,10],[110,70,10,10],[90,90,10,10],[110,90,10,10],
        [190,55,10,10],[210,55,10,10],[190,75,10,10],[210,75,10,10],
        [300,65,12,10],[320,65,12,10],[300,85,12,10],[320,85,12,10],
        [418,60,10,10],[438,60,10,10],[418,80,10,10],[438,80,10,10],
      ].map(([x,y,w,h],i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="rgba(0,0,0,0.25)" rx="1"/>
      ))}
      {/* Ground line */}
      <rect x="0" y="178" width="560" height="2" fill="white" opacity="0.4"/>
    </svg>
  )
}

/* ── Faint Map Pattern (radial grid) ────────────────────────── */
function MapPattern() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .07 }}
      viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      {/* Concentric circles */}
      {[60,120,180,240,300,360].map(r => (
        <circle key={r} cx="300" cy="400" r={r} stroke="white" strokeWidth="1" fill="none"/>
      ))}
      {/* Radial lines */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => {
        const rad = (deg * Math.PI) / 180
        return <line key={deg}
          x1={300} y1={400}
          x2={300 + 380 * Math.cos(rad)} y2={400 + 380 * Math.sin(rad)}
          stroke="white" strokeWidth="0.8"/>
      })}
      {/* Grid overlay */}
      {[0,1,2,3,4,5,6,7,8].map(i => (
        <line key={'h'+i} x1={0} y1={i*100} x2={600} y2={i*100} stroke="white" strokeWidth="0.5"/>
      ))}
      {[0,1,2,3,4,5,6].map(i => (
        <line key={'v'+i} x1={i*100} y1={0} x2={i*100} y2={800} stroke="white" strokeWidth="0.5"/>
      ))}
    </svg>
  )
}

/* ── Main Login Page ─────────────────────────────────────────── */
export default function LoginPage() {
  const { login } = useAuth()
  const [adminId,    setAdminId]    = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [department, setDepartment] = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId.trim() || !password.trim() || !department) {
      setError('Please fill in all fields before continuing.')
      return
    }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    login({ adminId, department, name: ADMIN_NAMES[department] || 'Admin Officer' })
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ══ LEFT PANEL — Government Identity ══════════════════════ */}
      <div style={{
        width: '55%',
        background: 'linear-gradient(155deg, #1a55e8 0%, #2F6BFF 45%, #1e4fd4 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3.5rem 3rem 2.5rem',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Map/grid pattern overlay */}
        <MapPattern />

        {/* Top section: emblem + titles */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Emblem */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <GovernmentEmblem />
          </div>

          {/* Portal title */}
          <h1 style={{
            fontFamily: 'Poppins, Inter, sans-serif',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            marginBottom: '.625rem',
          }}>
            Smart City<br />Admin Portal
          </h1>

          {/* Divider */}
          <div style={{
            width: 48, height: 3, background: 'rgba(255,255,255,0.5)',
            borderRadius: 2, margin: '.875rem auto 1rem',
          }} />

          {/* Subtitle */}
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '.9rem',
            fontWeight: 600,
            letterSpacing: '.01em',
            marginBottom: '1.5rem',
          }}>
            AI-Powered Urban Infrastructure Monitoring System
          </p>

          {/* Description */}
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '.82rem',
            lineHeight: 1.75,
            maxWidth: 380,
            margin: '0 auto',
          }}>
            "Secure administrative interface for monitoring civic infrastructure,
            managing service requests, and overseeing smart governance operations."
          </p>
        </div>

        {/* Middle section: city skyline */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
          width: '100%', flex: 1, marginTop: '2rem',
        }}>
          <CitySkyline />
        </div>

        {/* Bottom: stat pills */}
        <div style={{
          display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center',
          position: 'relative', zIndex: 1, marginTop: '1.5rem',
        }}>
          {[
            { num: '1,284', label: 'Active Requests' },
            { num: '94.2%', label: 'AI Accuracy' },
            { num: '4',     label: 'Departments' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, padding: '.5rem 1.125rem',
              textAlign: 'center', backdropFilter: 'blur(4px)',
            }}>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>{s.num}</div>
              <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,0.55)', marginTop: '.1rem', letterSpacing: '.02em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Footer label */}
        <p style={{
          position: 'relative', zIndex: 1,
          marginTop: '1.25rem',
          fontSize: '.68rem', color: 'rgba(255,255,255,0.3)',
          letterSpacing: '.04em', textTransform: 'uppercase',
        }}>
          Government Digital Services · India
        </p>
      </div>

      {/* ══ RIGHT PANEL — Login Form ═══════════════════════════════ */}
      <div style={{
        flex: 1,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2.5rem',
        overflowY: 'auto',
      }}>
        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: 400,
        }}>
          {/* Card header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            {/* Secure icon badge */}
            <div style={{
              width: 52, height: 52,
              borderRadius: 14,
              background: 'var(--secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <ShieldCheck size={24} color="var(--primary)" />
            </div>
            <h2 style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '.35rem',
            }}>
              Admin Secure Access
            </h2>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
              Sign in to your government admin account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Admin ID */}
            <div className="form-group">
              <label className="form-label" htmlFor="admin-id">Admin ID Number</label>
              <input
                id="admin-id"
                type="text"
                className="form-input"
                placeholder="e.g. ADM-2024-001"
                value={adminId}
                onChange={e => setAdminId(e.target.value)}
                style={{ borderRadius: 10 }}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your secure password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ borderRadius: 10, paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position: 'absolute', right: '1rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="form-label" htmlFor="department">Department Selection</label>
              <select
                id="department"
                className="form-select"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                style={{ borderRadius: 10 }}
              >
                <option value="" disabled>Select your department</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'var(--alert-light)',
                border: '1px solid rgba(255,77,79,.25)',
                borderRadius: 8, padding: '.7rem 1rem',
                color: 'var(--alert)', fontSize: '.82rem',
                marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '.5rem',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit button */}
            <button
              id="login-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%', justifyContent: 'center',
                padding: '.875rem', fontSize: '.95rem',
                borderRadius: 10,
                opacity: loading ? .75 : 1,
              }}
            >
              <LogIn size={18} />
              {loading ? 'Authenticating…' : 'Login to Dashboard'}
            </button>
          </form>

          {/* Security note */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '.5rem',
            justifyContent: 'center',
            marginTop: '1.5rem',
            padding: '.75rem 1rem',
            background: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 10,
          }}>
            <Lock size={13} color="var(--text-muted)" />
            <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', margin: 0 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Authorized personnel only.</strong>
              {' '}All access is logged and monitored.
            </p>
          </div>

          {/* Footer */}
          <p style={{
            textAlign: 'center', marginTop: '1.25rem',
            fontSize: '.68rem', color: 'var(--text-muted)',
            letterSpacing: '.01em',
          }}>
            🔒 256-bit encrypted · Government of India · Aazhi v2.0
          </p>
        </div>

        {/* Bottom branding strip */}
        <div style={{
          position: 'absolute', bottom: '1.25rem',
          fontSize: '.68rem', color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          Smart City Admin Portal · Powered by Aazhi AI Platform
        </div>
      </div>
    </div>
  )
}
