import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Calendar, MapPin, Eye, FileText, CheckCircle, RefreshCw, UserCheck, Play, Download, FileCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { apiRequest } from '../../services/adminApi';

const COLORS = ['#2F6BFF', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff7300', '#0088FE', '#00C49F'];

const CATEGORIES = [
  "Staff Misconduct",
  "Corruption / Bribe Demand",
  "Fake Meter Reading",
  "Service Fraud",
  "Abuse of Authority",
  "Financial Irregularities",
  "Contractor Misconduct",
  "Other"
];

const TRACKING_STAGES = [
  "Submitted",
  "Under Review",
  "Evidence Verification",
  "Investigation Started",
  "Action Initiated",
  "Closed"
];

interface Report {
  id: string;
  anonymous_case_code: string;
  category: string;
  description: string;
  location: string | null;
  incident_date: string | null;
  media_files: Array<{ id: string, filename: string, mimetype: string, size: number }>;
  created_at: string;
  status: string;
  integrity_notes: string | null;
  assigned_officer: string | null;
  audit_log: Array<{ action: string, officer: string, timestamp: string }>;
}

interface Metrics {
  totalReports: number;
  statusCounts: Record<string, number>;
  categoryDistribution: Array<{ name: string, value: number }>;
  monthlyTrends: Array<{ name: string, reports: number }>;
}

export default function IntegrityDashboardPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selection / Modal state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingOfficer, setEditingOfficer] = useState('');
  const [updatingAction, setUpdatingAction] = useState(false);

  // Filter / Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Object URLs for dynamic evidence loading
  const [evidenceBlobUrls, setEvidenceBlobUrls] = useState<Record<string, string>>({});
  const [loadingEvidenceId, setLoadingEvidenceId] = useState<string | null>(null);

  // Secure Messaging State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const fetchMessages = async (reportId: string) => {
    setMessagesLoading(true);
    setMessagesError('');
    try {
      const res = await apiRequest(`/integrity/reports/${reportId}/messages`);
      if (res && res.success) {
        setMessages(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setMessagesError("Failed to load conversation history.");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchMessages(selectedReport.id);
    } else {
      setMessages([]);
      setNewMessage('');
    }
  }, [selectedReport]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const reportsRes = await apiRequest('/integrity/reports');
      const metricsRes = await apiRequest('/integrity/metrics');

      if (reportsRes && reportsRes.success) {
        setReports(reportsRes.data);
      }
      if (metricsRes && metricsRes.success) {
        setMetrics(metricsRes.data);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load integrity data. Check authentication and roles.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setUpdatingAction(true);
    try {
      const res = await apiRequest(`/integrity/reports/${reportId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res && res.success) {
        // Update local state
        setReports(prev => prev.map(r => r.id === reportId ? { 
          ...r, 
          status: res.data.status, 
          audit_log: res.data.audit_log 
        } : r));
        
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport(prev => prev ? { 
            ...prev, 
            status: res.data.status, 
            audit_log: res.data.audit_log 
          } : null);
        }
        
        // Reload metrics
        const metricsRes = await apiRequest('/integrity/metrics');
        if (metricsRes && metricsRes.success) {
          setMetrics(metricsRes.data);
        }
      }
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setUpdatingAction(true);
    try {
      const res = await apiRequest(`/integrity/reports/${selectedReport.id}/notes`, {
        method: 'PUT',
        body: JSON.stringify({
          notes: editingNotes,
          assignedOfficer: editingOfficer
        })
      });

      if (res && res.success) {
        setReports(prev => prev.map(r => r.id === selectedReport.id ? { 
          ...r, 
          integrity_notes: res.data.notes, 
          assigned_officer: res.data.assignedOfficer, 
          audit_log: res.data.audit_log 
        } : r));

        setSelectedReport(prev => prev ? { 
          ...prev, 
          integrity_notes: res.data.notes, 
          assigned_officer: res.data.assignedOfficer, 
          audit_log: res.data.audit_log 
        } : null);
        
        alert("Investigation notes and officer assignment updated successfully.");
      }
    } catch (err: any) {
      alert("Failed to update notes: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingAction(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newMessage.trim()) return;

    setMessagesLoading(true);
    setMessagesError('');
    try {
      const res = await apiRequest(`/integrity/reports/${selectedReport.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: newMessage.trim() })
      });
      if (res && res.success) {
        setMessages(prev => [...prev, res.data]);
        setNewMessage('');
      }
    } catch (err: any) {
      console.error(err);
      setMessagesError("Failed to send message: " + (err.message || "Unknown error"));
    } finally {
      setMessagesLoading(false);
    }
  };

  // Safe file download/view fetching decrypted buffer
  const loadEvidence = async (reportId: string, fileId: string, filename: string, mimetype: string) => {
    if (evidenceBlobUrls[fileId]) {
      // Already loaded
      return;
    }

    setLoadingEvidenceId(fileId);
    try {
      const token = localStorage.getItem('adminToken');
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const VITE_API_URL = import.meta.env.VITE_API_URL as string;
      const API_BASE = isLocal ? 'http://localhost:5000/api' : (VITE_API_URL || 'https://aazhi-9gj2.onrender.com/api');

      const res = await fetch(`${API_BASE}/integrity/reports/${reportId}/evidence/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to download file");

      const fileBlob = await res.blob();
      const cleanBlob = new Blob([fileBlob], { type: mimetype });
      const url = URL.createObjectURL(cleanBlob);
      
      setEvidenceBlobUrls(prev => ({
        ...prev,
        [fileId]: url
      }));
    } catch (err: any) {
      console.error(err);
      alert("Failed to decrypt and load evidence file: " + err.message);
    } finally {
      setLoadingEvidenceId(null);
    }
  };

  // Filters logic
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.anonymous_case_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RefreshCw className="animate-spin text-blue-600" size={36} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Decrypting Secure Integrity Log...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1A2E5A 0%, #111e3b 100%)',
        padding: '1.75rem 2rem',
        borderRadius: 16,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid #1f366b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 12,
            background: 'rgba(47, 107, 255, 0.15)',
            border: '1px solid rgba(47, 107, 255, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#2F6BFF'
          }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Anonymous Civic Integrity Queue</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem', fontWeight: 500 }}>
              Isolated queue reserved strictly for authorized Integrity Officers. Standard administrative access is blocked.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: 12, color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Reports</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{metrics.totalReports}</span>
          </div>
          <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Under Review</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b' }}>{metrics.statusCounts["Under Review"] || 0}</span>
          </div>
          <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2F6BFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Investigations</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2F6BFF' }}>
              {(metrics.statusCounts["Evidence Verification"] || 0) + (metrics.statusCounts["Investigation Started"] || 0) + (metrics.statusCounts["Action Initiated"] || 0)}
            </span>
          </div>
          <div style={{ background: '#fff', padding: '1.25rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closed Cases</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>{metrics.statusCounts["Closed"] || 0}</span>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {metrics && metrics.totalReports > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Category Distribution Chart */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '320px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Category Distribution</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metrics.categoryDistribution}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {metrics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends Chart */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '320px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Monthly Intake Trends</h3>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={metrics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="reports" stroke="#2F6BFF" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Main Queue Table & Detail drawer */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Filters and search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              placeholder="Search by Case Code (e.g. CIV-...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 1rem 0.625rem 2.5rem',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                background: '#F9FAFB'
              }}
            />
            <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} size={16} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 0.75rem' }}>
              <Filter size={14} color="#9CA3AF" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', padding: '0.625rem 0', outline: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0 0.75rem' }}>
              <Filter size={14} color="#9CA3AF" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: 'transparent', border: 'none', padding: '0.625rem 0', outline: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <option value="All">All Statuses</option>
                {TRACKING_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

        </div>

        {/* Table Queue */}
        <div style={{ overflowX: 'auto', border: '1px solid #F3F4F6', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: 'var(--text-secondary)', fontWeight: 800 }}>
                <th style={{ padding: '0.875rem 1rem' }}>Case Code</th>
                <th style={{ padding: '0.875rem 1rem' }}>Category</th>
                <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                <th style={{ padding: '0.875rem 1rem' }}>Date Submitted</th>
                <th style={{ padding: '0.875rem 1rem' }}>Assigned Officer</th>
                <th style={{ padding: '0.875rem 1rem', width: '80px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontWeight: 600 }}>
                    No integrity reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map(r => {
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{r.anonymous_case_code}</td>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{r.category}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: r.status === 'Closed' ? '#D1FAE5' : r.status === 'Submitted' ? '#DBEAFE' : '#FEF3C7',
                          color: r.status === 'Closed' ? '#065F46' : r.status === 'Submitted' ? '#1E40AF' : '#92400E'
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {new Date(r.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#374151' }}>
                        {r.assigned_officer || <span style={{ color: '#9CA3AF', fontWeight: 500 }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedReport(r);
                            setEditingNotes(r.integrity_notes || '');
                            setEditingOfficer(r.assigned_officer || '');
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            background: '#F3F4F6',
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: '#4B5563'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Case details Drawer Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 99,
          animation: 'fadeIn 0.2s'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '640px',
            background: '#fff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 30px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s'
          }}>
            
            {/* Drawer Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert className="text-blue-600" size={22} />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 900, margin: 0, fontFamily: 'monospace' }}>{selectedReport.anonymous_case_code}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>INTEGRITY REPORT CASE</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedReport(null);
                  // Revoke loaded blob URLs to prevent memory leak
                  Object.values(evidenceBlobUrls).forEach(URL.revokeObjectURL);
                  setEvidenceBlobUrls({});
                }}
                style={{ padding: '0.5rem', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

            {/* Drawer Body Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Category, Date, Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Category</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{selectedReport.category}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Lodged At</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>
                    {new Date(selectedReport.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Status</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{selectedReport.status}</span>
                </div>
              </div>

              {/* Decrypted Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 900, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Decrypted Report Description</h4>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: 12, fontSize: '0.85rem', lineHeight: 1.6, fontWeight: 500, color: '#1E293B', whiteSpace: 'pre-wrap' }}>
                  {selectedReport.description}
                </div>
              </div>

              {/* Decrypted Location & Incident Date */}
              {(selectedReport.location || selectedReport.incident_date) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {selectedReport.location && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12}/> Location</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.625rem 1rem', borderRadius: 10 }}>
                        {selectedReport.location}
                      </span>
                    </div>
                  )}
                  {selectedReport.incident_date && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12}/> Date of Incident</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.625rem 1rem', borderRadius: 10 }}>
                        {new Date(selectedReport.incident_date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Decrypted Evidence & Attachments */}
              {selectedReport.media_files && selectedReport.media_files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 900, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Decrypted Evidence Attachments</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedReport.media_files.map(file => {
                      const fileUrl = evidenceBlobUrls[file.id];
                      const isLoaded = !!fileUrl;
                      const isImage = file.mimetype.startsWith("image/");
                      const isAudio = file.mimetype.startsWith("audio/");
                      const isPdf = file.mimetype.startsWith("application/pdf");

                      return (
                        <div key={file.id} style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#F8FAFC' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <FileText size={16} color="#64748B" />
                              <div>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>{file.filename}</p>
                                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>{(file.size / (1024 * 1024)).toFixed(2)} MB · {file.mimetype}</span>
                              </div>
                            </div>

                            {!isLoaded ? (
                              <button
                                onClick={() => loadEvidence(selectedReport.id, file.id, file.filename, file.mimetype)}
                                disabled={loadingEvidenceId === file.id}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  background: '#2F6BFF',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  marginLeft: 'auto'
                                }}
                              >
                                {loadingEvidenceId === file.id ? <RefreshCw className="animate-spin" size={10} /> : <Play size={10} />}
                                Decrypt & Load
                              </button>
                            ) : (
                              <a
                                href={fileUrl}
                                download={file.filename}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  background: '#10b981',
                                  color: '#fff',
                                  borderRadius: 8,
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  marginLeft: 'auto'
                                }}
                              >
                                <Download size={10} /> Save File
                              </a>
                            )}
                          </div>

                          {/* Render Player/Previewer if Loaded */}
                          {isLoaded && fileUrl && (
                            <div style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '0.5rem', borderRadius: 8 }}>
                              {isImage && (
                                <img src={fileUrl} alt="Sanitized Evidence" style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: 6, display: 'block', margin: '0 auto' }} />
                              )}
                              {isAudio && (
                                <audio controls src={fileUrl} style={{ width: '100%', display: 'block' }} />
                              )}
                              {isPdf && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                                  <FileCheck size={16} /> PDF decrypted successfully. Click Save File to view.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Update Progression */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 900, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Progress Status Action</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {TRACKING_STAGES.map(statusOption => {
                    const isSelected = selectedReport.status.toLowerCase() === statusOption.toLowerCase();
                    return (
                      <button
                        key={statusOption}
                        onClick={() => handleUpdateStatus(selectedReport.id, statusOption)}
                        disabled={updatingAction || isSelected}
                        style={{
                          padding: '0.5rem 0.85rem',
                          background: isSelected ? 'rgba(47,107,255,0.1)' : '#fff',
                          color: isSelected ? '#2F6BFF' : '#475569',
                          border: isSelected ? '1px solid #2F6BFF' : '1px solid #CBD5E1',
                          borderRadius: 8,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: updatingAction || isSelected ? 'default' : 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {statusOption}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secure Chat with Citizen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 900, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Two-Way Secure Chat (Anonymous Citizen)
                  </h4>
                  <button
                    type="button"
                    onClick={() => selectedReport && fetchMessages(selectedReport.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4B5563',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <RefreshCw size={14} className={messagesLoading ? "animate-spin" : ""} />
                  </button>
                </div>

                {messagesError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: 8, color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                    ⚠️ {messagesError}
                  </div>
                )}

                {/* Message display area */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '1rem',
                  height: '240px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {messages.length === 0 ? (
                    <div style={{ margin: 'auto', textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600 }}>
                      No messages exchanged yet.<br/>Post a message below to request clarification.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isOfficer = m.sender_type === 'officer';
                      return (
                        <div 
                          key={m.id} 
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isOfficer ? 'flex-end' : 'flex-start',
                            alignSelf: isOfficer ? 'flex-end' : 'flex-start',
                            maxWidth: '85%'
                          }}
                        >
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', marginBottom: '0.15rem' }}>
                            {isOfficer ? 'You (Integrity Officer)' : 'Anonymous Citizen'}
                          </span>
                          <div style={{
                            padding: '0.5rem 0.85rem',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            lineHeight: 1.4,
                            background: isOfficer ? '#2F6BFF' : '#E2E8F0',
                            color: isOfficer ? '#fff' : '#1E293B',
                            borderTopLeftRadius: !isOfficer ? 0 : 12,
                            borderTopRightRadius: isOfficer ? 0 : 12
                          }}>
                            {m.message}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: '0.15rem', fontWeight: 600 }}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input area */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Ask whistleblower for clarification..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.875rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: 10,
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={messagesLoading || !newMessage.trim()}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#2F6BFF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: messagesLoading || !newMessage.trim() ? 0.6 : 1
                    }}
                  >
                    Send
                  </button>
                </form>
              </div>

              {/* Internal Investigation Notes & Officer Assignment */}
              <form onSubmit={handleSaveNotes} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 900, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', paddingTop: '1rem' }}>Investigation Panel</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Assigned Integrity Officer</label>
                  <input
                    type="text"
                    placeholder="Enter officer name"
                    value={editingOfficer}
                    onChange={(e) => setEditingOfficer(e.target.value)}
                    style={{ padding: '0.625rem 0.875rem', border: '1px solid #CBD5E1', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Internal Notes & Findings (Encrypted)</label>
                  <textarea
                    rows={4}
                    placeholder="Record detailed investigation notes, logs of interviews, findings, or administrative resolutions. These notes are encrypted before saving."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    style={{ padding: '0.875rem', border: '1px solid #CBD5E1', borderRadius: 10, fontSize: '0.8rem', fontWeight: 500, outline: 'none', resize: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingAction}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#1A2E5A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: updatingAction ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {updatingAction ? <RefreshCw className="animate-spin" size={14} /> : <UserCheck size={14} />}
                  Save Findings & Assignment
                </button>
              </form>

              {/* Case Audit Log Timeline */}
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 900, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em', paddingTop: '1rem' }}>Investigation Audit Trail</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedReport.audit_log && selectedReport.audit_log.map((log, index) => (
                    <div key={index} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.875rem 1.125rem', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>{log.action}</p>
                        <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>By: {log.officer}</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString("en-GB", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Embedded CSS for Drawer Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

    </div>
  );
}
