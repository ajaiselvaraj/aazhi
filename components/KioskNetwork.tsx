import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, Battery, Activity, Plus, Power, Terminal, X, 
  LayoutGrid, Cpu, HardDrive, Upload, Search, Filter, Wrench, Clock,
  Map as MapIcon, Download, Printer, Users, AlertTriangle, CheckCircle,
  Settings, PenTool, FileText, MapPin, MapPinned
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MaintenanceLog {
  id: string;
  technician: string;
  issue: string;
  date: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface TechnicianAssignment {
  name: string;
  issue: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface ExtendedKiosk {
  id: string;
  location: string;
  status: 'Online' | 'Offline' | 'Maintenance';
  lastActive: Date;
  uptimeHours: number;
  battery: number;
  network: 'Good' | 'Weak' | 'Offline';
  systemHealth: 'Healthy' | 'Warning' | 'Critical';
  printerStatus: 'Working' | 'Low Paper' | 'Error';
  stats: {
    requests: number;
    complaints: number;
    services: number;
  };
  technicianAssigned: TechnicianAssignment | null;
  maintenanceHistory: MaintenanceLog[];
  mapCoords: { lat: number; lng: number }; 
}

const initialMockKiosks: ExtendedKiosk[] = [
  {
    id: 'K-101', location: 'City Center Mall', status: 'Online', lastActive: new Date(), uptimeHours: 342,
    battery: 100, network: 'Good', systemHealth: 'Healthy', printerStatus: 'Working',
    stats: { requests: 45, complaints: 12, services: 120 },
    technicianAssigned: null,
    maintenanceHistory: [
      { id: 'M-01', technician: 'Rahul Sharma', issue: 'Paper Jam', date: '2023-10-15', status: 'Completed' }
    ],
    mapCoords: { lat: 28.6139, lng: 77.2090 } // New Delhi center
  },
  {
    id: 'K-102', location: 'North District Office', status: 'Maintenance', lastActive: new Date(Date.now() - 3600000), uptimeHours: 120,
    battery: 85, network: 'Weak', systemHealth: 'Warning', printerStatus: 'Low Paper',
    stats: { requests: 20, complaints: 5, services: 40 },
    technicianAssigned: { name: 'Amit Kumar', issue: 'Refill Printer Paper', status: 'In Progress' },
    maintenanceHistory: [],
    mapCoords: { lat: 28.6448, lng: 77.2167 } // North Delhi approx
  },
  {
    id: 'K-103', location: 'Bus Terminal Station', status: 'Offline', lastActive: new Date(Date.now() - 86400000), uptimeHours: 0,
    battery: 5, network: 'Offline', systemHealth: 'Critical', printerStatus: 'Error',
    stats: { requests: 12, complaints: 0, services: 15 },
    technicianAssigned: null,
    maintenanceHistory: [],
    mapCoords: { lat: 28.5961, lng: 77.2285 } // Southish Delhi approx
  },
  {
    id: 'K-104', location: 'General Hospital', status: 'Online', lastActive: new Date(), uptimeHours: 500,
    battery: 100, network: 'Good', systemHealth: 'Healthy', printerStatus: 'Working',
    stats: { requests: 156, complaints: 20, services: 304 },
    technicianAssigned: null,
    maintenanceHistory: [],
    mapCoords: { lat: 28.6200, lng: 77.1800 } // Westish
  }
];

const TECHNICIANS = ["Rahul Sharma", "Amit Kumar", "Sanjay Verma", "Priya Singh"];

// Custom Leaflet Icons using SVG rendering logic
const createCustomIcon = (status: string) => {
  const color = status === 'Online' ? '#10b981' : status === 'Offline' ? '#ef4444' : '#f97316';
  const pulseClass = status !== 'Online' ? 'animate-pulse' : '';
  
  const markerHtml = `
    <div style="position: relative; top: -15px; left: -10px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="drop-shadow-lg" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="${color}" fill-opacity="0.2"></path>
        <circle cx="12" cy="10" r="3" fill="${color}"></circle>
      </svg>
      ${status !== 'Online' ? `
        <span style="position: absolute; top: 0; right: 0; display: flex; height: 12px; width: 12px;">
          <span style="position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 9999px; background-color: ${color}; opacity: 0.75;" class="animate-ping"></span>
          <span style="position: relative; display: inline-flex; border-radius: 9999px; height: 12px; width: 12px; background-color: ${color};"></span>
        </span>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html: markerHtml,
    className: `custom-leaflet-marker ${pulseClass}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const KioskNetwork: React.FC = () => {
  const [kiosks, setKiosks] = useState<ExtendedKiosk[]>(initialMockKiosks);
  
  // UI State
  const [viewMode, setViewMode] = useState<'Grid' | 'Map'>('Grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modal State
  const [activeModal, setActiveModal] = useState<'add' | 'tech' | 'issue' | 'history' | null>(null);
  const [selectedKioskId, setSelectedKioskId] = useState<string | null>(null);

  // Forms State
  const [techForm, setTechForm] = useState({ name: TECHNICIANS[0], issue: '' });
  const [issueForm, setIssueForm] = useState({ type: 'Printer', description: '' });
  const [newKioskForm, setNewKioskForm] = useState({ id: 'K-', location: '' });

  // 1. Real-Time Status Monitoring & Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setKiosks(prev => prev.map(kiosk => {
        if (kiosk.status !== 'Online') return kiosk;
        
        // Randomly simulate traffic and uptime
        const isUsed = Math.random() > 0.7;
        return {
          ...kiosk,
          lastActive: isUsed ? new Date() : kiosk.lastActive,
          uptimeHours: kiosk.uptimeHours + 0.01,
          stats: {
            ...kiosk.stats,
            services: kiosk.stats.services + (isUsed ? 1 : 0),
            requests: kiosk.stats.requests + (isUsed && Math.random() > 0.8 ? 1 : 0)
          }
        };
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Kiosks
  const filteredKiosks = kiosks.filter(k => {
    const matchesSearch = k.location.toLowerCase().includes(searchQuery.toLowerCase()) || k.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'All' || k.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Kiosk ID', 'Location', 'Status', 'Last Active', 'Uptime (hrs)', 'Network', 'System Health', 'Printer', 'Assigned Tech', 'Total Services'];
    const rows = kiosks.map(k => [
      k.id, k.location, k.status, k.lastActive.toLocaleString(), Math.floor(k.uptimeHours), 
      k.network, k.systemHealth, k.printerStatus, 
      k.technicianAssigned ? k.technicianAssigned.name : 'None',
      k.stats.services
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'kiosk_network_report.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Assign Technician
  const handleAssignTech = () => {
    if (!selectedKioskId || !techForm.issue) return;
    setKiosks(prev => prev.map(k => k.id === selectedKioskId ? {
      ...k,
      status: 'Maintenance',
      technicianAssigned: { name: techForm.name, issue: techForm.issue, status: 'Pending' }
    } : k));
    setActiveModal(null);
    setTechForm({ name: TECHNICIANS[0], issue: '' });
  };

  // Report Issue
  const handleReportIssue = () => {
    if (!selectedKioskId || !issueForm.description) return;
    setKiosks(prev => prev.map(k => {
      if (k.id !== selectedKioskId) return k;
      
      const newHistory: MaintenanceLog = {
        id: `M-${Date.now().toString().slice(-4)}`,
        technician: 'Unassigned',
        issue: `[${issueForm.type}] ${issueForm.description}`,
        date: new Date().toLocaleDateString(),
        status: 'Pending'
      };
      
      return {
        ...k,
        status: issueForm.type === 'Hardware' || issueForm.type === 'Internet' ? 'Offline' : 'Maintenance', // Hardware/Net breaks it, printer degrades it
        systemHealth: issueForm.type === 'Hardware' ? 'Critical' : k.systemHealth,
        network: issueForm.type === 'Internet' ? 'Offline' : k.network,
        printerStatus: issueForm.type === 'Printer' ? 'Error' : k.printerStatus,
        maintenanceHistory: [newHistory, ...k.maintenanceHistory]
      };
    }));
    setActiveModal(null);
    setIssueForm({ type: 'Printer', description: '' });
  };

  // Add New Kiosk
  const handleAddKiosk = () => {
    if (!newKioskForm.id || !newKioskForm.location) return;
    const newKiosk: ExtendedKiosk = {
      id: newKioskForm.id,
      location: newKioskForm.location,
      status: 'Online',
      lastActive: new Date(),
      uptimeHours: 0,
      battery: 100,
      network: 'Good',
      systemHealth: 'Healthy',
      printerStatus: 'Working',
      stats: { requests: 0, complaints: 0, services: 0 },
      technicianAssigned: null,
      maintenanceHistory: [],
      mapCoords: { 
         lat: 28.6139 + (Math.random() - 0.5) * 0.1, 
         lng: 77.2090 + (Math.random() - 0.5) * 0.1 
      }
    };
    setKiosks([newKiosk, ...kiosks]);
    setActiveModal(null);
    setNewKioskForm({ id: 'K-', location: '' });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Online') return 'bg-green-100 text-green-700';
    if (status === 'Offline') return 'bg-red-100 text-red-700 animate-pulse';
    return 'bg-orange-100 text-orange-700';
  };

  const getHealthColor = (health: string) => {
    if (health === 'Healthy' || health === 'Good' || health === 'Working') return 'text-green-500';
    if (health === 'Warning' || health === 'Weak' || health === 'Low Paper') return 'text-orange-500';
    return 'text-red-500';
  };

  const selectedKioskDetails = kiosks.find(k => k.id === selectedKioskId);

  return (
    <div className="p-8 h-full overflow-y-auto pb-24 bg-slate-50 relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><LayoutGrid className="text-blue-600" /> Kiosk Network Command</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time telemetry, maintenance, and diagnostics</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">
          {/* View Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
             <button onClick={() => setViewMode('Grid')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'Grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                <LayoutGrid size={16} /> Grid
             </button>
             <button onClick={() => setViewMode('Map')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'Map' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                <MapIcon size={16} /> Map
             </button>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Search location or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold outline-none">
            <option value="All">All Status</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Maintenance">Maintenance</option>
          </select>
          <button onClick={handleExportCSV} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 border border-slate-200">
            <Download size={16} /> Export
          </button>
          <button onClick={() => setActiveModal('add')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition flex items-center gap-2">
            <Plus size={16} /> Deploy Kiosk
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'Grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {filteredKiosks.map(kiosk => (
            <div key={kiosk.id} className={`bg-white rounded-3xl shadow-sm border transition hover:shadow-md p-6 flex flex-col relative overflow-hidden group
                 ${kiosk.status === 'Online' ? 'border-t-4 border-t-green-500' : kiosk.status === 'Offline' ? 'border-t-4 border-t-red-500 bg-red-50/10' : 'border-t-4 border-t-orange-500 bg-orange-50/10'}`}>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-black text-lg text-slate-800 truncate" title={kiosk.location}>{kiosk.location}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-500">{kiosk.id}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={12}/> {Math.floor(kiosk.uptimeHours)}h uptime
                    </span>
                  </div>
                </div>
                <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadge(kiosk.status)}`}>
                  {kiosk.status}
                </div>
              </div>

              {/* 2. Health Monitoring */}
              <div className="bg-slate-50 rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 border border-slate-100">
                <div className="text-center group-hover:scale-105 transition">
                  <Wifi className={`mx-auto mb-1 ${getHealthColor(kiosk.network)}`} size={18} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Net</span>
                </div>
                <div className="text-center border-l border-r border-slate-200 group-hover:scale-105 transition">
                  <Printer className={`mx-auto mb-1 ${getHealthColor(kiosk.printerStatus)}`} size={18} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Print</span>
                </div>
                <div className="text-center group-hover:scale-105 transition">
                   <Cpu className={`mx-auto mb-1 ${getHealthColor(kiosk.systemHealth)}`} size={18} />
                   <span className="text-[10px] font-bold text-slate-500 uppercase">Sys</span>
                </div>
              </div>

              {/* 3. Usage Statistics */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                 <div className="bg-blue-50/50 rounded-xl p-2 border border-blue-100">
                    <span className="block font-black text-lg text-blue-700">{kiosk.stats.services}</span>
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Services</span>
                 </div>
                 <div className="bg-indigo-50/50 rounded-xl p-2 border border-indigo-100">
                    <span className="block font-black text-lg text-indigo-700">{kiosk.stats.requests}</span>
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Requests</span>
                 </div>
                 <div className="bg-rose-50/50 rounded-xl p-2 border border-rose-100">
                    <span className="block font-black text-lg text-rose-700">{kiosk.stats.complaints}</span>
                    <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Complaints</span>
                 </div>
              </div>

              {kiosk.technicianAssigned && (
                 <div className="bg-orange-50 rounded-xl p-3 mb-4 border border-orange-200 flex items-start gap-2">
                    <Wrench size={14} className="text-orange-600 mt-0.5" />
                    <div>
                       <p className="text-xs font-bold text-orange-900 leading-tight">Tech Assigned: {kiosk.technicianAssigned.name}</p>
                       <p className="text-[10px] font-medium text-orange-700 mt-0.5">{kiosk.technicianAssigned.issue}</p>
                    </div>
                 </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                 <div className="relative group/btn flex-1">
                    <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
                       <Settings size={14} /> Manage
                    </button>
                    {/* Hover Dropdown Actions */}
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover/btn:block z-10 animate-in fade-in slide-in-from-bottom-2">
                       <button onClick={() => { setSelectedKioskId(kiosk.id); setActiveModal('tech'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg flex items-center gap-2"><Users size={14}/> Assign Tech</button>
                       <button onClick={() => { setSelectedKioskId(kiosk.id); setActiveModal('issue'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg flex items-center gap-2"><AlertTriangle size={14}/> Report Issue</button>
                       <button onClick={() => { setSelectedKioskId(kiosk.id); setActiveModal('history'); }} className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2"><FileText size={14}/> Maintenance Log</button>
                    </div>
                 </div>
                 <div className="text-[10px] font-bold text-slate-400 self-center text-right flex-1 truncate">
                    Active: {kiosk.lastActive.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 7. Real Map-Based Visualization using React-Leaflet */}
      {viewMode === 'Map' && (
        <div className="w-full h-[600px] bg-white rounded-3xl border border-slate-200 relative overflow-hidden animate-in fade-in zoom-in-95 shadow-sm">
          {/* We default center the map around New Delhi roughly */}
          <MapContainer center={[28.6139, 77.2090]} zoom={11} className="w-full h-full z-0 font-sans">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            
            {filteredKiosks.map(kiosk => (
              <Marker 
                key={kiosk.id} 
                position={[kiosk.mapCoords.lat, kiosk.mapCoords.lng]}
                icon={createCustomIcon(kiosk.status)}
              >
                <Popup className="rounded-xl shadow-xl border-0 overflow-hidden min-w-[200px] kiosk-popup text-sm font-sans" closeButton={false}>
                   <div className="bg-slate-900 -m-[14px] p-4 text-white">
                      <h4 className="font-extrabold text-[15px] mb-1 leading-tight tracking-tight">{kiosk.location}</h4>
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-300 mt-2 mb-3 tracking-wide">
                        <span className="bg-slate-800 px-2 py-1 rounded bg-opacity-50 border border-slate-700">{kiosk.id}</span>
                        <span className={`px-2 py-1 rounded lowercase ${kiosk.status === 'Online' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : kiosk.status === 'Offline' ? 'text-red-400 bg-red-400/10 border border-red-400/20' : 'text-orange-400 bg-orange-400/10 border border-orange-400/20'}`}>
                           {kiosk.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3 mb-2">
                        <div className="bg-slate-800 rounded p-2 text-center border border-slate-700/50">
                           <span className="block text-emerald-400 font-black text-sm">{kiosk.stats.services}</span>
                           <span className="text-[9px] uppercase font-bold text-slate-400">Services</span>
                        </div>
                        <div className="bg-slate-800 rounded p-2 text-center border border-slate-700/50">
                           <span className="block text-slate-300 font-black text-sm">{Math.floor(kiosk.uptimeHours)}h</span>
                           <span className="text-[9px] uppercase font-bold text-slate-400">Uptime</span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                          <button onClick={() => { setSelectedKioskId(kiosk.id); setActiveModal('history'); }} className="bg-white/10 hover:bg-white/20 text-white w-full py-1.5 rounded text-[10px] font-bold transition flex items-center justify-center gap-1">
                             <FileText size={12}/> History
                          </button>
                          {kiosk.status !== 'Online' ? (
                            <button onClick={() => { setSelectedKioskId(kiosk.id); setActiveModal('tech'); }} className="bg-blue-600 hover:bg-blue-500 text-white w-full py-1.5 rounded text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-md shadow-blue-500/20">
                               <Wrench size={12}/> Fix
                            </button>
                          ) : (
                            <button onClick={() => { setSelectedKioskId(kiosk.id); setActiveModal('issue'); }} className="bg-white/10 hover:bg-orange-500 text-white w-full py-1.5 rounded text-[10px] font-bold transition flex items-center justify-center gap-1">
                               <AlertTriangle size={12}/> Report
                            </button>
                          )}
                      </div>
                   </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 text-xs font-bold text-slate-700 flex flex-col gap-3 pointer-events-none z-[1000]">
             <div className="text-[10px] uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-1 mb-1">Network Legend</div>
             <div className="flex items-center gap-3"><MapPinned size={16} className="text-emerald-500 fill-white"/> Online & Healthy</div>
             <div className="flex items-center gap-3"><MapPinned size={16} className="text-orange-500 fill-white drop-shadow-sm"/> Maintenance / Warning</div>
             <div className="flex items-center gap-3"><MapPinned size={16} className="text-red-500 fill-white drop-shadow-sm"/> Offline / Critical</div>
          </div>
        </div>
      )}

      {/* 4. Technician Assignment Modal */}
      {activeModal === 'tech' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Wrench className="text-blue-600"/> Assign Technician</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Target Kiosk</label>
                  <div className="bg-slate-50 p-3 rounded-xl font-bold border border-slate-200 text-slate-700">
                     {selectedKioskDetails?.location} ({selectedKioskDetails?.id})
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Select Technician</label>
                  <select 
                     className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                     value={techForm.name} onChange={e => setTechForm({...techForm, name: e.target.value})}
                  >
                     {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Issue Description / Instructions</label>
                  <textarea 
                     className="w-full bg-white border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                     placeholder="e.g. Please replace thermal paper roll and check network cable."
                     value={techForm.issue} onChange={e => setTechForm({...techForm, issue: e.target.value})}
                  />
               </div>
               <button onClick={handleAssignTech} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition active:scale-95">
                  Confirm Assignment
               </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Kiosk Issue Reporting Modal */}
      {activeModal === 'issue' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><AlertTriangle className="text-orange-500"/> Report Malfunction</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Failure Category</label>
                  <select 
                     className="w-full bg-white border border-slate-200 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500"
                     value={issueForm.type} onChange={e => setIssueForm({...issueForm, type: e.target.value})}
                  >
                     <option value="Printer">Printer / Consumables</option>
                     <option value="Internet">Network Failure</option>
                     <option value="Hardware">System Hardware Failure</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Description</label>
                  <textarea 
                     className="w-full bg-white border border-slate-200 p-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
                     placeholder="Describe the failure detail..."
                     value={issueForm.description} onChange={e => setIssueForm({...issueForm, description: e.target.value})}
                  />
               </div>
               <button onClick={handleReportIssue} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition active:scale-95">
                  Log Issue & Flag Kiosk
               </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Maintenance History Modal */}
      {activeModal === 'history' && selectedKioskDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                 <h2 className="text-xl font-black text-slate-800">Kiosk Intelligence Report</h2>
                 <p className="text-sm font-bold text-slate-500">{selectedKioskDetails.location} ({selectedKioskDetails.id})</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
               <h3 className="font-bold text-slate-700 mb-3 border-b border-slate-100 pb-2">Maintenance & Repair Log</h3>
               {selectedKioskDetails.maintenanceHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                     <CheckCircle size={32} className="mx-auto text-green-400 mb-2"/>
                     <p className="font-bold text-slate-500">No maintenance history.</p>
                     <p className="text-xs text-slate-400">This kiosk has been running perfectly.</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {selectedKioskDetails.maintenanceHistory.map(log => (
                        <div key={log.id} className="bg-white border border-slate-200 p-4 rounded-xl flex gap-4">
                           <div className="bg-slate-100 p-3 rounded-lg h-12 w-12 flex items-center justify-center flex-shrink-0">
                              <PenTool className="text-slate-500" size={20} />
                           </div>
                           <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                 <h4 className="font-bold text-slate-800 text-sm">{log.issue}</h4>
                                 <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-100 text-green-700">{log.status}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                 <span>Tech: {log.technician}</span>
                                 <span>{log.date}</span>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               <div className="grid grid-cols-2 gap-4 mt-6">
                 <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                    <h4 className="text-xs font-bold uppercase text-blue-500 mb-2">Lifetime Statistics</h4>
                    <div className="space-y-2 text-sm font-bold text-blue-900">
                       <div className="flex justify-between"><span>Citizen Services</span> <span>{selectedKioskDetails.stats.services}</span></div>
                       <div className="flex justify-between"><span>Requests Filed</span> <span>{selectedKioskDetails.stats.requests}</span></div>
                       <div className="flex justify-between"><span>Complaints Raised</span> <span>{selectedKioskDetails.stats.complaints}</span></div>
                    </div>
                 </div>
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Hardware Telemetry</h4>
                    <div className="space-y-2 text-sm font-bold text-slate-700">
                       <div className="flex justify-between"><span>Total Uptime</span> <span>{Math.floor(selectedKioskDetails.uptimeHours)} Hours</span></div>
                       <div className="flex justify-between"><span>Battery Health</span> <span className="text-green-600">Excellent (98%)</span></div>
                       <div className="flex justify-between"><span>Storage</span> <span>45% Used</span></div>
                    </div>
                 </div>
               </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
               <button onClick={() => setActiveModal(null)} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">Close Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Kiosk Modal */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800">Provision New Kiosk</h2>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
                <div>
                   <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Hardware ID</label>
                   <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" value={newKioskForm.id} onChange={e => setNewKioskForm({...newKioskForm, id: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Deployment Location</label>
                   <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Civic Center" value={newKioskForm.location} onChange={e => setNewKioskForm({...newKioskForm, location: e.target.value})} />
                </div>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-xs font-medium border border-blue-200">
                   System will automatically provision certificates, initialize telemetry, and place a marker on the deployment map.
                </div>
                <button onClick={handleAddKiosk} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition">
                    Execute Deployment
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskNetwork;
