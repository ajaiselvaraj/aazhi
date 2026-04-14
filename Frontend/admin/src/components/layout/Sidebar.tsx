import React, { useState } from 'react'
import {
  LayoutDashboard, Map, MessageSquare, Cpu, Copy,
  AlertTriangle, ListOrdered, BarChart2, TrendingUp,
  BellRing, ShieldAlert, Settings, LogOut, Zap, Brain, History
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const navGroups = [
  {
    label_key: 'nav.grp_overview',
    label_default: 'Overview',
    items: [
      { id: 'overview',  icon: LayoutDashboard, trans_key: 'nav.overview', default_label: 'Dashboard Overview' },
      { id: 'heatmap',   icon: Map,             trans_key: 'nav.live_map', default_label: 'Live Issue Map' },
      { id: 'complaints',icon: MessageSquare,   trans_key: 'nav.complaints', default_label: 'Complaints' },
      { id: 'service-requests', icon: ListOrdered, trans_key: 'nav.service_req', default_label: 'Service Requests' },
    ],
  },
  {
    label_key: 'nav.grp_ai',
    label_default: 'AI Processing',
    items: [
      { id: 'triage',       icon: Cpu,             trans_key: 'nav.ai_route', default_label: 'AI Routing Queue' },
      { id: 'duplicate',    icon: Copy,            trans_key: 'nav.dup_det', default_label: 'Duplicate Detection' },
      { id: 'fraud',        icon: ShieldAlert,     trans_key: 'nav.fraud_mon', default_label: 'Fraud Monitoring' },
      { id: 'ai-insights',  icon: Brain,           trans_key: 'nav.ai_insights', default_label: 'AI Insights' },
    ],
  },
  {
    label_key: 'nav.grp_ops',
    label_default: 'Operations',
    items: [
      { id: 'history',   icon: History,         trans_key: 'common.history', default_label: 'History' },
      { id: 'insights',  icon: BarChart2,       trans_key: 'nav.insights', default_label: 'Insights & Analytics' },
      { id: 'forecast',  icon: TrendingUp,      trans_key: 'nav.forecast', default_label: 'Workload Forecast' },
    ],
  },
  {
    label_key: 'nav.grp_mon',
    label_default: 'Monitoring',
    items: [
      { id: 'alerts',    icon: BellRing,        trans_key: 'nav.sys_alerts', default_label: 'System Alerts' },
      { id: 'risk',      icon: AlertTriangle,   trans_key: 'nav.risk_det', default_label: 'Risk Detector' },
    ],
  },
]

interface SidebarProps {
  active: string
  onNav: (id: string) => void
  onLogout: () => void
}

export default function Sidebar({ active, onNav, onLogout }: SidebarProps) {
  const { t } = useLanguage()
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
            <div className="sidebar-logo-sub">{t('nav.admin_portal') || 'Admin Portal'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navGroups.map(group => (
          <div key={group.label_key}>
            <div className="nav-section-label">{t(group.label_key) || group.label_default}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item${active === item.id ? ' active' : ''}`}
                onClick={() => onNav(item.id)}
              >
                <item.icon size={16} />
                <span>{t(item.trans_key) || item.default_label}</span>
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
          <span>{t('nav.settings') || 'Settings'}</span>
        </button>
        <button className="nav-item" onClick={onLogout} style={{ color: 'rgba(255,77,79,.7)' }}>
          <LogOut size={16} />
          <span>{t('nav.logout') || 'Logout'}</span>
        </button>
      </div>
    </aside>
  )
}
