import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrientation } from '../../../contexts/OrientationContext';
import { Language } from '../../../types';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudSun, ShieldCheck, List, Sidebar } from 'lucide-react';

// Utilities
import {
  setup3DBuildings,
  setup3DTerrain,
  setupAtmosphere,
  remove3DBuildings,
  remove3DTerrain,
  removeAtmosphere
} from '../../../utils/mapbox3DUtils';

// Data & Components
import {
  mockIncidents,
  wardGeojson,
  flowLinesGeojson,
  Incident
} from './mockIncidentData';
import LiveMetricsOverlay from './LiveMetricsOverlay';
import LiveIncidentFeed from './LiveIncidentFeed';
import SmartCityControls from './SmartCityControls';
import MapLegend from './MapLegend';

interface Props {
  alerts?: any[];
  language?: Language;
}

const aiRisksGeojson: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { label: 'AI Risk: Water Pressure Loss' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [76.9300, 11.0200],
          [76.9480, 11.0200],
          [76.9480, 11.0330],
          [76.9300, 11.0330],
          [76.9300, 11.0200]
        ]]
      }
    }
  ]
};

const getUpdatedWardsGeojson = (baseGeojson: any, currentIncidents: Incident[]) => {
  return {
    ...baseGeojson,
    features: baseGeojson.features.map((f: any) => {
      const activeIncident = currentIncidents.find(
        (i) => i.ward === f.properties.id && i.status !== 'Resolved'
      );
      return {
        ...f,
        properties: {
          ...f.properties,
          severity: activeIncident ? activeIncident.severity : 'Normal',
          type: activeIncident ? activeIncident.type : 'None'
        }
      };
    })
  };
};

