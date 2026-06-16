import React, { useState } from 'react'
import {
  LayoutDashboard, Map, MessageSquare, Cpu, Copy,
  AlertTriangle, ListOrdered, BarChart2, TrendingUp,
  BellRing, ShieldAlert, Settings, LogOut, Zap, Brain, History,
  Layers, Heart, Megaphone
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'

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
      { id: 'ai-insights',  icon: Brain,           trans_key: 'nav.ai_insights', default_label: 'AI Insights' },
    ],
  },
  {
    label_key: 'nav.grp_ml',
    label_default: '🧠 ML Innovation',
    items: [
      { id: 'ml-summarizer',   icon: Layers,       trans_key: 'nav.ml_summarizer', default_label: '📋 Smart Summarizer' },
      { id: 'ml-sentiment',    icon: Heart,         trans_key: 'nav.ml_sentiment',  default_label: '🎯 Sentiment Pulse' },
    ],
  },
  {
    label_key: 'nav.grp_mlops',
    label_default: '🧠 MLOps & Control',
    items: [
      { id: 'ai-command-center', icon: Brain, trans_key: 'nav.ai_command_center', default_label: 'AI Command Center' },
      { id: 'ai-model-metrics',  icon: Cpu,   trans_key: 'nav.ai_model_metrics',  default_label: 'Model Performance' },
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
      { id: 'alerts',        icon: BellRing,      trans_key: 'nav.sys_alerts',   default_label: 'System Alerts' },
      { id: 'risk',          icon: AlertTriangle,  trans_key: 'nav.risk_det',     default_label: 'Risk Detector' },
      { id: 'civic-alerts',  icon: Megaphone,      trans_key: 'nav.civic_alerts', default_label: 'Alerts' }, // ⭐ ADD-ON
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
  const { user } = useAuth()

  const isIntegrity = user?.role === 'integrity_officer'
  const isExecutive = user?.role === 'executive_oversight'

  const groupsToRender = isIntegrity ? [
    {
      label_key: 'nav.grp_integrity',
      label_default: 'Civic Integrity Board',
      items: [
        { id: 'integrity-dashboard', icon: ShieldAlert, trans_key: 'nav.integrity_dashboard', default_label: 'Integrity Dashboard' }
      ]
    }
  ] : isExecutive ? [
    {
      label_key: 'nav.grp_executive',
      label_default: 'Executive Governance',
      items: [
        { id: 'executive-oversight', icon: ShieldAlert, trans_key: 'nav.executive_oversight', default_label: 'Executive Dashboard' }
      ]
    }
  ] : navGroups;

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
        {groupsToRender.map(group => (
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
        {!isIntegrity && !isExecutive && (
          <button 
            className={`nav-item${active === 'settings' ? ' active' : ''}`} 
            onClick={() => onNav('settings')}
            style={{ color: active === 'settings' ? '#fff' : 'rgba(255,255,255,.4)', marginBottom: '.25rem' }}
          >
            <Settings size={16} />
            <span>{t('nav.settings') || 'Settings'}</span>
          </button>
        )}
        <button className="nav-item" onClick={onLogout} style={{ color: 'rgba(255,77,79,.7)' }}>
          <LogOut size={16} />
          <span>{t('nav.logout') || 'Logout'}</span>
        </button>
      </div>
    </aside>
  )
}
