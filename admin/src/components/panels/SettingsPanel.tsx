import React, { useState, useEffect } from 'react'
import { 
  User, Shield, Bell, Globe, 
  Save, RefreshCw, Key, LogOut, Settings, Power 
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { adminApi } from '../../services/adminApi'

export default function SettingsPanel() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'services' | 'system'>('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Service config state
  const [serviceConfig, setServiceConfig] = useState<any[]>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState('')

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }, 800)
  }

  const fetchServiceConfig = async () => {
    setConfigLoading(true)
    setConfigError('')
    try {
      const data = await adminApi.getServiceConfig()
      setServiceConfig(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setConfigError(err.message || 'Failed to load service config')
    } finally {
      setConfigLoading(false)
    }
  }

  const toggleService = async (serviceName: string, currentEnabled: boolean) => {
    try {
      await adminApi.updateServiceConfig(serviceName, !currentEnabled)
      fetchServiceConfig()
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    }
  }

  useEffect(() => {
    if (activeTab === 'services') {
      fetchServiceConfig()
    }
  }, [activeTab])

  return (
    <div className="section-gap animate-in">
      <div className="page-header">
        <h1>Admin Settings</h1>
        <p>Manage your account, security preferences, service toggles, and system configuration.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '240px 1fr', 
        gap: '2rem',
        background: '#fff',
        borderRadius: 16,
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        border: '1px solid #f0f0f0',
        minHeight: '500px'
      }}>
        {/* Settings Nav */}
        <div style={{ borderRight: '1px solid #f0f0f0', paddingRight: '1rem' }}>
          {[
            { id: 'profile', icon: User, label: 'Profile Info' },
            { id: 'security', icon: Shield, label: 'Security & Auth' },
            { id: 'services', icon: Settings, label: 'Service Config' },
            { id: 'system', icon: Globe, label: 'System API' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '.75rem',
                padding: '.875rem 1.125rem', borderRadius: 10, border: 'none',
                background: activeTab === tab.id ? '#F2F6FF' : 'transparent',
                color: activeTab === tab.id ? '#2F6BFF' : '#555',
                fontSize: '.9rem', fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer', transition: 'all .2s', textAlign: 'left', marginBottom: '.25rem'
              }}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
          
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #f0f0f0' }}>
            <button onClick={logout} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '.75rem',
              padding: '.875rem 1.125rem', borderRadius: 10, border: 'none',
              background: 'transparent', color: '#FF4D4F', fontSize: '.9rem', fontWeight: 600, cursor: 'pointer'
            }}>
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div style={{ padding: '0 1rem' }}>
          {activeTab === 'profile' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Profile Information</h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '.8rem', color: '#888', marginBottom: '.5rem', fontWeight: 600 }}>FULL NAME</label>
                <input type="text" defaultValue={user?.name || ''} style={{ width: '100%', padding: '.75rem', borderRadius: 8, border: '1px solid #ddd', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '.8rem', color: '#888', marginBottom: '.5rem', fontWeight: 600 }}>ADMIN ID</label>
                <input type="text" readOnly value={user?.adminId || ''} style={{ width: '100%', padding: '.75rem', borderRadius: 8, border: '1px solid #eee', background: '#f9f9f9', outline: 'none', color: '#666' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '.8rem', color: '#888', marginBottom: '.5rem', fontWeight: 600 }}>DEPARTMENT</label>
                <input type="text" readOnly value={user?.department || ''} style={{ width: '100%', padding: '.75rem', borderRadius: 8, border: '1px solid #eee', background: '#f9f9f9', outline: 'none', color: '#666' }} />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Security & Authentication</h3>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <Key size={16} color="#2F6BFF" />
                    <span style={{ fontWeight: 700, fontSize: '.95rem' }}>Active Session Token</span>
                  </div>
                  <span style={{ background: '#e6fffa', color: '#2ECC71', fontSize: '.7rem', padding: '.25rem .5rem', borderRadius: 4, fontWeight: 800 }}>SECURE</span>
                </div>
                <p style={{ fontSize: '.75rem', color: '#64748b', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {localStorage.getItem('adminToken')?.slice(0, 60) || 'No token found'}…
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-primary" style={{ padding: '.625rem 1.25rem' }}>Change Password</button>
                <button className="btn btn-ghost" style={{ padding: '.625rem 1.25rem' }}>Two-Factor Auth</button>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '.5rem', fontSize: '1.25rem' }}>Service Configuration</h3>
              <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Enable or disable backend services. Changes apply immediately on the server.
              </p>

              {configLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <RefreshCw size={24} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : configError ? (
                <div style={{ background: '#fff1f0', border: '1px solid rgba(255,77,79,.25)', borderRadius: 8, padding: '1rem', color: '#c0392b', marginBottom: '1rem' }}>
                  ⚠️ {configError}
                  <button className="btn btn-ghost" onClick={fetchServiceConfig} style={{ marginLeft: '1rem', fontSize: '.8rem' }}>
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              ) : serviceConfig.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No service configuration found in the database.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {serviceConfig.map((svc: any) => (
                    <div key={svc.service_name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '1rem 1.25rem', borderRadius: 12,
                      border: `1px solid ${svc.is_enabled ? '#d4edda' : '#f5c6cb'}`,
                      background: svc.is_enabled ? '#f8fff9' : '#fff8f8',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <Power size={18} color={svc.is_enabled ? '#2ECC71' : '#FF4D4F'} />
                        <div>
                          <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{svc.service_name.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{svc.description || 'No description'}</div>
                        </div>
                      </div>
                      <button
                        className={`btn ${svc.is_enabled ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '.4rem 1rem', fontSize: '.8rem' }}
                        onClick={() => toggleService(svc.service_name, svc.is_enabled)}
                      >
                        {svc.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>System API Configuration</h3>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '.8rem', color: '#888', marginBottom: '.5rem', fontWeight: 600 }}>BACKEND API URL</label>
                <input type="text" readOnly value="https://aazhi-9gj2.onrender.com/api"
                  style={{ width: '100%', padding: '.75rem', borderRadius: 8, border: '1px solid #ddd', outline: 'none', fontFamily: 'monospace', background: '#f9f9f9' }} />
                <p style={{ fontSize: '.7rem', color: '#999', marginTop: '.5rem' }}>Production endpoint for all administrative data sync.</p>
              </div>
              <div style={{ background: '#fff7e6', padding: '1.25rem', borderRadius: 12, border: '1px solid #ffd591' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: '#d46b08', fontWeight: 700, marginBottom: '.5rem' }}>
                  <Globe size={18} /> <span>CORS Configuration</span>
                </div>
                <p style={{ fontSize: '.8rem', color: '#873800' }}>
                  Authorized Origins: aazhi.ajaiselvaraj.me, localhost:5173, localhost:5174
                </p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            {success && <span style={{ color: '#2ECC71', fontSize: '.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.25rem' }}><Save size={16}/> Saved!</span>}
            {activeTab === 'profile' && (
              <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ minWidth: '140px', justifyContent: 'center' }}>
                {loading ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={18}/> Save Changes</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
