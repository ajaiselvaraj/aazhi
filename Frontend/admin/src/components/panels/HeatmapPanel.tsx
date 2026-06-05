import React, { useState, useEffect, useRef } from 'react'
import { adminApi } from '../../services/adminApi'
import { useLanguage } from '../../context/LanguageContext'
import { RefreshCw, Inbox, MapPin } from 'lucide-react'
import { formatTimestamp } from '../../utils/formatTimestamp'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  setup3DBuildings,
  setup3DTerrain,
  setupAtmosphere,
  remove3DBuildings,
  remove3DTerrain,
  removeAtmosphere
} from '../../utils/mapbox3DUtils'
import StreetViewPanel from './streetview/StreetViewPanel'


// Default coordinates for wards when no GPS available
const WARD_COORDS: Record<string, [number, number]> = {
  'Ward 1': [26.18, 91.74],
  'Ward 2': [26.19, 91.75],
  'Ward 3': [26.17, 91.76],
  'Ward 4': [26.20, 91.73],
  'Ward 5': [26.16, 91.77],
  'Ward 6': [26.21, 91.72],
  'Ward 7': [26.15, 91.74],
  'Ward 8': [26.22, 91.76],
  'Ward 9': [26.14, 91.73],
  'Ward 10': [26.23, 91.75],
}

function getCoordinates(complaint: any): [number, number] | null {
  // Try to get lat/lng from complaint metadata
  if (complaint.latitude && complaint.longitude) {
    return [parseFloat(complaint.latitude), parseFloat(complaint.longitude)]
  }
  const seedStr = (complaint.ticket_number || '') + (complaint.description || '') + (complaint.subject || '')
  const seed = seedStr.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)

  // Try ward-based coordinates with small deterministic offset
  if (complaint.ward && WARD_COORDS[complaint.ward]) {
    const base = WARD_COORDS[complaint.ward]
    const latJitter = ((seed % 100) / 100 - 0.5) * 0.01
    const lngJitter = (((seed * 17) % 100) / 100 - 0.5) * 0.01
    return [base[0] + latJitter, base[1] + lngJitter]
  }
  // Deterministic position in the default area with jitter
  const latJitter = ((seed % 100) / 100 - 0.5) * 0.08
  const lngJitter = (((seed * 17) % 100) / 100 - 0.5) * 0.06
  return [26.18 + latJitter, 91.74 + lngJitter]
}

