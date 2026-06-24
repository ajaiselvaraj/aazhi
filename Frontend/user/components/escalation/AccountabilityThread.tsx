// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Accountability Thread Component
// Shows responsible officer card + full escalation timeline
// Read-only for citizens — purely additive
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { User, ArrowUpCircle, FileText, Building2, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EscalationEvent {
    event: string;
    officer_name?: string;
    officer_title?: string;
    timestamp: string;
    level?: number;
    reason?: string;
    triggered_by?: string;
    icon: string;
}

interface EscalationData {
    sla: any;
    escalation_history: any[];
    escalation_requests: any[];
    current_officer: { name: string; title: string } | null;
    accountability_timeline: EscalationEvent[];
}

interface Props {
    complaintId: string;
    apiBase: string;
    token?: string;
}

const LEVEL_COLORS = [
    '#2563eb', // Level 1 - blue
    '#7c3aed', // Level 2 - purple
    '#ea580c', // Level 3 - orange
    '#dc2626', // Level 4 - red
];

function fmtDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const AccountabilityThread: React.FC<Props> = ({ complaintId, apiBase, token }) => {
    const { t } = useTranslation();
    const [data, setData] = useState<EscalationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${apiBase}/api/complaints/${complaintId}/escalations`, { headers });
                if (!res.ok) return;
                const json = await res.json();
                if (json.success) setData(json.data);
            } catch { /* non-critical */ } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [complaintId]);

    if (loading || !data) return null;

    const { current_officer, accountability_timeline, escalation_history } = data;
    const hasEscalation = escalation_history.length > 0;

    return (
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', marginBottom: 20, overflow: 'hidden' }}>

            {/* Section header */}
            <div
                style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '18px 24px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                    background: hasEscalation ? 'linear-gradient(135deg, #fff7ed, #fef3c7)' : '#fff',
                }}
                onClick={() => setExpanded(e => !e)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: hasEscalation ? '#fed7aa' : '#dbeafe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Shield size={18} style={{ color: hasEscalation ? '#ea580c' : '#2563eb' }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b' }}>
                            {t('accountabilityEscalation') || 'Accountability & Escalation'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
                            {hasEscalation ? `${escalation_history.length} escalation(s) on record` : 'No escalations yet'}
                        </div>
                    </div>
                </div>
                {expanded ? <ChevronUp size={18} style={{ color: '#94a3b8' }} /> : <ChevronDown size={18} style={{ color: '#94a3b8' }} />}
            </div>

            {expanded && (
                <div style={{ padding: '20px 24px' }}>

                    {/* Responsible Officer Card */}
                    {current_officer ? (
                        <div style={{
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
                            borderRadius: 16, padding: '16px 20px', marginBottom: 20,
                            display: 'flex', alignItems: 'center', gap: 14,
                        }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <User size={24} style={{ color: '#fff' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 3 }}>
                                    {t('currentResponsibleOfficer') || 'Current Responsible Officer'}
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 17, color: '#fff' }}>
                                    {current_officer.name || t('officerAssigned') || 'Officer Assigned'}
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginTop: 2 }}>
                                    <Building2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                                    {current_officer.title}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            background: '#f8fafc', borderRadius: 14, padding: '14px 18px',
                            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                            border: '1px dashed #cbd5e1',
                        }}>
                            <User size={18} style={{ color: '#94a3b8' }} />
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{t('noOfficerAssigned') || 'No officer currently assigned'}</span>
                        </div>
                    )}

                    {/* Timeline */}
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                        {t('escalationTimeline') || 'Escalation Timeline'}
                    </div>

                    <div style={{ position: 'relative' }}>
                        {/* Vertical connector line */}
                        {accountability_timeline.length > 1 && (
                            <div style={{
                                position: 'absolute', left: 17, top: 18, bottom: 8,
                                width: 2, background: 'linear-gradient(to bottom, #dbeafe, #e2e8f0)', borderRadius: 4
                            }} />
                        )}

                        {accountability_timeline.map((event, idx) => {
                            const isEscalation = event.icon === 'arrow-up-circle';
                            const level = event.level || 0;
                            const dotColor = isEscalation ? (LEVEL_COLORS[level - 1] || '#dc2626') : '#2563eb';

                            return (
                                <div key={idx} style={{ display: 'flex', gap: 14, paddingBottom: idx < accountability_timeline.length - 1 ? 20 : 0, position: 'relative' }}>
                                    {/* Icon dot */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10, flexShrink: 0, zIndex: 1,
                                        background: isEscalation ? `${dotColor}18` : '#eff6ff',
                                        border: `2px solid ${isEscalation ? dotColor : '#bfdbfe'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {isEscalation
                                            ? <ArrowUpCircle size={16} style={{ color: dotColor }} />
                                            : <FileText size={16} style={{ color: '#2563eb' }} />
                                        }
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, paddingTop: 6 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>
                                            {event.event === 'Complaint Created' ? (t('complaintCreated') || 'Complaint Created') :
                                             event.event === 'Escalated to Field Officer' ? (t('escalatedFieldOfficer') || 'Escalated to Field Officer') :
                                             event.event === 'Escalated to Ward Commissioner' ? (t('escalatedWardCommissioner') || 'Escalated to Ward Commissioner') :
                                             event.event === 'Escalated to Municipal Commissioner' ? (t('escalatedMunicipalCommissioner') || 'Escalated to Municipal Commissioner') :
                                             event.event === 'Escalated to District Collector' ? (t('escalatedDistrictCollector') || 'Escalated to District Collector') :
                                             event.event}
                                        </div>
                                        {event.officer_name && (
                                            <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginTop: 2 }}>
                                                👤 {event.officer_name}
                                            </div>
                                        )}
                                        {event.reason && (
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, padding: '6px 10px', background: '#f8fafc', borderRadius: 8, fontStyle: 'italic' }}>
                                                {event.reason}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 3 }}>
                                            {fmtDate(event.timestamp)}
                                            {event.triggered_by === 'automatic' && (
                                                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                                                    Auto
                                                </span>
                                            )}
                                            {event.triggered_by === 'citizen_request' && (
                                                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, background: '#fef9c3', color: '#854d0e', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                                                    Citizen Request
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty state */}
                    {accountability_timeline.length <= 1 && (
                        <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
                            {t('noEscalationsOccurred') || 'No escalations have occurred. Your complaint is being handled normally.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountabilityThread;
