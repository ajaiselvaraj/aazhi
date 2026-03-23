// ============================================================
// AAZHI ADMIN — COMPREHENSIVE MOCK DATA LAYER
// ============================================================

export const DEPARTMENTS = [
  'Electricity Department',
  'Water Supply Department',
  'Gas Distribution',
  'Municipal Services',
]

// ── Complaint Triage ─────────────────────────────────────────
export interface TriageComplaint {
  id: string
  text: string
  predictedDept: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  confidence: number
  status: 'Routed' | 'Pending' | 'Review Needed' | 'Resolved'
  sentiment: 'Angry' | 'Frustrated' | 'Neutral' | 'Positive'
  urgency: number
  keyPhrases: string[]
  aiClassified: boolean
}

export const triageComplaints: TriageComplaint[] = [
  { id: 'CMP-8841', text: 'No electricity for 3 days in Ward 7, entire block affected', predictedDept: 'Electricity Dept', priority: 'Critical', confidence: 97, status: 'Routed', sentiment: 'Angry', urgency: 5, keyPhrases: ['no electricity', '3 days', 'entire block'], aiClassified: true },
  { id: 'CMP-8839', text: 'Water pipeline burst near Gandhi Nagar main road', predictedDept: 'Water Supply Dept', priority: 'Critical', confidence: 95, status: 'Routed', sentiment: 'Frustrated', urgency: 5, keyPhrases: ['pipeline burst', 'main road'], aiClassified: true },
  { id: 'CMP-8837', text: 'Suspected gas leakage smell near Sector 12 B', predictedDept: 'Gas Distribution', priority: 'Critical', confidence: 93, status: 'Routed', sentiment: 'Angry', urgency: 5, keyPhrases: ['gas leakage', 'smell'], aiClassified: true },
  { id: 'CMP-8835', text: 'Street lights not working for 2 weeks on MG Road', predictedDept: 'Electricity Dept', priority: 'High', confidence: 88, status: 'Routed', sentiment: 'Frustrated', urgency: 3, keyPhrases: ['street lights', '2 weeks'], aiClassified: true },
  { id: 'CMP-8833', text: 'Water discolouration and bad smell from taps in flat complex', predictedDept: 'Water Supply Dept', priority: 'High', confidence: 85, status: 'Pending', sentiment: 'Frustrated', urgency: 4, keyPhrases: ['discolouration', 'bad smell', 'taps'], aiClassified: true },
  { id: 'CMP-8831', text: 'Garbage bins overflowing outside school premises', predictedDept: 'Municipal Services', priority: 'High', confidence: 82, status: 'Pending', sentiment: 'Frustrated', urgency: 3, keyPhrases: ['garbage bins', 'overflowing', 'school'], aiClassified: true },
  { id: 'CMP-8829', text: 'Pothole on highway causing accidents near flyover', predictedDept: 'Municipal Services', priority: 'Medium', confidence: 79, status: 'Review Needed', sentiment: 'Neutral', urgency: 3, keyPhrases: ['pothole', 'accidents', 'flyover'], aiClassified: true },
  { id: 'CMP-8827', text: 'Park lights issue could be electricity or municipal', predictedDept: 'Electricity Dept', priority: 'Medium', confidence: 54, status: 'Review Needed', sentiment: 'Neutral', urgency: 2, keyPhrases: ['park lights'], aiClassified: false },
  { id: 'CMP-8825', text: 'Transformer making loud noise near residential area', predictedDept: 'Electricity Dept', priority: 'High', confidence: 91, status: 'Routed', sentiment: 'Frustrated', urgency: 4, keyPhrases: ['transformer', 'loud noise', 'residential'], aiClassified: true },
  { id: 'CMP-8823', text: 'Sewage overflow on main street creating health hazard', predictedDept: 'Municipal Services', priority: 'Critical', confidence: 96, status: 'Routed', sentiment: 'Angry', urgency: 5, keyPhrases: ['sewage overflow', 'health hazard'], aiClassified: true },
  { id: 'CMP-8821', text: 'Low water pressure for past week entire colony affected', predictedDept: 'Water Supply Dept', priority: 'High', confidence: 87, status: 'Pending', sentiment: 'Frustrated', urgency: 3, keyPhrases: ['low pressure', 'past week', 'entire colony'], aiClassified: true },
  { id: 'CMP-8819', text: 'Issue could be water or sewage, unclear situation', predictedDept: 'Municipal Services', priority: 'Medium', confidence: 48, status: 'Review Needed', sentiment: 'Neutral', urgency: 2, keyPhrases: ['unclear'], aiClassified: false },
]

