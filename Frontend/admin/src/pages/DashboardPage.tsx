import React, { useState } from 'react'
import Sidebar from '../components/layout/Sidebar'
import TopBar from '../components/layout/TopBar'
import DashboardOverview from '../components/panels/DashboardOverview'
import HeatmapPanel from '../components/panels/HeatmapPanel'
import TriagePanel from '../components/panels/TriagePanel'
import DuplicatePanel from '../components/panels/DuplicatePanel'
import FraudPanel from '../components/panels/FraudPanel'
import HistoryPanel from '../components/panels/HistoryPanel'
import InsightsPanel from '../components/panels/InsightsPanel'
import WorkloadForecastPanel from '../components/panels/WorkloadForecastPanel'
import PredictiveAlertsPanel from '../components/panels/PredictiveAlertsPanel'
import RiskDetectorPanel from '../components/panels/RiskDetectorPanel'
import AIInsightsPanel from '../components/panels/AIInsightsPanel'
import SettingsPanel from '../components/panels/SettingsPanel'
import ServiceRequestsPanel from '../components/panels/ServiceRequestsPanel'
import { useAuth } from '../context/AuthContext'

const PANEL_MAP: Record<string, React.ComponentType> = {
  overview:   DashboardOverview,
  heatmap:    HeatmapPanel,
  complaints: TriagePanel,
  'service-requests': ServiceRequestsPanel,
  triage:     TriagePanel,
  duplicate:  DuplicatePanel,
  fraud:      FraudPanel,
  history:    HistoryPanel,
  insights:   InsightsPanel,
  forecast:   WorkloadForecastPanel,
  alerts:     PredictiveAlertsPanel,
  risk:            RiskDetectorPanel,
  'ai-insights':   AIInsightsPanel,
  settings:   SettingsPanel,
}

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState('overview')
  const { logout } = useAuth()

  const Panel = PANEL_MAP[activeNav] || DashboardOverview

  return (
    <div className="app-shell">
      <Sidebar active={activeNav} onNav={setActiveNav} onLogout={logout} />
      <div className="main-area">
        <TopBar />
        <main className="page-content" key={activeNav}>
          <Panel />
        </main>
      </div>
    </div>
  )
}
