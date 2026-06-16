import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, BarChart2, TrendingUp, AlertTriangle, DownloadCloud, FileCheck, Layers, MapPin, Users, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { apiRequest } from '../../services/adminApi';

const COLORS = ['#2F6BFF', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff7300'];

interface ExecutiveData {
  heatmapData: Array<{ district: string; lat: number; lng: number; intensity: number; avgRisk: number }>;
  complaintsByDepartment: Array<{ department: string; count: number; risk: number }>;
  complaintsByDistrict: Array<{ district: string; count: number; risk: number }>;
  complaintsByMonth: Array<{ name: string; reports: number }>;
  earlyWarningAlerts: Array<{ severity: string; description: string; date: string }>;
  forecast: {
    forecast30: number;
    forecast90: number;
    forecastAnnual: number;
    atRiskDepartments: string[];
    atRiskRegions: string[];
  };
  slaPerformance: {
    avgResolutionDays: number;
    backlogCount: number;
    escalationFrequency: number;
    avgApprovalTurnaroundHours: number;
    officerWorkload: Array<{ officer: string; cases: number }>;
  };
}

export default function ExecutiveOversightPanel() {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const execRes = await apiRequest('/integrity/analytics/executive');
      const watchRes = await apiRequest('/integrity/watchlist');
      
      if (execRes && execRes.success) {
        setData(execRes.data);
      }
      if (watchRes && watchRes.success) {
        setWatchlist(watchRes.data);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch executive metrics. Ensure you have appropriate oversight role access.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCompliance = async (format: string) => {
    setDownloading(true);
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const VITE_API_URL = import.meta.env.VITE_API_URL as string;
      const API_BASE = isLocal ? 'http://localhost:5000/api' : (VITE_API_URL || 'https://aazhi-9gj2.onrender.com/api');
      const token = localStorage.getItem('adminToken');
      
      window.open(`${API_BASE}/integrity/compliance/export?format=${format}&token=${token}&_t=${Date.now()}`, '_blank');
    } catch (err: any) {
      alert('Failed to trigger compliance export: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RefreshCw className="animate-spin text-blue-600" size={36} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280' }}>Aggregating Governance Statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1.5rem', borderRadius: 16, color: '#DC2626', fontWeight: 600 }}>
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'Inter, sans-serif', paddingBottom: '3rem' }}>
      
      {/* Top Welcome Title Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '2rem',
        borderRadius: 20,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid #334155',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: 14,
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3B82F6'
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.025em' }}>National Whistleblower Executive Board</h1>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem', fontWeight: 500 }}>
              Read-Only Aggregated Oversight · Real-Time Governance Performance
            </p>
          </div>
        </div>

        <button 
          onClick={loadData}
          style={{
            background: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '0.6rem 1.2rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
            transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* KPI Overview row */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Resolution Duration</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1E293B' }}>{data.slaPerformance.avgResolutionDays} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748B' }}>Days</span></span>
          </div>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Backlog (&gt;15 Days)</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#EF4444' }}>{data.slaPerformance.backlogCount} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748B' }}>Cases</span></span>
          </div>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Escalation Frequency</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#F59E0B' }}>{data.slaPerformance.escalationFrequency} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748B' }}>Events</span></span>
          </div>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approval Turnaround</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#10B981' }}>{data.slaPerformance.avgApprovalTurnaroundHours} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748B' }}>Hours</span></span>
          </div>
        </div>
      )}

      {/* Main Charts area */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          
          {/* Trends line chart */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} className="text-blue-500" /> Intake Velocity Trends
            </h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.complaintsByMonth}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Area type="monotone" dataKey="reports" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorReports)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Breakdown */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.01)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} className="text-teal-500" /> Sector Risk Matrix
            </h3>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.complaintsByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="department" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="count" name="Case Count" fill="#00C49F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="risk" name="Avg Risk Score" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap coordinates & Risk Forecasting row */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          
          {/* Geolocation Region Analysis */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} className="text-red-500" /> Department District Map & Heatmap
            </h3>
            <div style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800, color: '#64748B', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                <span>DISTRICT REGION</span>
                <span>COORDINATES (LAT/LNG)</span>
                <span>VOLUME</span>
                <span>RISK LEVEL</span>
              </div>
              {data.heatmapData.map((item, idx) => {
                const getRiskBadgeColor = (risk: number) => {
                  if (risk >= 75) return { bg: '#FEE2E2', text: '#EF4444', label: 'CRITICAL' };
                  if (risk >= 50) return { bg: '#FFEDD5', text: '#F97316', label: 'HIGH' };
                  return { bg: '#D1FAE5', text: '#10B981', label: 'LOW' };
                };
                const badge = getRiskBadgeColor(item.avgRisk);
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#334155', padding: '0.25rem 0' }}>
                    <span style={{ fontWeight: 700 }}>📍 {item.district}</span>
                    <span style={{ fontFamily: 'monospace', color: '#64748B' }}>{item.lat}, {item.lng}</span>
                    <span style={{ fontWeight: 800, color: '#1E293B' }}>{item.intensity} Reports</span>
                    <span style={{ background: badge.bg, color: badge.text, fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: 6 }}>
                      {badge.label} ({item.avgRisk})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Forecasting Card */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} className="text-purple-500" /> Strategic Intelligence Forecasting
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#F8FAFC', padding: '1.25rem', borderRadius: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B' }}>30-DAY PROJECTION</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2F6BFF', marginTop: '0.25rem' }}>+{data.forecast.forecast30}</span>
                <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, marginTop: '0.15rem' }}>New Cases</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B' }}>90-DAY PROJECTION</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#8B5CF6', marginTop: '0.25rem' }}>+{data.forecast.forecast90}</span>
                <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, marginTop: '0.15rem' }}>New Cases</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B' }}>ANNUAL VELOCITY</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#EC4899', marginTop: '0.25rem' }}>+{data.forecast.forecastAnnual}</span>
                <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, marginTop: '0.15rem' }}>Intake Est</span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#EF4444', fontWeight: 800 }}>⚠️ Sector Risks:</span>
                <span>Departments heading towards rising corruption risk: <span style={{ fontWeight: 800, color: '#1E293B' }}>{data.forecast.atRiskDepartments.join(', ') || 'None flagged'}</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ color: '#F97316', fontWeight: 800 }}>📍 Regional Alert:</span>
                <span>Emerging clusters predicted in: <span style={{ fontWeight: 800, color: '#1E293B' }}>{data.forecast.atRiskRegions.join(', ') || 'None flagged'}</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Early Warning Alerts & Watchlist Watch registry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Early Warning system */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} className="text-amber-500" /> National Early Warning Indicators
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
            {data && data.earlyWarningAlerts.map((alert, idx) => {
              const colorsMap: Record<string, { bg: string, border: string, text: string }> = {
                "Critical Alert": { bg: '#FEE2E2', border: '#FCA5A5', text: '#EF4444' },
                "Warning": { bg: '#FFEDD5', border: '#FDBA74', text: '#F97316' },
                "Advisory": { bg: '#EFF6FF', border: '#BFDBFE', text: '#3B82F6' }
              };
              const c = colorsMap[alert.severity] || colorsMap["Advisory"];
              return (
                <div key={idx} style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: '1rem', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>🚨 {alert.severity}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 700 }}>
                      {new Date(alert.date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0, color: '#334155', marginTop: '0.25rem' }}>{alert.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Watchlist */}
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} className="text-indigo-500" /> Secure Repeat Offender watchlist
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
            {watchlist.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                No entities registered in watchlist yet.
              </div>
            ) : (
              watchlist.map((item, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase' }}>{item.entity_type}</span>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0.1rem 0 0 0', color: '#1E293B' }}>{item.entity_value}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#EF4444' }}>{item.mention_count} Mentions</span>
                      <span style={{ fontSize: '0.6rem', display: 'block', color: item.risk_trend === 'High Risk' ? '#EF4444' : '#64748B', fontWeight: 700 }}>
                        Trend: {item.risk_trend}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Compliance Exporter card */}
      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        padding: '1.5rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.01)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#10B981',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>Compliance & Audit Readiness Packages</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, fontWeight: 500 }}>
              Tamper-evident audit chain certification logs, evidence verification metrics, and monitoring records.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            onClick={() => handleExportCompliance('pdf')}
            disabled={downloading}
            style={{
              flex: 1,
              minWidth: '150px',
              background: '#0F172A',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '0.8rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)',
              opacity: downloading ? 0.7 : 1
            }}
          >
            <DownloadCloud size={16} /> Export Audit PDF
          </button>
          <button
            onClick={() => handleExportCompliance('excel')}
            disabled={downloading}
            style={{
              flex: 1,
              minWidth: '150px',
              background: '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '0.8rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.15)',
              opacity: downloading ? 0.7 : 1
            }}
          >
            <DownloadCloud size={16} /> Export Audit Excel (xls)
          </button>
          <button
            onClick={() => handleExportCompliance('csv')}
            disabled={downloading}
            style={{
              flex: 1,
              minWidth: '150px',
              background: '#F59E0B',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '0.8rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.15)',
              opacity: downloading ? 0.7 : 1
            }}
          >
            <DownloadCloud size={16} /> Export Audit CSV
          </button>
        </div>
      </div>
    </div>
  );
}