// ── AI Insights Chart Data ────────────────────────────────────
export const aiComplaintTrend = [
  { day: 'Mon', complaints: 42, resolved: 38 },
  { day: 'Tue', complaints: 58, resolved: 51 },
  { day: 'Wed', complaints: 45, resolved: 42 },
  { day: 'Thu', complaints: 67, resolved: 59 },
  { day: 'Fri', complaints: 52, resolved: 47 },
  { day: 'Sat', complaints: 38, resolved: 35 },
  { day: 'Sun', complaints: 29, resolved: 27 },
]

export const aiDeptDistribution = [
  { name: 'Electricity', value: 34, color: '#FFA940' },
  { name: 'Water Supply', value: 28, color: '#2F6BFF' },
  { name: 'Municipal', value: 25, color: '#2ECC71' },
  { name: 'Gas', value: 13, color: '#FF4D4F' },
]

export const aiPriorityBreakdown = [
  { name: 'Critical', count: 31, color: '#FF4D4F' },
  { name: 'High', count: 84, color: '#FFA940' },
  { name: 'Medium', count: 127, color: '#2F6BFF' },
  { name: 'Low', count: 58, color: '#2ECC71' },
]

export const aiSentimentDistribution = [
  { name: 'Angry', value: 18, color: '#FF4D4F' },
  { name: 'Frustrated', value: 42, color: '#FFA940' },
  { name: 'Neutral', value: 31, color: '#94a3b8' },
  { name: 'Positive', value: 9, color: '#2ECC71' },
]

export const aiModelHealth = {
  accuracy: 94.2,
  avgLatency: 12,
  uptime: 99.97,
  totalClassified: 1102,
  lastRetrained: '2 hours ago',
  topKeywords: ['pipeline', 'electricity', 'water', 'garbage', 'sewage', 'pothole', 'transformer', 'gas leak', 'street light', 'overflow'],
}

// ── Duplicate Clusters ────────────────────────────────────────
export interface DuplicateCluster {
  id: string
  title: string
  ward: string
  reportCount: number
  status: 'Merged Into Master Ticket' | 'Under Review' | 'Open'
  dept: string
  masterTicket: string
  timeAgo: string
}

export const duplicateClusters: DuplicateCluster[] = [
  { id: 'CLU-201', title: 'Power Outage', ward: 'Ward 12', reportCount: 47, status: 'Merged Into Master Ticket', dept: 'Electricity', masterTicket: 'MST-5521', timeAgo: '2h ago' },
  { id: 'CLU-202', title: 'Water Pipeline Burst', ward: 'Ward 3', reportCount: 38, status: 'Merged Into Master Ticket', dept: 'Water Supply', masterTicket: 'MST-5519', timeAgo: '4h ago' },
  { id: 'CLU-203', title: 'Garbage Overflow', ward: 'Sector 8', reportCount: 24, status: 'Under Review', dept: 'Municipal', masterTicket: 'MST-5518', timeAgo: '5h ago' },
  { id: 'CLU-204', title: 'Streetlight Failure', ward: 'Ward 19', reportCount: 31, status: 'Merged Into Master Ticket', dept: 'Electricity', masterTicket: 'MST-5517', timeAgo: '6h ago' },
  { id: 'CLU-205', title: 'Pothole Damage', ward: 'Zone 5', reportCount: 18, status: 'Open', dept: 'Municipal', masterTicket: 'MST-5516', timeAgo: '7h ago' },
  { id: 'CLU-206', title: 'Gas Pressure Issue', ward: 'Ward 7', reportCount: 12, status: 'Under Review', dept: 'Gas Distribution', masterTicket: 'MST-5515', timeAgo: '9h ago' },
]

// ── Fraud Monitor ─────────────────────────────────────────────
export interface FraudUser {
  userId: string
  submitted: number
  pattern: string
  riskScore: number
  status: 'Flagged' | 'Under Review' | 'Cleared' | 'Banned'
}

export const fraudUsers: FraudUser[] = [
  { userId: 'USR-19482', submitted: 84, pattern: 'Mass duplicate spam', riskScore: 97, status: 'Flagged' },
  { userId: 'USR-27731', submitted: 61, pattern: 'Bot-like rapid submissions', riskScore: 91, status: 'Banned' },
  { userId: 'USR-88104', submitted: 45, pattern: 'Cross-dept phishing', riskScore: 88, status: 'Flagged' },
  { userId: 'USR-33219', submitted: 22, pattern: 'Repeated false alarms', riskScore: 74, status: 'Under Review' },
  { userId: 'USR-55602', submitted: 15, pattern: 'Off-hours mass submissions', riskScore: 68, status: 'Under Review' },
  { userId: 'USR-71100', submitted: 9, pattern: 'Moderate unusual pattern', riskScore: 52, status: 'Cleared' },
  { userId: 'USR-44823', submitted: 6, pattern: 'Normal activity', riskScore: 18, status: 'Cleared' },
]

