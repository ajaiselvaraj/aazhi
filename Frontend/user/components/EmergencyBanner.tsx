import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, X } from 'lucide-react';
import { io } from 'socket.io-client';
import apiClient, { API_BASE_URL } from '../services/api/apiClient';

export default function EmergencyBanner() {
  const [emergencyStatus, setEmergencyStatus] = useState<any>(null);
  const [reliefCenters, setReliefCenters] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<Set<string>>(new Set());


  useEffect(() => {
    const fetchEmergencyData = async () => {
      try {
        const statusData = await apiClient.get<any>('/emergency/status');
        if (statusData) {
          setEmergencyStatus(statusData);
        }

        const centerData = await apiClient.get<any[]>('/emergency/relief-centers');
        if (centerData) {
          setReliefCenters(centerData);
        }
      } catch (e) {
        console.error("Failed to fetch emergency data", e);
      }
    };

    fetchEmergencyData();

    const socketUrl = API_BASE_URL.replace('/api', '');
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('EMERGENCY_MODE_CHANGE', (payload) => {
      console.log('🚨 EMERGENCY MODE CHANGE:', payload);
      fetchEmergencyData(); // Refetch to get latest accurate state
    });

    newSocket.on('EMERGENCY_BROADCAST', (payload) => {
      console.log('🚨 EMERGENCY BROADCAST:', payload);
      setBroadcasts(prev => [payload, ...prev]);
    });


    return () => {
      newSocket.disconnect();
    };
  }, []);

  const isEmergencyActive = emergencyStatus?.is_active && emergencyStatus?.mode_type !== 'normal';

  const dismissBroadcast = (id: string) => {
    setDismissedBroadcasts(prev => new Set(prev).add(id));
  };

  const activeBroadcasts = broadcasts.filter(b => !dismissedBroadcasts.has(b.id));

  if (!isEmergencyActive && activeBroadcasts.length === 0) {
    return null; // Don't render anything if normal
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999999, fontFamily: 'sans-serif' }}>
      
      {/* Active Broadcasts (Floating Toasts) */}
      <div style={{ position: 'absolute', top: isEmergencyActive ? 'auto' : '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: isEmergencyActive ? '100px' : 0 }}>
        {activeBroadcasts.map((b, i) => (
          <div key={b.id || i} style={{
            background: b.severity === 'critical' ? '#dc2626' : (b.severity === 'high' ? '#ea580c' : '#2563eb'),
            color: '#fff',
            padding: '1rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            width: '320px',
            display: 'flex',
            gap: '0.75rem',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>{b.title}</h4>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.4 }}>{b.message}</p>
            </div>
            <button 
              onClick={() => dismissBroadcast(b.id)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, height: 'max-content' }}
            >
              <X size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Fullscreen/Header Emergency Banner */}
      {isEmergencyActive && (
        <div style={{ 
          background: '#dc2626', 
          color: '#ffffff', 
          padding: '1rem 2rem',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          borderBottom: '4px solid #991b1b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={32} strokeWidth={2.5} />
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
              CIVIC EMERGENCY: {emergencyStatus.mode_type}
            </h1>
          </div>
          
          <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 500, maxWidth: '800px', lineHeight: 1.5 }}>
            {emergencyStatus.emergency_message}
          </p>

          {reliefCenters.length > 0 && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              {reliefCenters.slice(0, 3).map((center, idx) => (
                <div key={center.id || idx} style={{ 
                  background: '#ffffff', 
                  color: '#991b1b', 
                  padding: '0.75rem 1.25rem', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(255,255,255,0.2)',
                  border: '1px solid #fca5a5'
                }}>
                  <div style={{ background: '#fee2e2', padding: '0.5rem', borderRadius: '50%' }}>
                    <MapPin size={24} strokeWidth={2.5} color="#dc2626" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.5px' }}>{center.center_name}</span>
                      <span style={{ background: '#dc2626', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', textTransform: 'uppercase' }}>Safe Zone</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginTop: '0.1rem' }}>
                      {center.address} {center.phone ? <span style={{ color: '#111827' }}>• 📞 {center.phone}</span> : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
