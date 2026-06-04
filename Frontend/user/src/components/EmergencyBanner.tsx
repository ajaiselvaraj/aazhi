import React, { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, Phone, Info } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface EmergencyState {
    mode_type: string;
    is_active: boolean;
    emergency_message: string;
}

interface ReliefCenter {
    id: string;
    center_name: string;
    address: string;
    phone: string;
    emergency_type: string;
}

export default function EmergencyBanner() {
    const [emergency, setEmergency] = useState<EmergencyState | null>(null);
    const [reliefCenters, setReliefCenters] = useState<ReliefCenter[]>([]);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);

    useEffect(() => {
        // Initial Fetch
        fetchEmergencyData();

        // Setup Socket
        const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
        const socket: Socket = io(socketUrl);

        socket.on('EMERGENCY_MODE_ENABLED', (payload: EmergencyState) => {
            setEmergency(payload);
            fetchEmergencyData(); // Refresh centers & broadcasts
        });

        socket.on('EMERGENCY_MODE_DISABLED', () => {
            setEmergency(null);
        });

        socket.on('EMERGENCY_BROADCAST', (payload: any) => {
            setBroadcasts(prev => [payload, ...prev].slice(0, 3)); // Keep last 3
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchEmergencyData = async () => {
        try {
            const [statusRes, centerRes, broadcastRes] = await Promise.all([
                fetch(`${API_BASE}/emergency/status`),
                fetch(`${API_BASE}/emergency/relief-centers`),
                fetch(`${API_BASE}/emergency/broadcasts`)
            ]);
            
            const statusJson = await statusRes.json();
            if (statusJson.success && statusJson.data && statusJson.data.mode_type !== 'normal') {
                setEmergency(statusJson.data);
            }

            const centerJson = await centerRes.json();
            if (centerJson.success) {
                setReliefCenters(centerJson.data);
            }

            const broadcastJson = await broadcastRes.json();
            if (broadcastJson.success) {
                setBroadcasts(broadcastJson.data.slice(0, 3));
            }
        } catch (err) {
            console.error('Error fetching emergency data', err);
        }
    };

    if (!emergency || emergency.mode_type === 'normal') return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#dc2626',
            color: 'white',
            padding: '1rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: 'system-ui, sans-serif'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={36} className="animate-pulse" />
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {emergency.mode_type} EMERGENCY
                </h1>
                <AlertTriangle size={36} className="animate-pulse" />
            </div>

            {/* Main Message */}
            <p style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600, textAlign: 'center', maxWidth: '800px' }}>
                {emergency.emergency_message}
            </p>

            {/* Broadcasts (Ticker-style) */}
            {broadcasts.length > 0 && (
                <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '4px', width: '100%', maxWidth: '800px', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Info size={20} />
                    {/* @ts-ignore */}
                    <marquee style={{ fontWeight: 500 }}>
                        {broadcasts.map((b, i) => (
                            <span key={i} style={{ marginRight: '3rem' }}>
                                <strong>{b.title}:</strong> {b.message}
                            </span>
                        ))}
                    {/* @ts-ignore */}
                    </marquee>
                </div>
            )}

            {/* Relief Centers */}
            {reliefCenters.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', maxWidth: '1000px' }}>
                    {reliefCenters.map(center => (
                        <div key={center.id} style={{ 
                            backgroundColor: 'white', 
                            color: '#dc2626', 
                            padding: '0.75rem 1rem', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '0.75rem',
                            minWidth: '250px'
                        }}>
                            <MapPin size={24} />
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{center.center_name}</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>{center.address}</div>
                                {center.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                                        <Phone size={14} /> {center.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
