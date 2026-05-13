// ═══════════════════════════════════════════════════════════════
// TrackingApp.tsx — Full complaint tracking with process hierarchy
// Route: /track/:complaintId
// Features:
//   • Vertical step-by-step timeline with ✅ 🟡 ⚪ icons
//   • Fetches live data from GET /api/track/:id
//   • Real-time Socket.IO updates
//   • Mobile-first responsive design
//   • Government/enterprise tracking system look
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { io as socketIO, Socket } from "socket.io-client";

// ── Dynamic backend URL detection ─────────────────────────────
const getBackendUrl = () => {
  const host = window.location.hostname;
  const isProd = host !== 'localhost' && !host.startsWith('192.168.') && !host.startsWith('10.');
  
  if (isProd) {
    // In production, fallback to your real Render backend
    return 'https://aazhi-9gj2.onrender.com';
  }
  
  // In kiosk/local demo, use the current machine's IP on port 8000
  return `http://${host}:8000`;
};

const BACKEND_URL = getBackendUrl();
const API_BASE    = `${BACKEND_URL}`; // Note: your tracking route is /api/track but fetchData adds /api
const SOCKET_URL  = BACKEND_URL;

// ── Types ─────────────────────────────────────────────────────
interface Stage {
  stage: string;
  status: "done" | "current" | "pending" | "completed";
  notes?: string;
  updated_at?: string;
}

interface Complaint {
  id: string;
  ticket_number: string;
  category: string;
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
}

interface TrackingData {
  complaint: Complaint;
  stages: Stage[];
  messages: { text: string; sender_type: string; created_at: string }[];
}

// ── Default workflow (used when API has no stage data) ─────────
const DEFAULT_WORKFLOW: Stage[] = [
  { stage: "Complaint Created", status: "done" },
  { stage: "Submitted to System", status: "done" },
  { stage: "Assigned to Officer", status: "done" },
  { stage: "In Progress", status: "current" },
  { stage: "Resolved", status: "pending" },
  { stage: "Closed", status: "pending" },
];

// ── Map a complaint status to workflow stage states ────────────
function buildWorkflowFromStatus(status: string): Stage[] {
  const statusOrder = ["pending", "submitted", "assigned", "in_progress", "resolved", "closed"];
  const labels: Record<string, string> = {
    pending: "Complaint Created",
    submitted: "Submitted to System",
    assigned: "Assigned to Officer",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };
  const currentIdx = statusOrder.indexOf(status?.toLowerCase());
  return statusOrder.map((key, i) => ({
    stage: labels[key],
    status: i < currentIdx ? "done" as const :
            i === currentIdx ? "current" as const : "pending" as const,
  }));
}

