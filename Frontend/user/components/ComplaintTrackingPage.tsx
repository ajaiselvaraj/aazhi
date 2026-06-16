// ═══════════════════════════════════════════════════════════════
// ComplaintTrackingPage — PLUG-IN component
// Route: /track/:complaintId
// - Reads existing complaint data via /api/track/:id
// - Live updates via Socket.IO
// - Mobile-first responsive design
// - QR scannable from any phone
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import {
    Shield, Clock, CheckCircle, XCircle, AlertCircle, Wifi, WifiOff,
    RefreshCw, ArrowLeft, Share2, Download, ExternalLink, Loader2,
    MessageSquare, User, Building2, MapPin, Tag, Calendar, Info
} from 'lucide-react';

// ⭐ FIX: Derive backend URL dynamically from the current page's hostname.
// - On kiosk (localhost): resolves to http://localhost:8000
// - On mobile via WiFi (192.168.x.x:3000): resolves to http://192.168.x.x:8000
// - On deployed domain: uses VITE_API_URL env var (set to deployed backend URL)
const _host = window.location.hostname;
const _isLocalNetwork = _host === 'localhost' || /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(_host);
const API_BASE   = import.meta.env.VITE_API_URL    || `http://${_host}:5000`;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : `http://${_host}:5000`);

// ── Types ─────────────────────────────────────────────────────
interface Stage {
    stage: string;
    status: 'current' | 'completed' | 'pending';
    notes?: string;
    updated_at?: string;
}

interface Message {
    text: string;
    sender_type: 'citizen' | 'authority';
    created_at: string;
}

interface CCI {
    detected: boolean;
    cluster_id: string;
    cluster_code: string;
    root_cause: string;
    status: string;
    severity: string;
    locality: string;
    progress: number;
    departments: {
        id: string;
        department_name: string;
        sla_deadline: string;
        completion_status: 'pending' | 'completed';
    }[];
    complaints: {
        ticket_number: string;
        category: string;
        department: string;
        status: string;
        subject?: string;
    }[];
}

interface Complaint {
    id: string;
    ticket_number: string;
    category: string;
    issue_category?: string;
    department?: string;
    subject?: string;
    description: string;
    ward?: string;
    priority: string;
    status: string;
    resolution_note?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    citizen_name?: string;
    type?: string;
    assigned_to_name?: string;
    scheduled_at?: string;
}

interface TrackingData {
    complaint: Complaint;
    stages: Stage[];
    messages: Message[];
    cci?: CCI;
}
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending:     { label: 'Pending',     color: '#d97706', bg: '#fef3c7', icon: <Clock size={18} /> },
    submitted:   { label: 'Submitted',   color: '#2563eb', bg: '#dbeafe', icon: <CheckCircle size={18} /> },
    assigned:    { label: 'Assigned',    color: '#7c3aed', bg: '#ede9fe', icon: <User size={18} /> },
    in_progress: { label: 'In Progress', color: '#0891b2', bg: '#cffafe', icon: <RefreshCw size={18} /> },
    on_hold:     { label: 'On Hold',     color: '#ea580c', bg: '#ffedd5', icon: <Clock size={18} /> },
    completed:   { label: 'Completed',   color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle size={18} /> },
    resolved:    { label: 'Resolved',    color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle size={18} /> },
    closed:      { label: 'Closed',      color: '#64748b', bg: '#f1f5f9', icon: <CheckCircle size={18} /> },
    cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={18} /> },
    rejected:    { label: 'Rejected',    color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={18} /> },
};

const getStatusCfg = (s: string) =>
    STATUS_CONFIG[s?.toLowerCase()] ?? { label: s, color: '#64748b', bg: '#f1f5f9', icon: <Info size={18} /> };

const fmt = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const priorityColor: Record<string, string> = {
    low: '#16a34a', medium: '#d97706', high: '#dc2626', critical: '#9f1239',
};

import { useParams } from 'react-router-dom';

