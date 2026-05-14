import React, { useState } from 'react';
import { ArrowLeft, Search, RefreshCw, SearchCode, CheckCircle, Clock, FileText, Printer, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack: () => void;
  language: Language;
}

type TimelineStep = {
  id: number;
  title: string;
  desc: string;
  date: string;
  status: 'completed' | 'current' | 'pending';
};

const MunicipalTracker: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Mock Data
  const [trackingData, setTrackingData] = useState<{
    id: string;
    type: string;
    applicant: string;
    submissionDate: string;
    tat: string;
    status: string;
    assignedDept: string;
    officer: string;
    timeline: TimelineStep[];
  } | null>(null);

  const handleSearch = () => {
    if (!query) return;
    setIsLoading(true);

    setTimeout(() => {
      // Logic for demo purposes: return mock data
      const isWater = query.toUpperCase().includes('WTR');
      const isTax = query.toUpperCase().includes('TAX');
      
      let typeDesc = 'Municipal Complaint';
      let dept = 'Civic Maintenance Dept';
      let tatDuration = '48 Hours';
      let timelineNodes: TimelineStep[] = [
        { id: 1, title: 'Complaint Registered', desc: 'Ticket successfully logged.', date: '17-Apr-2026 09:30 AM', status: 'completed' },
        { id: 2, title: 'Department Assigned', desc: 'Routed to Ward Supervisor.', date: '17-Apr-2026 11:15 AM', status: 'completed' },
        { id: 3, title: 'Resolution In Progress', desc: 'Field staff dispatched to location.', date: '18-Apr-2026 10:00 AM', status: 'current' },
        { id: 4, title: 'Resolved', desc: 'Awaiting citizen closure confirmation.', date: 'Pending', status: 'pending' },
        { id: 5, title: 'Closed', desc: 'Complaint ticket formally closed.', date: 'Pending', status: 'pending' }
      ];

      if (isWater) {
         typeDesc = 'New Water Connection';
         dept = 'Water Supply Sub-Division';
         tatDuration = '14 Working Days';
         timelineNodes = [
           { id: 1, title: 'Application Received', desc: 'Initial documents verified.', date: '15-Apr-2026 10:30 AM', status: 'completed' },
           { id: 2, title: 'Site Inspection', desc: 'Assigned to Assistant Engineer.', date: '17-Apr-2026 02:20 PM', status: 'completed' },
           { id: 3, title: 'Pipeline Assessment', desc: 'Pending road cut approval.', date: '18-Apr-2026 09:15 AM', status: 'current' },
           { id: 4, title: 'Meter Installation', desc: 'Pending connection routing.', date: 'Pending', status: 'pending' },
           { id: 5, title: 'Service Active', desc: 'Water service fully operational.', date: 'Pending', status: 'pending' }
         ];
      }

      setTrackingData({
        id: query.toUpperCase(),
        type: typeDesc,
        applicant: 'Deepa Krishnan',
        submissionDate: '15-Apr-2026',
        tat: tatDuration,
        status: 'In Progress',
        assignedDept: dept,
        officer: 'S. Ramkumar (AE)',
        timeline: timelineNodes
      });
      setHasSearched(true);
      setIsLoading(false);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-6 pb-12">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition print:hidden">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Search Area */}
        <div className="w-full lg:w-1/3 space-y-6 print:hidden">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
            <div className="w-20 h-20 bg-cyan-50 text-cyan-600 rounded-[2rem] flex items-center justify-center mb-6 border border-cyan-100">
              <SearchCode size={36} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">Track Application</h2>
            <p className="text-slate-500 font-medium text-sm mb-8">
              Monitor the status of your municipal requests, water applications, and civic complaints.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Application / Ticket ID
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. MC-WTR-12345"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-cyan-500 focus:bg-white transition"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || !query}
                className="w-full bg-cyan-600 text-white p-4 rounded-xl font-black text-lg hover:bg-cyan-700 shadow-lg shadow-cyan-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                {t('searchBtn') || 'Track Status'}
              </button>
            </div>
          </div>

          {!trackingData && hasSearched && !isLoading && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 text-sm">No Record Found</h4>
                <p className="text-xs text-amber-700 mt-1 font-medium">We couldn't find any request matching this ID. Please verify the ID and try again.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Tracking Results */}
        <div className="w-full lg:w-2/3">
          {trackingData ? (
             <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative print:shadow-none print:border-none">
                
                {/* Header info */}
                <div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-2">
                           <Building2 size={14} /> {trackingData.type}
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{trackingData.id}</h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">Applicant: <span className="font-bold text-slate-700">{trackingData.applicant}</span></p>
                    </div>

                    <div className="text-left md:text-right">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm font-bold border border-amber-200">
                           <Clock size={16} /> {trackingData.status}
                        </div>
                    </div>
                </div>

                <div className="px-8 py-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white">
                    <div className="flex gap-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Dept</p>
                            <p className="font-bold text-slate-700 text-sm">{trackingData.assignedDept}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handling Officer</p>
                            <p className="font-bold text-slate-700 text-sm">{trackingData.officer}</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-right">SLA / Timeline</p>
                        <p className="text-sm font-bold text-slate-600 flex items-center justify-end gap-1">
                            <ShieldCheck size={16} className="text-green-600"/> {trackingData.tat}
                        </p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="p-8 pt-6 relative">
                    <button onClick={handlePrint} className="absolute top-4 right-8 flex items-center gap-2 text-slate-400 hover:text-cyan-600 font-bold text-sm transition print:hidden z-10">
                        <Printer size={16} /> Print Status
                    </button>

                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 mt-4">
                       {trackingData.timeline.map((item) => (
                           <div key={item.id} className="relative pl-8">
                               {/* Bullet */}
                               <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                                   item.status === 'completed' ? 'bg-green-500 border-green-500' :
                                   item.status === 'current' ? 'bg-white border-cyan-500 ring-4 ring-cyan-50' :
                                   'bg-white border-slate-200'
                               }`}>
                               </div>

                               <h4 className={`text-lg font-bold ${
                                   item.status === 'completed' ? 'text-slate-800' :
                                   item.status === 'current' ? 'text-cyan-700' :
                                   'text-slate-400'
                               }`}>{item.title}</h4>
                               
                               <p className="text-sm font-medium text-slate-500 mt-1 mb-2 max-w-sm leading-relaxed">{item.desc}</p>
                               
                               <p className={`text-xs font-bold uppercase tracking-wider ${item.status === 'pending' ? 'text-slate-300' : 'text-slate-400'}`}>
                                   {item.date}
                               </p>
                           </div>
                       ))}
                    </div>
                </div>

             </div>
          ) : (
            <div className="h-full bg-white rounded-[2.5rem] p-12 border border-slate-100 border-dashed flex flex-col items-center justify-center text-center print:hidden">
                <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                   <SearchCode size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-400 mb-2">Awaiting Inquiry</h3>
                <p className="text-slate-400 font-medium max-w-sm">
                    Enter your application or complaint ticket ID in the search box to monitor its real-time progress.
                </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MunicipalTracker;