// ── Date formatter ────────────────────────────────────────────
const fmt = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// ══════════════════════════════════════════════════════════════
// ComplaintTrackingPage — The main tracking UI
// ══════════════════════════════════════════════════════════════
function ComplaintTrackingPage() {
  const { complaintId } = useParams();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [workflow, setWorkflow] = useState<Stage[]>(DEFAULT_WORKFLOW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [liveFlash, setLiveFlash] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch complaint data from API ─────────────────────────
  const fetchData = useCallback(async () => {
    if (!complaintId) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/track/${encodeURIComponent(complaintId)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || "Complaint not found.");
        // Use default workflow as fallback demo
        setWorkflow(DEFAULT_WORKFLOW);
        return;
      }
      const data: TrackingData = json.data;
      setComplaint(data.complaint);

      // Build workflow from API stages or from complaint status
      if (data.stages && data.stages.length > 0) {
        const mapped = data.stages.map((s) => ({
          ...s,
          status: s.status === "completed" ? "done" as const : s.status,
        }));
        setWorkflow(mapped as Stage[]);
      } else {
        setWorkflow(buildWorkflowFromStatus(data.complaint.status));
      }
    } catch {
      setError("Unable to reach the server. Showing demo data.");
      setWorkflow(DEFAULT_WORKFLOW);
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  // ── Socket.IO real-time updates ───────────────────────────
  useEffect(() => {
    fetchData();

    const socket = socketIO(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("track:join", complaintId || "");
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("complaint:statusUpdated", (payload: any) => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);
      if (payload.newStatus) {
        setWorkflow(buildWorkflowFromStatus(payload.newStatus));
        setComplaint((prev) =>
          prev
            ? {
                ...prev,
                status: payload.newStatus,
                updated_at: payload.updatedAt || prev.updated_at,
                resolution_note: payload.resolutionNote || prev.resolution_note,
              }
            : prev
        );
      }
      fetchData();
    });

    socket.on("complaint:timelineUpdated", () => fetchData());

    return () => {
      socket.emit("track:leave", complaintId || "");
      socket.disconnect();
    };
  }, [complaintId, fetchData]);

  // ── Share handler ─────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Track Complaint", url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Tracking link copied!");
    }
  };

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════

  // Loading state
  if (loading) {
    return (
      <div style={styles.pageCenter}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading tracking data…</p>
      </div>
    );
  }

  // Priority badge color
  const priorityColors: Record<string, string> = {
    low: "#16a34a", medium: "#d97706", high: "#dc2626", critical: "#9f1239",
  };

  return (
    <div style={styles.page}>
      {/* ── HEADER ───────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerLeft}>
            <div style={styles.logoBox}>🏛️</div>
            <div>
              <div style={styles.headerTitle}>SUVIDHA TRACKING</div>
              <div style={styles.headerSub}>Citizen Complaint Tracker</div>
            </div>
          </div>
          <div style={styles.headerRight}>
            {/* Live indicator */}
            <div style={{
              ...styles.liveBadge,
              background: connected ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
              borderColor: connected ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: connected ? "#4ade80" : "#f87171",
                display: "inline-block",
                animation: connected ? "pulse 2s infinite" : "none",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.15em",
                textTransform: "uppercase" as const,
                color: connected ? "#4ade80" : "#f87171",
              }}>
                {connected ? "Live" : "Offline"}
              </span>
            </div>
            <button onClick={handleShare} style={styles.shareBtn}>📤</button>
          </div>
        </div>

        {/* Ticket number */}
        <div style={styles.ticketArea}>
          <div style={styles.ticketLabel}>Reference Number</div>
          <div style={styles.ticketId}>{complaint?.ticket_number || complaintId}</div>
          {complaint && (
            <div style={styles.ticketDate}>Submitted {fmt(complaint.created_at)}</div>
          )}
        </div>

        {/* Live flash */}
        {liveFlash && <div style={styles.flashOverlay} />}
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <main style={styles.main}>

        {/* Error banner (non-blocking) */}
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Status Card */}
        {complaint && (
          <div style={styles.card}>
            <div style={styles.statusRow}>
              <div>
                <div style={styles.sectionLabel}>Current Status</div>
                <div style={{
                  fontSize: 24, fontWeight: 900,
                  color: complaint.status === "resolved" ? "#16a34a" :
                         complaint.status === "rejected" ? "#dc2626" : "#2563eb",
                  textTransform: "capitalize" as const,
                }}>
                  {complaint.status?.replace(/_/g, " ")}
                </div>
              </div>
              <div style={{
                ...styles.priorityBadge,
                background: (priorityColors[complaint.priority] || "#64748b") + "18",
                color: priorityColors[complaint.priority] || "#64748b",
              }}>
                {complaint.priority?.toUpperCase()}
              </div>
            </div>

            {/* Meta grid */}
            <div style={styles.metaGrid}>
              {[
                { label: "Category", value: complaint.category },
                { label: "Department", value: complaint.department || "—" },
                { label: "Ward", value: complaint.ward || "—" },
                { label: "Last Updated", value: fmt(complaint.updated_at) },
              ].map((m) => (
                <div key={m.label} style={styles.metaItem}>
                  <div style={styles.metaLabel}>{m.label}</div>
                  <div style={styles.metaValue}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Resolution note */}
            {complaint.resolution_note && (
              <div style={styles.resolutionBox}>
                <div style={styles.resolutionLabel}>Resolution Note</div>
                <div style={{ fontSize: 13, color: "#166534" }}>{complaint.resolution_note}</div>
              </div>
            )}
            {complaint.rejection_reason && (
              <div style={{ ...styles.resolutionBox, background: "#fef2f2", borderLeftColor: "#dc2626" }}>
                <div style={{ ...styles.resolutionLabel, color: "#dc2626" }}>Rejection Reason</div>
                <div style={{ fontSize: 13, color: "#991b1b" }}>{complaint.rejection_reason}</div>
              </div>
            )}
          </div>
        )}

        {/* ── PROCESS HIERARCHY / TIMELINE ─────────────── */}
        <div style={styles.card}>
          <h3 style={styles.timelineTitle}>
            📋 Complaint Process Hierarchy
          </h3>
          <div style={styles.timeline}>
            {workflow.map((step, idx) => {
              const isDone = step.status === "done" || step.status === "completed";
              const isCurrent = step.status === "current";
              const isPending = step.status === "pending";

              return (
                <div key={idx} style={styles.timelineStep}>
                  {/* Connector line (except last) */}
                  {idx < workflow.length - 1 && (
                    <div style={{
                      ...styles.connectorLine,
                      background: isDone ? "#16a34a" : "#e2e8f0",
                    }} />
                  )}

                  {/* Icon circle */}
                  <div style={{
                    ...styles.stepIcon,
                    background: isDone ? "#dcfce7" : isCurrent ? "#dbeafe" : "#f8fafc",
                    border: isCurrent ? "3px solid #2563eb" : isDone ? "3px solid #16a34a" : "3px solid #e2e8f0",
                    boxShadow: isCurrent ? "0 0 0 6px rgba(37,99,235,0.15)" : "none",
                    animation: isCurrent ? "pulseRing 2s infinite" : "none",
                  }}>
                    <span style={{ fontSize: 20 }}>
                      {isDone ? "✅" : isCurrent ? "🟡" : "⚪"}
                    </span>
                  </div>

                  {/* Step content */}
                  <div style={styles.stepContent}>
                    <div style={{
                      ...styles.stepLabel,
                      color: isDone || isCurrent ? "#1e293b" : "#94a3b8",
                      fontWeight: isCurrent ? 900 : 700,
                    }}>
                      {step.stage?.replace(/_/g, " ")}
                      {isCurrent && (
                        <span style={styles.currentTag}>CURRENT</span>
                      )}
                    </div>
                    {step.updated_at && (
                      <div style={styles.stepTime}>{fmt(step.updated_at)}</div>
                    )}
                    {step.notes && (
                      <div style={styles.stepNotes}>{step.notes}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── REFRESH BUTTON ─────────────────────────────── */}
        <button onClick={fetchData} style={styles.refreshBtn}>
          🔄 Refresh Status
        </button>

        {/* Footer */}
        <p style={styles.footer}>
          Digital India Initiative • SUVIDHA / AAZHI Platform
        </p>
      </main>

      {/* ── Global keyframes ─────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.35); }
          70% { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes flashPulse { 0%,100%{opacity:0}50%{opacity:0.25} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Styles — inline objects for zero-dependency styling
// ══════════════════════════════════════════════════════════════
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%)",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: "#1e293b",
  },
  pageCenter: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f4ff",
    gap: 16,
  },
  spinner: {
    width: 44, height: 44,
    border: "4px solid #2563eb25",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#64748b", fontWeight: 700, fontSize: 13,
    letterSpacing: "0.12em", textTransform: "uppercase",
  },

  // Header
  header: {
    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
    color: "#fff",
    padding: "28px 20px 80px",
    borderRadius: "0 0 2.5rem 2.5rem",
    position: "relative",
    overflow: "hidden",
  },
  headerInner: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    maxWidth: 600, margin: "0 auto 20px",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logoBox: {
    width: 42, height: 42,
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22,
  },
  headerTitle: { fontWeight: 900, fontSize: 16, letterSpacing: "-0.5px" },
  headerSub: {
    fontSize: 10, opacity: 0.7, fontWeight: 700,
    letterSpacing: "0.2em", textTransform: "uppercase",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  liveBadge: {
    borderRadius: 20, padding: "5px 10px",
    display: "flex", alignItems: "center", gap: 6,
    border: "1px solid",
  },
  shareBtn: {
    background: "rgba(255,255,255,0.15)", border: "none",
    borderRadius: 10, padding: 8, cursor: "pointer",
    fontSize: 16, color: "#fff",
  },
  ticketArea: { maxWidth: 600, margin: "0 auto", paddingBottom: 8 },
  ticketLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: "0.3em",
    opacity: 0.7, textTransform: "uppercase", marginBottom: 4,
  },
  ticketId: { fontSize: 30, fontWeight: 900, letterSpacing: "-1px" },
  ticketDate: { fontSize: 12, opacity: 0.6, marginTop: 4 },
  flashOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(74,222,128,0.2)",
    borderRadius: "0 0 2.5rem 2.5rem",
    animation: "flashPulse 1s ease",
    pointerEvents: "none",
  },

  // Main
  main: {
    padding: "0 16px 40px",
    marginTop: -48,
    maxWidth: 640,
    marginLeft: "auto", marginRight: "auto",
  },
  errorBanner: {
    background: "#fef3c7", border: "1px solid #fbbf24",
    borderRadius: 14, padding: "12px 16px", marginBottom: 16,
    fontSize: 13, fontWeight: 600, color: "#92400e",
    display: "flex", alignItems: "center", gap: 8,
  },

  // Cards
  card: {
    background: "#fff",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
    marginBottom: 20,
    animation: "fadeIn 0.4s ease",
  },
  statusRow: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 800, color: "#94a3b8",
    letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6,
  },
  priorityBadge: {
    borderRadius: 12, padding: "6px 14px",
    fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
  },
  metaGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
  },
  metaItem: {
    background: "#f8fafc", borderRadius: 12, padding: "10px 14px",
  },
  metaLabel: {
    fontSize: 9, fontWeight: 800, color: "#94a3b8",
    letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4,
  },
  metaValue: { fontSize: 13, fontWeight: 700, color: "#1e293b" },
  resolutionBox: {
    marginTop: 14, padding: "14px 16px",
    background: "#f0fdf4", borderRadius: 12,
    borderLeft: "4px solid #16a34a",
  },
  resolutionLabel: {
    fontSize: 9, fontWeight: 800, color: "#16a34a",
    textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4,
  },

  // Timeline
  timelineTitle: {
    fontWeight: 900, fontSize: 17, marginBottom: 28,
    display: "flex", alignItems: "center", gap: 10,
    color: "#1e293b",
  },
  timeline: { position: "relative", paddingLeft: 0 },
  timelineStep: {
    display: "flex", gap: 16, paddingBottom: 28,
    position: "relative", alignItems: "flex-start",
  },
  connectorLine: {
    position: "absolute", left: 23, top: 50, bottom: -4,
    width: 3, borderRadius: 4,
  },
  stepIcon: {
    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1, transition: "all 0.3s",
  },
  stepContent: { flex: 1, paddingTop: 10 },
  stepLabel: {
    fontSize: 15, textTransform: "capitalize",
    display: "flex", alignItems: "center", gap: 10,
  },
  currentTag: {
    fontSize: 9, fontWeight: 900, color: "#2563eb",
    background: "#dbeafe", padding: "3px 10px",
    borderRadius: 20, letterSpacing: "0.15em",
  },
  stepTime: {
    fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3,
  },
  stepNotes: {
    fontSize: 12, color: "#475569", marginTop: 6,
    padding: "8px 12px", background: "#f8fafc", borderRadius: 8,
  },

  // Refresh
  refreshBtn: {
    width: "100%", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 16, padding: "16px 0",
    fontWeight: 800, fontSize: 15, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
    transition: "all 0.2s", marginBottom: 16,
  },

  // Footer
  footer: {
    textAlign: "center", fontSize: 10, fontWeight: 800,
    color: "#cbd5e1", letterSpacing: "0.3em",
    textTransform: "uppercase", marginTop: 8,
  },
};

// ══════════════════════════════════════════════════════════════
// TrackingApp — Route wrapper (uses nested Routes, no BrowserRouter)
// ══════════════════════════════════════════════════════════════
export default function TrackingApp() {
  return (
    <Routes>
      <Route
        path=":complaintId"
        element={<ComplaintTrackingPage />}
      />
    </Routes>
  );
}
