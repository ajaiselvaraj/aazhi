import React, { useState } from 'react';
import { ArrowLeft, Users, FileText, CheckCircle, Clock, BarChart2, Search, Filter, Eye, UserCheck, MessageSquare, AlertCircle, Globe, ChevronDown, AlertTriangle, Edit, LayoutGrid } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MOCK_REQUESTS } from '../constants';
import { Language } from '../types';
import { useServiceComplaint } from '../contexts/ServiceComplaintContext';
import KioskNetwork from './KioskNetwork';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onBack: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const data = [
  { name: 'Electricity', applications: 400, resolved: 240 },
  { name: 'Water', applications: 300, resolved: 139 },
  { name: 'Municipal', applications: 200, resolved: 180 },
  { name: 'Gas', applications: 278, resolved: 190 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const Admin: React.FC<Props> = ({ onBack, language, onLanguageChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'requests' | 'complaints' | 'alerts' | 'kiosks'>('overview');
  const { t } = useLanguage();
  const {
    serviceRequests,
    complaints,
    areaAlerts,
    updateServiceStatus,
    updateServiceStage,
    updateComplaintStatus,
    updateComplaintStage,
    getComplaintsByCategory
  } = useServiceComplaint();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Requests State
  const [selectedRequestCategory, setSelectedRequestCategory] = useState<string>('All');

  // Dropdown Management State
  const [openDropdown, setOpenDropdown] = useState<{ id: string, type: 'reqStep' | 'compStage' | 'compStatus' } | null>(null);

  const toggleDropdown = (id: string, type: 'reqStep' | 'compStage' | 'compStatus') => {
    if (openDropdown?.id === id && openDropdown?.type === type) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown({ id, type });
    }
  };

  const filteredRequests = serviceRequests.filter(req => {
    if (selectedRequestCategory === 'All') return true;
    const dept = req.category.toLowerCase();
    if (selectedRequestCategory === 'Electricity' && dept.includes('electricity')) return true;
    if (selectedRequestCategory === 'Water' && dept.includes('water')) return true;
    if (selectedRequestCategory === 'Gas' && dept.includes('gas')) return true;
    if (selectedRequestCategory === 'Municipal' && dept.includes('municipal')) return true;
    return false;
  });

  // Priority Mapping for Sorting (Higher value = Higher Priority)
  const PRIORITY_ORDER: Record<string, number> = {
    'Critical': 4,
    'High': 3,
    'Medium': 2,
    'Low': 1
  };

  // Filter complaints
  const sortedComplaints = getComplaintsByCategory(selectedCategory)
    .filter(c => {
      const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    })
    .sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a.priority] ?? 1;
      const priorityB = PRIORITY_ORDER[b.priority] ?? 1;

      if (priorityB !== priorityA) {
        return priorityB - priorityA; // Descending Priority
      }
      // Newest First
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-blue-950 text-white flex flex-col shrink-0">
        <div className="p-8">
          <h1 className="text-2xl font-black tracking-tighter">AAZHI <span className="text-blue-400">ADMIN</span></h1>
          <p className="text-[10px] uppercase tracking-widest text-blue-300 font-bold mt-1 opacity-70">Control Panel v2.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'overview', label: t('adminDashboard'), icon: BarChart2 },
            { id: 'requests', label: t('adminRequests'), icon: FileText },
            { id: 'complaints', label: t('adminComplaints'), icon: AlertCircle },
            { id: 'alerts', label: "Impact Alerts", icon: AlertTriangle },
            { id: 'kiosks', label: "Kiosk Network", icon: LayoutGrid },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeSubTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-blue-200 hover:bg-white/10'}`}
            >
              <item.icon size={20} /> {item.label}
              {item.id === 'alerts' && areaAlerts.length > 0 && (
                <span className="ml-auto bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  {areaAlerts.length}
                </span>
              )}
              {item.id === 'complaints' && (
                <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {complaints.filter(c => c.status === 'Pending').length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-8 space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-2">{t('sysStatus')}</p>
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold">{t('statusActive')}</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-4 rounded-2xl font-bold transition-all"
          >
            <ArrowLeft size={18} /> {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="bg-white p-6 px-10 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {activeSubTab === 'overview' ? t('adminDashboard') :
                  activeSubTab === 'requests' ? t('adminRequests') :
                    activeSubTab === 'alerts' ? "Area Impact Alerts" :
                      activeSubTab === 'kiosks' ? "Kiosk Network Management" : t('adminComplaints')}
              </h2>
              <p className="text-sm text-gray-500">{t('welcomeBack')}, Admin ID: 963852</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Language Switcher */}
            <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-2xl border">
              <Globe size={16} className="text-gray-400 ml-2" />
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as Language)}
                className="bg-transparent border-none text-xs font-bold outline-none cursor-pointer pr-4"
              >
                {Object.values(Language).map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="relative hidden lg:block">
              <input
                type="text"
                placeholder="Search ID..."
                className="bg-gray-100 pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shadow-sm">A</div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-10">
          {activeSubTab === 'overview' && (
            <div className="space-y-10">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: "Total Complaints", val: complaints.length, icon: AlertCircle, color: 'red' },
                  { label: "Resolved", val: complaints.filter(c => c.status === 'Resolved').length, icon: CheckCircle, color: 'green' },
                  { label: t('slaMet'), val: '96.4%', icon: CheckCircle, color: 'blue' },
                  { label: t('avgFeedback'), val: '4.8/5', icon: MessageSquare, color: 'purple' }
                ].map((stat) => (
                  <div key={stat.label} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition">
                    <stat.icon className={`text-${stat.color}-500 mb-4`} size={28} />
                    <p className="text-3xl font-black text-gray-900">{stat.val}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-8 rounded-3xl shadow-sm border">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <BarChart2 className="text-blue-500" /> {t('deptPerformance')}
                  </h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="applications" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border">
                  <h3 className="text-lg font-bold mb-8">{t('serviceDistribution')}</h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="applications"
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'requests' && (
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b flex flex-col gap-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">{t('activeApps')}</h3>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold border hover:bg-gray-50">
                      <Filter size={14} /> Filter
                    </button>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-100">
                      Bulk Export
                    </button>
                  </div>
                </div>

                {/* Request Category Filters */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {['All', 'Electricity', 'Water', 'Gas', 'Municipal'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedRequestCategory(cat)}
                      className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap
                            ${selectedRequestCategory === cat
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                    <tr>
                      <th className="px-8 py-4">Ref ID</th>
                      <th className="px-8 py-4">Citizen</th>
                      <th className="px-8 py-4">Service Type</th>
                      <th className="px-8 py-4">Status</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400 font-bold">
                          No requests found for {selectedRequestCategory}
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-blue-50/30 transition">
                          <td className="px-8 py-6 font-bold text-blue-600">{req.id}</td>
                          <td className="px-8 py-6 font-bold text-gray-900">{req.name}</td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{req.serviceType}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{req.category}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${req.currentStage === 'Completed' || req.currentStage === 'Approved' ? 'bg-green-100 text-green-700' : req.currentStage === 'Submitted' || req.currentStage === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {req.currentStage}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex gap-2 justify-end">
                              <button className="p-2 hover:bg-white rounded-lg border transition text-gray-500 hover:text-blue-600" title="View Documents"><Eye size={18} /></button>

                              <div className="relative">
                                <button
                                  onClick={() => toggleDropdown(req.id, 'reqStep')}
                                  className="p-2 hover:bg-white rounded-lg border transition text-gray-500 hover:text-green-600 flex items-center gap-1"
                                >
                                  <Edit size={16} />
                                </button>
                                {openDropdown?.id === req.id && openDropdown?.type === 'reqStep' && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg w-48 z-20 p-1 animate-in fade-in zoom-in-95 duration-200">
                                    {['Submitted', 'Under Review', 'Verification', 'Approval Pending', 'Completed', 'Rejected'].map((stage) => (
                                      <button
                                        key={stage}
                                        onClick={() => {
                                          updateServiceStage(req.id, stage);
                                          setOpenDropdown(null);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-blue-50 rounded-lg 
                                          ${req.currentStage === stage ? 'bg-blue-100 text-blue-700' : 'text-slate-700'}`}
                                      >
                                        {stage}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'alerts' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-red-50 border border-red-200 p-6 rounded-3xl mb-8">
                <div className="flex items-center gap-4 mb-2">
                  <AlertTriangle className="text-red-600" size={32} />
                  <div>
                    <h3 className="text-xl font-black text-red-900">High Impact Areas Detected</h3>
                    <p className="text-red-700 font-medium">Immediate attention required for clustering complaints in these zones.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {areaAlerts.length === 0 ? (
                  <div className="col-span-full text-center py-20 opacity-50">
                    <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
                    <p className="text-xl font-bold text-slate-800">No active area alerts</p>
                    <p className="text-slate-500">System is monitoring for complaint spikes...</p>
                  </div>
                ) : (
                  [...areaAlerts].sort((a, b) => a.level === 'Critical' ? -1 : 1).map((alert, idx) => (
                    <div key={idx} className={`relative overflow-hidden bg-white p-6 rounded-3xl shadow-lg border-2 
                            ${alert.level === 'Critical' ? 'border-red-500 shadow-red-100' : 'border-orange-400 shadow-orange-100'}`}>

                      <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl font-black text-xs uppercase text-white
                                ${alert.level === 'Critical' ? 'bg-red-600 animate-pulse' : 'bg-orange-500'}`}>
                        {alert.level} Priority
                      </div>

                      <h4 className="text-2xl font-black text-slate-900 mb-1">{alert.area}</h4>
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-6">Impact Zone</p>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-500">Issue Type</span>
                          <span className="font-bold text-slate-900">{alert.complaintType}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                          <span className="text-xs font-bold text-slate-500">Department</span>
                          <span className="font-bold text-slate-900">{alert.category}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-500">Total Reports</span>
                          <span className="font-black text-2xl text-slate-900">{alert.count}</span>
                        </div>
                      </div>

                      <button onClick={() => {
                        setActiveSubTab('complaints');
                        setSelectedCategory(alert.category);
                        setSearchTerm(alert.area);
                      }} className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2">
                        View Complaints <ArrowLeft className="rotate-180" size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'complaints' && (
            <div className="space-y-6">
              {/* Complaint Filters */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {['All', 'Electricity', 'Water', 'Gas', 'Municipal'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap
                        ${selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 pl-3">Priority</span>
                  {['All', 'Critical', 'High', 'Medium', 'Low'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                ${priorityFilter === p
                          ? (p === 'Critical' ? 'bg-red-100 text-red-700' :
                            p === 'High' ? 'bg-orange-100 text-orange-700' :
                              p === 'Medium' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-800 text-white')
                          : 'text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {sortedComplaints.length === 0 ? (
                  <div className="text-center py-20 opacity-50">
                    <AlertCircle className="mx-auto mb-4" size={48} />
                    <p className="text-xl font-bold">No complaints found</p>
                  </div>
                ) : (
                  sortedComplaints.map((complaint) => (
                    <div key={complaint.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition hover:shadow-md
                        ${complaint.priority === 'Critical' ? 'border-l-4 border-l-red-500' :
                        complaint.priority === 'High' ? 'border-l-4 border-l-orange-500' : 'border-slate-100'}
                        ${complaint.areaAlert ? 'ring-2 ring-red-500 ring-offset-2 bg-red-50/10' : ''}
                    `}>
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase
                              ${complaint.status === 'Pending' ? 'bg-red-50 text-red-600' :
                                complaint.status === 'In Progress' ? 'bg-orange-50 text-orange-600' :
                                  'bg-green-50 text-green-600'}`}>
                              {complaint.status}
                            </span>

                            {/* Stage Badge */}
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase
                              ${complaint.currentStage === 'GM Approval' ? 'bg-purple-100 text-purple-700' :
                                complaint.currentStage === 'Manager Review' ? 'bg-indigo-100 text-indigo-700' :
                                  'bg-blue-50 text-blue-600'}`}>
                              {complaint.currentStage || 'Submitted'}
                            </span>

                            {/* Priority Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider
                                ${complaint.priority === 'Critical' ? 'bg-red-600 text-white' :
                                complaint.priority === 'High' ? 'bg-orange-500 text-white' :
                                  complaint.priority === 'Medium' ? 'bg-blue-500 text-white' :
                                    'bg-slate-200 text-slate-500'}
                            `}>
                              {complaint.priority}
                            </span>

                            <span className="text-xs font-bold text-slate-400">{complaint.id}</span>
                            <span className="text-xs font-bold text-slate-400">• {new Date(complaint.createdAt).toLocaleDateString()}</span>
                            {complaint.areaAlert && (
                              <span className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                                <AlertTriangle size={10} /> Impact Alert
                              </span>
                            )}
                          </div>

                          <h4 className="text-lg font-black text-slate-900 mb-1">{complaint.complaintType}</h4>
                          <p className="text-slate-500 text-sm mb-3 line-clamp-2">{complaint.description}</p>

                          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><Users size={14} /> {complaint.name} ({complaint.phone})</span>
                            <span className="flex items-center gap-1"><Globe size={14} /> {complaint.category}</span>
                            {complaint.location && <span className="flex items-center gap-1"><AlertCircle size={14} /> {complaint.location}</span>}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 min-w-[150px]">
                          {/* NEW: Stage Updater for Complaints */}
                          <div className="relative">
                            <button
                              onClick={() => toggleDropdown(complaint.id, 'compStage')}
                              className="w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex justify-between items-center hover:bg-blue-100 border border-blue-100 mb-2"
                            >
                              <Edit size={14} /> {complaint.currentStage || 'Update Stage'} <ChevronDown size={14} />
                            </button>
                            {openDropdown?.id === complaint.id && openDropdown?.type === 'compStage' && (
                              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 w-48 z-20 animate-in fade-in zoom-in-95 duration-200">
                                {['Submitted', 'Officer Assigned', 'Manager Review', 'GM Approval', 'Resolved', 'Closed'].map((stage) => (
                                  <button
                                    key={stage}
                                    onClick={() => {
                                      updateComplaintStage(complaint.id, stage);
                                      setOpenDropdown(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-blue-50 rounded-lg 
                                      ${complaint.currentStage === stage ? 'bg-blue-100 text-blue-700' : 'text-slate-700'}`}
                                  >
                                    {stage}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => toggleDropdown(complaint.id, 'compStatus')}
                              className="w-full bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex justify-between items-center hover:bg-slate-200"
                            >
                              Status <ChevronDown size={14} />
                            </button>
                            {openDropdown?.id === complaint.id && openDropdown?.type === 'compStatus' && (
                              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 w-40 z-10 animate-in fade-in zoom-in-95 duration-200">
                                {['Pending', 'In Progress', 'Resolved'].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => {
                                      updateComplaintStatus(complaint.id, s as any);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 rounded-lg text-slate-700"
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activeSubTab === 'kiosks' && <KioskNetwork />}
        </div>
      </main>
    </div>
  );
};

export default Admin;
