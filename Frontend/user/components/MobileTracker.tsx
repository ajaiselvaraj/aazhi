import React from 'react';
import { Shield, Clock, CheckCircle, Smartphone, MapPin, Search } from 'lucide-react';

interface Props {
    trackId: string;
}

const MobileTracker: React.FC<Props> = ({ trackId }) => {
    // We can fetch real data here, but for this demo we'll use a mocked status
    const mockStatus = {
        id: trackId,
        service: 'Civic Complaint',
        dept: 'Municipal Corp',
        status: 'In Progress',
        steps: [
            { label: 'Submitted', date: '25 Mar, 10:15 AM', current: false, done: true },
            { label: 'Assigned', date: '25 Mar, 11:30 AM', current: true, done: true },
            { label: 'Inspection', date: 'Waiting...', current: false, done: false },
            { label: 'Resolved', date: 'Waiting...', current: false, done: false }
        ]
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100">
            {/* Header */}
            <header className="bg-slate-900 text-white p-6 pb-20 rounded-b-[3rem] shadow-xl relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Shield size={24} className="text-white" />
                        </div>
                        <h1 className="text-xl font-black tracking-tighter">SUVIDHA MOBILE</h1>
                    </div>
                    <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/30">
                        Live Tracking
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 opacity-80">Reference Number</p>
                    <h2 className="text-4xl font-black tracking-tighter">{trackId}</h2>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 -mt-12 px-5 pb-10 space-y-6">
                {/* Status Card */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 animate-in slide-in-from-bottom-6">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                            <h3 className="text-3xl font-black text-slate-900">{mockStatus.status}</h3>
                        </div>
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center animate-pulse">
                            <Clock size={28} />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-0 relative">
                        {/* Line */}
                        <div className="absolute left-6 top-2 bottom-6 w-1 bg-slate-100 rounded-full" />
                        
                        {mockStatus.steps.map((step, idx) => (
                            <div key={idx} className="flex gap-6 pb-10 relative">
                                <div className={`
                                    w-12 h-12 rounded-2xl flex items-center justify-center z-10 
                                    ${step.done ? 'bg-green-100 text-green-600 border border-green-200 shadow-sm shadow-green-100' : 'bg-slate-100 text-slate-300'}
                                    ${step.current ? 'ring-4 ring-green-100 animate-pulse' : ''}
                                `}>
                                    {step.done ? <CheckCircle size={20} /> : <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h4 className={`font-black text-lg ${step.done ? 'text-slate-900' : 'text-slate-300'}`}>{step.label}</h4>
                                    <p className={`text-xs font-bold ${step.done ? 'text-slate-500' : 'text-slate-300'}`}>{step.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-8 border-t border-slate-50 grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Assigned To</p>
                            <p className="text-sm font-bold text-slate-800">Zonal Officer</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Estimate</p>
                            <p className="text-sm font-bold text-slate-800">48 Hours</p>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group active:scale-[0.98] transition-transform">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h4 className="text-xl font-black mb-1">Save Tracking</h4>
                            <p className="text-sm font-medium opacity-80">Add to your home screen for quick access.</p>
                        </div>
                        <Smartphone size={32} />
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Smartphone size={150} />
                    </div>
                </div>

                {/* Branding */}
                <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] pt-4">
                    Digital India Initiative • AAZHI Platform
                </p>
            </main>
        </div>
    );
};

export default MobileTracker;
