import React, { useState, useEffect } from 'react';
import { alertApi, CivicAlert } from '../../api/alertApi';
import { Megaphone, Plus, ShieldAlert, FileText, Edit2, Trash2 } from 'lucide-react';

type InfoType = 'Alert' | 'Notice' | 'Emergency';

export default function PublicInformationPanel() {
  const [activeTab, setActiveTab] = useState<InfoType>('Alert');
  const [items, setItems] = useState<CivicAlert[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CivicAlert | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Tax');
  const [formAlertCategory, setFormAlertCategory] = useState('Civic');
  const [formTargetLocation, setFormTargetLocation] = useState('Global');
  const [formPriority, setFormPriority] = useState<number>(2); // 1: High, 2: Medium, 3: Low
  const [formStartDate, setFormStartDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');

  const [formError, setFormError] = useState('');

  const fetchAlerts = async () => {
    try {
      const alerts = await alertApi.getAll();
      setItems(alerts);
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleOpenModal = (item?: CivicAlert) => {
    setFormError('');
    if (item) {
      setEditingItem(item);
      setFormTitle(item.title);
      setFormDesc(item.message);
      if (item.is_notice) {
          setFormCategory(item.type || 'Tax');
          setFormAlertCategory('Civic');
      } else {
          setFormCategory('Tax');
          setFormAlertCategory(item.type || 'Civic');
      }
      setFormTargetLocation(item.ward || 'Global');
      setFormPriority(item.priority || 2);
      
      // format dates for input type="datetime-local" (YYYY-MM-DDTHH:mm)
      const formatForInput = (isoString?: string | null) => {
          if (!isoString) return '';
          return new Date(isoString).toISOString().slice(0, 16);
      };

      setFormStartDate(formatForInput(item.start_date));
      setFormExpiryDate(formatForInput(item.expires_at));
    } else {
      setEditingItem(null);
      setFormTitle('');
      setFormDesc('');
      setFormCategory('Tax');
      setFormAlertCategory('Civic');
      setFormTargetLocation('Global');
      setFormPriority(2);
      setFormStartDate('');
      setFormExpiryDate('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    
    // Validation Rules
    if (!formTitle.trim()) return setFormError("Title cannot be empty.");
    if (!formDesc.trim()) return setFormError("Description cannot be empty.");
    if (!formTargetLocation.trim()) return setFormError("Target Location is required.");
    if (!formPriority) return setFormError("Priority is required.");
    
    if (formStartDate && formExpiryDate) {
        if (new Date(formExpiryDate) <= new Date(formStartDate)) {
            return setFormError("Expiry Date must be after Start Date.");
        }
    }

    try {
      const payload = {
        title: formTitle,
        message: formDesc,
        type: activeTab === 'Notice' ? formCategory : formAlertCategory,
        severity: formPriority === 1 ? 'Critical' : formPriority === 2 ? 'Warning' : 'Info',
        priority: activeTab === 'Alert' ? formPriority : 3,
        ward: formTargetLocation,
        start_date: formStartDate ? new Date(formStartDate).toISOString() : null,
        expires_at: formExpiryDate ? new Date(formExpiryDate).toISOString() : null,
        is_notice: activeTab === 'Notice',
      };

      if (editingItem) {
        await alertApi.update(editingItem.id, payload);
      } else {
        await alertApi.create(payload);
      }
      fetchAlerts();
      setIsModalOpen(false);
    } catch (e: any) {
      console.error("Failed to save alert:", e);
      setFormError(e.message || "Failed to save alert.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this alert?")) {
      try {
        await alertApi.delete(id);
        fetchAlerts();
      } catch (e) {
        console.error("Failed to delete alert:", e);
      }
    }
  };

  const togglePublish = async (id: number, currentStatus: boolean) => {
    try {
      await alertApi.toggleActive(id, !currentStatus);
      fetchAlerts();
    } catch (e) {
      console.error("Failed to toggle publish:", e);
    }
  };

  const filteredItems = items.filter(i => activeTab === 'Notice' ? i.is_notice : !i.is_notice);

  const WARD_OPTIONS = ["Global", "Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Indira Airport", "Central Station"];

  return (
    <div className="panel-container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone color="#3b82f6" /> Public Alert Management
          </h2>
          <p style={{ color: '#94a3b8', marginTop: '4px' }}>Manage alerts, notices, and announcements for the Citizen Home Dashboard.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
        >
          <Plus size={18} /> Add {activeTab === 'Notice' ? 'Notice' : 'Alert'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <TabButton active={activeTab === 'Alert'} onClick={() => setActiveTab('Alert')} icon={<ShieldAlert size={16} />} label="Local Alerts" />
        <TabButton active={activeTab === 'Notice'} onClick={() => setActiveTab('Notice')} icon={<FileText size={16} />} label="Public Notices" />
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600 }}>Title</th>
              {activeTab === 'Alert' && <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600 }}>Priority</th>}
              <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600 }}>Target Location</th>
              <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600 }}>Start Date</th>
              <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600 }}>Expiry Date</th>
              <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: '#3b82f6', background: '#3b82f620', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>{item.type}</div>
                </td>
                {activeTab === 'Alert' && (
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px',
                      background: item.priority === 1 ? '#ef444420' : item.priority === 2 ? '#f59e0b20' : '#3b82f620',
                      color: item.priority === 1 ? '#ef4444' : item.priority === 2 ? '#f59e0b' : '#3b82f6'
                    }}>
                      {item.priority === 1 ? 'High' : item.priority === 2 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                )}
                <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>{item.ward || 'Global'}</td>
                <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>{item.start_date ? new Date(item.start_date).toLocaleString() : 'N/A'}</td>
                <td style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>{item.expires_at ? new Date(item.expires_at).toLocaleString() : 'N/A'}</td>
                <td style={{ padding: '16px' }}>
                  <button onClick={() => togglePublish(item.id, item.is_active)} style={{
                    background: item.is_active ? '#10b98120' : '#64748b20',
                    color: item.is_active ? '#10b981' : '#94a3b8',
                    border: 'none', padding: '4px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'
                  }}>
                    {item.is_active ? 'Published' : 'Unpublished'}
                  </button>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button onClick={() => handleOpenModal(item)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', marginRight: '12px' }}><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No {activeTab.toLowerCase()}s found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', width: '500px', borderRadius: '16px', padding: '24px', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <h3 style={{ marginTop: 0, fontSize: '20px', marginBottom: '20px' }}>{editingItem ? 'Edit' : 'Add'} {activeTab === 'Notice' ? 'Notice' : 'Alert'}</h3>
            
            {formError && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#ef444420', color: '#ef4444', borderRadius: '8px', fontSize: '14px', border: '1px solid #ef4444' }}>
                    {formError}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Title</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Description</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Target Location</label>
                  <select value={formTargetLocation} onChange={e => setFormTargetLocation(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}>
                      {WARD_OPTIONS.map(w => (
                          <option key={w} value={w}>{w}</option>
                      ))}
                  </select>
                </div>
                {activeTab === 'Alert' ? (
                  <div style={{ display: 'flex', gap: '16px', flex: 2 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Alert Category</label>
                      <select value={formAlertCategory} onChange={e => setFormAlertCategory(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}>
                        <option value="Civic">Civic</option>
                        <option value="Power">Power</option>
                        <option value="Water">Water</option>
                        <option value="Road">Road</option>
                        <option value="Weather">Weather</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Priority</label>
                      <select value={formPriority} onChange={e => setFormPriority(Number(e.target.value))} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}>
                        <option value={1}>High</option>
                        <option value={2}>Medium</option>
                        <option value={3}>Low</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Notice Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box' }}>
                      <option value="Tax">Tax</option>
                      <option value="Jobs">Jobs</option>
                      <option value="Event">Event</option>
                      <option value="Health">Health</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Start Date</label>
                    <input type="datetime-local" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box', colorScheme: 'dark' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Expiry Date</label>
                    <input type="datetime-local" value={formExpiryDate} onChange={e => setFormExpiryDate(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '10px', borderRadius: '8px', boxSizing: 'border-box', colorScheme: 'dark' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={handleSave} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', 
      border: 'none', borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
      color: active ? '#3b82f6' : '#94a3b8', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px'
    }}>
      {icon} {label}
    </button>
  );
}
