// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: SLA Countdown Widget
// Displays SLA deadline, color-coded urgency, AI risk badge
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldCheck, Flame, Zap } from 'lucide-react';

interface SLAData {
    sla_deadline: string;
    is_breached: boolean;
    breached_at?: string;
    time_remaining_ms: number;
    time_breached_ms: number;
    percent_elapsed: number;
    color_state: 'green' | 'yellow' | 'orange' | 'red';
    sla_hours: number;
    current_escalation_level: number;
    current_officer: { name: string; title: string } | null;
    ai_risk_badge: string | null;
}

interface Props {
    complaintId: string;
    apiBase: string;
    token?: string;
}

const COLOR_MAP = {
    green:  { bg: '#f0fdf4', border: '#86efac', text: '#15803d', track: '#dcfce7', fill: '#22c55e', label: 'On Track'   },
    yellow: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', track: '#fef9c3', fill: '#eab308', label: 'Nearing SLA' },
    orange: { bg: '#fff7ed', border: '#fb923c', text: '#c2410c', track: '#ffedd5', fill: '#f97316', label: '< 24 Hours'  },
    red:    { bg: '#fef2f2', border: '#f87171', text: '#991b1b', track: '#fee2e2', fill: '#ef4444', label: 'SLA Breached' },
};

function formatDuration(ms: number | null | undefined): string | null {
    if (ms == null) return null;
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const days    = Math.floor(totalSeconds / 86400);
    const hours   = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

const SLACountdownWidget: React.FC<Props> = ({ complaintId, apiBase, token }) => {
    const [sla, setSla] = useState<SLAData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchSLA = async () => {
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${apiBase}/api/complaints/${complaintId}/sla`, { headers });
            if (!res.ok) throw new Error('SLA fetch failed');
            const json = await res.json();
            if (json.success) setSla(json.data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSLA();
        // Refresh every 60 seconds
        const interval = setInterval(fetchSLA, 60_000);
        return () => clearInterval(interval);
    }, [complaintId]);

    if (loading) return (
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: '20px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading SLA data…
        </div>
    );

    if (error) return (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: 16, padding: '20px 24px', textAlign: 'center', color: '#991b1b', fontSize: 13 }}>
            Unable to load SLA countdown data.
        </div>
    );

    if (!sla) return null;

    const colors = COLOR_MAP[sla.color_state] || COLOR_MAP.green;
    const progressWidth = Math.min(100, sla.percent_elapsed);
    const isBreached = sla.is_breached;

    return (
        <div style={{
            background: colors.bg,
            border: `2px solid ${colors.border}`,
            borderRadius: 20,
            padding: '20px 22px',
            marginBottom: 16,
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sla.color_state === 'red'    ? <Flame size={18} style={{ color: colors.text }} /> :
                     sla.color_state === 'orange' ? <AlertTriangle size={18} style={{ color: colors.text }} /> :
                     sla.color_state === 'yellow' ? <Clock size={18} style={{ color: colors.text }} /> :
                                                    <ShieldCheck size={18} style={{ color: colors.text }} />}
                    <span style={{ fontWeight: 800, fontSize: 14, color: colors.text }}>
                        SLA {isBreached ? 'Breached' : 'Countdown'}
                    </span>
                </div>
                <span style={{
                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: colors.border, color: colors.text, padding: '3px 10px', borderRadius: 20
                }}>
                    {colors.label}
                </span>
            </div>

            {/* Main timer display */}
            <div style={{ marginBottom: 14 }}>
                {isBreached ? (
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                            SLA Breached By
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#dc2626', lineHeight: 1, letterSpacing: '-1px' }}>
                            {formatDuration(sla.time_breached_ms)}
                        </div>
                        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, fontWeight: 600 }}>
                            Deadline was: {new Date(sla.sla_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                            SLA Expires In
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: colors.text, lineHeight: 1, letterSpacing: '-1px' }}>
                            {formatDuration(sla.time_remaining_ms)}
                        </div>
                        <div style={{ fontSize: 11, color: colors.text, marginTop: 4, fontWeight: 600, opacity: 0.8 }}>
                            Deadline: {new Date(sla.sla_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: colors.text, opacity: 0.8 }}>Elapsed</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: colors.text }}>{progressWidth}%</span>
                </div>
                <div style={{ height: 8, background: colors.track, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${progressWidth}%`,
                        background: isBreached
                            ? 'repeating-linear-gradient(45deg, #ef4444, #ef4444 8px, #dc2626 8px, #dc2626 16px)'
                            : `linear-gradient(90deg, ${colors.fill}, ${sla.color_state === 'green' ? '#4ade80' : colors.fill})`,
                        borderRadius: 99,
                        transition: 'width 0.5s ease',
                        animation: isBreached ? 'breachedPulse 1.5s ease-in-out infinite' : 'none',
                    }} />
                </div>
            </div>

            {/* AI Risk Badge */}
            {sla.ai_risk_badge && (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: sla.ai_risk_badge.includes('High') ? '#fef2f2' : '#fff7ed',
                    border: `1px solid ${sla.ai_risk_badge.includes('High') ? '#fca5a5' : '#fdba74'}`,
                    borderRadius: 20, padding: '4px 12px', marginBottom: 10,
                }}>
                    <Zap size={11} style={{ color: sla.ai_risk_badge.includes('High') ? '#dc2626' : '#ea580c' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: sla.ai_risk_badge.includes('High') ? '#dc2626' : '#ea580c' }}>
                        🤖 {sla.ai_risk_badge}
                    </span>
                </div>
            )}

            {/* Escalation level info */}
            {sla.current_escalation_level > 0 && (
                <div style={{ fontSize: 12, color: colors.text, fontWeight: 600, opacity: 0.85 }}>
                    📊 Escalation Level: {sla.current_escalation_level}
                    {sla.current_officer && ` · ${sla.current_officer.title}`}
                </div>
            )}

            {/* CSS for breached animation */}
            <style>{`
                @keyframes breachedPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
};

export default SLACountdownWidget;
