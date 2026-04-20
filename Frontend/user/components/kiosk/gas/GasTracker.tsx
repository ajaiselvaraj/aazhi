import React, { useState } from 'react';
import { ArrowLeft, Search, RefreshCw, SearchCode, CheckCircle, Clock, FileText, Printer, ShieldCheck, AlertCircle, Flame } from 'lucide-react';
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

const GasTracker: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Mock Data
  const [trackingData, setTrackingData] = useState<{
    id: string;
    type: string;
    consumer: string;
    submissionDate: string;
    tat: string;
    status: string;
    timeline: TimelineStep[];
  } | null>(null);

  const handleSearch = () => {
    if (!query) return;
    setIsLoading(true);

    setTimeout(() => {
      // Logic for demo purposes: return mock data based on Gas request types
      const isComplaint = query.includes('CMP');
      setTrackingData({
        id: query.toUpperCase(),
        type: isComplaint ? 'Gas Leak / Complaint' : 'New Gas Connection',
        consumer: 'Arjun Das',
        submissionDate: '17-Apr-2026',
        tat: isComplaint ? '24 Hours' : '7 Working Days',
        status: 'In Progress',
        timeline: [
          { id: 1, title: 'Request Submitted', desc: 'Received successfully.', date: '17-Apr-2026 09:30 AM', status: 'completed' },
          { id: 2, title: 'Document / Detail Verification', desc: 'Basic details verified.', date: '18-Apr-2026 10:15 AM', status: 'completed' },
          { id: 3, title: 'Field Inspection', desc: 'Assigned to Gas Engineer for site survey.', date: '19-Apr-2026 09:00 AM', status: 'current' },
          { id: 4, title: 'Clearance & Safety Check', desc: 'Pending safety approval.', date: 'Pending', status: 'pending' },
          { id: 5, title: 'Service Fulfilled', desc: 'Completion of request.', date: 'Pending', status: 'pending' }
        ]
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
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mb-6 border border-orange-100">
              <SearchCode size={36} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2">{t('gas_trackReq') || 'Track Request'}</h2>
            <p className="text-slate-500 font-medium text-sm mb-8">
              {t('gas_trackDesc') || 'Check real-time status of your gas service requests or complaints.'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  {t('ticketNumber') || 'Application / Ticket ID'}
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. GAS-12345"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || !query}
                className="w-full bg-orange-600 text-white p-4 rounded-xl font-black text-lg hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                {t('searchBtn') || 'Track Status'}
              </button>
            </div>
          </div>

          {!trackingData && hasSearched && !isLoading && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-800 text-sm">{t('noRecordFound') || 'No Record Found'}</h4>
                <p className="text-xs text-red-700 mt-1 font-medium">{t('verifyId') || "We couldn't find any request matching this ID. Please verify the ID and try again."}</p>
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
                        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-2">
                           <Flame size={14} /> {trackingData.type}
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{trackingData.id}</h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">{t('consumer') || 'Consumer'}: <span className="font-bold text-slate-700">{trackingData.consumer}</span></p>
                    </div>

                    <div className="text-left md:text-right">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('currentStatus') || 'Current Status'}</p>
                        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl text-sm font-bold border border-yellow-200">
                           <Clock size={16} /> {trackingData.status}
                        </div>
                    </div>
                </div>

                <div className="p-8 pb-4 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-green-600"/> SLA/TAT: <span className="text-slate-900">{trackingData.tat}</span>
                    </p>
                    <button onClick={handlePrint} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-sm transition print:hidden">
                        <Printer size={18} /> {t('printStatus') || 'Print Status'}
                    </button>
                </div>

                {/* Timeline */}
                <div className="p-8 pt-4">
                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-8">
                       {trackingData.timeline.map((item) => (
                           <div key={item.id} className="relative pl-8">
                               {/* Bullet */}
                               <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                                   item.status === 'completed' ? 'bg-green-500 border-green-500' :
                                   item.status === 'current' ? 'bg-white border-orange-500 ring-4 ring-orange-50' :
                                   'bg-white border-slate-200'
                               }`}>
                               </div>

                               <h4 className={`text-lg font-bold ${
                                   item.status === 'completed' ? 'text-slate-800' :
                                   item.status === 'current' ? 'text-orange-700' :
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
                <h3 className="text-2xl font-black text-slate-400 mb-2">{t('awaitingInquiry') || 'Awaiting Inquiry'}</h3>
                <p className="text-slate-400 font-medium max-w-sm">
                    {t('enterIdToTrack') || 'Enter your application or complaint ID in the search box to trace its real-time progress.'}
                </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default GasTracker;
