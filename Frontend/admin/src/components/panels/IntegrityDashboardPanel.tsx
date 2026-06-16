import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Calendar, MapPin, Eye, FileText, CheckCircle, RefreshCw, UserCheck, Play, Download, FileCheck, ShieldAlert as AlertIcon, AlertOctagon, Info, ChevronRight, Lock, Key, Users, History, ArrowUpRight, TrendingUp, DownloadCloud } from 'lucide-react';
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
  media_files: Array<{ id: string, filename: string, mimetype: string, size: number, hash?: string }>;
  created_at: string;
  status: string;
  integrity_notes: string | null;
  assigned_officer: string | null;
  audit_log: Array<{ action: string, officer: string, timestamp: string }>;
  retaliation_risk?: boolean;
  risk_score?: number;
  risk_level?: string;
  escalation_level?: string;
  triage_results?: {
    fraudIndicators: string[];
    similarCases: Array<{ id: string; caseCode: string; similarity: number }>;
    duplicateProbability: number;
    recommendedPriority: string;
    aiSummary: string;
  };
  protection_score?: number;
  protection_level?: string;
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
  
  // Navigation / Tabs State
  const [subTab, setSubTab] = useState<'queue' | 'approvals' | 'security' | 'oversight'>('queue');

  // Selection / Modal state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'collaborators' | 'approvals' | 'evidence' | 'escalations' | 'chat' | 'triage' | 'intelligence'>('overview');
  
  // Form inputs
  const [editingNotes, setEditingNotes] = useState('');
  const [editingOfficer, setEditingOfficer] = useState('');
  const [updatingAction, setUpdatingAction] = useState(false);

  // V3 specific states
  const [activeOfficers, setActiveOfficers] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [evidenceChain, setEvidenceChain] = useState<any[]>([]);
  const [caseApprovals, setCaseApprovals] = useState<any[]>([]);

  // V4 AI Intelligence state
  const [evidenceIntelligence, setEvidenceIntelligence] = useState<any | null>(null);
  const [evidenceIntelligenceLoading, setEvidenceIntelligenceLoading] = useState(false);
  const [caseEscalations, setCaseEscalations] = useState<any[]>([]);
  
  const [globalApprovals, setGlobalApprovals] = useState<any[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<any[]>([]);
  const [drStatus, setDrStatus] = useState<any>(null);

  // New item creation inputs
  const [newCollaboratorId, setNewCollaboratorId] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState('Lead Investigator');
  const [newApprovalAction, setNewApprovalAction] = useState('Close Case');
  const [newEscalateLevel, setNewEscalateLevel] = useState('Level 2: Regional Integrity Unit');
  const [newEscalateReason, setNewEscalateReason] = useState('');
  
  // MFA setup states
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Filter / Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortByRisk, setSortByRisk] = useState(true);

  // Object URLs for dynamic evidence loading
  const [evidenceBlobUrls, setEvidenceBlobUrls] = useState<Record<string, string>>({});
  const [loadingEvidenceId, setLoadingEvidenceId] = useState<string | null>(null);

  // Secure Messaging State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  // Extract currently logged-in officer session details
  const [currentOfficer, setCurrentOfficer] = useState<any>(null);

  useEffect(() => {
    try {
      const sessionStr = localStorage.getItem('aazhi_admin_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        setCurrentOfficer(session);
      }
    } catch (e) {
      console.error("Failed to parse officer session", e);
    }
  }, []);

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

  // V3 specific loaders
  const loadCaseCollaborators = async (reportId: string) => {
    try {
      const res = await apiRequest(`/integrity/reports/${reportId}/assignments`);
      if (res && res.success) {
        setCollaborators(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCaseEvidenceChain = async (reportId: string) => {
    try {
      const res = await apiRequest(`/integrity/reports/${reportId}/evidence-chain`);
      if (res && res.success) {
        setEvidenceChain(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadEvidenceIntelligence = async (reportId: string) => {
    setEvidenceIntelligenceLoading(true);
    try {
      const res = await apiRequest(`/integrity/reports/${reportId}/evidence-intelligence`);
      if (res && res.success) {
        setEvidenceIntelligence(res.data);
      }
    } catch (e) {
      console.error(e);
      setEvidenceIntelligence(null);
    } finally {
      setEvidenceIntelligenceLoading(false);
    }
  };

  const loadCaseApprovals = async (reportId: string) => {
    try {
      const res = await apiRequest(`/integrity/reports/${reportId}/approvals`);
      if (res && res.success) {
        setCaseApprovals(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCaseEscalations = async (reportId: string) => {
    try {
      const res = await apiRequest(`/integrity/reports/${reportId}/escalate`);
      if (res && res.success) {
        setCaseEscalations(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadActiveOfficers = async () => {
    try {
      const res = await apiRequest('/integrity/officers');
      if (res && res.success) {
        setActiveOfficers(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadGlobalApprovals = async () => {
    try {
      const res = await apiRequest('/integrity/reports/all/approvals');
      if (res && res.success) {
        setGlobalApprovals(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSecurityIncidents = async () => {
    try {
      const res = await apiRequest('/integrity/incidents');
      if (res && res.success) {
        setSecurityIncidents(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDRStatus = async () => {
    try {
      const res = await apiRequest('/integrity/disaster-recovery/status');
      if (res && res.success) {
        setDrStatus(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      fetchMessages(selectedReport.id);
      loadCaseCollaborators(selectedReport.id);
      loadCaseEvidenceChain(selectedReport.id);
      loadCaseApprovals(selectedReport.id);
      loadCaseEscalations(selectedReport.id);
      setDrawerTab('overview');
      setEvidenceIntelligence(null);
    } else {
      setMessages([]);
      setNewMessage('');
      setEvidenceIntelligence(null);
    }
  }, [selectedReport]);

  useEffect(() => {
    loadData();
    loadActiveOfficers();
  }, []);

  useEffect(() => {
    if (subTab === 'approvals') {
      loadGlobalApprovals();
    } else if (subTab === 'security') {
      loadSecurityIncidents();
    } else if (subTab === 'oversight') {
      loadDRStatus();
    }
  }, [subTab]);

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
        
        alert(`Status updated successfully to '${newStatus}'.`);
        
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
  const loadEvidenceFile = async (reportId: string, fileId: string, filename: string, mimetype: string) => {
    if (evidenceBlobUrls[fileId]) {
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to download file");
      }

      const fileBlob = await res.blob();
      const cleanBlob = new Blob([fileBlob], { type: mimetype });
      const url = URL.createObjectURL(cleanBlob);
      
      setEvidenceBlobUrls(prev => ({
        ...prev,
        [fileId]: url
      }));

      // Reload evidence chain to show download audit logs
      loadCaseEvidenceChain(reportId);
    } catch (err: any) {
      console.error(err);
      alert("Failed to decrypt and load watermarked evidence file: " + err.message);
    } finally {
      setLoadingEvidenceId(null);
    }
  };

  // Add collaborator
  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newCollaboratorId) return;

    try {
      const res = await apiRequest(`/integrity/reports/${selectedReport.id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({ officerId: newCollaboratorId, role: newCollaboratorRole })
      });
      if (res && res.success) {
        alert("Collaborator assigned successfully.");
        loadCaseCollaborators(selectedReport.id);
        loadData(); // reload queue
      }
    } catch (err: any) {
      alert("Assignment failed: " + err.message);
    }
  };

  // Delete collaborator
  const handleRemoveCollaborator = async (assignmentId: string) => {
    if (!selectedReport) return;
    if (!confirm("Are you sure you want to remove this collaborator?")) return;

    try {
      const res = await apiRequest(`/integrity/reports/${selectedReport.id}/assignments/${assignmentId}`, {
        method: 'DELETE'
      });
      if (res && res.success) {
        alert("Collaborator removed.");
        loadCaseCollaborators(selectedReport.id);
        loadData();
      }
    } catch (err: any) {
      alert("Failed to remove collaborator: " + err.message);
    }
  };

  // Create approval request
  const handleCreateApprovalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      const res = await apiRequest(`/integrity/reports/${selectedReport.id}/approvals`, {
        method: 'POST',
        body: JSON.stringify({ action_type: newApprovalAction })
      });
      if (res && res.success) {
        alert("Approval request submitted.");
        loadCaseApprovals(selectedReport.id);
      }
    } catch (err: any) {
      alert("Failed to submit approval request: " + err.message);
    }
  };

  // Approve/Reject request
  const handleUpdateApproval = async (approvalId: string, status: 'Approved' | 'Rejected') => {
    try {
      const res = await apiRequest(`/integrity/approvals/${approvalId}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res && res.success) {
        alert(`Request ${status.toLowerCase()} successfully.`);
        if (selectedReport) loadCaseApprovals(selectedReport.id);
        loadGlobalApprovals();
        loadData(); // reload queue to reflect state changes
      }
    } catch (err: any) {
      alert("Action failed: " + err.message);
    }
  };

  // Escalate case
  const handleEscalateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newEscalateReason.trim()) return;

    try {
      const res = await apiRequest(`/integrity/reports/${selectedReport.id}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ escalated_to: newEscalateLevel, reason: newEscalateReason.trim() })
      });
      if (res && res.success) {
        alert("Case escalated successfully.");
        setNewEscalateReason('');
        loadCaseEscalations(selectedReport.id);
        loadData(); // reload queue to show escalation badge
      }
    } catch (err: any) {
      alert("Failed to escalate case: " + err.message);
    }
  };

  // Resolve Security Incident
  const handleResolveIncident = async (incidentId: string) => {
    try {
      const res = await apiRequest(`/integrity/incidents/${incidentId}/resolve`, {
        method: 'PUT'
      });
      if (res && res.success) {
        alert("Incident marked as resolved.");
        loadSecurityIncidents();
      }
    } catch (err: any) {
      alert("Action failed: " + err.message);
    }
  };

  // Setup TOTP MFA
  const handleInitializeMfa = async () => {
    setMfaLoading(true);
    try {
      const res = await apiRequest('/integrity/mfa/setup', { method: 'POST' });
      if (res && res.success) {
        setMfaSecret(res.data.secret);
      }
    } catch (err: any) {
      alert("Failed to initialize MFA setup: " + err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  // Verify and enable MFA
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) return;

    setMfaLoading(true);
    try {
      const res = await apiRequest('/integrity/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: mfaCode.trim() })
      });
      if (res && res.success) {
        alert("MFA successfully enabled for your account!");
        setMfaSecret('');
        setMfaCode('');
      }
    } catch (err: any) {
      alert("Verification failed: " + err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  // Trigger download of monthly governance reports
  const downloadGovernanceReport = (format: string) => {
    const token = localStorage.getItem('adminToken');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const VITE_API_URL = import.meta.env.VITE_API_URL as string;
    const API_BASE = isLocal ? 'http://localhost:5000/api' : (VITE_API_URL || 'https://aazhi-9gj2.onrender.com/api');

    window.open(`${API_BASE}/integrity/governance/report?format=${format}&_t=${Date.now()}&token=${token}`, '_blank');
  };

  // Filters logic
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.anonymous_case_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sorting logic (Feature 5 Case Risk Prioritization)
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortByRisk) {
      return (b.risk_score || 0) - (a.risk_score || 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <RefreshCw className="animate-spin text-blue-600" size={36} />
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Decrypting Secure Integrity Log...</span>
      </div>
    );
  }

  const isAuditor = currentOfficer?.role === 'oversight_auditor';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1A2E5A 0%, #111e3b 100%)',
        padding: '1.5rem 2rem',
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>V3 Enterprise-Grade Whistleblower Platform</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem', fontWeight: 500 }}>
              Sovereign Kiosk Whistleblower Audit Center. Role: <span style={{ color: '#FFBB28', fontWeight: 700 }}>{currentOfficer?.role || 'Integrity Officer'}</span>
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: 12, color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Sub-tabs switch */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '2px solid #E5E7EB', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setSubTab('queue')}
          style={{
            padding: '0.5rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'queue' ? '3px solid #2F6BFF' : '3px solid transparent',
            color: subTab === 'queue' ? '#2F6BFF' : '#4B5563',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            paddingBottom: '0.75rem'
          }}
        >
          🗂️ Reports Queue
        </button>
        <button
          onClick={() => setSubTab('approvals')}
          style={{
            padding: '0.5rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'approvals' ? '3px solid #2F6BFF' : '3px solid transparent',
            color: subTab === 'approvals' ? '#2F6BFF' : '#4B5563',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            paddingBottom: '0.75rem'
          }}
        >
          👁️‍🗨️ Four-Eyes Approvals
        </button>
        <button
          onClick={() => setSubTab('security')}
          style={{
            padding: '0.5rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'security' ? '3px solid #2F6BFF' : '3px solid transparent',
            color: subTab === 'security' ? '#2F6BFF' : '#4B5563',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            paddingBottom: '0.75rem'
          }}
        >
          🚨 Security Incidents
        </button>
        <button
          onClick={() => setSubTab('oversight')}
          style={{
            padding: '0.5rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'oversight' ? '3px solid #2F6BFF' : '3px solid transparent',
            color: subTab === 'oversight' ? '#2F6BFF' : '#4B5563',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            paddingBottom: '0.75rem'
          }}
        >
          🛡️ Oversight & DR
        </button>
      </div>

      {/* QUEUE TAB */}
      {subTab === 'queue' && (
        <>
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

          {/* Queue Table */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Filters bar */}
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

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Risk score toggle */}
                <button
                  onClick={() => setSortByRisk(!sortByRisk)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: sortByRisk ? '#FEF3C7' : '#F3F4F6',
                    border: sortByRisk ? '1px solid #FCD34D' : '1px solid #E5E7EB',
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: sortByRisk ? '#B45309' : '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <TrendingUp size={14} /> {sortByRisk ? "Sorted by Risk Score" : "Sort by Risk"}
                </button>

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

            {/* Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #F3F4F6', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: 'var(--text-secondary)', fontWeight: 800 }}>
                    <th style={{ padding: '0.875rem 1rem' }}>Case Code</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Risk Priority</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Escalation</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Date Submitted</th>
                    <th style={{ padding: '0.875rem 1rem', width: '80px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontWeight: 600 }}>
                        No integrity reports found.
                      </td>
                    </tr>
                  ) : (
                    sortedReports.map(r => {
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '1rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {r.anonymous_case_code}
                            {r.retaliation_risk && <span title="Witness Protection Enabled" style={{ background: '#EF4444', color: '#fff', fontSize: '8px', padding: '2px 5px', borderRadius: 4, fontWeight: 900 }}>WP</span>}
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 600 }}>{r.category}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.625rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: r.risk_level === 'Critical' ? '#FEE2E2' : r.risk_level === 'High' ? '#FFEDD5' : r.risk_level === 'Medium' ? '#FEF3C7' : '#F0FDF4',
                              color: r.risk_level === 'Critical' ? '#991B1B' : r.risk_level === 'High' ? '#9A3412' : r.risk_level === 'Medium' ? '#92400E' : '#166534'
                            }}>
                              {r.risk_level || 'Low'} ({r.risk_score || 0})
                            </span>
                          </td>
                          <td style={{ padding: '1rem', fontWeight: 700, fontSize: '0.75rem', color: '#4B5563' }}>
                            {r.escalation_level || 'Level 1: Integrity Officer'}
                          </td>
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
                            {new Date(r.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
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
                              <Eye size={12} /> Open
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
        </>
      )}

      {/* FOUR-EYES APPROVALS TAB */}
      {subTab === 'approvals' && (
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Four-Eyes Workflows Management</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
            Every sensitive case resolution requires verification and confirmation by a secondary investigator. Requests are detailed below:
          </p>

          <div style={{ overflowX: 'auto', border: '1px solid #F3F4F6', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '0.875rem 1rem' }}>Case Code</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Action Type Required</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Requested By</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Created At</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Authorization</th>
                </tr>
              </thead>
              <tbody>
                {globalApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontWeight: 600 }}>
                      No active approval requests found.
                    </td>
                  </tr>
                ) : (
                  globalApprovals.map((reqItem) => {
                    const isOwnRequest = reqItem.requested_by === currentOfficer?.id;
                    const isPending = reqItem.status === 'Pending';
                    return (
                      <tr key={reqItem.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1rem', fontWeight: 800, fontFamily: 'monospace' }}>{reqItem.anonymous_case_code}</td>
                        <td style={{ padding: '1rem', fontWeight: 700, color: '#1E293B' }}>{reqItem.action_type}</td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{reqItem.requester_name}</td>
                        <td style={{ padding: '1rem', color: '#64748B' }}>
                          {new Date(reqItem.created_at).toLocaleString("en-GB", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: reqItem.status === 'Approved' ? '#D1FAE5' : reqItem.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7',
                            color: reqItem.status === 'Approved' ? '#065F46' : reqItem.status === 'Rejected' ? '#991B1B' : '#92400E'
                          }}>
                            {reqItem.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {isPending && !isAuditor && (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleUpdateApproval(reqItem.id, 'Approved')}
                                disabled={isOwnRequest}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  background: isOwnRequest ? '#E2E8F0' : '#10b981',
                                  color: isOwnRequest ? '#94A3B8' : '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: isOwnRequest ? 'default' : 'pointer'
                                }}
                                title={isOwnRequest ? "You cannot approve your own action" : "Approve action"}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateApproval(reqItem.id, 'Rejected')}
                                disabled={isOwnRequest}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  background: isOwnRequest ? '#E2E8F0' : '#ef4444',
                                  color: isOwnRequest ? '#94A3B8' : '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: isOwnRequest ? 'default' : 'pointer'
                                }}
                                title={isOwnRequest ? "You cannot reject your own action" : "Reject action"}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {!isPending && (
                            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECURITY INCIDENTS TAB */}
      {subTab === 'security' && (
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#991B1B' }}>🚨 Security Incident Monitoring Panel</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
            Real-time tracking of unauthorized access, brute force tracking code lookups, password failures, or abnormal evidence exports:
          </p>

          <div style={{ overflowX: 'auto', border: '1px solid #F3F4F6', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '0.875rem 1rem' }}>Incident Type</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Severity</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Details</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Logged Time</th>
                  <th style={{ padding: '0.875rem 1rem' }}>State</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {securityIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontWeight: 600 }}>
                      No active security incidents detected.
                    </td>
                  </tr>
                ) : (
                  securityIncidents.map((incident) => {
                    const isCritical = incident.severity === 'Critical' || incident.severity === 'High';
                    return (
                      <tr key={incident.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1rem', fontWeight: 800, color: isCritical ? '#991B1B' : '#1E293B' }}>{incident.incident_type}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            background: incident.severity === 'Critical' ? '#FEE2E2' : incident.severity === 'High' ? '#FFEDD5' : incident.severity === 'Medium' ? '#FEF3C7' : '#DBEAFE',
                            color: incident.severity === 'Critical' ? '#991B1B' : incident.severity === 'High' ? '#9A3412' : incident.severity === 'Medium' ? '#92400E' : '#1E40AF'
                          }}>
                            {incident.severity}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, color: '#334155' }} title={JSON.stringify(incident.details)}>
                          {JSON.stringify(incident.details)}
                        </td>
                        <td style={{ padding: '1rem', color: '#64748B' }}>
                          {new Date(incident.created_at).toLocaleString("en-GB", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: incident.resolved ? '#059669' : '#DC2626'
                          }}>
                            {incident.resolved ? "Resolved" : "Unresolved"}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {!incident.resolved && !isAuditor && (
                            <button
                              onClick={() => handleResolveIncident(incident.id)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OVERSIGHT & DR TAB */}
      {subTab === 'oversight' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* DR widget */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1E3A8A' }}>
              <ShieldAlert size={20} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Disaster Recovery Monitor</h3>
            </div>
            
            {drStatus ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', fontSize: '0.8rem' }}>
                <div style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Last Encrypted Backup Time:</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 800, color: '#1E293B' }}>{new Date(drStatus.lastBackupTime).toLocaleString()}</p>
                </div>
                <div style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Standby Backup Status:</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 800, color: '#10B981' }}>● {drStatus.backupStatus} (AES-256 Key Protected)</p>
                </div>
                <div style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Cross-Region Replication:</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 800, color: '#3B82F6' }}>{drStatus.replicationStatus}</p>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Recovery Test Status (RTO &lt; 1h):</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontWeight: 800, color: '#10B981' }}>● {drStatus.verificationStatus} ({drStatus.recoveryTestLogs[0]?.rtoAchieved || "N/A"})</p>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>DR Status metrics loading...</span>
            )}
          </div>

          {/* Governance Reports Export */}
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981' }}>
              <ChevronRight size={20} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Governance Monthly Reports</h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
              Export aggregated integrity data, compliance indices, average case resolutions, and monthly threat statistics:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => downloadGovernanceReport('pdf')}
                style={{
                  padding: '0.625rem 1rem',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#1E293B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <DownloadCloud size={16} color="#DC2626" /> Download Governance Report (PDF)
              </button>
              <button
                onClick={() => downloadGovernanceReport('excel')}
                style={{
                  padding: '0.625rem 1rem',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#1E293B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <DownloadCloud size={16} color="#059669" /> Export Monthly Data (Excel)
              </button>
              <button
                onClick={() => downloadGovernanceReport('csv')}
                style={{
                  padding: '0.625rem 1rem',
                  background: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#1E293B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <DownloadCloud size={16} color="#2F6BFF" /> Export Monthly Data (CSV)
              </button>
            </div>
          </div>

          {/* MFA setup card */}
          {!isAuditor && (
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 16, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1E293B' }}>
                <Key size={20} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Integrity Officer MFA Hardening</h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                Secure your integrity access credentials by binding a Time-based One Time Password (TOTP) authenticator application:
              </p>

              {!mfaSecret ? (
                <button
                  onClick={handleInitializeMfa}
                  disabled={mfaLoading}
                  style={{
                    padding: '0.625rem 1rem',
                    background: '#2F6BFF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Configure Authenticator App
                </button>
              ) : (
                <form onSubmit={handleVerifyMfa} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 8, fontSize: '0.75rem', wordBreak: 'break-all' }}>
                    <span style={{ fontWeight: 800, color: '#475569' }}>Secret Key:</span> <code style={{ fontWeight: 900, fontSize: '0.85rem' }}>{mfaSecret}</code>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#64748B' }}>Add this key to Google Authenticator or Microsoft Authenticator.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="6-digit TOTP code"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      style={{ padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: 8, flex: 1, fontSize: '0.8rem', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      disabled={mfaLoading}
                      style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Verify
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      )}

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
            maxWidth: '680px',
            background: '#fff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 30px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s'
          }}>
            
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
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
                  Object.values(evidenceBlobUrls).forEach(URL.revokeObjectURL);
                  setEvidenceBlobUrls({});
                }}
                style={{ padding: '0.5rem 1rem', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Close Drawer
              </button>
            </div>

            {/* Drawer Sub-tabs switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F8FAFC', padding: '0 1rem', overflowX: 'auto' }}>
              {[
                { id: 'overview', label: '📖 Overview' },
                { id: 'triage', label: '🤖 AI Triage' },
                { id: 'intelligence', label: '🔍 Evidence Intel' },
                { id: 'collaborators', label: '👥 Collaborators' },
                { id: 'approvals', label: '👁️‍🗨️ Approvals' },
                { id: 'evidence', label: '⛓️ Evidence Chain' },
                { id: 'escalations', label: '📈 Escalations' },
                { id: 'chat', label: '💬 Citizen Chat' }
              ].map((tab) => {
                const isCurrent = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setDrawerTab(tab.id as any);
                      if (tab.id === 'intelligence' && selectedReport && !evidenceIntelligence) {
                        loadEvidenceIntelligence(selectedReport.id);
                      }
                    }}
                    style={{
                      padding: '0.75rem 0.5rem',
                      marginRight: '0.75rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: isCurrent ? '2.5px solid #2F6BFF' : '2.5px solid transparent',
                      color: isCurrent ? '#2F6BFF' : '#64748B',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>


            {/* Drawer Body Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* OVERVIEW TAB */}
              {drawerTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Witness Protection warning alert (Feature 6) */}
                  {selectedReport.retaliation_risk && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1rem', borderRadius: 12, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <AlertOctagon size={20} color="#DC2626" />
                      <div style={{ fontSize: '0.75rem', color: '#991B1B', fontWeight: 700 }}>
                        <span style={{ fontWeight: 900 }}>WITNESS PROTECTION LOCKOUT ACTIVATED:</span> Location/Department logs redacted for safety. Evidence exports restricted. Supervisor approval required before modifying assignments.
                      </div>
                    </div>
                  )}

                  {/* Summary Card */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Intake Category</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{selectedReport.category}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Risk priority level</span>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        color: selectedReport.risk_level === 'Critical' ? '#DC2626' : selectedReport.risk_level === 'High' ? '#D97706' : '#2563EB'
                      }}>
                        {selectedReport.risk_level} ({selectedReport.risk_score || 0})
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', display: 'block', textTransform: 'uppercase' }}>Status</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B' }}>{selectedReport.status}</span>
                    </div>
                  </div>

                  {/* Decrypted Description */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', margin: 0 }}>Decrypted Report Description</h4>
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 12, fontSize: '0.8rem', lineHeight: 1.5, color: '#1E293B', whiteSpace: 'pre-wrap' }}>
                      {selectedReport.description}
                    </div>
                  </div>

                  {/* Decrypted Location & Incident Date */}
                  {(selectedReport.location || selectedReport.incident_date) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Incident Location</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.625rem 1rem', borderRadius: 10 }}>
                          {selectedReport.location || "[Redacted / Restricted]"}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>Incident Date</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.625rem 1rem', borderRadius: 10 }}>
                          {selectedReport.incident_date ? new Date(selectedReport.incident_date).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : "Not specified"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Decrypted Evidence & Attachments */}
                  {selectedReport.media_files && selectedReport.media_files.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', margin: 0 }}>Evidence Attachments (Watermarked on download)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedReport.media_files.map(file => {
                          const fileUrl = evidenceBlobUrls[file.id];
                          const isLoaded = !!fileUrl;
                          const isImage = file.mimetype.startsWith("image/");
                          const isAudio = file.mimetype.startsWith("audio/");
                          const isPdf = file.mimetype.startsWith("application/pdf");

                          return (
                            <div key={file.id} style={{ border: '1px solid #E2E8F0', padding: '0.875rem', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#F8FAFC' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <FileText size={16} color="#64748B" />
                                  <div style={{ fontSize: '0.75rem' }}>
                                    <p style={{ fontWeight: 800, margin: 0, color: '#1E293B' }}>{file.filename}</p>
                                    <span style={{ color: '#64748B' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB · {file.mimetype}</span>
                                  </div>
                                </div>

                                {!isLoaded ? (
                                  <button
                                    onClick={() => loadEvidenceFile(selectedReport.id, file.id, file.filename, file.mimetype)}
                                    disabled={loadingEvidenceId === file.id}
                                    style={{
                                      padding: '0.35rem 0.75rem',
                                      background: '#2F6BFF',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 8,
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {loadingEvidenceId === file.id ? <RefreshCw className="animate-spin" size={10} /> : "Decrypt & Stamp"}
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
                                      textDecoration: 'none'
                                    }}
                                  >
                                    Save Stamped
                                  </a>
                                )}
                              </div>

                              {isLoaded && fileUrl && (
                                <div style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '0.5rem', borderRadius: 8 }}>
                                  {isImage && (
                                    <img src={fileUrl} alt="Sanitized Evidence" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: 6, display: 'block', margin: '0 auto' }} />
                                  )}
                                  {isAudio && (
                                    <audio controls src={fileUrl} style={{ width: '100%', display: 'block' }} />
                                  )}
                                  {isPdf && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem', color: '#10b981', fontSize: '0.7rem', fontWeight: 700 }}>
                                      <FileCheck size={14} /> PDF decrypted successfully. Stamped watermark attributes generated.
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

                  {/* Status Progression Updates */}
                  {!isAuditor && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', margin: 0 }}>Progress Status Update</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {TRACKING_STAGES.map(statusOption => {
                          const isSelected = selectedReport.status.toLowerCase() === statusOption.toLowerCase();
                          return (
                            <button
                              key={statusOption}
                              onClick={() => handleUpdateStatus(selectedReport.id, statusOption)}
                              disabled={updatingAction || isSelected}
                              style={{
                                padding: '0.5rem 0.75rem',
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
                  )}

                  {/* Notes & Assignment */}
                  {!isAuditor && (
                    <form onSubmit={handleSaveNotes} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Assigned Lead Officer</label>
                        <input
                          type="text"
                          placeholder="Lead Officer name"
                          value={editingOfficer}
                          onChange={(e) => setEditingOfficer(e.target.value)}
                          style={{ padding: '0.5rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Investigation Notes (Encrypted)</label>
                        <textarea
                          rows={3}
                          placeholder="Record findings..."
                          value={editingNotes}
                          onChange={(e) => setEditingNotes(e.target.value)}
                          style={{ padding: '0.75rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.8rem', outline: 'none', resize: 'none' }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={updatingAction}
                        style={{
                          padding: '0.625rem 1rem',
                          background: '#1A2E5A',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: updatingAction ? 'default' : 'pointer'
                        }}
                      >
                        Save Findings & Assignment
                      </button>
                    </form>
                  )}

                  {/* Audit Trail Timeline */}
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', margin: 0 }}>Investigation History Logs</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedReport.audit_log && selectedReport.audit_log.map((log, index) => (
                        <div key={index} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>{log.action}</p>
                            <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>By: {log.officer}</span>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700 }}>
                            {new Date(log.timestamp).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* COLLABORATORS TAB */}
              {drawerTab === 'collaborators' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: '#334155' }}>Case Assigned Collaborators</h4>

                  {/* Add collaborator form */}
                  {!isAuditor && (
                    <form onSubmit={handleAddCollaborator} style={{ display: 'flex', gap: '0.5rem', background: '#F8FAFC', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                      <select
                        value={newCollaboratorId}
                        onChange={(e) => setNewCollaboratorId(e.target.value)}
                        required
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.8rem', outline: 'none' }}
                      >
                        <option value="">Select Officer to Assign</option>
                        {activeOfficers.map(o => <option key={o.id} value={o.id}>{o.username} ({o.department})</option>)}
                      </select>

                      <select
                        value={newCollaboratorRole}
                        onChange={(e) => setNewCollaboratorRole(e.target.value)}
                        style={{ padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.8rem', outline: 'none' }}
                      >
                        <option value="Lead Investigator">Lead Investigator</option>
                        <option value="Reviewer">Reviewer</option>
                        <option value="Legal Officer">Legal Officer</option>
                        <option value="Auditor">Auditor</option>
                      </select>

                      <button
                        type="submit"
                        style={{ padding: '0.5rem 1rem', background: '#2F6BFF', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Assign
                      </button>
                    </form>
                  )}

                  {/* List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {collaborators.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No secondary investigators assigned. Case restricted to primary owner.</span>
                    ) : (
                      collaborators.map((c) => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: 8 }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B' }}>{c.officer_name}</span>
                            <span style={{ fontSize: '0.7rem', display: 'block', color: '#64748B', fontWeight: 600 }}>Role: {c.role}</span>
                          </div>
                          {!isAuditor && (
                            <button
                              onClick={() => handleRemoveCollaborator(c.id)}
                              style={{ padding: '0.25rem 0.5rem', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* APPROVALS TAB */}
              {drawerTab === 'approvals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: '#334155' }}>Four-Eyes Verification Status</h4>

                  {/* Request approval form */}
                  {!isAuditor && (
                    <form onSubmit={handleCreateApprovalRequest} style={{ display: 'flex', gap: '0.5rem', background: '#F8FAFC', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                      <select
                        value={newApprovalAction}
                        onChange={(e) => setNewApprovalAction(e.target.value)}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.8rem', outline: 'none' }}
                      >
                        <option value="Close Case">Close Case</option>
                        <option value="Archive Case">Archive Case</option>
                        <option value="Delete Evidence">Delete Evidence</option>
                        <option value="Mark Investigation Complete">Mark Investigation Complete</option>
                        <option value="Escalation Reversal">Escalation Reversal</option>
                        {selectedReport.retaliation_risk && <option value="Case Assignment">Case Assignment Approval</option>}
                      </select>

                      <button
                        type="submit"
                        style={{ padding: '0.5rem 1.25rem', background: '#2F6BFF', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Request
                      </button>
                    </form>
                  )}

                  {/* Approvals list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {caseApprovals.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No approvals requested yet for this case.</span>
                    ) : (
                      caseApprovals.map((app) => {
                        const isOwn = app.requested_by === currentOfficer?.id;
                        const isPending = app.status === 'Pending';
                        return (
                          <div key={app.id} style={{ border: '1px solid #E2E8F0', padding: '0.875rem', borderRadius: 8, background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B' }}>{app.action_type}</span>
                              <span style={{ fontSize: '0.65rem', display: 'block', color: '#64748B', fontWeight: 600 }}>Requested By: {app.requester_name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                background: app.status === 'Approved' ? '#D1FAE5' : app.status === 'Rejected' ? '#FEE2E2' : '#FEF3C7',
                                color: app.status === 'Approved' ? '#065F46' : app.status === 'Rejected' ? '#991B1B' : '#92400E'
                              }}>
                                {app.status}
                              </span>

                              {isPending && !isOwn && !isAuditor && (
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button
                                    onClick={() => handleUpdateApproval(app.id, 'Approved')}
                                    style={{ padding: '0.2rem 0.4rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateApproval(app.id, 'Rejected')}
                                    style={{ padding: '0.2rem 0.4rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* EVIDENCE CHAIN TAB */}
              {drawerTab === 'evidence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: '#334155' }}>Evidence Chain of Custody Timeline</h4>

                  <div style={{ position: 'relative', borderLeft: '2px solid #E2E8F0', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', marginLeft: '0.5rem' }}>
                    {evidenceChain.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No evidence operations logged.</span>
                    ) : (
                      evidenceChain.map((item) => (
                        <div key={item.id} style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute',
                            left: '-1.4rem',
                            top: '0.2rem',
                            width: '8px', height: '8px',
                            background: item.action === 'Upload' ? '#10B981' : '#2F6BFF',
                            borderRadius: '50%'
                          }}></span>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B' }}>{item.action} File</span>
                            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>
                              By: {item.performed_by_name || "Citizen Submit"} · {new Date(item.timestamp).toLocaleString()}
                            </p>
                            {item.checksum_before && (
                              <code style={{ fontSize: '8px', color: '#94A3B8', display: 'block', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                                Hash Checksum: {item.checksum_before}
                              </code>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}


              {/* AI TRIAGE TAB */}
              {drawerTab === 'triage' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>🤖</div>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 900, margin: 0, color: '#1E293B' }}>AI Case Triage Analysis</h4>
                      <p style={{ fontSize: '0.65rem', color: '#64748B', margin: 0, fontWeight: 600 }}>Automatically generated fraud indicators and risk assessment</p>
                    </div>
                  </div>

                  {!selectedReport.triage_results ? (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
                      ⏳ AI triage not yet run for this case. Results generate automatically when reports are lodged.
                    </div>
                  ) : (
                    <>
                      {/* AI Priority Badge */}
                      <div style={{
                        background: selectedReport.triage_results.recommendedPriority === 'Critical' ? '#FEF2F2' : selectedReport.triage_results.recommendedPriority === 'High' ? '#FFF7ED' : selectedReport.triage_results.recommendedPriority === 'Medium' ? '#FEFCE8' : '#F0FDF4',
                        border: `1px solid ${selectedReport.triage_results.recommendedPriority === 'Critical' ? '#FCA5A5' : selectedReport.triage_results.recommendedPriority === 'High' ? '#FDBA74' : selectedReport.triage_results.recommendedPriority === 'Medium' ? '#FDE047' : '#86EFAC'}`,
                        borderRadius: 12, padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>AI Recommended Priority</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: selectedReport.triage_results.recommendedPriority === 'Critical' ? '#DC2626' : selectedReport.triage_results.recommendedPriority === 'High' ? '#EA580C' : selectedReport.triage_results.recommendedPriority === 'Medium' ? '#CA8A04' : '#16A34A' }}>
                            {selectedReport.triage_results.recommendedPriority}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>Duplicate Probability</span>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#6366F1' }}>
                            {(selectedReport.triage_results.duplicateProbability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* AI Summary */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>AI Case Summary</h4>
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.875rem', borderRadius: 10, fontSize: '0.8rem', lineHeight: 1.6, color: '#334155', fontStyle: 'italic' }}>
                          "{selectedReport.triage_results.aiSummary}"
                        </div>
                      </div>

                      {/* Fraud Indicators */}
                      {selectedReport.triage_results.fraudIndicators && selectedReport.triage_results.fraudIndicators.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>🚨 Fraud Pattern Indicators ({selectedReport.triage_results.fraudIndicators.length})</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {selectedReport.triage_results.fraudIndicators.map((indicator: string, i: number) => (
                              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.3rem 0.65rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700 }}>
                                ⚠️ {indicator}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Similar Cases */}
                      {selectedReport.triage_results.similarCases && selectedReport.triage_results.similarCases.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>🔗 Linked Similar Cases</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {selectedReport.triage_results.similarCases.map((sim: { id: string; caseCode: string; similarity: number }) => (
                              <div key={sim.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.75rem', color: '#1D4ED8' }}>{sim.caseCode}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3B82F6' }}>{(sim.similarity * 100).toFixed(0)}% match</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Officer note */}
                      <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', padding: '0.75rem', borderRadius: 10, fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
                        ✅ <strong>Officer Discretion:</strong> AI triage findings are advisory only. Final investigation decisions remain with the assigned Integrity Officer.
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* EVIDENCE INTELLIGENCE TAB */}
              {drawerTab === 'intelligence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>🔍</div>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 900, margin: 0, color: '#1E293B' }}>Evidence Intelligence Report</h4>
                        <p style={{ fontSize: '0.65rem', color: '#64748B', margin: 0, fontWeight: 600 }}>Hash deduplication, anomaly detection, and cross-case linking</p>
                      </div>
                    </div>
                    <button
                      onClick={() => selectedReport && loadEvidenceIntelligence(selectedReport.id)}
                      disabled={evidenceIntelligenceLoading}
                      style={{ padding: '0.35rem 0.75rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800, color: '#1D4ED8', cursor: 'pointer' }}
                    >
                      {evidenceIntelligenceLoading ? '⏳ Scanning...' : '🔄 Refresh'}
                    </button>
                  </div>

                  {evidenceIntelligenceLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '0.75rem', color: '#64748B' }}>
                      <RefreshCw className="animate-spin" size={24} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Running evidence scan...</span>
                    </div>
                  ) : !evidenceIntelligence ? (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
                      Click Refresh to run the evidence intelligence scan for this case.
                    </div>
                  ) : (
                    <>
                      {/* File Hash Status Grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Evidence File Hash Analysis</h4>
                        {evidenceIntelligence.fileAnalysis && evidenceIntelligence.fileAnalysis.length > 0 ? (
                          evidenceIntelligence.fileAnalysis.map((file: any, i: number) => (
                            <div key={i} style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: 10, background: '#F8FAFC' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <p style={{ fontSize: '0.75rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>{file.filename}</p>
                                  <code style={{ fontSize: '0.6rem', color: '#94A3B8', display: 'block', marginTop: '0.15rem', wordBreak: 'break-all' }}>SHA-256: {file.hash}</code>
                                </div>
                                <span style={{ padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800, background: file.isDuplicate ? '#FEE2E2' : '#D1FAE5', color: file.isDuplicate ? '#991B1B' : '#065F46' }}>
                                  {file.isDuplicate ? '⚠ Duplicate' : '✓ Unique'}
                                </span>
                              </div>
                              {file.duplicateOf && (
                                <div style={{ marginTop: '0.5rem', background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '0.4rem 0.75rem', borderRadius: 6, fontSize: '0.65rem', color: '#991B1B', fontWeight: 700 }}>
                                  ⚠ Hash match found in case: <span style={{ fontFamily: 'monospace' }}>{file.duplicateOf}</span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '0.875rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                            ✅ No evidence files attached to this report.
                          </div>
                        )}
                      </div>

                      {/* Anomaly Signals */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Anomaly Signals</h4>
                        {evidenceIntelligence.anomalies && evidenceIntelligence.anomalies.length > 0 ? (
                          evidenceIntelligence.anomalies.map((anomaly: any, i: number) => (
                            <div key={i} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.75rem', borderRadius: 10, fontSize: '0.75rem', color: '#92400E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              ⚠️ <span>{anomaly}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '0.875rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                            ✅ No anomalies detected in submission metadata.
                          </div>
                        )}
                      </div>

                      {/* Intelligence Score */}
                      <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: 12, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Integrity Score</span>
                          <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: '0.15rem 0 0 0' }}>
                            {evidenceIntelligence.integrityScore ?? 'N/A'}
                            <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}> / 100</span>
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Scanned Files</span>
                          <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3B82F6', margin: '0.15rem 0 0 0' }}>
                            {evidenceIntelligence.fileAnalysis?.length ?? 0}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ESCALATIONS TAB */}
              {drawerTab === 'escalations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: '#334155' }}>Case Escalation Framework</h4>

                  {/* Escalate form */}
                  {!isAuditor && (
                    <form onSubmit={handleEscalateCase} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#F8FAFC', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          value={newEscalateLevel}
                          onChange={(e) => setNewEscalateLevel(e.target.value)}
                          style={{ flex: 1, padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.8rem', outline: 'none' }}
                        >
                          <option value="Level 2: Regional Integrity Unit">Level 2: Regional Integrity Unit</option>
                          <option value="Level 3: State Vigilance Unit">Level 3: State Vigilance Unit</option>
                          <option value="Level 4: National Oversight Authority">Level 4: National Oversight Authority</option>
                          <option value="Ombudsman Office">Ombudsman Office</option>
                          <option value="Anti-Corruption Bureau">Anti-Corruption Bureau</option>
                          <option value="Vigilance Commission">Vigilance Commission</option>
                          <option value="External Independent Auditor">External Independent Auditor</option>
                        </select>
                        <button
                          type="submit"
                          style={{ padding: '0.5rem 1.25rem', background: '#991B1B', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Escalate
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Provide escalation justification reason"
                        required
                        value={newEscalateReason}
                        onChange={(e) => setNewEscalateReason(e.target.value)}
                        style={{ padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: '0.8rem', outline: 'none' }}
                      />
                    </form>
                  )}

                  {/* Escalation list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {caseEscalations.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No escalation history logs found. Case is handled locally (Level 1).</span>
                    ) : (
                      caseEscalations.map((esc) => (
                        <div key={esc.id} style={{ border: '1px solid #E2E8F0', padding: '0.875rem', borderRadius: 8, background: '#FDF2F2' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991B1B' }}>Escalated to: {esc.escalated_to}</span>
                          <span style={{ fontSize: '0.65rem', display: 'block', color: '#64748B', fontWeight: 600 }}>From Level: {esc.escalated_from} · {new Date(esc.created_at).toLocaleString()}</span>
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>
                            <span style={{ fontWeight: 700 }}>Reason:</span> {esc.reason}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* MESSAGING TIMELINE TAB */}
              {drawerTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 900, margin: 0, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Two-Way Secure Chat (Anonymous Citizen)
                    </h4>
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
                    height: '280px',
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
                  {!isAuditor && (
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
                          padding: '0.5rem 1.25rem',
                          background: '#2F6BFF',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Send
                      </button>
                    </form>
                  )}
                </div>
              )}

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
