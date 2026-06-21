// ═══════════════════════════════════════════════════════════════
// ⭐ ADD-ON: Request Escalation Button
// Citizen can request manual escalation — pending admin approval
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, X, Send, CheckCircle, Loader2 } from 'lucide-react';

const PRESET_REASONS = [
    'Road completely blocked — emergency access at risk',
    'Public safety risk — requires immediate attention',
    'Water leakage worsening — structural damage likely',
    'No officer action in 7+ days — SLA nearing breach',
    'Issue causing health hazard to residents',
    'Previous resolution was inadequate — issue recurred',
    'Affecting multiple households in the ward',
];

interface Props {
    complaintId: string;
    apiBase: string;
    token?: string;
    complaintStatus: string;
}

const RequestEscalationButton: React.FC<Props> = ({ complaintId, apiBase, token, complaintStatus }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Hide for terminal statuses
    const terminalStatuses = ['resolved', 'closed', 'rejected'];
    if (terminalStatuses.includes(complaintStatus)) return null;

    const handlePresetSelect = (preset: string) => {
        setSelectedPreset(preset);
        setReason(preset);
    };

    const handleSubmit = async () => {
        if (!reason.trim() || reason.trim().length < 5) {
            setError('Please provide a reason for escalation.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`${apiBase}/api/complaints/${complaintId}/request-escalation`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason: reason.trim() }),
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.message || 'Failed to submit escalation request.');

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setModalOpen(false);
        setReason('');
        setSelectedPreset('');
        setError(null);
        if (!success) setSuccess(false);
    };

    return (
        <>
            {/* Trigger Button */}
            <div style={{ marginBottom: 20 }}>
                <button
                    id="request-escalation-btn"
                    onClick={() => setModalOpen(true)}
                    style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #ea580c, #dc2626)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 16,
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        boxShadow: '0 4px 16px rgba(234,88,12,0.35)',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                    <AlertTriangle size={18} />
                    Request Escalation
                </button>
                <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 6, fontWeight: 500 }}>
                    Your request will be reviewed by a senior officer
                </p>
            </div>

            {/* Modal Overlay */}
            {modalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(15,28,46,0.7)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                    zIndex: 9999, backdropFilter: 'blur(4px)', padding: '0 0 0',
                }}
                    onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
                >
                    <div style={{
                        background: '#fff', width: '100%', maxWidth: 600,
                        borderRadius: '24px 24px 0 0',
                        padding: '24px 24px 40px',
                        maxHeight: '90vh', overflowY: 'auto',
                        animation: 'slideUp 0.3s ease',
                    }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertTriangle size={20} style={{ color: '#dc2626' }} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 17, color: '#1e293b' }}>Request Escalation</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Pending Admin Approval</div>
                                </div>
                            </div>
                            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                                <X size={20} />
                            </button>
                        </div>

                        {success ? (
                            /* Success State */
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f0fdf4', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={32} style={{ color: '#16a34a' }} />
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 18, color: '#166534', marginBottom: 8 }}>Request Submitted!</div>
                                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                                    Your escalation request is now <strong>Pending Admin Review</strong>.<br />
                                    You will be notified once it is approved or rejected.
                                </p>
                                <button
                                    onClick={handleClose}
                                    style={{ marginTop: 20, padding: '12px 32px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Info note */}
                                <div style={{ background: '#fef9c3', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 8 }}>
                                    <AlertTriangle size={14} style={{ color: '#854d0e', flexShrink: 0, marginTop: 1 }} />
                                    <p style={{ fontSize: 12, color: '#854d0e', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                                        Escalation requests are reviewed by senior officers. False or frivolous requests may be rejected.
                                    </p>
                                </div>

                                {/* Preset reasons */}
                                <div style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                                        Common Reasons
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {PRESET_REASONS.map(preset => (
                                            <button
                                                key={preset}
                                                onClick={() => handlePresetSelect(preset)}
                                                style={{
                                                    padding: '10px 14px', textAlign: 'left', borderRadius: 10,
                                                    border: `1.5px solid ${selectedPreset === preset ? '#dc2626' : '#e2e8f0'}`,
                                                    background: selectedPreset === preset ? '#fef2f2' : '#f8fafc',
                                                    color: selectedPreset === preset ? '#dc2626' : '#475569',
                                                    fontWeight: selectedPreset === preset ? 700 : 500,
                                                    fontSize: 13, cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom reason textarea */}
                                <div style={{ marginBottom: 18 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                                        Describe Your Reason
                                    </div>
                                    <textarea
                                        id="escalation-reason-textarea"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="Describe why this complaint needs urgent escalation…"
                                        rows={4}
                                        style={{
                                            width: '100%', padding: '12px 14px',
                                            border: '1.5px solid #e2e8f0', borderRadius: 12,
                                            fontSize: 14, fontFamily: 'inherit',
                                            color: '#1e293b', resize: 'vertical',
                                            outline: 'none', lineHeight: 1.5,
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={e => (e.target.style.borderColor = '#2563eb')}
                                        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                    />
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>{reason.length}/500</div>
                                </div>

                                {error && (
                                    <div style={{ background: '#fef2f2', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                                        <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>⚠️ {error}</span>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    id="submit-escalation-btn"
                                    onClick={handleSubmit}
                                    disabled={submitting || !reason.trim()}
                                    style={{
                                        width: '100%', padding: '15px',
                                        background: submitting || !reason.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #ea580c, #dc2626)',
                                        color: submitting || !reason.trim() ? '#94a3b8' : '#fff',
                                        border: 'none', borderRadius: 14,
                                        fontWeight: 800, fontSize: 15, cursor: submitting || !reason.trim() ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                                    {submitting ? 'Submitting…' : 'Submit Escalation Request'}
                                </button>
                            </>
                        )}
                    </div>

                    <style>{`
                        @keyframes slideUp {
                            from { transform: translateY(100%); opacity: 0; }
                            to   { transform: translateY(0); opacity: 1; }
                        }
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to   { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
};

export default RequestEscalationButton;
