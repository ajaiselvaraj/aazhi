import React, { useState, useEffect, useRef } from 'react'
import {
  Brain, Cpu, ShieldAlert, Map, AlertTriangle, Layers, Clock,
  Activity, Play, Pause, RefreshCw, Send, CheckCircle, XCircle,
  Sparkles, Sliders, Info, Server, Terminal, BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import * as aiApi from '../api/aiApi'
import { adminApi } from '../services/adminApi'
import { useLanguage } from '../context/LanguageContext'

// Mapbox Access Token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || ''

export default function AICommandCenter() {
  const { t } = useLanguage()

  // --- State Variables ---
  const [aiEndpoint, setAiEndpoint] = useState(aiApi.getAiBaseUrl())
  const [health, setHealth] = useState<any>(null)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  // Live Playground State
  const [inputText, setInputText] = useState('')
  const [playgroundLoading, setPlaygroundLoading] = useState(false)
  const [playgroundResult, setPlaygroundResult] = useState<any>(null)
  const [playgroundError, setPlaygroundError] = useState<string | null>(null)

  // Real data state
  const [duplicateClusters, setDuplicateClusters] = useState<any[]>([])
  const [fraudSignals, setFraudSignals] = useState<any[]>([])
  const [recentComplaints, setRecentComplaints] = useState<any[]>([])
  const [hotspotData, setHotspotData] = useState<any[]>([])
  const [loadingFeeds, setLoadingFeeds] = useState(true)

  // Mapbox states
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11')
  const [showHotspots, setShowHotspots] = useState(true)
  const [showAnomalies, setShowAnomalies] = useState(true)

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null)

  // Live log simulation states -> now real WebSockets
  const [logs, setLogs] = useState<string[]>([])
  const [isLogging, setIsLogging] = useState(true)

  // --- Initialize Web Console Logs ---
  useEffect(() => {
    addLog('System', 'Civic Intelligence Engine initialized.')
    addLog('MLOps', `Base URL set to: ${aiEndpoint}`)
  }, [aiEndpoint])

  function addLog(source: string, msg: string) {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => {
      const line = `[${timestamp}] [${source.toUpperCase()}] ${msg}`;
      if (prev.includes(line)) return prev;
      return [line, ...prev].slice(0, 50);
    })
  }

  // --- Toggle Endpoint Override ---
  function handleEndpointChange(newUrl: string) {
    localStorage.setItem('aazhi_ai_endpoint_override', newUrl)
    setAiEndpoint(newUrl)
    addLog('MLOps', `Switched AI Endpoint to: ${newUrl}`)
    // Trigger health recheck
    setHealthLoading(true)
  }

  // --- Live WebSocket Stream ---
  useEffect(() => {
    if (!isLogging) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    const wsUrl = aiEndpoint.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/inference'
    addLog('System', `Connecting to WebSocket: ${wsUrl}...`)

    const socket = new WebSocket(wsUrl)
    wsRef.current = socket

    socket.onopen = () => {
      addLog('System', 'Live WebSocket stream connected.')
    }

    socket.onmessage = (event) => {
      const msg = event.data
      setLogs(prev => {
        if (prev.includes(msg)) return prev
        return [msg, ...prev].slice(0, 50)
      })
    }

    socket.onclose = () => {
      addLog('System', 'Live WebSocket stream disconnected.')
    }

    socket.onerror = (err) => {
      console.error('WebSocket error:', err)
      addLog('System', 'WebSocket connection error.')
    }

    return () => {
      socket.close()
      wsRef.current = null
    }
  }, [aiEndpoint, isLogging])

  // --- Fetch System Health & Diagnostics ---
  useEffect(() => {
    async function loadHealth() {
      try {
        const h = await aiApi.checkHealth()
        setHealth(h)
        addLog('Health', 'FastAPI Health check: 200 OK (models loaded)')
      } catch (err: any) {
        setHealth(null)
        addLog('Health', `FastAPI check failed: ${err.message}`)
      } finally {
        setHealthLoading(false)
      }

      try {
        const d = await aiApi.getDiagnostics()
        setDiagnostics(d)
        addLog('Diagnostics', 'Loaded memory usage & latency diagnostic profiles.')
      } catch (err: any) {
        setDiagnostics(null)
      }
    }
    loadHealth()
    const iv = setInterval(loadHealth, 30000)
    return () => clearInterval(iv)
  }, [aiEndpoint])

  // --- Fetch live dashboard feeds ---
  useEffect(() => {
    async function loadFeeds() {
      setLoadingFeeds(true)
      try {
        // Load duplicate clusters from Express backend (which queries FastAPI)
        const dupRes = await adminApi.getMLComplaintClusters()
        // Express might return raw object or wrapped, handle both
        const clusters = dupRes.clusters || dupRes || []
        setDuplicateClusters(clusters)
        addLog('ML', `Loaded ${clusters.length} duplicate semantic clusters.`)

        // Load fraud signals
        const fraudRes = await adminApi.getFraudSignals()
        setFraudSignals(fraudRes || [])
        addLog('Fraud', `Scanned Isolation Forest anomaly logs. flagged ${fraudRes?.length || 0} suspicious actors.`)

        // Load complaints for map plotting
        const complaintsRes = await adminApi.getAllComplaints({ limit: 100 })
        const complaintsList = complaintsRes.data || []
        setRecentComplaints(complaintsList)

        // Request hotspot aggregates from FastAPI
        if (complaintsList.length > 0) {
          const hotspots = await aiApi.predictHotspot(complaintsList)
          setHotspotData(hotspots || [])
          addLog('Forecast', 'Re-calculated relative risk indicators across municipal wards.')
        }
      } catch (err: any) {
        console.error('Failed to load operational feeds', err)
        addLog('Error', `Failed loading feeds: ${err.message}`)
      } finally {
        setLoadingFeeds(false)
      }
    }
    loadFeeds()
  }, [aiEndpoint])

  // --- Mapbox GL Initialization ---
  useEffect(() => {
    if (!mapContainerRef.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [91.74, 26.18], // Guwahati coordinates
      zoom: 12,
      pitch: 45,
      bearing: -17
    })

    mapRef.current = map
    addLog('GIS', 'Mapbox viewport initialized.')

    map.on('load', () => {
      // Add a simple 3D buildings layer
      if (map.getSource('composite')) {
        map.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 14,
          'paint': {
            'fill-extrusion-color': '#1E293B',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
            'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.6
          }
        })
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [mapStyle])

  // --- Map Overlays Updating ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clean existing markers
    const currentMarkers = document.querySelectorAll('.mapboxgl-marker')
    currentMarkers.forEach(m => m.remove())

    if (recentComplaints.length === 0) return

    // Draw Hotspots or Anomaly points
    recentComplaints.forEach((c: any) => {
      const lat = parseFloat(c.latitude)
      const lng = parseFloat(c.longitude)
      if (isNaN(lat) || isNaN(lng)) return

      // Determine marker characteristics
      const isAnomaly = fraudSignals.some(f => f.odUserId === c.citizen_id && f.riskScore > 60)
      
      if (isAnomaly && showAnomalies) {
        // Red critical marker
        const el = document.createElement('div')
        el.className = 'custom-marker anomaly-marker'
        el.style.width = '24px'
        el.style.height = '24px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = 'rgba(255, 77, 79, 0.9)'
        el.style.border = '2px solid #fff'
        el.style.boxShadow = '0 0 10px rgba(255, 77, 79, 0.8)'
        el.style.cursor = 'pointer'
        el.title = `Suspicious activity flagged: ${c.subject}`

        new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="color:#000;font-size:12px;padding:4px;">
              <strong style="color:#FF4D4F;">⚠️ ANOMALY DETECTED</strong><br/>
              <strong>Ticket:</strong> ${c.ticket_number}<br/>
              <strong>Issue:</strong> ${c.subject}<br/>
              <strong>Ward:</strong> ${c.ward || 'Unknown'}
            </div>
          `))
          .addTo(map)
      } else if (showHotspots) {
        // Normal issues mapped as blue/purple hotspot indicators
        const el = document.createElement('div')
        el.className = 'custom-marker hotspot-marker'
        el.style.width = '14px'
        el.style.height = '14px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = c.priority === 'critical' ? '#FF4D4F' : c.priority === 'high' ? '#FFA940' : '#2F6BFF'
        el.style.border = '1px solid #fff'
        el.style.cursor = 'pointer'

        new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="color:#000;font-size:12px;padding:4px;">
              <strong>🏢 ${c.department?.toUpperCase()}</strong><br/>
              <strong>Ticket:</strong> ${c.ticket_number}<br/>
              <strong>Subject:</strong> ${c.subject}<br/>
              <strong>Priority:</strong> <span style="font-weight:700;color:${c.priority === 'critical' ? '#FF4D4F' : '#000'}">${c.priority}</span>
            </div>
          `))
          .addTo(map)
      }
    })

  }, [recentComplaints, showHotspots, showAnomalies, fraudSignals])

  // Logs are updated in real-time exclusively via active WebSocket connection.

  // --- Run manual live ML playground predictions ---
  async function handlePlaygroundPredict() {
    if (!inputText.trim()) return
    setPlaygroundLoading(true)
    setPlaygroundError(null)
    setPlaygroundResult(null)

    try {
      const cleanInput = inputText.trim()
      addLog('Playground', `Forwarding test inference query: "${cleanInput.substring(0, 30)}..."`)

      // Parallel calls to FastAPI endpoints
      const [routeRes, sentRes, duplicateRes, slaRes, timeRes] = await Promise.all([
        aiApi.classifyComplaint(cleanInput),
        aiApi.analyzeSentiment(cleanInput),
        aiApi.checkDuplicate(cleanInput, recentComplaints.slice(0, 10)),
        aiApi.predictSla('water', 'medium', 'Ward 4', cleanInput),
        aiApi.predictResolutionTime('water', 'medium', 'Ward 4', cleanInput)
      ])

      const finalRes = {
        route: routeRes,
        sentiment: sentRes,
        duplicate: duplicateRes,
        sla: slaRes,
        resolutionTime: timeRes
      }
      
      setPlaygroundResult(finalRes)
      addLog('Playground', `Inference finished. Routing: ${routeRes.department} (Confidence: ${routeRes.confidence}%)`)
    } catch (err: any) {
      console.error(err)
      setPlaygroundError(`Inference server rejected request: ${err.message}`)
      addLog('Playground', `Error: ${err.message}`)
    } finally {
      setPlaygroundLoading(false)
    }
  }

  // --- UI Render ---
  const isOnline = health !== null
  const loadedModels = health?.models || {}

  // SHAP Chart data for playground
  const shapData = playgroundResult?.route?.explainability
    ? playgroundResult.route.explainability
    : []

  return (
    <div className="section-gap" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ═══ MLOps Server Banner & Controller ═══ */}
      <div style={{
        background: isOnline ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #2d1515 0%, #1e1b1b 100%)',
        borderRadius: 16, padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1.25rem',
        border: `1px solid ${isOnline ? 'rgba(47,107,255,.25)' : 'rgba(255,77,79,.25)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: isOnline ? 'linear-gradient(135deg, #2F6BFF, #1e40af)' : 'linear-gradient(135deg, #FF4D4F, #991b1b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isOnline ? '0 4px 15px rgba(47,107,255,.35)' : 'none'
          }}>
            <Brain size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span>Civic Intelligence Engine — Operations Panel</span>
              <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '.68rem' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.45)', marginTop: '.15rem' }}>
              {isOnline 
                ? `Models Active: ${Object.keys(loadedModels).filter(k => (loadedModels as any)[k]).join(', ').toUpperCase()}`
                : 'Connection failed. Ensure uvicorn service is active on port 5005.'}
            </div>
          </div>
        </div>

        {/* Server selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>AI Endpoint:</span>
          <select 
            value={aiEndpoint} 
            onChange={(e) => handleEndpointChange(e.target.value)}
            style={{
              background: '#0B0F19', border: '1px solid var(--border)', borderRadius: 8,
              color: '#fff', fontSize: '.78rem', padding: '.4rem .75rem', outline: 'none'
            }}
          >
            <option value="http://127.0.0.1:5005">Local Core (127.0.0.1:5005)</option>
            <option value="https://ai-service-aazhi.onrender.com">Cloud Mainframe (Render)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Hand side: Live Playground, Map, Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 🧪 LIVE PLAYGROUND (Explainable AI Engine) */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '.75rem', marginBottom: '1.25rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>
                <Cpu size={16} style={{ color: '#2F6BFF' }} /> Test Intake Pipeline & Explainable AI
              </h3>
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>SHAP Estimations Enabled</span>
            </div>

            <textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste description text (e.g. 'Street light broken and sparks flying next to electrical line at Ward 4...')"
              style={{
                width: '100%', minHeight: 90, padding: '.8rem', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontSize: '.85rem', outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: '1rem'
              }}
            />

            <button 
              onClick={handlePlaygroundPredict}
              disabled={playgroundLoading || !inputText.trim()}
              className="btn btn-primary"
              style={{ width: 'fit-content', padding: '.5rem 1.2rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}
            >
              {playgroundLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              Execute Inference
            </button>

            {playgroundError && (
              <div style={{ marginTop: '1rem', padding: '.8rem', background: 'rgba(255,77,79,.1)', border: '1px solid #FF4D4F', borderRadius: 10, color: '#FF4D4F', fontSize: '.8rem' }}>
                {playgroundError}
              </div>
            )}

            {/* Inference results layout */}
            {playgroundResult && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                
                {/* Predictions results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Inference Classifications</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '.4rem' }}>
                      <span>Predicted Department:</span>
                      <strong style={{ color: '#2F6BFF' }}>{playgroundResult.route.department?.toUpperCase()} ({playgroundResult.route.confidence}%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '.4rem' }}>
                      <span>SLA Breach Risk:</span>
                      <strong style={{ color: playgroundResult.sla.will_breach ? '#FF4D4F' : '#2ECC71' }}>
                        {playgroundResult.sla.will_breach ? 'High Risk' : 'Sufficient Time'} ({playgroundResult.sla.breach_probability}%)
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '.4rem' }}>
                      <span>Urgency / Sentiment Score:</span>
                      <strong>{playgroundResult.sentiment.sentiment?.toUpperCase()} ({playgroundResult.sentiment.urgency}/5)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '.4rem' }}>
                      <span>Est. Resolution ETA:</span>
                      <strong>{playgroundResult.resolutionTime.estimated_hours} Hours</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Semantic Duplicate Check:</span>
                      <strong style={{ color: playgroundResult.duplicate.is_duplicate ? '#FF4D4F' : '#2ECC71' }}>
                        {playgroundResult.duplicate.is_duplicate ? `Found Duplicate (${Math.round(playgroundResult.duplicate.similarity * 100)}%)` : 'Unique Complaint'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Explainable AI SHAP BarChart */}
                <div>
                  <h4 style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    <BarChart2 size={14} color="#9b59b6" /> SHAP Feature Contribution (XAI)
                  </h4>
                  <div style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shapData} layout="vertical" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" fontSize={9} stroke="var(--text-muted)" />
                        <YAxis dataKey="name" type="category" width={80} fontSize={8} stroke="var(--text-muted)" />
                        <Tooltip contentStyle={{ fontSize: 10, background: '#0B0F19', border: '1px solid var(--border)', color: '#fff' }} />
                        <Bar dataKey="value" fill="#9b59b6" radius={[0, 4, 4, 0]} barSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '.5rem' }}>
                    * Values express the absolute weight (SHAP value) by which each extracted feature pushed this specific complaint's SLA breach risk prediction upwards.
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* 🗺️ Mapbox GIS Command Panel */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="section-title" style={{ margin: 0 }}>
                <Map size={16} style={{ color: '#2ECC71' }} /> GIS Predictive Overlay Viewport
              </h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '.75rem', fontWeight: 600 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showHotspots} onChange={e => setShowHotspots(e.target.checked)} />
                  <span>AI Hotspots</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showAnomalies} onChange={e => setShowAnomalies(e.target.checked)} />
                  <span>Fraud Anomaly Markers</span>
                </label>
              </div>
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} style={{ width: '100%', height: 320 }} />

            <div style={{ padding: '.8rem 1.5rem', background: 'var(--border)', fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Guwahati Metropolitan Region • GIS Engine active</span>
              <span>Map Style: 3D Dark Extrusions</span>
            </div>
          </div>

          {/* 📋 Smart Summarizer Clusters */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '.75rem', marginBottom: '1rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>
                <Layers size={16} style={{ color: '#9b59b6' }} /> Duplicate semantic clusters & Extractive Summary
              </h3>
              <span className="badge badge-info" style={{ fontSize: '.68rem' }}>
                {duplicateClusters.length} Clusters Detected
              </span>
            </div>

            {loadingFeeds ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading clusters...</div>
            ) : duplicateClusters.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {duplicateClusters.map((cluster) => (
                  <div key={cluster.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                      <strong style={{ fontSize: '.82rem', color: 'var(--text-primary)' }}>
                        {cluster.id} — {cluster.title}
                      </strong>
                      <span className="badge badge-warning" style={{ fontSize: '.7rem' }}>
                        {cluster.reportCount} tickets merged
                      </span>
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(255,169,64,.05)', padding: '.75rem', borderRadius: 8, borderLeft: '3px solid #FFA940', marginBottom: '.5rem' }}>
                      <strong>AI Summary:</strong> {cluster.summary || 'No summary available.'}
                    </div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                      <strong>Tickets:</strong> {cluster.tickets?.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.8rem' }}>
                No duplicate ticket clusters detected in the last 30 days.
              </div>
            )}
          </div>

        </div>

        {/* Right Hand side: Telemetry stats, Anomaly listings, Live log feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* MLOps diagnostics telemetry */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '.9rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '.5rem' }}>
              <Server size={14} style={{ color: '#2F6BFF', marginRight: '.4rem' }} /> ML Diagnostics Telemetry
            </h3>

            {healthLoading ? (
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Loading diagnostics...</div>
            ) : diagnostics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', fontSize: '.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Spam Model:</span>
                  <strong style={{ color: diagnostics.spam_model_loaded ? '#2ECC71' : '#FF4D4F' }}>
                    {diagnostics.spam_model_loaded ? 'LOADED' : 'UNLOADED'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Router Classifier:</span>
                  <strong style={{ color: diagnostics.router_model_loaded ? '#2ECC71' : '#FF4D4F' }}>
                    {diagnostics.router_model_loaded ? 'LOADED' : 'UNLOADED'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sentiment Classifier:</span>
                  <strong style={{ color: diagnostics.sentiment_model_loaded ? '#2ECC71' : '#FF4D4F' }}>
                    {diagnostics.sentiment_model_loaded ? 'LOADED' : 'UNLOADED'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Forecaster Regressor:</span>
                  <strong style={{ color: diagnostics.volume_forecaster_loaded ? '#2ECC71' : '#FF4D4F' }}>
                    {diagnostics.volume_forecaster_loaded ? 'LOADED' : 'UNLOADED'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fraud IsolationForest:</span>
                  <strong style={{ color: diagnostics.fraud_model_loaded ? '#2ECC71' : '#FF4D4F' }}>
                    {diagnostics.fraud_model_loaded ? 'LOADED' : 'UNLOADED'}
                  </strong>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '.4rem', paddingTop: '.6rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Avg Latency:</span>
                  <strong>{diagnostics.inference_latency_avg_ms} ms</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>System Memory:</span>
                  <strong>{diagnostics.system_memory_mb} MB</strong>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '.78rem', color: '#FF4D4F' }}>Diagnostics unavailable. Server offline.</div>
            )}
          </div>

          {/* Anomaly / Fraud Alerts */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '.9rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <ShieldAlert size={15} color="#FF4D4F" /> Isolation Forest Anomalies
            </h3>

            {loadingFeeds ? (
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Scanning activity logs...</div>
            ) : fraudSignals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {fraudSignals.slice(0, 5).map((act, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '.5rem', fontSize: '.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{act.userId}</span>
                      <span style={{ color: act.riskScore > 75 ? '#FF4D4F' : '#FFA940' }}>Risk: {act.riskScore}%</span>
                    </div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.15rem' }}>
                      <strong>Pattern:</strong> {act.pattern}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>No fraud anomalies flagged.</div>
            )}
          </div>

          {/* Ward risk forecast */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '.9rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <AlertTriangle size={15} color="#FFA940" /> Hotspot Risk Projections
            </h3>

            {loadingFeeds ? (
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>Computing risk layers...</div>
            ) : hotspotData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {hotspotData.slice(0, 4).map((hot, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '.5rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{hot.ward}</strong>
                      <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>Growth projection: +{hot.predicted_growth_pct}%</div>
                    </div>
                    <span className={`badge ${hot.risk_score > 75 ? 'badge-danger' : hot.risk_score > 50 ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '.7rem', fontWeight: 700 }}>
                      {hot.risk_score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>No risk hotspots mapped.</div>
            )}
          </div>

          {/* Inference logs console */}
          <div className="card" style={{ padding: '1.25rem', background: '#070C15', border: '1px solid rgba(47,107,255,.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.1)', paddingBottom: '.5rem', marginBottom: '.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '.85rem', fontWeight: 800, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <Terminal size={14} /> Live Inference Stream
              </h3>
              <button 
                onClick={() => setIsLogging(!isLogging)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isLogging ? '#2ECC71' : 'rgba(255,255,255,.3)' }}
              >
                {isLogging ? <Pause size={12} /> : <Play size={12} />}
              </button>
            </div>

            <div style={{
              height: 150, overflowY: 'auto', fontFamily: 'monospace', fontSize: '.68rem',
              color: '#34D399', display: 'flex', flexDirection: 'column', gap: '.3rem', lineHeight: 1.4
            }}>
              {logs.map((l, i) => (
                <div key={i} style={{ wordBreak: 'break-all' }}>{l}</div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