// ── Priority Queue ────────────────────────────────────────────
export interface PriorityIssue {
  id: string
  title: string
  ward: string
  priority: 'P0 — Emergency' | 'P1 — Critical' | 'P2 — High'
  officer: string
  dept: string
  reportedAt: string
  icon: string
}

export const priorityIssues: PriorityIssue[] = [
  { id: 'P-001', title: 'Gas Leakage Detected', ward: 'Ward 12', priority: 'P0 — Emergency', officer: 'Ramprasad K.', dept: 'Gas Distribution', reportedAt: '09:12 AM', icon: '🔥' },
  { id: 'P-002', title: 'Power Grid Failure', ward: 'Ward 7', priority: 'P0 — Emergency', officer: 'Meena R.', dept: 'Electricity', reportedAt: '09:31 AM', icon: '⚡' },
  { id: 'P-003', title: 'Pipeline Burst', ward: 'Ward 3', priority: 'P1 — Critical', officer: 'Suresh V.', dept: 'Water Supply', reportedAt: '10:05 AM', icon: '💧' },
  { id: 'P-004', title: 'Sewage Overflow', ward: 'Sector 8', priority: 'P1 — Critical', officer: 'Kavitha M.', dept: 'Municipal', reportedAt: '10:18 AM', icon: '🚨' },
  { id: 'P-005', title: 'Transformer Fire Risk', ward: 'Ward 19', priority: 'P1 — Critical', officer: 'Arjun T.', dept: 'Electricity', reportedAt: '10:45 AM', icon: '⚠️' },
  { id: 'P-006', title: 'Road Cave-in Reported', ward: 'Zone 5', priority: 'P2 — High', officer: 'Devi S.', dept: 'Municipal', reportedAt: '11:02 AM', icon: '🛣️' },
]

// ── AI Insights ───────────────────────────────────────────────
export interface AIInsight {
  id: string
  text: string
  category: 'Trend' | 'Anomaly' | 'Pattern' | 'Forecast'
  dept: string
  change: string
  positive: boolean
}

export const aiInsights: AIInsight[] = [
  { id: 'INS-1', text: 'Water complaints increased 42% in Ward 12 this week.', category: 'Trend', dept: 'Water Supply', change: '+42%', positive: false },
  { id: 'INS-2', text: 'Garbage collection complaints trending upward in Sector 8.', category: 'Pattern', dept: 'Municipal', change: '+28%', positive: false },
  { id: 'INS-3', text: 'Electricity complaints resolved 18% faster after AI routing.', category: 'Trend', dept: 'Electricity', change: '+18%', positive: true },
  { id: 'INS-4', text: 'Duplicate submission rate dropped 33% after fraud filter enabled.', category: 'Anomaly', dept: 'System', change: '-33%', positive: true },
  { id: 'INS-5', text: 'Gas complaints spike predicted for Ward 7 — 3 reports in 2h.', category: 'Forecast', dept: 'Gas Distribution', change: '↑ spike', positive: false },
  { id: 'INS-6', text: 'Water complaints expected to peak Tuesday based on last 4 weeks.', category: 'Forecast', dept: 'Water Supply', change: 'Peak Tue', positive: false },
]

// ── Workload Forecast ─────────────────────────────────────────
export const workloadForecast = [
  { day: 'Mon', electricity: 42, water: 38, gas: 18, municipal: 55 },
  { day: 'Tue', electricity: 58, water: 62, gas: 22, municipal: 48 },
  { day: 'Wed', electricity: 45, water: 71, gas: 19, municipal: 61 },
  { day: 'Thu', electricity: 67, water: 55, gas: 25, municipal: 72 },
  { day: 'Fri', electricity: 52, water: 48, gas: 31, municipal: 66 },
  { day: 'Sat', electricity: 38, water: 42, gas: 27, municipal: 44 },
  { day: 'Sun', electricity: 29, water: 35, gas: 16, municipal: 38 },
  { day: 'Mon+', electricity: 71, water: 78, gas: 34, municipal: 68 },
]

export const tomorrowForecast = {
  electricity: 71,
  water: 78,
  gas: 34,
  municipal: 68,
}

// ── Predictive Alerts ─────────────────────────────────────────
export interface PredictiveAlert {
  id: string
  severity: 'Critical' | 'High' | 'Medium'
  title: string
  description: string
  ward: string
  time: string
  icon: string
}