const MAP_STYLES = [
  { name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
  { name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
  { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
]

export default function HeatmapPanel() {
  const { t } = useLanguage()
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12')
  const [mapReady, setMapReady] = useState(false)
  const [is3DMode, setIs3DMode] = useState(true)
  const [isRotating, setIsRotating] = useState(false)

  // Street View States
  const [viewMode, setViewMode] = useState<'map' | 'street'>('map')
  const [streetViewCoords, setStreetViewCoords] = useState<{ lat: number; lng: number }>({ lat: 26.18, lng: 91.74 })

  const viewModeRef = useRef(viewMode)
  const streetViewCoordsRef = useRef(streetViewCoords)

  useEffect(() => {
    viewModeRef.current = viewMode
  }, [viewMode])

  useEffect(() => {
    streetViewCoordsRef.current = streetViewCoords
  }, [streetViewCoords])

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({})
  const pegmanMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const is3DModeRef = useRef(is3DMode)
  const mapStyleRef = useRef(mapStyle)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    is3DModeRef.current = is3DMode
  }, [is3DMode])

  useEffect(() => {
    mapStyleRef.current = mapStyle
  }, [mapStyle])


  useEffect(() => {
    loadComplaints()
  }, [])

  async function loadComplaints() {
    setLoading(true)
    try {
      const res = await adminApi.getAllComplaints({ limit: 50 })
      const complaints = res.data || []
      // Transform complaints to map markers
      const mapped = complaints
        .filter((c: any) => c.status !== 'rejected')
        .map((c: any) => {
          const coords = getCoordinates(c)
          return coords ? {
            id: c.id,
            title: c.subject || c.category || 'Complaint',
            dept: c.department || 'General',
            ward: c.ward || 'N/A',
            priority: c.priority || 'medium',
            ticket: c.ticket_number,
            reportedAt: formatTimestamp(c.created_at || c.createdAt),
            lat: coords[0], // latitude
            lng: coords[1], // longitude
            status: c.status,
          } : null
        })
        .filter(Boolean)

      setIssues(mapped as any[])
    } catch (err) {
      console.error('Failed to load complaints for map:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current || !import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) return

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [92.9376, 26.2006], // Assam center [lng, lat]
      zoom: 7,
      minZoom: 6,
      pitch: is3DMode ? 50 : 0,
      bearing: is3DMode ? -15 : 0,
      maxBounds: [
        [88.0, 21.5], // Southwest coordinates [lng, lat]
        [97.5, 29.5]  // Northeast coordinates [lng, lat]
      ]
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    
    // Map click handler to relocate Street View panorama
    map.on('click', (e) => {
      if (viewModeRef.current === 'street') {
        const { lng, lat } = e.lngLat
        setStreetViewCoords({ lat, lng })
      }
    })

    // Sync Street View Pegman marker on Mapbox map
    const syncPegmanEffect = () => {
      const mapObj = mapRef.current
      if (!mapObj || !mapReady) return

      if (viewMode === 'street') {
        if (pegmanMarkerRef.current) {
          pegmanMarkerRef.current.setLngLat([streetViewCoords.lng, streetViewCoords.lat])
        } else {
          const el = document.createElement('div')
          el.className = 'streetview-pegman-marker'
          el.innerHTML = `<div style="
            width: 24px; 
            height: 24px; 
            background: #f59e0b; 
            border: 2px solid #fff; 
            border-radius: 50%; 
            box-shadow: 0 0 10px #f59e0b; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 11px;
            cursor: pointer;
          ">👤</div>`
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([streetViewCoords.lng, streetViewCoords.lat])
            .addTo(mapObj)
          pegmanMarkerRef.current = marker
        }
      } else {
        if (pegmanMarkerRef.current) {
          pegmanMarkerRef.current.remove()
          pegmanMarkerRef.current = null
        }
      }
    }

    // Trigger sync effect whenever coords or viewMode changes
    syncPegmanEffect()

    // Trigger Mapbox canvas resize when changing to/from split view
    setTimeout(() => {
      map.resize()
    }, 150)

    map.on('style.load', () => {
      setMapReady(true)
      if (is3DModeRef.current) {
        setup3DBuildings(map)
        setup3DTerrain(map)
        const isDark = mapStyleRef.current.includes('dark')
        setupAtmosphere(map, isDark)
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      setMapReady(false)
      markersRef.current = {}
      if (pegmanMarkerRef.current) {
        pegmanMarkerRef.current.remove()
        pegmanMarkerRef.current = null
      }
    }
  }, [])

  const handleStreetViewPositionChange = (newLat: number, newLng: number) => {
    setStreetViewCoords({ lat: newLat, lng: newLng })
    const map = mapRef.current
    if (map) {
      const center = map.getCenter()
      const dist = Math.sqrt(Math.pow(center.lng - newLng, 2) + Math.pow(center.lat - newLat, 2))
      if (dist > 0.0001) {
        map.setCenter([newLng, newLat])
      }
    }
  }

  // Sync style changes
  useEffect(() => {
    if (mapRef.current && mapReady) {
      setMapReady(false) // Reset mapReady to false during style transition
      mapRef.current.setStyle(mapStyle)
    }
  }, [mapStyle])

  // Toggle 3D visual layers dynamically
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (is3DMode) {
      map.easeTo({ pitch: 50, bearing: -15, duration: 800 })
      setup3DBuildings(map)
      setup3DTerrain(map)
      const isDark = mapStyle.includes('dark')
      setupAtmosphere(map, isDark)
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 })
      remove3DBuildings(map)
      remove3DTerrain(map)
      removeAtmosphere(map)
    }
  }, [is3DMode, mapReady])

  // Handle slow cinematic orbital rotation
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const rotateCamera = () => {
      if (mapRef.current) {
        const currentBearing = mapRef.current.getBearing()
        mapRef.current.setBearing((currentBearing + 0.08) % 360)
        animationFrameRef.current = requestAnimationFrame(rotateCamera)
      }
    }

    if (isRotating && is3DMode) {
      animationFrameRef.current = requestAnimationFrame(rotateCamera)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isRotating, is3DMode, mapReady])


  // Sync Mapbox Markers with issues state
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    // Remove obsolete markers
    Object.keys(markersRef.current).forEach(id => {
      if (!issues.some(issue => String(issue.id) === id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })

    // Add or update markers
    issues.forEach(issue => {
      const idStr = String(issue.id)
      
      if (markersRef.current[idStr]) {
        markersRef.current[idStr].setLngLat([issue.lng, issue.lat])
        return
      }

      // Create Custom DOM Element for marker
      const el = document.createElement('div')
      el.className = `marker-priority-${issue.priority}`

      // Create Popup content node to support styling
      const popupContent = document.createElement('div')
      popupContent.style.padding = '0'
      popupContent.innerHTML = `
        <div style="font-family: 'Inter', sans-serif; min-width: 190px; padding: 12px; background: #ffffff; color: #1f2937; border-radius: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 0.95rem; color: #111827; font-weight: 700; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px;">${issue.title}</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.8rem; color: #4B5563; display: flex; justify-content: space-between;">
              <strong style="color: #6b7280; margin-right: 8px;">Dept:</strong> <span>${issue.dept}</span>
            </div>
            <div style="font-size: 0.8rem; color: #4B5563; display: flex; justify-content: space-between;">
              <strong style="color: #6b7280; margin-right: 8px;">Ward:</strong> <span>${issue.ward}</span>
            </div>
            <div style="font-size: 0.8rem; color: #4B5563; display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: #6b7280; margin-right: 8px;">Priority:</strong> 
              <span style="
                font-size: 0.75rem; 
                font-weight: 700; 
                text-transform: uppercase;
                color: ${issue.priority === 'critical' ? '#FF4D4F' : issue.priority === 'high' ? '#FFA940' : issue.priority === 'medium' ? '#F59E0B' : '#2ECC71'}
              ">${issue.priority}</span>
            </div>
            <div style="font-size: 0.8rem; color: #4B5563; display: flex; justify-content: space-between;">
              <strong style="color: #6b7280; margin-right: 8px;">Status:</strong> 
              <span style="text-transform: capitalize; font-weight: 600; color: ${issue.status === 'resolved' ? '#10B981' : '#3B82F6'}">${issue.status}</span>
            </div>
            <div style="font-size: 0.8rem; color: #4B5563; display: flex; justify-content: space-between;">
              <strong style="color: #6b7280; margin-right: 8px;">Reported:</strong> <span style="font-size: 0.75rem; color: #6b7280;">${issue.reportedAt}</span>
            </div>
          </div>
          <div style="font-size: 0.8rem; color: #4B5563; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #E5E7EB; display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #6b7280;">Ticket:</strong> 
            <span style="font-family: monospace; font-weight: 600; background: #F3F4F6; padding: 2px 6px; border-radius: 4px; color: #374151;">${issue.ticket}</span>
          </div>
        </div>
      `

      const popup = new mapboxgl.Popup({ offset: [0, -10], closeButton: true })
        .setDOMContent(popupContent)

      // Open Street View when clicking marker
      el.addEventListener('click', () => {
        setStreetViewCoords({ lat: issue.lat, lng: issue.lng })
        setViewMode('street')
        
        // Highlight active marker with blue glow accent
        Object.keys(markersRef.current).forEach(id => {
          const markerEl = markersRef.current[id].getElement()
          if (id === idStr) {
            markerEl.style.boxShadow = '0 0 15px #3b82f6'
            markerEl.style.border = '3px solid #3b82f6'
          } else {
            markerEl.style.boxShadow = ''
            markerEl.style.border = ''
          }
        })
      })

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([issue.lng, issue.lat])
        .setPopup(popup)
        .addTo(map)

      markersRef.current[idStr] = marker
    })
  }, [issues, mapReady])

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      <style>{`
        .marker-priority-critical {
          width: 24px; height: 24px;
          background-color: #FF4D4F;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(0,0,0,0.5);
          position: relative;
          cursor: pointer;
        }
        .marker-priority-critical::after {
          content: '';
          position: absolute;
          top: -6px; left: -6px; right: -6px; bottom: -6px;
          border: 3px solid #FF4D4F;
          border-radius: 50%;
          animation: mapPulse 1.5s infinite ease-out;
        }
        @keyframes mapPulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .marker-priority-high {
          width: 20px; height: 20px;
          background-color: #FFA940;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 5px rgba(0,0,0,0.4);
          cursor: pointer;
        }
        .marker-priority-medium {
          width: 16px; height: 16px;
          background-color: #FFD43B;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
          cursor: pointer;
        }
        .marker-priority-low {
          width: 12px; height: 12px;
          background-color: #2ECC71;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 3px rgba(0,0,0,0.3);
          cursor: pointer;
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--primary)' }} />
          {t('live_map.title') || 'Live Issue Map'}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={loadComplaints} className="btn btn-ghost" style={{ padding: '.3rem' }} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="badge badge-info">
            <MapPin size={10} /> {issues.length} Issues Plotted
          </span>
          <span className="live-dot">{t('live_map.live_view') || 'Live Priority View'}</span>
        </div>
      </div>

      {/* Map & Street View Split View Container */}
      <div style={{ width: '100%', height: '550px', display: 'flex', position: 'relative', zIndex: 0 }}>
        {import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ? (
          <>
            {/* Map Column */}
            <div 
              ref={mapContainerRef} 
              style={{ 
                width: viewMode === 'street' ? '50%' : '100%', 
                height: '100%',
                transition: 'width 0.25s ease-in-out'
              }} 
            />

            {/* Street View Column */}
            {viewMode === 'street' && (
              <div style={{ 
                width: '50%', 
                height: '100%', 
                borderLeft: '1px solid var(--border)',
                position: 'relative',
                zIndex: 10
              }}>
                <StreetViewPanel 
                  lat={streetViewCoords.lat}
                  lng={streetViewCoords.lng}
                  onPositionChange={handleStreetViewPositionChange}
                  onClose={() => setViewMode('map')}
                />
              </div>
            )}

            {/* Overlay Loader */}
            {loading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                backdropFilter: 'blur(2px)'
              }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={28} className="animate-spin" style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600 }}>Updating issue map...</p>
                </div>
              </div>
            )}

            {/* Empty State Overlay */}
            {!loading && issues.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0, background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1900
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Inbox size={40} style={{ color: 'var(--border)', margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Complaints to Display</p>
                  <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Complaint locations will appear on the map once complaints are submitted.</p>
                </div>
              </div>
            )}

            {/* Style Control, View Mode & 3D Tools */}
            <div style={{
              position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              {/* View Mode Toggle */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)', padding: '4px', borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', gap: '4px',
                border: '1px solid var(--border)', width: 'fit-content', backdropFilter: 'blur(4px)'
              }}>
                <button
                  onClick={() => setViewMode('map')}
                  style={{
                    background: viewMode === 'map' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'map' ? '#ffffff' : 'var(--text-primary)',
                    border: 'none', padding: '6px 12px', borderRadius: '6px',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  Map View
                </button>
                <button
                  onClick={() => {
                    if (issues.length > 0) {
                      setStreetViewCoords({ lat: issues[0].lat, lng: issues[0].lng })
                    }
                    setViewMode('street')
                  }}
                  style={{
                    background: viewMode === 'street' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'street' ? '#ffffff' : 'var(--text-primary)',
                    border: 'none', padding: '6px 12px', borderRadius: '6px',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  Street View
                </button>
              </div>

              {/* Map Styles Selector */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)', padding: '4px', borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', gap: '4px',
                border: '1px solid var(--border)', backdropFilter: 'blur(4px)'
              }}>
                {MAP_STYLES.map(style => (
                  <button
                    key={style.name}
                    onClick={() => setMapStyle(style.url)}
                    style={{
                      background: mapStyle === style.url ? 'var(--primary)' : 'transparent',
                      color: mapStyle === style.url ? '#ffffff' : 'var(--text-primary)',
                      border: 'none', padding: '6px 12px', borderRadius: '6px',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    {style.name}
                  </button>
                ))}
              </div>

              {/* 3D Smart City Toggles */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)', padding: '4px', borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', gap: '6px',
                border: '1px solid var(--border)', width: 'fit-content', backdropFilter: 'blur(4px)'
              }}>
                <button
                  onClick={() => setIs3DMode(!is3DMode)}
                  style={{
                    background: is3DMode ? 'var(--primary)' : 'transparent',
                    color: is3DMode ? '#ffffff' : 'var(--text-primary)',
                    border: 'none', padding: '6px 12px', borderRadius: '6px',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  {is3DMode ? '3D City Active' : 'Enable 3D'}
                </button>
                {is3DMode && (
                  <button
                    onClick={() => setIsRotating(!isRotating)}
                    style={{
                      background: isRotating ? '#10b981' : 'transparent',
                      color: isRotating ? '#ffffff' : 'var(--text-primary)',
                      border: 'none', padding: '6px 12px', borderRadius: '6px',
                      fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    {isRotating ? 'Orbiting' : 'Cinematic Scan'}
                  </button>
                )}
              </div>
            </div>

            {/* Floating Legend */}
            <div style={{
              position: 'absolute', bottom: '24px', right: '24px', zIndex: 1000,
              background: 'rgba(255, 255, 255, 0.95)', padding: '14px 18px', borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '10px', fontSize: '0.9rem', color: '#111827' }}>Priority Legend</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 14, height: 14, background: '#FF4D4F', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px #FFE0E0' }} />
                  Critical Issue
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 14, height: 14, background: '#FFA940', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px #FFE0E0' }} />
                  High Priority
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 14, height: 14, background: '#FFD43B', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px #FFE0E0' }} />
                  Medium Priority
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 14, height: 14, background: '#2ECC71', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px #FFE0E0' }} />
                  Low Priority
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px dashed var(--border)',
          }}>
            <MapPin size={48} style={{ color: 'var(--text-muted)' }} />
            <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>Mapbox Token Missing</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '400px', lineHeight: 1.5 }}>
              The Live Issue Map requires a Mapbox API token. Please configure <code>VITE_MAPBOX_ACCESS_TOKEN</code> in your admin <code>.env</code> file.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
