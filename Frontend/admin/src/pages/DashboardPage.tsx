import React, { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'
import DashboardOverview from '../components/panels/DashboardOverview'
import HeatmapPanel from '../components/panels/HeatmapPanel'
import TriagePanel from '../components/panels/TriagePanel'
import DuplicatePanel from '../components/panels/DuplicatePanel'
import HistoryPanel from '../components/panels/HistoryPanel'
import InsightsPanel from '../components/panels/InsightsPanel'
import WorkloadForecastPanel from '../components/panels/WorkloadForecastPanel'
import PredictiveAlertsPanel from '../components/panels/PredictiveAlertsPanel'
import RiskDetectorPanel from '../components/panels/RiskDetectorPanel'
import AIInsightsPanel from '../components/panels/AIInsightsPanel'
import SettingsPanel from '../components/panels/SettingsPanel'
import ServiceRequestsPanel from '../components/panels/ServiceRequestsPanel'
import ComplaintSummarizerPanel from '../components/panels/ComplaintSummarizerPanel'
import SentimentPulsePanel from '../components/panels/SentimentPulsePanel'
import CivicAlertPanel from '../components/panels/CivicAlertPanel' // ⭐ ADD-ON: Civic Alert Management
import AICommandCenter from './AICommandCenter'
import AIModelMetrics from './AIModelMetrics'
import IntegrityDashboardPanel from '../components/panels/IntegrityDashboardPanel' // ⭐ ADD-ON: Integrity Queue
import ExecutiveOversightPanel from '../components/panels/ExecutiveOversightPanel'
import CCICommandCenterPanel from '../components/panels/CCICommandCenterPanel' // ⭐ ADD-ON: CCI Command Center
import NotificationCenterPanel from '../components/panels/NotificationCenterPanel'
import EscalationQueuePanel from '../components/panels/EscalationQueuePanel'         // ⭐ ADD-ON: Escalation Queue
import OfficerAccountabilityPanel from '../components/panels/OfficerAccountabilityPanel' // ⭐ ADD-ON: Officer Accountability
import { useAuth } from '../context/AuthContext'

const PANEL_MAP: Record<string, React.ComponentType> = {
  overview:   DashboardOverview,
  heatmap:    HeatmapPanel,
  complaints: TriagePanel,
  'service-requests': ServiceRequestsPanel,
  triage:     TriagePanel,
  duplicate:  DuplicatePanel,
  history:    HistoryPanel,
  insights:   InsightsPanel,
  forecast:   WorkloadForecastPanel,
  alerts:     PredictiveAlertsPanel,
  risk:            RiskDetectorPanel,
  'ai-insights':   AIInsightsPanel,
  settings:   SettingsPanel,
  'ml-summarizer':  ComplaintSummarizerPanel,
  'ml-sentiment':   SentimentPulsePanel,
  'civic-alerts':   CivicAlertPanel,  // ⭐ ADD-ON: Admin Civic Alert Management
  'ai-command-center': AICommandCenter,
  'ai-model-metrics': AIModelMetrics,
  'integrity-dashboard': IntegrityDashboardPanel,
  'executive-oversight': ExecutiveOversightPanel,
  'cci-command': CCICommandCenterPanel,
  'notification-center': NotificationCenterPanel,
  'escalation-queue':       EscalationQueuePanel,       // ⭐ ADD-ON
  'officer-accountability': OfficerAccountabilityPanel, // ⭐ ADD-ON
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const isIntegrity = user?.role === 'integrity_officer'
  const isExecutive = user?.role === 'executive_oversight'
  const [activeNav, setActiveNav] = useState(isIntegrity ? 'integrity-dashboard' : isExecutive ? 'executive-oversight' : 'overview')

  // Enforce strict role-based panel rendering
  const Panel = isIntegrity 
    ? IntegrityDashboardPanel 
    : isExecutive
      ? ExecutiveOversightPanel
      : (activeNav === 'integrity-dashboard' ? DashboardOverview : (PANEL_MAP[activeNav] || DashboardOverview))

  return (
    <div className="app-shell">
      <Sidebar active={isIntegrity ? 'integrity-dashboard' : activeNav} onNav={setActiveNav} onLogout={logout} />
      <div className="main-area">
        <TopBar />
        <main className="page-content" key={isIntegrity ? 'integrity-dashboard' : activeNav}>
          <Panel />
        </main>
      </div>
    </div>
  )
}
