import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Megaphone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { apiRequest } from '../../services/adminApi';
import { useLanguage } from '../../context/LanguageContext';

export default function EmergencyControlPanel() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // State for Emergency Mode
  const [emergencyStatus, setEmergencyStatus] = useState<any>(null);
  const [modeType, setModeType] = useState('emergency');
  const [modeMessage, setModeMessage] = useState('');

  // State for Broadcasts
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState('high');

  // State for Relief Centers
  const [centerName, setCenterName] = useState('');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerWard, setCenterWard] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [reliefCenters, setReliefCenters] = useState<any[]>([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await apiRequest('/emergency/status');
      if (res.success) {
        setEmergencyStatus(res.data);
      }
      
      const centerRes = await apiRequest('/emergency/relief-centers');
      if (centerRes.success) {
        setReliefCenters(centerRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch emergency data", err);
    }
  };

  const handleActivateMode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      await apiRequest('/admin/emergency/activate', {
        method: 'POST',
        body: JSON.stringify({ modeType, message: modeMessage })
      });
      setSuccessMsg('Emergency Mode Activated successfully.');
      fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to activate emergency mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateMode = async () => {
    if (!window.confirm("Are you sure you want to deactivate Emergency Mode?")) return;
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      await apiRequest('/admin/emergency/deactivate', { method: 'POST' });
      setSuccessMsg('Emergency Mode Deactivated.');
      fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate emergency mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      await apiRequest('/admin/emergency/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          severity: broadcastSeverity,
          type: 'global'
        })
      });
      setSuccessMsg('Emergency broadcast sent.');
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send broadcast.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReliefCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      await apiRequest('/admin/emergency/relief-center', {
        method: 'POST',
        body: JSON.stringify({
          centerName,
          address: centerAddress,
          ward: centerWard,
          phone: centerPhone,
          emergencyType: modeType
        })
      });
      setSuccessMsg('Relief center added.');
      setCenterName(''); setCenterAddress(''); setCenterWard(''); setCenterPhone('');
      fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to add relief center.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReliefCenter = async (id: string) => {
    if (!window.confirm("Delete this relief center?")) return;
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      await apiRequest(`/admin/emergency/relief-center/${id}`, { method: 'DELETE' });
      setSuccessMsg('Relief center deleted.');
      fetchStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to delete relief center.');
    } finally {
      setLoading(false);
    }
  };

  const isEmergencyActive = emergencyStatus?.is_active && emergencyStatus?.mode_type !== 'normal';

  return (
    <div className="panel-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', color: '#1f2937' }}>
          <ShieldAlert color="#e11d48" size={32} />
          Emergency Command & Control
        </h1>
        <p style={{ margin: '0.5rem 0 0', color: '#6b7280' }}>
          Manage critical system states, broadcast alerts, and allocate relief centers during crisis events.
        </p>
      </header>

      {error && (
        <div style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <XCircle size={20} /> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#ecfdf5', borderLeft: '4px solid #10b981', color: '#047857', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Left Column */}
        <div>
          {/* Status Card */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} /> System State
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ 
                width: '16px', height: '16px', borderRadius: '50%', 
                background: isEmergencyActive ? '#ef4444' : '#10b981',
                boxShadow: `0 0 8px ${isEmergencyActive ? '#ef4444' : '#10b981'}`
              }} />
              <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                {isEmergencyActive ? `EMERGENCY ACTIVE: ${emergencyStatus.mode_type.toUpperCase()}` : 'NORMAL OPERATION'}
              </span>
            </div>
            {isEmergencyActive && (
              <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '6px', border: '1px solid #fee2e2' }}>
                <strong>Current Message:</strong> {emergencyStatus.emergency_message}
              </div>
            )}
          </div>

          {/* Mode Activation Form */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827' }}>
              {isEmergencyActive ? 'Deactivate Emergency' : 'Activate Emergency Mode'}
            </h2>
            
            {!isEmergencyActive ? (
              <form onSubmit={handleActivateMode}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Emergency Type</label>
                  <select 
                    value={modeType} onChange={e => setModeType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    required
                  >
                    <option value="emergency">General Emergency</option>
                    <option value="flood">Flood</option>
                    <option value="cyclone">Cyclone</option>
                    <option value="power_failure">Major Power Failure</option>
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Public Instructions / Banner Message</label>
                  <textarea 
                    value={modeMessage} onChange={e => setModeMessage(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    placeholder="E.g., Please remain indoors. All non-essential services are suspended."
                    required
                  />
                </div>
                <button type="submit" disabled={loading} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  {loading ? 'Activating...' : 'ACTIVATE EMERGENCY'}
                </button>
              </form>
            ) : (
              <button 
                onClick={handleDeactivateMode} 
                disabled={loading} 
                style={{ background: '#059669', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
              >
                {loading ? 'Deactivating...' : 'RETURN TO NORMAL OPERATION'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Broadcast Form */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={20} /> Push Emergency Broadcast
            </h2>
            <form onSubmit={handleSendBroadcast}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title</label>
                <input 
                  type="text" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message</label>
                <textarea 
                  value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Severity</label>
                <select 
                  value={broadcastSeverity} onChange={e => setBroadcastSeverity(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <button type="submit" disabled={loading} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
                {loading ? 'Sending...' : 'Send Global Broadcast'}
              </button>
            </form>
          </div>

          {/* Relief Center Form */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} /> Register Relief Center
            </h2>
            <form onSubmit={handleAddReliefCenter}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Center Name</label>
                  <input 
                    type="text" value={centerName} onChange={e => setCenterName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Phone (Optional)</label>
                  <input 
                    type="text" value={centerPhone} onChange={e => setCenterPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Address</label>
                <textarea 
                  value={centerAddress} onChange={e => setCenterAddress(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  required
                />
              </div>
              <button type="submit" disabled={loading} style={{ background: '#4b5563', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
                {loading ? 'Adding...' : 'Add Relief Center'}
              </button>
            </form>

            {/* List of Relief Centers */}
            {reliefCenters.length > 0 && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#111827' }}>Active Relief Centers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reliefCenters.map(center => (
                    <div key={center.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>{center.center_name}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{center.address}</div>
                      </div>
                      <button 
                        onClick={() => handleDeleteReliefCenter(center.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                        title="Delete Center"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
