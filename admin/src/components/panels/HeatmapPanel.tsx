import React, { useEffect, useRef } from 'react'
import { heatPoints } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { filterByDept } from '../../utils/deptFilter'

const INTENSITY_COLORS = {
  high:   '#FF4D4F',
  medium: '#FFA940',
  low:    '#2ECC71',
}

const INTENSITY_RADIUS = {
  high:   28,
  medium: 20,
  low:    14,
}

export default function HeatmapPanel() {
  const { user } = useAuth()
  const pts = user ? filterByDept(heatPoints, user.department) : heatPoints

  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Dynamically load Leaflet to avoid SSR issues
    if (typeof window === 'undefined') return
    if (mapRef.current) return // already initialized

    // @ts-ignore
    const L = (window as any).L || null
    if (!L) {
      // Fallback: render SVG heatmap if Leaflet not globally available
      return
    }

    const map = L.map(containerRef.current!, {
      center: [11.01, 76.96],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19,
    }).addTo(map)

    pts.forEach(pt => {
      const color = INTENSITY_COLORS[pt.intensity]
      const radius = INTENSITY_RADIUS[pt.intensity]

      L.circleMarker([pt.lat, pt.lng], {
        radius,
        fillColor: color,
        color,
        weight: 1,
        opacity: .7,
        fillOpacity: .45,
      }).addTo(map)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:160px">
            <div style="font-weight:700;color:#0f1c2e;margin-bottom:4px">${pt.ward}</div>
            <div style="font-size:.8rem;color:#4a5568">Dept: ${pt.dept}</div>
            <div style="font-size:.8rem;color:#4a5568">Reports: <strong style="color:${color}">${pt.count}</strong></div>
          </div>
        `)
    })
  }, [])

  return (
    <div className="card section-gap" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" />
          City Issue Intelligence
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="live-dot">Live</span>
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.75rem' }}>
            {Object.entries(INTENSITY_COLORS).map(([k, c]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        id="city-heatmap"
        style={{ width: '100%', height: 420, background: '#162236', position: 'relative' }}
      >
        {/* SVG Fallback render */}
        <SVGHeatmap pts={pts} />
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '1px solid var(--border)',
      }}>
        {[
          { label: 'High Density Zones', value: pts.filter(p => p.intensity === 'high').length, color: '#FF4D4F' },
          { label: 'Medium Density', value: pts.filter(p => p.intensity === 'medium').length, color: '#FFA940' },
          { label: 'Low Density', value: pts.filter(p => p.intensity === 'low').length, color: '#2ECC71' },
          { label: 'Total Hotspots', value: pts.length, color: '#2F6BFF' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '1rem 1.25rem',
            borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'Poppins,sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SVGHeatmap({ pts }: { pts: typeof heatPoints }) {
  // City map SVG with positioned complaint clusters
  const WIDTH = 900
  const HEIGHT = 420

  // Map lat/lng to SVG coordinates
  const latMin = 10.985, latMax = 11.040
  const lngMin = 76.935, lngMax = 76.975

  const toX = (lng: number) => ((lng - lngMin) / (lngMax - lngMin)) * (WIDTH - 80) + 40
  const toY = (lat: number) => ((latMax - lat) / (latMax - latMin)) * (HEIGHT - 60) + 30

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0d1b2e 0%, #0f2035 100%)' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid lines */}
      {[1,2,3,4,5,6].map(i => (
        <line key={'h'+i} x1={0} y1={i*70} x2={WIDTH} y2={i*70} stroke="rgba(255,255,255,.04)" strokeWidth={1} />
      ))}
      {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
        <line key={'v'+i} x1={i*75} y1={0} x2={i*75} y2={HEIGHT} stroke="rgba(255,255,255,.04)" strokeWidth={1} />
      ))}

      {/* Road network simulation */}
      <path d="M 40 210 Q 200 200 400 215 Q 600 225 860 210" stroke="rgba(255,255,255,.08)" strokeWidth={3} fill="none" />
      <path d="M 40 130 Q 250 140 450 135 Q 650 125 860 140" stroke="rgba(255,255,255,.06)" strokeWidth={2} fill="none" />
      <path d="M 40 300 Q 300 290 550 305 Q 700 315 860 300" stroke="rgba(255,255,255,.06)" strokeWidth={2} fill="none" />
      <path d="M 300 30 Q 290 150 305 250 Q 315 350 300 420" stroke="rgba(255,255,255,.07)" strokeWidth={2} fill="none" />
      <path d="M 580 30 Q 575 180 585 280 Q 590 360 580 420" stroke="rgba(255,255,255,.06)" strokeWidth={2} fill="none" />

      {/* Ward boundary outlines */}
      <rect x={50} y={40} width={220} height={160} rx={8} fill="rgba(47,107,255,.04)" stroke="rgba(47,107,255,.08)" strokeWidth={1} />
      <rect x={290} y={60} width={270} height={180} rx={8} fill="rgba(47,107,255,.03)" stroke="rgba(47,107,255,.06)" strokeWidth={1} />
      <rect x={580} y={40} width={240} height={170} rx={8} fill="rgba(47,107,255,.03)" stroke="rgba(47,107,255,.06)" strokeWidth={1} />
      <rect x={80} y={230} width={200} height={150} rx={8} fill="rgba(47,107,255,.03)" stroke="rgba(47,107,255,.06)" strokeWidth={1} />
      <rect x={310} y={260} width={240} height={140} rx={8} fill="rgba(47,107,255,.03)" stroke="rgba(47,107,255,.06)" strokeWidth={1} />
      <rect x={580} y={240} width={220} height={150} rx={8} fill="rgba(47,107,255,.03)" stroke="rgba(47,107,255,.06)" strokeWidth={1} />

      {/* Heatmap circles */}
      {pts.map((pt, i) => {
        const x = toX(pt.lng)
        const y = toY(pt.lat)
        const color = pt.intensity === 'high' ? '#FF4D4F' : pt.intensity === 'medium' ? '#FFA940' : '#2ECC71'
        const r = pt.intensity === 'high' ? 36 : pt.intensity === 'medium' ? 26 : 16
        return (
          <g key={i}>
            {/* Outer glow */}
            <circle cx={x} cy={y} r={r * 1.8} fill={color} fillOpacity={.08} />
            <circle cx={x} cy={y} r={r * 1.3} fill={color} fillOpacity={.14} />
            {/* Main dot */}
            <circle cx={x} cy={y} r={r} fill={color} fillOpacity={.4} />
            <circle cx={x} cy={y} r={r * .55} fill={color} fillOpacity={.85} />
            {/* Count label */}
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize={r > 28 ? 11 : 9} fontWeight={700} fill="#fff" fontFamily="Inter,sans-serif">
              {pt.count}
            </text>
            {/* Ward label */}
            <text x={x} y={y + r + 14} textAnchor="middle"
              fontSize={9} fill="rgba(255,255,255,.5)" fontFamily="Inter,sans-serif">
              {pt.ward}
            </text>
          </g>
        )
      })}

      {/* City label */}
      <text x={WIDTH/2} y={HEIGHT - 10} textAnchor="middle" fontSize={10}
        fill="rgba(255,255,255,.2)" fontFamily="Inter,sans-serif">
        Coimbatore City — Live Complaint Heatmap
      </text>

      {/* Legend */}
      <g transform="translate(28,16)">
        <rect x={0} y={0} width={200} height={30} rx={6} fill="rgba(0,0,0,.4)" />
        <text x={8} y={11} fontSize={8} fill="rgba(255,255,255,.5)" fontFamily="Inter,sans-serif" dominantBaseline="middle">COMPLAINT DENSITY</text>
        {[['#FF4D4F','High'],['#FFA940','Med'],['#2ECC71','Low']].map(([c,l], i) => (
          <g key={i} transform={`translate(${8 + i * 64}, 20)`}>
            <circle cx={5} cy={0} r={5} fill={c as string} fillOpacity={.7} />
            <text x={13} y={0} fontSize={8} fill="rgba(255,255,255,.5)" fontFamily="Inter,sans-serif" dominantBaseline="middle">{l}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}
