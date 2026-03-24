import React, { useState } from 'react'
import {
  LayoutDashboard, Map, MessageSquare, Cpu, Copy,
  AlertTriangle, ListOrdered, BarChart2, TrendingUp,
  BellRing, ShieldAlert, Settings, LogOut, Zap, Brain
} from 'lucide-react'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { id: 'overview',  icon: LayoutDashboard, label: 'Dashboard Overview' },
      { id: 'heatmap',   icon: Map,             label: 'Live Issue Map' },
      { id: 'complaints',icon: MessageSquare,   label: 'Complaints' },
      { id: 'service-requests', icon: ListOrdered, label: 'Service Requests' },
    ],
  },
  {
    label: 'AI Processing',
    items: [
      { id: 'triage',       icon: Cpu,             label: 'AI Routing Queue' },
      { id: 'duplicate',    icon: Copy,            label: 'Duplicate Detection' },
      { id: 'fraud',        icon: ShieldAlert,     label: 'Fraud Monitoring' },
      { id: 'ai-insights',  icon: Brain,           label: 'AI Insights' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'priority',  icon: ListOrdered,     label: 'Priority Queue' },
      { id: 'insights',  icon: BarChart2,       label: 'Insights & Analytics' },
      { id: 'forecast',  icon: TrendingUp,      label: 'Workload Forecast' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { id: 'alerts',    icon: BellRing,        label: 'System Alerts' },
      { id: 'risk',      icon: AlertTriangle,   label: 'Risk Detector' },
    ],
  },
]

interface SidebarProps {
  active: string
  onNav: (id: string) => void
  onLogout: () => void
}

export default function Sidebar({ active, onNav, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #2F6BFF, #1a55e8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Zap size={16} color="#fff" />
          </div>
          <div>
            <div className="sidebar-logo-title">AAZHI</div>
            <div className="sidebar-logo-sub">Admin Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="nav-section-label">{group.label}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item${active === item.id ? ' active' : ''}`}
                onClick={() => onNav(item.id)}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button 
          className={`nav-item${active === 'settings' ? ' active' : ''}`} 
          onClick={() => onNav('settings')}
          style={{ color: active === 'settings' ? '#fff' : 'rgba(255,255,255,.4)', marginBottom: '.25rem' }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button className="nav-item" onClick={onLogout} style={{ color: 'rgba(255,77,79,.7)' }}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
