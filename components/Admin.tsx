
import React, { useState } from 'react';
import { ArrowLeft, Users, FileText, CheckCircle, Clock, BarChart2, Search, Filter, Eye, UserCheck, MessageSquare, AlertCircle, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MOCK_REQUESTS, TRANSLATIONS } from '../constants';
import { Language } from '../types';

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
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'requests' | 'complaints'>('overview');
  const t = TRANSLATIONS[language];

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
            { id: 'overview', label: t.adminDashboard, icon: BarChart2 },
            { id: 'requests', label: t.adminRequests, icon: FileText },
            { id: 'complaints', label: t.adminComplaints, icon: AlertCircle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${activeSubTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-blue-200 hover:bg-white/10'}`}
            >
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-8 space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-xs text-blue-300 font-bold uppercase tracking-wider mb-2">{t.sysStatus}</p>
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold">{t.statusActive}</p>
            </div>
          </div>
          <button 
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-4 rounded-2xl font-bold transition-all"
          >
            <ArrowLeft size={18} /> {t.logout}
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
                {activeSubTab === 'overview' ? t.adminDashboard : 
                 activeSubTab === 'requests' ? t.adminRequests : t.adminComplaints}
              </h2>
              <p className="text-sm text-gray-500">{t.welcomeBack}, Admin ID: 963852</p>
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
              <input type="text" placeholder="Search ID..." className="bg-gray-100 pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
                  { label: t.citizensServed, val: '1,284', icon: Users, color: 'blue' },
                  { label: t.pendingRequests, val: '42', icon: Clock, color: 'amber' },
                  { label: t.slaMet, val: '96.4%', icon: CheckCircle, color: 'green' },
                  { label: t.avgFeedback, val: '4.8/5', icon: MessageSquare, color: 'purple' }
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
                    <BarChart2 className="text-blue-500" /> {t.deptPerformance}
                  </h3>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="applications" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border">
                  <h3 className="text-lg font-bold mb-8">{t.serviceDistribution}</h3>
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
               <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold">{t.activeApps}</h3>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold border hover:bg-gray-50">
                      <Filter size={14} /> Filter
                    </button>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-100">
                      Bulk Export
                    </button>
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
                       {MOCK_REQUESTS.map((req) => (
                          <tr key={req.id} className="hover:bg-blue-50/30 transition">
                             <td className="px-8 py-6 font-bold text-blue-600">{req.id}</td>
                             <td className="px-8 py-6 font-bold text-gray-900">{req.citizenName}</td>
                             <td className="px-8 py-6">{req.type}</td>
                             <td className="px-8 py-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${req.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                   {req.status}
                                </span>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <div className="flex gap-2 justify-end">
                                   <button className="p-2 hover:bg-white rounded-lg border transition text-gray-500 hover:text-blue-600" title="View Documents"><Eye size={18} /></button>
                                   <button className="p-2 hover:bg-white rounded-lg border transition text-gray-500 hover:text-green-600" title="Approve"><UserCheck size={18} /></button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeSubTab === 'complaints' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {[1, 2, 3].map((i) => (
                 <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border-l-8 border-red-500">
                    <div className="flex justify-between items-start mb-4">
                       <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">High Priority</span>
                       <p className="text-xs text-gray-400">Received: 2h ago</p>
                    </div>
                    <h4 className="text-xl font-bold mb-2">Illegal Water Tapping Reported</h4>
                    <p className="text-gray-500 text-sm mb-6">Citizen reported multiple illegal connections in Ward 12. Significant pressure loss for legitimate users.</p>
                    <div className="flex gap-4 border-t pt-6">
                       <button className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold text-xs hover:bg-red-700">Dispatch Team</button>
                       <button className="flex-1 bg-gray-100 p-3 rounded-xl font-bold text-xs hover:bg-gray-200">View Map Location</button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
