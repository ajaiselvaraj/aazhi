// ═══════════════════════════════════════════════════════════════
// ComplaintQRModal — PLUG-IN component
// Shown after a complaint is successfully submitted.
// Generates a QR code linking to /track/:complaintId
// Uses react-qr-code (already installed in package.json)
// ═══════════════════════════════════════════════════════════════
import React, { useCallback } from 'react';
import QRCode from 'react-qr-code';
import { X, Download, Share2, Smartphone, CheckCircle, Copy } from 'lucide-react';

interface Props {
    ticketNumber: string;
    complaintId: string;
    onClose: () => void;
}

const ComplaintQRModal: React.FC<Props> = ({ ticketNumber, complaintId, onClose }) => {
    // ⭐ FIX: Use VITE_APP_URL env var — set to production domain in Vercel, localhost in dev.
    // This ensures QR codes ALWAYS contain the correct domain, never a local IP.
    const BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin;
    const trackingUrl = `${BASE_URL}/track/${encodeURIComponent(ticketNumber || complaintId)}`;

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(trackingUrl);
            alert('Tracking link copied! Share it or scan the QR code with any phone.');
        } catch {
            prompt('Copy this link:', trackingUrl);
        }
    }, [trackingUrl]);

    const handleShare = useCallback(async () => {
        if (navigator.share) {
            await navigator.share({
                title: `Track Complaint ${ticketNumber}`,
                text: `Track your SUVIDHA complaint in real-time: ${ticketNumber}`,
                url: trackingUrl,
            });
        } else {
            handleCopy();
        }
    }, [ticketNumber, trackingUrl, handleCopy]);

    // Download QR as SVG
    const handleDownload = useCallback(() => {
        const svg = document.getElementById('complaint-qr-svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SUVIDHA-${ticketNumber}-QR.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }, [ticketNumber]);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(15,23,42,0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16, animation: 'fadeIn 0.25s ease',
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: '#fff',
                borderRadius: 28,
                padding: 36,
                maxWidth: 420,
                width: '100%',
                position: 'relative',
                boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
                animation: 'slideUp 0.3s ease',
                textAlign: 'center',
            }}>
                {/* Close */}
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#64748b' }}
                >
                    <X size={18} />
                </button>

                {/* Success header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ width: 56, height: 56, background: '#f0fdf4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <CheckCircle size={32} style={{ color: '#16a34a' }} />
                    </div>
                    <h2 style={{ fontWeight: 900, fontSize: 22, color: '#1e293b', marginBottom: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Complaint Registered!
                    </h2>
                    <p style={{ color: '#64748b', fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Scan to track from your phone — no login required
                    </p>
                </div>

                {/* Ticket badge */}
                <div style={{ background: '#eff6ff', borderRadius: 14, padding: '10px 20px', marginBottom: 24, display: 'inline-block' }}>
                    <span style={{ fontWeight: 900, fontSize: 18, color: '#1d4ed8', letterSpacing: '-0.5px', fontFamily: 'monospace' }}>
                        {ticketNumber}
                    </span>
                </div>

                {/* QR Code */}
                <div style={{
                    background: '#fff',
                    border: '3px solid #e2e8f0',
                    borderRadius: 20,
                    padding: 20,
                    display: 'inline-block',
                    marginBottom: 24,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                    <QRCode
                        id="complaint-qr-svg"
                        value={trackingUrl}
                        size={180}
                        level="H"
                        style={{ display: 'block' }}
                    />
                </div>

                {/* URL preview */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Smartphone size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, wordBreak: 'break-all', fontFamily: 'monospace', flex: 1, textAlign: 'left' }}>
                        {trackingUrl}
                    </span>
                    <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', flexShrink: 0, padding: 4 }}>
                        <Copy size={14} />
                    </button>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <button
                        onClick={handleShare}
                        style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                        <Share2 size={16} /> Share Link
                    </button>
                    <button
                        onClick={handleDownload}
                        style={{ background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: 14, padding: '14px 0', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                        <Download size={16} /> Save QR
                    </button>
                </div>

                <button
                    onClick={onClose}
                    style={{ width: '100%', background: 'none', border: '2px solid #e2e8f0', borderRadius: 14, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                    Done — Close
                </button>

                <p style={{ fontSize: 10, color: '#cbd5e1', marginTop: 16, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Updates sent in real-time • No app install needed
                </p>
            </div>

            <style>{`
                @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
                @keyframes slideUp { from { transform:translateY(30px); opacity:0; } to { transform:translateY(0); opacity:1; } }
            `}</style>
        </div>
    );
};

export default ComplaintQRModal;
