import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Users, FileText, CheckCircle, Clock, BarChart2, Search, Filter, Eye, UserCheck, MessageSquare, AlertCircle, Globe, ChevronDown, AlertTriangle, Edit, LayoutGrid, TrendingUp, Calendar, Download, Moon, Sun, Bell, Trophy, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { MOCK_REQUESTS } from '../constants';
import { Language } from '../types';
import { useServiceComplaint } from '../contexts/ServiceComplaintContext';
import KioskNetwork from './KioskNetwork';
import AdminRequests from './AdminRequests';
import AdminAlerts from './AdminAlerts';
import AdminComplaints from './AdminComplaints';
import { useTranslation } from 'react-i18next';

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

const trendData = [
  { name: 'Jan', complaints: 40, requests: 24, handled: 60 },
  { name: 'Feb', complaints: 30, requests: 13, handled: 40 },
  { name: 'Mar', complaints: 20, requests: 58, handled: 70 },
  { name: 'Apr', complaints: 27, requests: 39, handled: 60 },
  { name: 'May', complaints: 18, requests: 48, handled: 65 },
  { name: 'Jun', complaints: 23, requests: 38, handled: 55 },
];

const sentimentData = [
  { name: 'Positive', value: 400 },
  { name: 'Neutral', value: 300 },
  { name: 'Negative', value: 150 },
];
const SENTIMENT_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const topOfficers = [
  { id: 1, name: 'Rahul Sharma', dept: 'Electricity', resolved: 145, time: '< 12h' },
  { id: 2, name: 'Priya Patel', dept: 'Water', resolved: 128, time: '< 24h' },
  { id: 3, name: 'Amit Kumar', dept: 'Roads', resolved: 112, time: '< 24h' },
];

const mockDateDataGenerator = (range: string) => {
   const multiplier = range === '7D' ? 0.2 : range === '90D' ? 3 : range === '1Y' ? 12 : 1;
   
   return {
      bar: [
        { name: 'Electricity', applications: Math.round(400 * multiplier), resolved: Math.round(240 * multiplier) },
        { name: 'Water', applications: Math.round(300 * multiplier), resolved: Math.round(139 * multiplier) },
        { name: 'Municipal', applications: Math.round(200 * multiplier), resolved: Math.round(180 * multiplier) },
        { name: 'Gas', applications: Math.round(278 * multiplier), resolved: Math.round(190 * multiplier) },
      ],
      trend: [
        { name: 'P1', complaints: Math.round(40 * multiplier), requests: Math.round(24 * multiplier), handled: Math.round(60 * multiplier) },
        { name: 'P2', complaints: Math.round(30 * multiplier), requests: Math.round(13 * multiplier), handled: Math.round(40 * multiplier) },
        { name: 'P3', complaints: Math.round(20 * multiplier), requests: Math.round(58 * multiplier), handled: Math.round(70 * multiplier) },
        { name: 'P4', complaints: Math.round(27 * multiplier), requests: Math.round(39 * multiplier), handled: Math.round(60 * multiplier) },
        { name: 'P5', complaints: Math.round(18 * multiplier), requests: Math.round(48 * multiplier), handled: Math.round(65 * multiplier) },
        { name: 'P6', complaints: Math.round(23 * multiplier), requests: Math.round(38 * multiplier), handled: Math.round(55 * multiplier) },
      ],
      sentiment: [
        { name: 'Positive', value: Math.round(400 * multiplier) },
        { name: 'Neutral', value: Math.round(300 * multiplier) },
        { name: 'Negative', value: Math.round(150 * multiplier) },
      ]
   };
};

