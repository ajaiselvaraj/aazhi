import React, { useState } from 'react'
import { User, ShieldAlert, Cpu, BellRing, Settings as SettingsIcon, Lock, Database } from 'lucide-react'

function ToggleSwitch({ checked, onChange, label }: { checked: boolean, onChange: (c: boolean) => void, label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', cursor: 'pointer' }} onClick={() => onChange(!checked)}>
      <div style={{
        width: 40, height: 22, borderRadius: 12,
        background: checked ? 'var(--primary)' : 'var(--border)',
        position: 'relative',
        transition: 'background 0.2s ease-in-out'
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          transition: 'left 0.2s ease-in-out', boxShadow: 'var(--shadow-sm)'
        }} />
      </div>
      {label && <span style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>}
    </div>
  )
}

function SectionHeader({ title, icon: Icon }: { title: string, icon: any }) {
  return (
    <div className="section-title" style={{ marginBottom: '1.25rem' }}>
      <div className="icon-dot" style={{ background: 'var(--primary)' }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <Icon size={18} color="var(--primary)" />
        {title}
      </span>
    </div>
  )
}

export default function SettingsPanel() {
  const [profile, setProfile] = useState({
    name: 'Admin User',
    id: 'ADM-9942',
    dept: 'Central Command',
    email: 'admin@aazhi.gov',
    phone: '+91 98765 43210'
  })

  const [toggles, setToggles] = useState({
    autoRouting: true,
    aiClassification: true,
    aiDuplicate: true,
    aiFraud: true,
    aiPriority: true,
    aiRisk: true,
    alertCritical: true,
    alertPredictive: false,
    alertInfra: true,
    twoFactor: false
  })

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Dashboard Settings</h1>
        <p>Configure administrative preferences, AI behaviors, and department settings.</p>
      </div>

      <div className="grid-2">
        {/* SECTION 1 — ADMIN PROFILE SETTINGS */}
        <div className="card section-gap">
          <SectionHeader title="Admin Profile Settings" icon={User} />
          <div className="form-group grid-2">
            <div>
              <label className="form-label">Admin Name</label>
              <input type="text" className="form-input" name="name" value={profile.name} onChange={handleProfileChange} />
            </div>
            <div>
              <label className="form-label">Admin ID</label>
              <input type="text" className="form-input" name="id" value={profile.id} readOnly style={{ background: 'var(--bg)', color: 'var(--text-muted)' }} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input type="text" className="form-input" name="dept" value={profile.dept} onChange={handleProfileChange} />
          </div>
          <div className="form-group grid-2">
            <div>
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" name="email" value={profile.email} onChange={handleProfileChange} />
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" name="phone" value={profile.phone} onChange={handleProfileChange} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary">Update Profile</button>
            <button className="btn btn-ghost">Change Password</button>
          </div>
        </div>

        {/* SECTION 2 — DEPARTMENT CONFIGURATION */}
        <div className="card section-gap">
          <SectionHeader title="Department Configuration" icon={SettingsIcon} />
          <div className="form-group">
            <label className="form-label">Default Complaint Priority</label>
            <select className="form-select">
              <option value="low">Low (Standard SLA)</option>
              <option value="medium">Medium (Accelerated SLA)</option>
              <option value="high">High (Urgent Attention)</option>
              <option value="critical">Critical (Immediate Action)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">AI Triage Sensitivity Level</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input type="range" min="1" max="100" defaultValue="75" style={{ flex: 1, accentColor: 'var(--primary)' }} />
              <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>75%</span>
            </div>
            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>Higher sensitivity routes more complaints to manual review.</p>
          </div>
          <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
            <ToggleSwitch checked={toggles.autoRouting} onChange={() => handleToggle('autoRouting')} label="Enable Auto Routing to Departments" />
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-primary">Save Configuration</button>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* SECTION 3 — AI SYSTEM SETTINGS */}
        <div className="card section-gap">
          <SectionHeader title="AI Automation Modules" icon={Cpu} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>Complaint Classification AI</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Auto-categorize incoming issues</div>
              </div>
              <ToggleSwitch checked={toggles.aiClassification} onChange={() => handleToggle('aiClassification')} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>Duplicate Detection AI</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Merge visually/contextually similar complaints</div>
              </div>
              <ToggleSwitch checked={toggles.aiDuplicate} onChange={() => handleToggle('aiDuplicate')} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>Fraud Detection AI</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Monitor for bot activity and spam patterns</div>
              </div>
              <ToggleSwitch checked={toggles.aiFraud} onChange={() => handleToggle('aiFraud')} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.75rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>Priority Prediction AI</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Escalate critical infrastructure issues automatically</div>
              </div>
              <ToggleSwitch checked={toggles.aiPriority} onChange={() => handleToggle('aiPriority')} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '.85rem', fontWeight: 600 }}>Risk Detection AI</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Analyze sentiment and potential PR hazards</div>
              </div>
              <ToggleSwitch checked={toggles.aiRisk} onChange={() => handleToggle('aiRisk')} />
            </div>
          </div>
        </div>

        {/* SECTION 4 — ALERT CONFIGURATION */}
        <div className="card section-gap">
          <SectionHeader title="Alert Configuration" icon={BellRing} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <ToggleSwitch checked={toggles.alertCritical} onChange={() => handleToggle('alertCritical')} label="Enable Critical Action Alerts" />
            <ToggleSwitch checked={toggles.alertPredictive} onChange={() => handleToggle('alertPredictive')} label="Enable Predictive Maintenance Alerts" />
            <ToggleSwitch checked={toggles.alertInfra} onChange={() => handleToggle('alertInfra')} label="Enable Infrastructure Risk Alerts" />
          </div>
          
          <div className="form-group" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <label className="form-label">Global Admin Notification Method</label>
            <select className="form-select">
              <option value="dashboard">Dashboard Alerts Only</option>
              <option value="email">Email Notifications</option>
              <option value="both">Both Email & Dashboard</option>
            </select>
          </div>
          <button className="btn btn-primary">Save Alerts Options</button>
        </div>
      </div>

      <div className="grid-3">
        {/* SECTION 5 — SYSTEM PREFERENCES */}
        <div className="card section-gap">
          <SectionHeader title="System Preferences" icon={SettingsIcon} />
          <div className="form-group">
            <label className="form-label">Dashboard Theme</label>
            <select className="form-select">
              <option value="light">Default (Light)</option>
              <option value="dark">Dark Mode</option>
              <option value="system">Follow System Settings</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data Refresh Interval</label>
            <select className="form-select">
              <option value="30s">Every 30 seconds</option>
              <option value="1m">Every 1 minute</option>
              <option value="5m">Every 5 minutes</option>
              <option value="never">Manual Refresh</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>Apply Preferences</button>
        </div>

        {/* SECTION 6 — SECURITY SETTINGS */}
        <div className="card section-gap">
          <SectionHeader title="Security Settings" icon={Lock} />
          <div className="form-group">
            <label className="form-label">Session Timeout Duration</label>
            <select className="form-select">
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="never">Never (Not Recommended)</option>
            </select>
          </div>
          <div className="form-group" style={{ padding: '1rem 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
            <ToggleSwitch checked={toggles.twoFactor} onChange={() => handleToggle('twoFactor')} label="Enable Two-Factor Authentication" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'center' }}>View Login History</button>
            <button className="btn btn-danger" style={{ justifyContent: 'center' }}>Force Logout All Sessions</button>
          </div>
        </div>

        {/* SECTION 7 — DATA MANAGEMENT */}
        <div className="card section-gap">
          <SectionHeader title="Data Management" icon={Database} />
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Manage the overall system data, download reports, or clear server caches to improve system speed.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Export Complaint Data (CSV)</button>
            <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>Download AI Analytics Report</button>
            <div style={{ margin: '.5rem 0', borderTop: '1px solid var(--border-light)' }} />
            <button className="btn btn-danger" style={{ justifyContent: 'center' }}>Clear System Cache</button>
          </div>
        </div>
      </div>
    </div>
  )
}
