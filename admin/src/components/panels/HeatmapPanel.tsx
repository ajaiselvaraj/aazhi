import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { liveMapIssues } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { filterByDept } from '../../utils/deptFilter'

const getPriorityIcon = (priority: string) => {
  if (priority === 'Critical') {
    return L.divIcon({ className: 'marker-priority-critical', iconSize: [24, 24], iconAnchor: [12, 12] })
  }
  if (priority === 'High') {
    return L.divIcon({ className: 'marker-priority-high', iconSize: [20, 20], iconAnchor: [10, 10] })
  }
  if (priority === 'Medium') {
    return L.divIcon({ className: 'marker-priority-medium', iconSize: [16, 16], iconAnchor: [8, 8] })
  }
  // Low priority default
  return L.divIcon({ className: 'marker-priority-low', iconSize: [12, 12], iconAnchor: [6, 6] })
}

export default function HeatmapPanel() {
  const { user } = useAuth()
  const issues = user ? filterByDept(liveMapIssues, user.department) : liveMapIssues

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
          0% { transform: scale(0.6); opacity: 1; stroke-width: 4px; }
          100% { transform: scale(1.6); opacity: 0; stroke-width: 0px; }
        }
        .marker-priority-high {
          width: 20px; height: 20px;
          background-color: #FFA940;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 5px rgba(0,0,0,0.4);
        }
        .marker-priority-medium {
          width: 16px; height: 16px;
          background-color: #FFD43B;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
        }
        .marker-priority-low {
          width: 12px; height: 12px;
          background-color: #2ECC71;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 3px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          <div className="icon-dot" style={{ background: 'var(--primary)' }} />
          Live Issue Map
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span className="live-dot">Live Priority View</span>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ width: '100%', height: '550px', position: 'relative', zIndex: 0 }}>
        <MapContainer 
          center={[26.2006, 92.9376]} 
          zoom={7} 
          minZoom={6}
          maxBounds={[
            [21.5, 88.0],
            [29.5, 97.5]
          ]}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
          {issues.map(issue => (
            <Marker
              key={issue.id}
              position={[issue.lat, issue.lng]}
              icon={getPriorityIcon(issue.priority)}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '170px', padding: '2px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#111827', fontWeight: 600 }}>{issue.title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#4B5563' }}>
                      <strong>Department:</strong> {issue.dept}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4B5563' }}>
                      <strong>Ward:</strong> {issue.ward}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4B5563' }}>
                      <strong>Priority:</strong> <span style={{ color: issue.priority === 'Critical' ? '#FF4D4F' : issue.priority === 'High' ? '#FFA940' : issue.priority === 'Medium' ? '#F59E0B' : '#2ECC71', fontWeight: 700 }}>{issue.priority}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4B5563' }}>
                      <strong>Reported:</strong> {issue.reportedAt}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#4B5563', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #D1D5DB' }}>
                    <strong>Ticket:</strong> <span style={{fontFamily: 'monospace', fontWeight: 500, background: '#F3F4F6', padding: '2px 4px', borderRadius: '4px'}}>{issue.ticket}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Legend */}
        <div style={{
          position: 'absolute', bottom: '24px', right: '24px', zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)', padding: '14px 18px', borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)',
          border: '1px solid var(--border)',
          fontFamily: 'Inter, sans-serif'
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
      </div>
    </div>
  )
}
