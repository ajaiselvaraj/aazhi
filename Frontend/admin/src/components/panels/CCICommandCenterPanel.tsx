import React, { useState, useEffect } from 'react';
import { 
  Building2, MapPin, AlertTriangle, CheckCircle, RefreshCw, 
  Calendar, Inbox, Activity, DollarSign, Clock, UserCheck, 
  ArrowRight, Plus, Eye, Send, EyeOff, CheckSquare, Heart
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { useAuth } from '../../context/AuthContext';

interface CCICluster {
  id: string;
  cluster_code: string;
  root_cause_category: string;
  ward_id: string;
  locality: string;
  status: 'active' | 'in_progress' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  progress: number;
  complaints: any[];
  departments: any[];
  complaint_count?: number;
}

interface CCIAnalytics {
  clustersDetected: number;
  duplicatesAvoided: number;
  departmentsCoordinated: number;
  averageRecoveryTimeReduction: string;
  costSavingsUSD: number;
  citizenSatisfactionImprovement: string;
}

interface PlannedActivity {
  id: string;
  activity_type: string;
  ward_id: string;
  locality: string;
  start_time: string;
  end_time: string;
  description: string;
  predicted_cascades: string[];
  alerts: any[];
}

export default function CCICommandCenterPanel() {
  const { user } = useAuth();
  
  // Loading & State
  const [clusters, setClusters] = useState<CCICluster[]>([]);
  const [analytics, setAnalytics] = useState<CCIAnalytics | null>(null);
  const [activities, setActivities] = useState<PlannedActivity[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<CCICluster | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [activityType, setActivityType] = useState('Excavation');
  const [wardId, setWardId] = useState('Ward 1');
  const [locality, setLocality] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const clustersData = await adminApi.getCCIClusters();
      const analyticsData = await adminApi.getCCIAnalytics();
      const activitiesData = await adminApi.getCCIPlannedActivities();
      
      setClusters(clustersData || []);
      setAnalytics(analyticsData || null);
      setActivities(activitiesData || []);
    } catch (err: any) {
      console.error("CCI Data fetch error:", err);
      setError(err.message || "Failed to load CCI dashboard details.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Coordinate SLA completion status
  const handleToggleDeptStatus = async (clusterId: string, deptName: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await adminApi.updateCCIDepartmentStatus(clusterId, deptName, nextStatus);
      
      // Update local state
      setClusters(prev => prev.map(c => {
        if (c.id === clusterId) {
          const updatedDepts = c.departments.map(d => 
            d.department_name === deptName ? { ...d, completion_status: nextStatus } : d
          );
          const totalDepts = updatedDepts.length;
          const completedDepts = updatedDepts.filter(d => d.completion_status === 'completed').length;
          const newProgress = totalDepts > 0 ? Math.round((completedDepts / totalDepts) * 100) : 0;
          const newStatus = newProgress === 100 ? 'resolved' : c.status;

          const updatedCluster = {
            ...c,
            departments: updatedDepts,
            progress: newProgress,
            status: newStatus as any
          };

          if (selectedCluster && selectedCluster.id === clusterId) {
            setSelectedCluster(updatedCluster);
          }

          return updatedCluster;
        }
        return c;
      }));
    } catch (err: any) {
      alert(`Failed to update department status: ${err.message}`);
    }
  };

  // Log planned maintenance
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormMessage(null);
    try {
      await adminApi.createCCIPlannedActivity({
        activity_type: activityType,
        ward_id: wardId,
        locality: locality || `${wardId} Sector A`,
        start_time: startTime,
        end_time: endTime,
        description: description
      });

      setFormMessage("Success! Planned activity logged and proactive alerts dispatched.");
      // Clear form
      setLocality('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      
      // Reload dashboard list
      const activitiesData = await adminApi.getCCIPlannedActivities();
      setActivities(activitiesData || []);
      const analyticsData = await adminApi.getCCIAnalytics();
      setAnalytics(analyticsData || null);
      
      setTimeout(() => {
        setShowPlanForm(false);
        setFormMessage(null);
      }, 2000);
    } catch (err: any) {
      setFormMessage(`Error: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Acknowledge proactive alert
  const handleAcknowledgeAlert = async (alertId: string, activityId: string) => {
    try {
      await adminApi.acknowledgeCCIAlert(alertId);
      
      // Update local state
      setActivities(prev => prev.map(a => {
        if (a.id === activityId) {
          return {
            ...a,
            alerts: a.alerts.map(al => al.id === alertId ? { ...al, status: 'acknowledged' } : al)
          };
        }
        return a;
      }));
    } catch (err: any) {
      alert(`Acknowledge failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-primary)' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '.3rem', background: 'linear-gradient(90deg, var(--primary), #00b4d8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cross-Complaint Cascade Intelligence (CCI)
          </h1>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Area Incident Coordination Center • Multi-Department Coordinated SLAs
          </p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-ghost" style={{ padding: '.5rem', display: 'flex', alignItems: 'center', gap: '.4rem', height: '36px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span style={{ fontSize: '.78rem', fontWeight: 700 }}>Reload Data</span>
        </button>
      </div>

      {/* ANALYTICS WIDGETS */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { label: "Active Clusters", val: analytics.clustersDetected, icon: Activity, col: "#2F6BFF" },
            { label: "Duplicates Avoided", val: `${analytics.duplicatesAvoided} tickets`, icon: UserCheck, col: "#10B981" },
            { label: "Coordinated Depts", val: analytics.departmentsCoordinated, icon: Building2, col: "#8B5CF6" },
            { label: "Resolution Speed", val: `-${analytics.averageRecoveryTimeReduction}`, icon: Clock, col: "#EF4444" },
            { label: "Estimated Savings", val: `$${analytics.costSavingsUSD}`, icon: DollarSign, col: "#F59E0B" },
            { label: "Satisfaction Boost", val: `+${analytics.citizenSatisfactionImprovement}`, icon: Heart, col: "#EC4899" },
          ].map((w, idx) => (
            <div key={idx} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${w.col}`, background: 'var(--card-bg, #ffffff)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${w.col}15`, color: w.col, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <w.icon size={18} />
              </div>
              <div>
                <p style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.2rem' }}>{w.label}</p>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>{w.val}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '1.5rem', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontWeight: 700 }}>
          {error}
        </div>
      )}

      {/* MAIN TWO-COLUMN SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedCluster ? '1.2fr 1fr' : '1fr', gap: '1.5rem' }}>
        
        {/* LEFT COLUMN: ACTIVE CLUSTERS LIST */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem', margin: 0 }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              Active Coordinated Incidents
            </h3>
            <span className="badge badge-info" style={{ fontWeight: 800 }}>{clusters.length} Active Events</span>
          </div>

          <div style={{ padding: '1.25rem 1.5rem', overflowX: 'auto' }}>
            {clusters.length === 0 ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Inbox size={40} style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
                <p style={{ fontWeight: 700 }}>No Coordinated Incidents Found</p>
                <p style={{ fontSize: '.8rem' }}>All citizen complaints are isolated or under threshold matching.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '.72rem', textTransform: 'uppercase', fontWeight: 900 }}>
                    <th style={{ padding: '.75rem .5rem' }}>Incident Code</th>
                    <th style={{ padding: '.75rem .5rem' }}>Predicted Root Cause</th>
                    <th style={{ padding: '.75rem .5rem' }}>Area (Ward)</th>
                    <th style={{ padding: '.75rem .5rem' }}>Tickets Mapped</th>
                    <th style={{ padding: '.75rem .5rem' }}>SLA Progress</th>
                    <th style={{ padding: '.75rem .5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '.85rem', fontWeight: 600, background: selectedCluster?.id === c.id ? 'rgba(47, 107, 255, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '1rem .5rem', fontWeight: 800 }}>
                        <span style={{ color: 'var(--primary)' }}>{c.cluster_code}</span>
                        {c.severity === 'critical' && (
                          <span style={{ marginLeft: '.4rem', fontSize: '.6rem', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 900 }}>CRITICAL</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem .5rem', fontWeight: 700 }}>{c.root_cause_category}</td>
                      <td style={{ padding: '1rem .5rem' }}>{c.locality} ({c.ward_id})</td>
                      <td style={{ padding: '1rem .5rem', textAlign: 'center', color: 'var(--primary)', fontWeight: 800 }}>{c.complaint_count}</td>
                      <td style={{ padding: '1rem .5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <div style={{ height: '6px', width: '60px', background: '#cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${c.progress}%`, background: 'var(--success)' }} />
                          </div>
                          <span style={{ fontSize: '.75rem', fontWeight: 800 }}>{c.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem .5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setSelectedCluster(c)} 
                          className="btn btn-ghost"
                          style={{ padding: '.3rem .6rem', fontSize: '.75rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED INCIDENT OVERVIEW (COORDINATED SLA CONTROL) */}
        {selectedCluster && (
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--primary)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(47, 107, 255, 0.02)' }}>
              <div>
                <h3 style={{ fontWeight: 900, margin: 0, fontSize: '1.05rem', color: 'var(--primary)' }}>
                  Coordinated Control Center
                </h3>
                <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', margin: 0 }}>ID: {selectedCluster.cluster_code}</p>
              </div>
              <button onClick={() => setSelectedCluster(null)} className="btn btn-ghost" style={{ padding: '.3rem .5rem', fontSize: '.7rem', height: 'auto' }}>
                Close Panel
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Prediction details */}
              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.25rem' }}>AI Root Cause Detection</p>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedCluster.root_cause_category}</div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '.4rem', fontSize: '.75rem', color: 'var(--text-secondary)' }}>
                  <span>Ward Location: <strong>{selectedCluster.ward_id}</strong></span>
                  <span>Locality Sector: <strong>{selectedCluster.locality}</strong></span>
                </div>
              </div>

              {/* Checklist Coordinated Departments (SLA toggle) */}
              <div>
                <h4 style={{ fontSize: '.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.75rem', display: 'flex', justifyItems: 'center', gap: '.3rem' }}>
                  <CheckSquare size={13} /> Coordinated SLA Checklist
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {selectedCluster.departments.map((dept, index) => {
                    const isCompleted = dept.completion_status === 'completed';
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', background: 'var(--bg)', borderRadius: '10px', border: `1px solid ${isCompleted ? 'var(--success-border, #d1e7dd)' : 'var(--border)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                          <input 
                            type="checkbox" 
                            checked={isCompleted}
                            onChange={() => handleToggleDeptStatus(selectedCluster.id, dept.department_name, dept.completion_status)}
                            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                          />
                          <div>
                            <span style={{ fontSize: '.85rem', fontWeight: 800, color: isCompleted ? 'var(--success)' : 'var(--text-primary)' }}>
                              {dept.department_name} Board
                            </span>
                            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>
                              Coordinated SLA: {new Date(dept.sla_deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({new Date(dept.sla_deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                            </div>
                          </div>
                        </div>
                        <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '.65rem', textTransform: 'uppercase' }}>
                          {dept.completion_status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Linked Grievances */}
              <div>
                <h4 style={{ fontSize: '.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
                  Linked citizen complaints ({selectedCluster.complaints.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {selectedCluster.complaints.map((comp, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.6rem .75rem', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '.8rem' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{comp.ticket_number}</span>
                          <span className="badge badge-info" style={{ fontSize: '.6rem', padding: '1px 5px' }}>{comp.department}</span>
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {comp.subject}
                        </div>
                      </div>
                      <span style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', color: comp.status === 'resolved' ? 'var(--success)' : 'var(--warning)' }}>
                        {comp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* PLANNED EXCAVATIONS & PROACTIVE ALERTS ENGINE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', marginTop: '.5rem' }}>
        
        {/* WIDGET 1: LOG PLANNED MAINTENANCE */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '.75rem' }}>
            <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem', margin: 0, fontSize: '1rem' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              Log Planned Maintenance
            </h3>
          </div>

          <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Activity Type</label>
              <select 
                value={activityType} 
                onChange={(e) => setActivityType(e.target.value)}
                style={{ width: '100%', padding: '.55rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text-primary)', fontWeight: 700 }}
              >
                <option value="Excavation & Pipeline Repair">Excavation &amp; Pipeline Repair</option>
                <option value="Road Resurfacing Work">Road Resurfacing Work</option>
                <option value="Utility Grid Maintenance">Utility Grid Maintenance</option>
                <option value="Stormwater Drain Excavation">Stormwater Drain Excavation</option>
                <option value="Planned Gas Pipeline Flush">Planned Gas Pipeline Flush</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Location Ward</label>
                <select 
                  value={wardId} 
                  onChange={(e) => setWardId(e.target.value)}
                  style={{ width: '100%', padding: '.55rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text-primary)', fontWeight: 700 }}
                >
                  {['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'Ward 9', 'Ward 10', 'Ward 12'].map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Locality/Sector</label>
                <input 
                  type="text" 
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Sector 4, Street 9"
                  required
                  style={{ width: '100%', padding: '.55rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text-primary)', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Start Time</label>
                <input 
                  type="datetime-local" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '.55rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text-primary)', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.25rem' }}>End Time</label>
                <input 
                  type="datetime-local" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '.55rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text-primary)', fontWeight: 700 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '.25rem' }}>Detailed Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe planned excavation and department alerts..."
                required
                style={{ width: '100%', padding: '.55rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text-primary)', minHeight: '60px', resize: 'none', fontWeight: 600 }}
              />
            </div>

            <button type="submit" disabled={formSubmitting} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
              {formSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              Log Event &amp; Dispatch Alerts
            </button>

            {formMessage && (
              <div style={{ padding: '.5rem', borderRadius: '6px', fontSize: '.75rem', textAlign: 'center', background: formMessage.includes("Success") ? '#d1e7dd' : '#f8d7da', color: formMessage.includes("Success") ? '#0f5132' : '#842029', fontWeight: 700 }}>
                {formMessage}
              </div>
            )}
          </form>
        </div>

        {/* WIDGET 2: PREDICTIVE CASCADE ALERTS FEED */}
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '.5rem', margin: 0, fontSize: '1rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
              Predictive Cascade Alerts Feed
            </h3>
          </div>

          <div style={{ padding: '1.25rem 1.5rem', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activities.length === 0 ? (
              <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <EyeOff size={32} style={{ opacity: 0.4, margin: '0 auto .5rem' }} />
                <p style={{ fontWeight: 700 }}>No Predictive Alerts Dispatched</p>
                <p style={{ fontSize: '.78rem' }}>Enter a planned excavation above to trigger alerts.</p>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', background: 'rgba(245, 158, 11, 0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.6rem' }}>
                    <div>
                      <span className="badge badge-info" style={{ fontSize: '.65rem', padding: '2px 6px' }}>{act.activity_type}</span>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.2rem', fontWeight: 700 }}>
                        Ward {act.ward_id} · {act.locality}
                      </div>
                    </div>
                    <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                      {new Date(act.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', borderLeft: '3px solid var(--border)', paddingLeft: '.75rem', marginTop: '.75rem' }}>
                    {act.alerts.map((al) => {
                      const isAck = al.status === 'acknowledged';
                      return (
                        <div key={al.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.78rem', padding: '.4rem 0' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>[{al.department} Alert]</span>
                            <span style={{ marginLeft: '.4rem', color: 'var(--text-secondary)' }}>{al.alert_message.split("\n").slice(1).join(" ")}</span>
                          </div>
                          <button 
                            disabled={isAck}
                            onClick={() => handleAcknowledgeAlert(al.id, act.id)}
                            className={`btn ${isAck ? 'btn-ghost' : 'btn-success'}`}
                            style={{ padding: '.2rem .5rem', fontSize: '.65rem', height: 'auto', flexShrink: 0, marginLeft: '1rem', cursor: isAck ? 'default' : 'pointer' }}
                          >
                            {isAck ? "Acknowledged" : "Acknowledge"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