const Admin: React.FC<Props> = ({ onBack, language, onLanguageChange }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'requests' | 'complaints' | 'alerts' | 'kiosks'>('overview');
  const { t } = useTranslation();

  const translateDynamic = (text: string) => {
    if (!text) return text;
    const keyMap: Record<string, string> = {
        'Pending': t('pending') || 'Pending',
        'In Progress': t('inProgress') || 'In Progress',
        'Resolved': t('resolved') || 'Resolved',
        'Completed': t('completed') || 'Completed',
        'Rejected': t('rejected') || 'Rejected',
        'Closed': t('closed') || 'Closed',
        'Submitted': t('submitted') || 'Submitted',
        'Officer Assigned': t('officerAssigned') || 'Officer Assigned',
        'Manager Review': t('managerReview') || 'Manager Review',
        'GM Approval': t('gmApproval') || 'GM Approval',
        'Critical': t('severityCritical') || 'Critical',
        'High': t('severityWarning') || 'High',
        'Medium': t('severityInfo') || 'Medium',
        'Low': t('severityLow') || 'Low',
        'Electricity': t('power') || 'Electricity',
        'Water': t('water') || 'Water',
        'Gas': t('gas') || 'Gas',
        'Municipal': t('municipalCorp') || 'Municipal',
        'All': t('all') || 'All'
    };
    return keyMap[text] || text;
  };
  const {
    serviceRequests,
    complaints,
    areaAlerts,
    updateServiceStatus,
    updateServiceStage,
    updateComplaintStatus,
    updateComplaintStage,
    getComplaintsByCategory,
    activityLog,
    logActivity
  } = useServiceComplaint();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dashboard Metrics State
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const activeMetrics = mockDateDataGenerator(dateRange);

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

  const getNextStageAction = (stage: string) => {
    switch (stage) {
      case 'Submitted': return { label: 'Assign Officer', next: 'Officer Assigned', color: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200' };
      case 'Officer Assigned': return { label: 'Submit Response', next: 'Manager Review', color: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200' };
      case 'Manager Review': return { label: 'Manager Approve', next: 'GM Approval', color: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200' };
      case 'GM Approval': return { label: 'Final Approval', next: 'Resolved', color: 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200' };
      default: return null;
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

  // Calculate new dashboard metrics
  const totalCount = serviceRequests.length + complaints.length;
  const resolvedCount = serviceRequests.filter(r => r.status === 'Completed' || r.status === 'Resolved').length + 
                        complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length;
  const pendingRequests = totalCount - resolvedCount;
  const pendingColor = pendingRequests < 10 ? 'green' : pendingRequests < 40 ? 'orange' : 'red';

  const todayStr = new Date().toDateString();
  const todaysRequests = serviceRequests.filter(r => new Date(r.createdAt).toDateString() === todayStr).length +
                         complaints.filter(c => new Date(c.createdAt).toDateString() === todayStr).length;

  const resolvedItems = [...serviceRequests.filter(r => r.status === 'Completed' || r.status === 'Resolved'), ...complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed')];
  
  let avgResText = "Not enough data";
  if (resolvedItems.length > 0) {
    const resolveTimes = resolvedItems.map(item => {
      // @ts-ignore
      const resolvedAtMs = item.resolvedAt ? new Date(item.resolvedAt).getTime() : new Date(item.stages[item.stages.length - 1]?.updatedAt || item.createdAt).getTime();
      return Math.max(0, resolvedAtMs - new Date(item.createdAt).getTime());
    });
    const avgMs = resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length;
    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    avgResText = `${avgHours} hrs`;
  }

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
                    activeSubTab === 'alerts' ? t('adminAlerts') || "Area Impact Alerts" :
                      activeSubTab === 'kiosks' ? t('adminKiosks') || "Kiosk Network Management" : t('adminComplaints')}
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

            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition">
              <Moon size={20} />
            </button>

            <div className="relative hidden lg:block">
              <input
                type="text"
                placeholder="Universal Search..."
                className="bg-gray-100 pl-10 pr-4 py-2 w-64 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              {/* Date Filter & Actions */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative">
                <div className="flex items-center gap-4">
                  <div 
                     onClick={() => setShowDatePicker(!showDatePicker)}
                     className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                  >
                    <Calendar size={18} className="text-blue-500" />
                    {dateRange === '7D' ? 'Last 7 Days' : dateRange === '30D' ? 'Last 30 Days' : dateRange === '90D' ? 'Last 3 Months' : 'Last Year'} <ChevronDown size={14} />
                  </div>
                  {showDatePicker && (
                     <div className="absolute top-full left-4 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 w-48">
                        {['7D', '30D', '90D', '1Y'].map(range => (
                           <button 
                              key={range}
                              onClick={() => { setDateRange(range as any); setShowDatePicker(false); }}
                              className={`w-full text-left px-4 py-2 text-sm font-bold rounded-lg transition ${dateRange === range ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                           >
                              {range === '7D' ? 'Last 7 Days' : range === '30D' ? 'Last 30 Days' : range === '90D' ? 'Last 3 Months' : 'Last Year'}
                           </button>
                        ))}
                     </div>
                  )}
                </div>
                <div className="flex gap-3">
                   <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition">
                     <Download size={16} /> Export PDF
                   </button>
                   <button className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-sm font-bold transition">
                     <Download size={16} /> Export Excel
                   </button>
                </div>
              </div>

              {/* SLA Violation Alert */}
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
                 <div className="flex items-center gap-3 w-full">
                   <AlertTriangle className="text-red-500 shrink-0" size={24} />
                   <div>
                     <p className="font-black text-red-900">SLA Violation Alert</p>
                     <p className="text-red-700 text-sm font-medium">12 Complaints and 5 Requests have breached their 48-hour resolution SLA.</p>
                   </div>
                 </div>
                 <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md shadow-red-200 transition whitespace-nowrap">
                   Review Now
                 </button>
              </div>

              {/* Pending Tasks & Quick Action Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div 
                   onClick={() => setActiveSubTab('complaints')}
                   className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 hover:shadow-lg transition cursor-pointer group flex flex-col relative overflow-hidden"
                >
                   <div className="absolute -right-6 -top-6 bg-red-50 w-24 h-24 rounded-full group-hover:scale-110 transition duration-500"></div>
                   <div className="flex justify-between items-start relative z-10 mb-2">
                      <div className="p-3 bg-red-100 rounded-2xl text-red-600"><AlertCircle size={24}/></div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 px-3 py-1 rounded-full">ACTION REQ</span>
                   </div>
                   <h3 className="text-3xl font-black text-slate-800 relative z-10">{complaints.filter(c => c.status === 'Pending').length}</h3>
                   <p className="font-bold text-slate-500 mt-1 relative z-10">{t('pendingComplaints')}</p>
                   <div className="mt-4 flex items-center text-xs font-bold text-red-500 group-hover:gap-2 transition-all">Manage Now <ArrowRight size={14} className="ml-1"/></div>
                </div>

                <div 
                   onClick={() => setActiveSubTab('requests')}
                   className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 hover:shadow-lg transition cursor-pointer group flex flex-col relative overflow-hidden"
                >
                   <div className="absolute -right-6 -top-6 bg-blue-50 w-24 h-24 rounded-full group-hover:scale-110 transition duration-500"></div>
                   <div className="flex justify-between items-start relative z-10 mb-2">
                      <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><FileText size={24}/></div>
                   </div>
                   <h3 className="text-3xl font-black text-slate-800 relative z-10">{serviceRequests.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length}</h3>
                   <p className="font-bold text-slate-500 mt-1 relative z-10">{t('activeRequests') || 'Active Requests'}</p>
                   <div className="mt-4 flex items-center text-xs font-bold text-blue-500 group-hover:gap-2 transition-all">Review Pipeline <ArrowRight size={14} className="ml-1"/></div>
                </div>
                
                <div 
                   onClick={() => setActiveSubTab('alerts')}
                   className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 hover:shadow-lg transition cursor-pointer group flex flex-col relative overflow-hidden"
                >
                   <div className="absolute -right-6 -top-6 bg-orange-50 w-24 h-24 rounded-full group-hover:scale-110 transition duration-500"></div>
                   <div className="flex justify-between items-start relative z-10 mb-2">
                      <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><AlertTriangle size={24}/></div>
                      {areaAlerts.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
                   </div>
                   <h3 className="text-3xl font-black text-slate-800 relative z-10">{areaAlerts.length}</h3>
                   <p className="font-bold text-slate-500 mt-1 relative z-10">Unresolved Impact Alerts</p>
                   <div className="mt-4 flex items-center text-xs font-bold text-orange-500 group-hover:gap-2 transition-all">Command Center <ArrowRight size={14} className="ml-1"/></div>
                </div>

              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: translateDynamic("Total Complaints") || "Total Complaints", val: complaints.length, icon: AlertCircle, color: 'red' },
                  { label: translateDynamic("Resolved") || "Resolved", val: complaints.filter(c => c.status === 'Resolved').length, icon: CheckCircle, color: 'green' },
                  { label: translateDynamic("Pending Requests") || "Pending Requests", val: pendingRequests, icon: Clock, color: pendingColor },
                  { label: translateDynamic("Today's Requests") || "Today's Requests", val: todaysRequests, icon: Calendar, color: 'blue' },
                  { label: translateDynamic("Average Resolution Time") || "Average Resolution Time", val: avgResText, icon: Clock, color: 'purple' },
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

              {/* Activity Row */}
              <div className="grid grid-cols-1 gap-10">
                {/* Recent Activity Feed */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        <Activity className="text-green-500" size={20} /> System Activity Log
                     </h3>
                     <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">Live Sync</span>
                  </div>
                  <div className="flex-1 space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                     {activityLog.length === 0 ? (
                        <div className="text-center text-slate-400 font-bold py-10">No recent activity</div>
                     ) : (
                        activityLog.map((log) => (
                           <div key={log.id} className="relative pl-6 pb-4 border-l-2 border-slate-100 last:border-transparent group">
                              <span className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-slate-200 border-4 border-white group-hover:bg-blue-400 transition-colors"></span>
                              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl rounded-tl-none -mt-2">
                                 <div className="flex justify-between items-start mb-1 gap-2">
                                    <h4 className="font-bold text-sm text-slate-700">{log.action}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </div>
                                 <p className="text-xs text-slate-500 font-medium leading-relaxed">{log.details}</p>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <BarChart2 className="text-blue-500" /> {t('deptPerformance')}
                  </h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activeMetrics.bar}>
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

                <div className="bg-white p-8 rounded-3xl shadow-sm border flex flex-col">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <MessageSquare className="text-blue-500" /> Feedback Sentiment
                  </h3>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeMetrics.sentiment}
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {activeMetrics.sentiment.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'requests' && (
             <AdminRequests 
                requests={serviceRequests} 
                updateStage={updateServiceStage} 
             />
          )}

          {activeSubTab === 'alerts' && (
             <AdminAlerts 
                alerts={areaAlerts} 
                onViewComplaints={(category, area) => {
                   setActiveSubTab('complaints');
                   setSelectedCategory(category);
                   setSearchTerm(area);
                }} 
             />
          )}

          {activeSubTab === 'complaints' && (
             <AdminComplaints 
                complaints={getComplaintsByCategory(selectedCategory).filter(c => {
                  const matchesSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm) || c.name.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
                  return matchesSearch && matchesPriority;
                }).sort((a, b) => {
                  const priorityA = PRIORITY_ORDER[a.priority] ?? 1;
                  const priorityB = PRIORITY_ORDER[b.priority] ?? 1;
                  if (priorityB !== priorityA) return priorityB - priorityA; 
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                updateStage={updateComplaintStage}
                updateStatus={updateComplaintStatus}
                searchTerm={searchTerm}
             />
          )}

          {activeSubTab === 'kiosks' && <KioskNetwork />}
        </div>
      </main>
    </div>
  );
};

export default Admin;