export const predictiveAlerts: PredictiveAlert[] = [
  { id: 'ALT-01', severity: 'Critical', title: 'Pipeline Leak Cluster Detected', description: 'Multiple pipeline leak complaints detected in Ward 12 within 30 minutes. Infrastructure failure likely.', ward: 'Ward 12', time: '5 min ago', icon: '💧' },
  { id: 'ALT-02', severity: 'Critical', title: 'Power Grid Overload Risk', description: 'Simultaneous outage reports from 3 adjacent wards. Grid stress approaching failure threshold.', ward: 'Wards 7, 8, 9', time: '12 min ago', icon: '⚡' },
  { id: 'ALT-03', severity: 'High', title: 'Gas Complaints Spike', description: 'Gas-related complaints in Sector 6 increased 300% in last 2 hours. Possible distribution failure.', ward: 'Sector 6', time: '18 min ago', icon: '🔥' },
  { id: 'ALT-04', severity: 'High', title: 'Sewage Overflow Imminent', description: 'Drain blockage cascade reported across Zone 4. Historical pattern indicates overflow in 2–4 hours.', ward: 'Zone 4', time: '25 min ago', icon: '🚨' },
]

// ── Civic Risk Timeline ───────────────────────────────────────
export interface RiskEvent {
  id: string
  title: string
  description: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  ward: string
  time: string
  resolved: boolean
}

export const riskEvents: RiskEvent[] = [
  { id: 'RSK-01', title: 'Power Outage Spike Detected', description: 'Anomaly: 47 outage reports in Ward 12 within 1 hour. AI flags as infrastructure failure.', severity: 'Critical', ward: 'Ward 12', time: '09:15 AM', resolved: false },
  { id: 'RSK-02', title: 'Water Pressure Anomaly', description: 'Pressure readings from 3 zones show simultaneous drop — possible main line failure.', severity: 'High', ward: 'Zones 2, 3, 5', time: '09:42 AM', resolved: false },
  { id: 'RSK-03', title: 'Transformer Overheating Signal', description: 'IoT sensor alert: transformer temp exceeds 85°C in Sector 11.', severity: 'High', ward: 'Sector 11', time: '10:08 AM', resolved: true },
  { id: 'RSK-04', title: 'Road Subsidence Pattern', description: 'Recurring pothole complaints on same 200m stretch indicate underground erosion risk.', severity: 'Medium', ward: 'Zone 5', time: '10:33 AM', resolved: false },
  { id: 'RSK-05', title: 'Garbage Accumulation Risk', description: 'Missed collection for 4 consecutive days — public health risk threshold approaching.', severity: 'Medium', ward: 'Sector 8', time: '11:01 AM', resolved: true },
  { id: 'RSK-06', title: 'Gas Leak Mitigation Complete', description: 'Ward 7 gas leak contained. 3 officers dispatched, area secured. System status: Normal.', severity: 'Low', ward: 'Ward 7', time: '11:20 AM', resolved: true },
]

// ── Heatmap Points ────────────────────────────────────────────
export interface HeatPoint {
  lat: number
  lng: number
  intensity: 'high' | 'medium' | 'low'
  ward: string
  count: number
  dept: string
}

export const heatPoints: HeatPoint[] = [
  { lat: 11.0168, lng: 76.9558, intensity: 'high', ward: 'Ward 12', count: 47, dept: 'Electricity' },
  { lat: 11.0100, lng: 76.9620, intensity: 'high', ward: 'Ward 3', count: 38, dept: 'Water Supply' },
  { lat: 11.0220, lng: 76.9480, intensity: 'medium', ward: 'Sector 8', count: 24, dept: 'Municipal' },
  { lat: 11.0050, lng: 76.9700, intensity: 'high', ward: 'Ward 7', count: 31, dept: 'Gas Distribution' },
  { lat: 11.0280, lng: 76.9550, intensity: 'medium', ward: 'Ward 19', count: 18, dept: 'Electricity' },
  { lat: 10.9980, lng: 76.9600, intensity: 'low', ward: 'Zone 5', count: 8, dept: 'Municipal' },
  { lat: 11.0150, lng: 76.9400, intensity: 'medium', ward: 'Sector 11', count: 15, dept: 'Electricity' },
  { lat: 11.0310, lng: 76.9650, intensity: 'high', ward: 'Ward 21', count: 29, dept: 'Water Supply' },
  { lat: 11.0070, lng: 76.9500, intensity: 'low', ward: 'Zone 2', count: 6, dept: 'All Depts' },
  { lat: 10.9920, lng: 76.9680, intensity: 'medium', ward: 'Sector 6', count: 19, dept: 'Gas Distribution' },
]

// ── Overview Stats ────────────────────────────────────────────
export const overviewStats = {
  totalComplaints: 1284,
  resolved: 937,
  pending: 221,
  critical: 31,
  aiRouted: 1102,
  duplicatesDetected: 189,
  fraudFlagged: 14,
  avgResolutionHrs: 3.2,
}
