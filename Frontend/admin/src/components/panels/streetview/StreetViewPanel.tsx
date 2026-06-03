import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, X, AlertTriangle, Move, HelpCircle } from 'lucide-react';
import { loadGoogleMapsScript } from './loadGoogleMapsScript';

interface Props {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  onClose: () => void;
}

export default function StreetViewPanel({ lat, lng, onPositionChange, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'google' | 'mock'>('google');
  
  // Google Street View refs
  const panoramaRef = useRef<any>(null);
  const isUpdatingFromMap = useRef(false);

  // Mock Panorama states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [bgPositionX, setBgPositionX] = useState(0);
  const [heading, setHeading] = useState(0); // 0 to 360 degrees

  // 1. Initialize Google Street View or Fallback
  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);

    loadGoogleMapsScript()
      .then(() => {
        if (!active) return;
        const google = (window as any).google;
        const service = new google.maps.StreetViewService();

        // Check if Street View coverage exists within 100 meters of the issue coordinate
        service.getPanorama(
          { location: { lat, lng }, radius: 100, source: google.maps.StreetViewSource.OUTDOOR },
          (data: any, status: any) => {
            if (!active) return;

            if (status === google.maps.StreetViewStatus.OK && data && data.location) {
              setMode('google');
              const actualCoords = data.location.latLng;
              
              // Trigger map sync to snap issue exactly to street path if needed
              isUpdatingFromMap.current = true;
              onPositionChange(actualCoords.lat(), actualCoords.lng());
              setTimeout(() => {
                isUpdatingFromMap.current = false;
              }, 100);

              initializeGooglePanorama(actualCoords.lat(), actualCoords.lng());
            } else {
              // No Google Street View coverage in Guwahati/Assam, fallback to Mock Mode
              console.warn('Google Street View coverage unavailable for coordinates, launching mock panorama.');
              setMode('mock');
              setLoading(false);
            }
          }
        );
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load Google Maps SDK, defaulting to mock mode:', err);
        setMode('mock');
        setLoading(false);
      });

    return () => {
      active = false;
      if (panoramaRef.current) {
        // Destroy listeners
        const google = (window as any).google;
        if (google && google.maps && google.maps.event) {
          google.maps.event.clearInstanceListeners(panoramaRef.current);
        }
        panoramaRef.current = null;
      }
    };
  }, [lat, lng]);

  // Initialize Native Google Panorama instance
  const initializeGooglePanorama = (actualLat: number, actualLng: number) => {
    if (!containerRef.current) return;
    const google = (window as any).google;

    try {
      const panorama = new google.maps.StreetViewPanorama(containerRef.current, {
        position: { lat: actualLat, lng: actualLng },
        pov: { heading: 165, pitch: 0 },
        zoom: 0,
        addressControl: true,
        showRoadLabels: true,
        linksControl: true,
        panControl: true,
        zoomControl: true,
        enableCloseButton: false
      });

      // Synchronize Street View movements back to Mapbox
      panorama.addListener('position_changed', () => {
        if (isUpdatingFromMap.current) return;
        const pos = panorama.getPosition();
        if (pos) {
          onPositionChange(pos.lat(), pos.lng());
        }
      });

      panoramaRef.current = panorama;
      setLoading(false);
    } catch (e) {
      console.error('Error rendering Google Street View panorama:', e);
      setMode('mock');
      setLoading(false);
    }
  };

  // 2. Mouse Drag Event Handlers for Mock 360 Panorama Mode
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'mock') return;
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mode !== 'mock') return;
    const deltaX = e.clientX - dragStartX;
    setDragStartX(e.clientX);
    
    // Rotate view by translating background position X
    const newBgPos = bgPositionX + deltaX * 1.5;
    setBgPositionX(newBgPos);

    // Compute heading based on background position
    const containerWidth = containerRef.current?.offsetWidth || 500;
    // Assume full image width represents 360 degrees
    const calculatedHeading = Math.floor((Math.abs(newBgPos) / 3) % 360);
    setHeading(calculatedHeading);

    // Simulated geolocation offset update to map as pegman wanders (adds visual realism!)
    if (Math.abs(deltaX) > 2) {
      const radians = (calculatedHeading * Math.PI) / 180;
      // Add very small micro-movements to coordinates
      const simulatedLat = lat + Math.cos(radians) * 0.000008 * (deltaX > 0 ? 1 : -1);
      const simulatedLng = lng + Math.sin(radians) * 0.000008 * (deltaX > 0 ? 1 : -1);
      onPositionChange(simulatedLat, simulatedLng);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="streetview-panel-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif"
      }}
      onMouseLeave={handleMouseUp}
    >
      {/* Header bar */}
      <div 
        style={{
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Street Panorama: {mode === 'google' ? 'Google Live' : 'Simulated twin'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
            Heading: {heading}°
          </span>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            title="Exit Street View"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main viewer container */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: mode === 'mock' ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Loading Spinner */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: '#0f172a',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5
          }}>
            <RefreshCw size={24} className="animate-spin" style={{ color: '#3b82f6', marginBottom: '8px' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Initializing panorama stream...</span>
          </div>
        )}

        {/* Mock Mode Panorama canvas wrapper */}
        {mode === 'mock' && !loading && (
          <div 
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: 'url(/streetview.png)',
              backgroundSize: 'cover',
              backgroundRepeat: 'repeat-x',
              backgroundPositionX: `${bgPositionX}px`,
              backgroundPositionY: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              transition: isDragging ? 'none' : 'background-position 0.15s ease-out'
            }}
          >
            {/* Warning Overlay Banner */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.75rem',
              color: '#f59e0b',
              textAlign: 'left'
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#fff' }}>Guwahati Telemetry Coverage:</strong> Real-world panoramic stream offline. Displaying simulated digital twin view. Drag mouse to look around.
              </div>
            </div>

            {/* Instruction tooltip */}
            <div style={{
              position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.7rem', color: '#e2e8f0', pointerEvents: 'none'
            }}>
              <Move size={10} /> Drag to pan 360° simulated street view
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