const DisruptionMap: React.FC<Props> = ({ language = Language.ENGLISH }) => {
  const { t } = useTranslation();
  const { isVertical } = useOrientation();

  // Map Controls State
  const [is3DMode, setIs3DMode] = useState(true);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/dark-v11');
  const [activeLayers, setActiveLayers] = useState<string[]>(['water', 'power', 'incidents']);
  const [aiRisksEnabled, setAiRisksEnabled] = useState(true);
  const [flowLinesEnabled, setFlowLinesEnabled] = useState(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFeedOpen, setIsFeedOpen] = useState(!isVertical);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const animationFrameRef = useRef<number | null>(null);

  // Keep refs to avoid stale closures in Mapbox style load event
  const is3DModeRef = useRef(is3DMode);
  const mapStyleRef = useRef(mapStyle);
  const activeLayersRef = useRef(activeLayers);
  const aiRisksEnabledRef = useRef(aiRisksEnabled);
  const flowLinesEnabledRef = useRef(flowLinesEnabled);

  useEffect(() => { is3DModeRef.current = is3DMode; }, [is3DMode]);
  useEffect(() => { mapStyleRef.current = mapStyle; }, [mapStyle]);
  useEffect(() => { activeLayersRef.current = activeLayers; }, [activeLayers]);
  useEffect(() => { aiRisksEnabledRef.current = aiRisksEnabled; }, [aiRisksEnabled]);
  useEffect(() => { flowLinesEnabledRef.current = flowLinesEnabled; }, [flowLinesEnabled]);

  // Sync feed open state with orientation defaults
  useEffect(() => {
    setIsFeedOpen(!isVertical);
  }, [isVertical]);

  // 1. Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    mapboxgl.accessToken = token || '';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [76.9558, 11.0168], // Coimbatore center [lng, lat]
      zoom: 11.2,
      minZoom: 10.0,
      maxZoom: 14.5,
      pitch: is3DMode ? 50 : 0,
      bearing: is3DMode ? -15 : 0,
      attributionControl: false
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('style.load', () => {
      setMapReady(true);

      // Add DEM Terrain if in 3D Mode
      if (is3DModeRef.current) {
        setup3DTerrain(map);
        setup3DBuildings(map);
        setupAtmosphere(map, mapStyleRef.current.includes('dark'));
      }

      // Add Wards Source and Extrusion Layer
      map.addSource('wards', {
        type: 'geojson',
        data: getUpdatedWardsGeojson(wardGeojson, mockIncidents)
      });

      map.addLayer({
        id: 'ward-fills',
        type: 'fill-extrusion',
        source: 'wards',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['==', ['get', 'severity'], 'Critical'], '#f87171', // Red
            ['==', ['get', 'severity'], 'Warning'], '#fb923c',  // Orange
            ['==', ['get', 'severity'], 'Info'], '#60a5fa',     // Blue
            '#334155' // Slate Dark Grid fallback
          ],
          'fill-extrusion-height': [
            'case',
            ['==', ['get', 'severity'], 'Critical'], is3DModeRef.current ? 450 : 0,
            ['==', ['get', 'severity'], 'Warning'], is3DModeRef.current ? 250 : 0,
            ['==', ['get', 'severity'], 'Info'], is3DModeRef.current ? 120 : 0,
            is3DModeRef.current ? 20 : 0
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.65
        }
      });

      // Ambient Border Glow Layer
      map.addLayer({
        id: 'ward-borders-glow',
        type: 'line',
        source: 'wards',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'severity'], 'Critical'], '#ef4444',
            ['==', ['get', 'severity'], 'Warning'], '#f59e0b',
            ['==', ['get', 'severity'], 'Info'], '#3b82f6',
            '#06b6d4'
          ],
          'line-width': 4.5,
          'line-opacity': 0.4
        }
      });

      map.addLayer({
        id: 'ward-borders',
        type: 'line',
        source: 'wards',
        paint: {
          'line-color': '#475569',
          'line-width': 1.5,
          'line-opacity': 0.8
        }
      });

      // Add Glowing Ward Labels
      map.addLayer({
        id: 'ward-labels',
        type: 'symbol',
        source: 'wards',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 9,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.5
        }
      });

      // Add Utility Flow Lines
      map.addSource('flow-lines', {
        type: 'geojson',
        data: flowLinesGeojson
      });

      map.addLayer({
        id: 'flow-lines-layer',
        type: 'line',
        source: 'flow-lines',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'type'], 'water'], '#06b6d4', // Cyan flowing water
            '#ef4444' // Red flowing electricity
          ],
          'line-width': 2.5,
          'line-opacity': flowLinesEnabledRef.current ? 0.85 : 0
        }
      });

      // Add AI Predicted Risk Zones Source & Layer
      map.addSource('ai-risks', {
        type: 'geojson',
        data: aiRisksGeojson
      });

      map.addLayer({
        id: 'ai-risks-layer',
        type: 'fill-extrusion',
        source: 'ai-risks',
        paint: {
          'fill-extrusion-color': '#a855f7', // Purple AI glow
          'fill-extrusion-height': is3DModeRef.current ? 180 : 0,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': aiRisksEnabledRef.current ? 0.35 : 0
        }
      });

      // Start Flow Dash Line Animation + Ward Borders Glow Pulse
      let step = 0;
      const animateDash = () => {
        if (!mapRef.current) return;
        step = (step + 0.18) % 20;
        try {
          const m = mapRef.current;
          if (m.getLayer('flow-lines-layer') && flowLinesEnabledRef.current) {
            m.setPaintProperty('flow-lines-layer', 'line-dasharray', [3, 6, step, 10]);
          }

          // Pulse Wards Opacity and border glow widths
          if (m.getLayer('ward-fills')) {
            const baseOpacity = 0.55 + Math.sin(step * 0.4) * 0.15;
            m.setPaintProperty('ward-fills', 'fill-extrusion-opacity', baseOpacity);
          }
          if (m.getLayer('ward-borders-glow')) {
            const glowOpacity = 0.3 + Math.sin(step * 0.5) * 0.2;
            m.setPaintProperty('ward-borders-glow', 'line-opacity', Math.max(0.1, glowOpacity));
          }
        } catch (e) {}
        animationFrameRef.current = requestAnimationFrame(animateDash);
      };
      animateDash();

      // Click handler for Ward Platforms
      map.on('click', 'ward-fills', (e) => {
        if (!e.features || e.features.length === 0) return;
        const properties = e.features[0].properties;
        const wardId = properties.id;
        const severity = properties.severity;

        const popupContent = document.createElement('div');
        popupContent.style.padding = '6px';
        
        if (severity !== 'Normal') {
          const matchingIncidents = mockIncidents.filter((inc) => inc.ward === wardId && inc.status !== 'Resolved');
          popupContent.innerHTML = `
            <div style="font-family: 'Inter', sans-serif; min-width: 170px; color: #f8fafc;">
              <h4 style="margin: 0 0 6px 0; font-size: 0.85rem; font-weight: 800;">Ward ${wardId} Active Outages</h4>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                ${matchingIncidents
                  .map(
                    (inc) => `
                  <div style="font-size: 0.75rem; border-left: 2px solid #ef4444; padding-left: 6px; margin-bottom: 4px;">
                    <strong>${inc.type} Incident</strong>
                    <div style="font-size: 0.7rem; color: #94a3b8;">${inc.id} • Est: ${inc.estimatedRestore}</div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `;
        } else {
          popupContent.innerHTML = `
            <div style="font-family: 'Inter', sans-serif; min-width: 150px; color: #f8fafc;">
              <h4 style="margin: 0 0 4px 0; font-size: 0.85rem; font-weight: 800;">Ward ${wardId}</h4>
              <p style="margin: 0; font-size: 0.75rem; color: #10b981; font-weight: 700;">✓ Status Normal</p>
              <p style="margin: 2px 0 0 0; font-size: 0.7rem; color: #94a3b8;">All utility connections running perfectly.</p>
            </div>
          `;
        }

        new mapboxgl.Popup({ offset: [0, -10] })
          .setLngLat(e.lngLat)
          .setDOMContent(popupContent)
          .addTo(map);
      });
    });

    mapRef.current = map;

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      markersRef.current = {};
    };
  }, []);

  // 2. Sync Map Styles
  useEffect(() => {
    if (mapRef.current && mapReady) {
      setMapReady(false);
      mapRef.current.setStyle(mapStyle);
    }
  }, [mapStyle]);

  // 3. Toggle 3D / 2D settings dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (is3DMode) {
      map.easeTo({ pitch: 50, bearing: -15, duration: 800 });
      setup3DBuildings(map);
      setup3DTerrain(map);
      setupAtmosphere(map, mapStyle.includes('dark'));

      // Adjust Wards heights
      try {
        map.setPaintProperty('ward-fills', 'fill-extrusion-height', [
          'case',
          ['==', ['get', 'severity'], 'Critical'], 450,
          ['==', ['get', 'severity'], 'Warning'], 250,
          ['==', ['get', 'severity'], 'Info'], 120,
          20
        ]);
        map.setPaintProperty('ai-risks-layer', 'fill-extrusion-height', 180);
      } catch (e) {}
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
      remove3DBuildings(map);
      remove3DTerrain(map);
      removeAtmosphere(map);

      // Flatten Wards
      try {
        map.setPaintProperty('ward-fills', 'fill-extrusion-height', 0);
        map.setPaintProperty('ai-risks-layer', 'fill-extrusion-height', 0);
      } catch (e) {}
    }
  }, [is3DMode, mapReady]);

  // 4. Toggle Overlay layers visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      if (map.getLayer('flow-lines-layer')) {
        map.setPaintProperty('flow-lines-layer', 'line-opacity', flowLinesEnabled ? 0.85 : 0);
      }
    } catch (e) {}
  }, [flowLinesEnabled, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    try {
      if (map.getLayer('ai-risks-layer')) {
        map.setPaintProperty(
          'ai-risks-layer',
          'fill-extrusion-opacity',
          aiRisksEnabled ? 0.35 : 0
        );
      }
    } catch (e) {}
  }, [aiRisksEnabled, mapReady]);

  // 5. Sync Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const incidentsEnabled = activeLayers.includes('incidents');

    // Remove old markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!incidentsEnabled || !mockIncidents.some((inc) => inc.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    if (!incidentsEnabled) return;

    // Add or update active markers
    mockIncidents.forEach((incident) => {
      if (markersRef.current[incident.id]) {
        markersRef.current[incident.id].setLngLat(incident.coordinates);
        return;
      }

      // Create Custom HTML element for marker
      const el = document.createElement('div');
      el.className = 'custom-neon-incident-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.cursor = 'pointer';

      const color =
        incident.status === 'Critical'
          ? '#ef4444'
          : incident.status === 'In Progress'
          ? '#f59e0b'
          : '#10b981';

      el.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%;">
          <span style="
            position: absolute; 
            inset: -4px; 
            border-radius: 50%; 
            background-color: ${color}; 
            opacity: 0.5; 
            animation: pulseGlow 1.5s infinite ease-out;
          "></span>
          <span style="
            position: absolute; 
            inset: -8px; 
            border-radius: 50%; 
            background-color: ${color}; 
            opacity: 0.25; 
            animation: pulseGlowSlow 2.5s infinite ease-out;
          "></span>
          <div style="
            position: absolute;
            inset: 3px;
            border-radius: 50%;
            background-color: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 8px;
            font-weight: 950;
          ">${incident.type.slice(0, 1)}</div>
        </div>
      `;

      // Create Popup
      const popupContent = document.createElement('div');
      popupContent.style.padding = '8px';
      popupContent.innerHTML = `
        <div style="font-family: 'Inter', sans-serif; min-width: 170px; color: #f8fafc;">
          <h4 style="margin: 0 0 4px 0; font-size: 0.8rem; font-weight: 800;">${incident.id} - ${incident.type}</h4>
          <p style="margin: 0 0 8px 0; font-size: 0.75rem; line-height: 1.3; color: #cbd5e1;">${incident.message}</p>
          <div style="font-size: 0.7rem; color: #94a3b8; border-top: 1px dashed rgba(255,255,255,0.1); pt: 6px; mt: 6px;">
            <div><strong>Status:</strong> ${incident.status}</div>
            <div><strong>Team:</strong> ${incident.responseTeam}</div>
            <div><strong>ETA:</strong> ${incident.estimatedRestore}</div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: [0, -10] }).setDOMContent(popupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(incident.coordinates)
        .setPopup(popup)
        .addTo(map);

      // Wire up click triggers
      el.addEventListener('click', () => {
        setSelectedIncidentId(incident.id);
      });

      markersRef.current[incident.id] = marker;
    });
  }, [activeLayers, mapReady]);

  // 6. Handle sidebar list click
  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncidentId(incident.id);
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: incident.coordinates,
      zoom: 12.2,
      pitch: 45,
      bearing: 15,
      duration: 1200
    });

    // Toggle marker popup
    const marker = markersRef.current[incident.id];
    if (marker) {
      marker.togglePopup();
    }
  };

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) =>
      prev.includes(layerId) ? prev.filter((l) => l !== layerId) : [...prev, layerId]
    );
  };

  const activeCount = mockIncidents.filter((i) => i.status !== 'Resolved').length;

  return (
    <div className="flex flex-col gap-5 w-full h-[780px] relative font-sans text-white select-none">
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes pulseGlowSlow {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(3.0); opacity: 0; }
        }
        @keyframes radarSweep {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 8s linear infinite;
        }
        .radar-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(180deg, transparent, rgba(168, 85, 247, 0.4), transparent);
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.55);
          pointer-events: none;
          animation: radarSweep 6s infinite linear;
          z-index: 5;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .mapboxgl-popup-content {
          background: rgba(15, 23, 42, 0.88) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 1.25rem !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.55) !important;
        }
        .mapboxgl-popup-anchor-top .mapboxgl-popup-tip { border-bottom-color: rgba(15, 23, 42, 0.88) !important; }
        .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip { border-top-color: rgba(15, 23, 42, 0.88) !important; }
        .mapboxgl-popup-anchor-left .mapboxgl-popup-tip { border-right-color: rgba(15, 23, 42, 0.88) !important; }
        .mapboxgl-popup-anchor-right .mapboxgl-popup-tip { border-left-color: rgba(15, 23, 42, 0.88) !important; }
      `}</style>

      {/* Top Metrics Row */}
      <LiveMetricsOverlay activeCount={activeCount} />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex gap-5 w-full h-full min-h-0 relative overflow-hidden">
        {/* Map Column */}
        <div className="flex-1 h-full bg-slate-950/80 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
          {/* Map canvas */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* AI Scan Overlay Line */}
          {aiRisksEnabled && <div className="radar-scan-line" />}

          {/* Floating controls panel */}
          <div className="absolute top-4 left-4 z-10">
            <SmartCityControls
              is3DMode={is3DMode}
              setIs3DMode={setIs3DMode}
              mapStyle={mapStyle}
              setMapStyle={setMapStyle}
              activeLayers={activeLayers}
              toggleLayer={toggleLayer}
              aiRisksEnabled={aiRisksEnabled}
              setAiRisksEnabled={setAiRisksEnabled}
              flowLinesEnabled={flowLinesEnabled}
              setFlowLinesEnabled={setFlowLinesEnabled}
            />
          </div>

          {/* Top Right Floating HUD Widgets */}
          <div className="absolute top-4 right-16 z-10 flex gap-2.5 pointer-events-none">
            {/* Weather mini-widget */}
            <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl px-3.5 py-2 text-slate-300 shadow-xl flex items-center gap-2.5 border-l-cyan-500/50 border-l-[3px]">
              <CloudSun size={13} className="text-cyan-400 animate-pulse" />
              <div className="text-left leading-none">
                <span className="text-[7.5px] uppercase text-slate-500 font-extrabold block tracking-wider">coimbatore weather</span>
                <span className="font-extrabold text-xs text-white">31°C • Storm Alert</span>
              </div>
            </div>

            {/* IoT Telemetry status */}
            <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl px-3.5 py-2 text-slate-300 shadow-xl flex items-center gap-2.5 border-l-emerald-500/50 border-l-[3px]">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <div className="text-left leading-none">
                <span className="text-[7.5px] uppercase text-slate-500 font-extrabold block tracking-wider">IoT gateway mesh</span>
                <span className="font-extrabold text-xs text-white">99.8% Online</span>
              </div>
            </div>
          </div>

          {/* Floating Sidebar Toggle Button */}
          <button
            onClick={() => setIsFeedOpen(!isFeedOpen)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition shadow-lg hover:border-white/20"
            title={isFeedOpen ? "Collapse Feed" : "Expand Feed"}
          >
            <Sidebar size={16} />
          </button>

          {/* Bottom Left AI Predictor Status */}
          {aiRisksEnabled && (
            <div className="absolute bottom-4 left-4 z-10 bg-slate-950/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl px-3 py-2 text-purple-300 shadow-lg flex items-center gap-2.5 border-l-purple-500/50 border-l-[3px]">
              <ShieldCheck size={13} className="text-purple-400" />
              <div className="text-left leading-none">
                <span className="text-[7.5px] uppercase text-purple-400/80 font-extrabold block tracking-wider">AI Grid Diagnostics</span>
                <span className="font-extrabold text-[10px] text-white">Scanning Pressure Nodes</span>
              </div>
            </div>
          )}

          {/* Bottom Right Legend */}
          <div className="absolute bottom-4 right-4 z-10">
            <MapLegend />
          </div>
        </div>

        {/* Live Incident Feed Sidebar (Desktop) or overlay slide-drawer (Kiosk/Tablet) */}
        {!isVertical ? (
          /* Desktop layout: Side-by-side flex column */
          <AnimatePresence initial={false}>
            {isFeedOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '32%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="h-full shrink-0 overflow-hidden"
              >
                <div className="w-full h-full min-w-[280px]">
                  <LiveIncidentFeed
                    incidents={mockIncidents}
                    onIncidentClick={handleIncidentClick}
                    selectedIncidentId={selectedIncidentId}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          /* Tablet/Kiosk Mode: Floating slide-over panel on top of map */
          <AnimatePresence>
            {isFeedOpen && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="absolute top-0 right-0 h-full w-[320px] max-w-[90%] z-20 shadow-2xl p-4 bg-slate-950/80 backdrop-blur-xl border-l border-white/10 rounded-l-[2.5rem]"
              >
                <div className="w-full h-full relative">
                  <button
                    onClick={() => setIsFeedOpen(false)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/80 border border-white/5 text-slate-400 hover:text-white flex items-center justify-center transition"
                  >
                    ×
                  </button>
                  <div className="h-full pt-10">
                    <LiveIncidentFeed
                      incidents={mockIncidents}
                      onIncidentClick={handleIncidentClick}
                      selectedIncidentId={selectedIncidentId}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default DisruptionMap;
export { DisruptionMap };