// ── Main Component ─────────────────────────────────────────────
const ComplaintTrackingPage: React.FC = () => {
    const { complaintId } = useParams();
    const [data, setData] = useState<TrackingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [connected, setConnected] = useState(false);
    const [liveFlash, setLiveFlash] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const isService = /^SRQ-/i.test(complaintId || "") || /^TKT-/i.test(complaintId || "") || (data?.complaint && (data.complaint as any).type === 'service_request') || false;

    // ── Fetch complaint data ───────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await fetch(`${API_BASE}/api/track/${encodeURIComponent(complaintId || '')}`);
            const json = await res.json();
            if (!res.ok || !json.success) {
                setError(json.message || 'Tracking ID not found.');
                return;
            }
            setData(json.data);
        } catch {
            setError('Unable to reach the server. Please check your connection.');
        } finally {
            setData(prev => {
                if (prev && !prev.complaint?.type) {
                    const isServiceReq = /^SRQ-/i.test(complaintId || "") || /^TKT-/i.test(complaintId || "");
                    if (isServiceReq) {
                        return {
                            ...prev,
                            complaint: {
                                ...prev.complaint,
                                type: 'service_request'
                            }
                        };
                    }
                }
                return prev;
            });
            setLoading(false);
        }
    }, [complaintId]);

    // ── Socket.IO real-time ────────────────────────────────────
    useEffect(() => {
        fetchData();

        const socket = socketIO(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('track:join', complaintId || '');
        });
        socket.on('disconnect', () => setConnected(false));

        socket.on('complaint:statusUpdated', (payload: any) => {
            setLiveFlash(true);
            setTimeout(() => setLiveFlash(false), 2000);
            setData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    complaint: {
                        ...prev.complaint,
                        status: payload.newStatus,
                        updated_at: payload.updatedAt || prev.complaint.updated_at,
                        resolution_note: payload.resolutionNote || prev.complaint.resolution_note,
                        rejection_reason: payload.rejectionReason || prev.complaint.rejection_reason,
                        assigned_to_name: payload.assignedToName || (prev.complaint as any).assigned_to_name,
                        scheduled_at: payload.scheduledAt || (prev.complaint as any).scheduled_at,
                    },
                };
            });
            // also do a full re-fetch to get fresh stages
            fetchData();
        });

        socket.on('complaint:timelineUpdated', () => fetchData());

        return () => {
            socket.emit('track:leave', complaintId || '');
            socket.disconnect();
        };
    }, [complaintId, fetchData]);

    // ── Share / copy link ─────────────────────────────────────
    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: isService ? 'Track My Service Request' : 'Track My Complaint', url });
        } else {
            await navigator.clipboard.writeText(url);
            alert('Tracking link copied to clipboard!');
        }
    };

    // ── Hierarchy step order ──────────────────────────────────
    const orderedStages = (stages: Stage[]) => {
        const STAGE_ORDER = isService 
            ? ['pending', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled']
            : ['pending', 'submitted', 'assigned', 'in_progress', 'resolved', 'closed'];

        const seen = new Set<string>();
        const result: Stage[] = [];
        STAGE_ORDER.forEach(key => {
            const found = stages.find(s => s.stage === key);
            if (found && !seen.has(key)) { result.push(found); seen.add(key); }
        });
        // append any stages not in STAGE_ORDER
        stages.forEach(s => { if (!seen.has(s.stage)) { result.push(s); seen.add(s.stage); } });
        return result;
    };

    // ════════════════════════════════════════════════════════════
    // Render states
    // ════════════════════════════════════════════════════════════
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f4ff' }}>
            <div style={{ textAlign: 'center' }}>
                <Loader2 size={48} style={{ color: '#2563eb', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b', fontWeight: 700, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Loading tracking data…
                </p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f0f4ff' }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
                <XCircle size={48} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
                <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: '#1e293b' }}>Not Found</h2>
                <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>{error}</p>
                <button onClick={fetchData} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                    Try Again
                </button>
            </div>
        </div>
    );

    if (!data) return null;

    const { complaint, stages, messages } = data;
    const statusCfg = getStatusCfg(complaint.status);
    const stageList = orderedStages(stages);

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4ff', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b' }}>

            {/* ── Header ─────────────────────────────────── */}
            <header style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)', color: '#fff', padding: '28px 20px 80px', borderRadius: '0 0 2.5rem 2.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, maxWidth: 600, margin: '0 auto 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.5px' }}>SUVIDHA MOBILE</div>
                            <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                {isService ? 'Service Tracker' : 'Complaint Tracker'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Live badge */}
                        <div style={{
                            background: connected ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
                            border: `1px solid ${connected ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                            borderRadius: 20, padding: '4px 10px',
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'all 0.3s',
                        }}>
                            {connected ? <Wifi size={12} style={{ color: '#4ade80' }} /> : <WifiOff size={12} style={{ color: '#f87171' }} />}
                            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: connected ? '#4ade80' : '#f87171' }}>
                                {connected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                        <button onClick={handleShare} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#fff' }}>
                            <Share2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Reference number */}
                <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', opacity: 0.7, textTransform: 'uppercase', marginBottom: 4 }}>Reference Number</div>
                    <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>{complaint.ticket_number}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Submitted {fmt(complaint.created_at)}</div>
                </div>

                {/* Live flash overlay */}
                {liveFlash && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(74,222,128,0.15)', borderRadius: '0 0 2.5rem 2.5rem', animation: 'pulse 0.5s ease', pointerEvents: 'none' }} />
                )}
            </header>

            {/* ── Main card area ─────────────────────────── */}
            <main style={{ padding: '0 16px 40px', marginTop: -48, maxWidth: 640, margin: '-48px auto 0' }}>

                {data.cci?.detected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
                        {/* Area Recovery Title Card */}
                        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', border: '2px solid #dbeafe' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#2563eb', background: '#dbeafe', borderRadius: 20, padding: '4px 10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        Area Recovery Event
                                    </span>
                                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1e3a8a', marginTop: 8 }}>
                                        {data.cci.root_cause}
                                    </h2>
                                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
                                        Cluster ID: <span style={{ color: '#1e293b', fontWeight: 700 }}>{data.cci.cluster_code}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: 600 }}>
                                        Locality: <span style={{ color: '#1e293b', fontWeight: 700 }}>{data.cci.locality || 'Ward 12'}</span>
                                    </div>
                                </div>
                                <div style={{ background: data.cci.severity === 'critical' ? '#fee2e2' : '#fef3c7', borderRadius: 16, padding: '6px 14px' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: data.cci.severity === 'critical' ? '#dc2626' : '#d97706', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {data.cci.severity} Severity
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ background: '#f8fafc', borderRadius: 20, padding: '16px 20px', marginTop: 20, border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>Recovery Progress</span>
                                    <span style={{ fontSize: 16, fontWeight: 900, color: '#2563eb' }}>{data.cci.progress}%</span>
                                </div>
                                <div style={{ height: 10, width: '100%', background: '#cbd5e1', borderRadius: 5, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${data.cci.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #10b981)', borderRadius: 5, transition: 'width 1s ease-in-out' }} />
                                </div>
                            </div>
                        </div>

                        {/* Coordinated Departments SLA Checklist */}
                        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
                            <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#1e3a8a' }}>
                                <Building2 size={18} style={{ color: '#2563eb' }} /> Coordinated Work Checklist
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {data.cci.departments.map((dept, index) => {
                                    const isCompleted = dept.completion_status === 'completed';
                                    return (
                                        <div key={index} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: isCompleted ? '#f0fdf4' : '#f8fafc',
                                            borderRadius: 16, padding: '14px 18px',
                                            border: `1px solid ${isCompleted ? '#bbf7d0' : '#e2e8f0'}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 24, height: 24, borderRadius: 6,
                                                    background: isCompleted ? '#16a34a' : '#cbd5e1',
                                                    color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 900, fontSize: 12
                                                }}>
                                                    {isCompleted ? '✓' : ' '}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 800, color: isCompleted ? '#166534' : '#1e293b' }}>
                                                        {dept.department_name} Coordinated Recovery
                                                    </div>
                                                    {!isCompleted && (
                                                        <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 600, marginTop: 2 }}>
                                                            Coordinated SLA: {new Date(dept.sla_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: 10, fontWeight: 800,
                                                color: isCompleted ? '#16a34a' : '#64748b',
                                                background: isCompleted ? '#dcfce7' : '#f1f5f9',
                                                padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em'
                                            }}>
                                                {isCompleted ? 'Completed' : 'Coordinated'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Neighboring Issues */}
                        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
                            <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#1e3a8a' }}>
                                <MapPin size={18} style={{ color: '#2563eb' }} /> Clustered Area Tickets ({data.cci.complaints.length})
                            </h3>
                            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                                The following local grievances have been mapped to this recovery event. They are scheduled for repair in a single deployment to prevent duplicate field visits.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                                {data.cci.complaints.map((comp, idx) => {
                                    const isThisTicket = comp.ticket_number === complaint.ticket_number;
                                    return (
                                        <div key={idx} style={{
                                            background: isThisTicket ? '#eff6ff' : '#f8fafc',
                                            border: `1px solid ${isThisTicket ? '#bfdbfe' : '#e2e8f0'}`,
                                            borderRadius: 14, padding: '12px 16px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{comp.ticket_number}</span>
                                                    {isThisTicket && (
                                                        <span style={{ fontSize: 9, fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: 4 }}>
                                                            Your Ticket
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                                    {comp.subject || comp.category} ({comp.department})
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: 10, fontWeight: 800,
                                                color: comp.status === 'resolved' || comp.status === 'closed' ? '#16a34a' : '#d97706',
                                                textTransform: 'uppercase'
                                            }}>
                                                {comp.status}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Status Card */}
                        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', marginBottom: 20, border: `2px solid ${statusCfg.bg}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Current Status</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ background: statusCfg.bg, color: statusCfg.color, borderRadius: 10, padding: 8 }}>{statusCfg.icon}</div>
                                        <span style={{ fontSize: 26, fontWeight: 900, color: statusCfg.color }}>{statusCfg.label}</span>
                                    </div>
                                </div>
                                <div style={{ background: statusCfg.bg, borderRadius: 16, padding: '6px 14px' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: statusCfg.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {complaint.priority}
                                    </span>
                                </div>
                            </div>

                            {/* Meta grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                    { icon: <Tag size={13} />, label: 'Category', value: complaint.category },
                                    { icon: <Building2 size={13} />, label: 'Department', value: complaint.department || '—' },
                                    ...(isService && (complaint as any).assigned_to_name ? [{ icon: <User size={13} />, label: 'Assigned Technician', value: (complaint as any).assigned_to_name }] : []),
                                    ...(isService && (complaint as any).scheduled_at ? [{ icon: <Calendar size={13} />, label: 'Scheduled Date & Time', value: fmt((complaint as any).scheduled_at) }] : []),
                                    { icon: <MapPin size={13} />, label: 'Ward', value: complaint.ward || '—' },
                                    { icon: <Calendar size={13} />, label: 'Last Updated', value: fmt(complaint.updated_at) },
                                ].map(({ icon, label, value }) => (
                                    <div key={label} style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', marginBottom: 4 }}>{icon}<span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</span></div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Subject */}
                            {complaint.subject && (
                                <div style={{ marginTop: 14, padding: '12px 16px', background: '#f8fafc', borderRadius: 12 }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Subject</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{complaint.subject}</div>
                                </div>
                            )}

                            {/* Resolution / rejection note */}
                            {complaint.resolution_note && (
                                <div style={{ marginTop: 14, padding: '14px 16px', background: '#f0fdf4', borderRadius: 12, borderLeft: '4px solid #16a34a' }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Resolution Note</div>
                                    <div style={{ fontSize: 13, color: '#166534' }}>{complaint.resolution_note}</div>
                                </div>
                            )}
                            {complaint.rejection_reason && (
                                <div style={{ marginTop: 14, padding: '14px 16px', background: '#fef2f2', borderRadius: 12, borderLeft: '4px solid #dc2626' }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Rejection Reason</div>
                                    <div style={{ fontSize: 13, color: '#991b1b' }}>{complaint.rejection_reason}</div>
                                </div>
                            )}
                        </div>

                        {/* Timeline Card */}
                        <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', marginBottom: 20 }}>
                            <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={18} style={{ color: '#2563eb' }} /> {isService ? 'Service Timeline' : 'Complaint Timeline'}
                            </h3>
                            <div style={{ position: 'relative' }}>
                                {/* Vertical line */}
                                <div style={{ position: 'absolute', left: 19, top: 10, bottom: 20, width: 2, background: '#e2e8f0', borderRadius: 4 }} />

                                {stageList.map((stage, idx) => {
                                    const cfg = getStatusCfg(stage.stage);
                                    const isDone = stage.status === 'completed';
                                    const isCurrent = stage.status === 'current';
                                    return (
                                        <div key={idx} style={{ display: 'flex', gap: 16, paddingBottom: 24, position: 'relative' }}>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 12, flexShrink: 0, zIndex: 1,
                                                background: isDone ? '#dcfce7' : isCurrent ? cfg.bg : '#f1f5f9',
                                                color: isDone ? '#16a34a' : isCurrent ? cfg.color : '#cbd5e1',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: isCurrent ? `2px solid ${cfg.color}` : '2px solid transparent',
                                                boxShadow: isCurrent ? `0 0 0 4px ${cfg.bg}` : 'none',
                                                transition: 'all 0.3s',
                                            }}>
                                                {isDone ? <CheckCircle size={18} /> : cfg.icon}
                                            </div>
                                            <div style={{ flex: 1, paddingTop: 8 }}>
                                                <div style={{ fontWeight: 800, fontSize: 14, color: isDone || isCurrent ? '#1e293b' : '#94a3b8', textTransform: 'capitalize' }}>
                                                    {stage.stage.replace(/_/g, ' ')}
                                                    {isCurrent && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 20 }}>CURRENT</span>}
                                                </div>
                                                {stage.updated_at && (
                                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{fmt(stage.updated_at)}</div>
                                                )}
                                                {stage.notes && (
                                                    <div style={{ fontSize: 12, color: '#475569', marginTop: 6, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>{stage.notes}</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Messages */}
                {messages.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', marginBottom: 20 }}>
                        <h3 style={{ fontWeight: 900, fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MessageSquare size={18} style={{ color: '#2563eb' }} /> Updates &amp; Messages
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {messages.map((msg, idx) => (
                                <div key={idx} style={{
                                    padding: '12px 16px',
                                    borderRadius: 14,
                                    background: msg.sender_type === 'authority' ? '#eff6ff' : '#f8fafc',
                                    borderLeft: `4px solid ${msg.sender_type === 'authority' ? '#2563eb' : '#94a3b8'}`,
                                }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: msg.sender_type === 'authority' ? '#2563eb' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
                                        {msg.sender_type === 'authority' ? '🏛️ Authority' : '👤 Citizen'}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>{msg.text}</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>{fmt(msg.created_at)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Refresh button */}
                <button
                    onClick={fetchData}
                    style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 16, padding: '16px 0', fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(37,99,235,0.3)', transition: 'all 0.2s', marginBottom: 16 }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                    <RefreshCw size={18} /> Refresh Status
                </button>

                {/* Branding footer */}
                <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 8 }}>
                    Digital India Initiative • SUVIDHA / AAZHI Platform
                </p>
            </main>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
                * { box-sizing: border-box; margin: 0; padding: 0; }
            `}</style>
        </div>
    );
};

export default ComplaintTrackingPage;
