/**
 * LiveAlertsPanel — Drop-in wrapper around AlertsPanel (ADD-ON)
 *
 * Uses civicAlertService to fetch admin-published alerts from the backend,
 * falls back to whatever `staticAlerts` prop is passed (the existing kiosk data).
 * AlertsPanel itself is NEVER modified.
 *
 * Usage: replace <AlertsPanel alerts={alerts} /> with
 *               <LiveAlertsPanel staticAlerts={alerts} />
 * anywhere a live feed is desired, while keeping original rendering intact.
 */

import React, { useState, useEffect } from 'react'
import AlertsPanel from './AlertsPanel'
import { CityAlert, Language } from '../../types'
import { startAlertPolling } from '../../services/civicAlertService'

interface Props {
  /** The existing static/context alerts — used as the initial fallback */
  staticAlerts: CityAlert[]
  language?: Language
}

const LiveAlertsPanel: React.FC<Props> = ({ staticAlerts, language }) => {
  const [liveAlerts, setLiveAlerts] = useState<CityAlert[]>(staticAlerts)

  useEffect(() => {
    // Start polling; if API fails, staticAlerts are the fallback
    const stopPolling = startAlertPolling(
      (alerts) => setLiveAlerts(alerts),
      staticAlerts
    )
    return stopPolling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only on mount — intentionally not re-subscribing on staticAlerts change

  // AlertsPanel is rendered exactly as before — we just supply live data
  return <AlertsPanel alerts={liveAlerts} language={language} />
}

export default LiveAlertsPanel
