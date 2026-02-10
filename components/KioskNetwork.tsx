import React, { useState } from 'react';
import { useServiceComplaint } from '../contexts/ServiceComplaintContext';
import { Kiosk } from '../types';
import { Wifi, WifiOff, Battery, Activity, Plus, Power, Terminal, X, LayoutGrid } from 'lucide-react';

const KioskNetwork: React.FC = () => {
    const { kiosks, addKiosk } = useServiceComplaint();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Kiosk>>({
        status: 'Online',
        network: 'Good',
        userLoad: 'Low',
        battery: 100
    });

    const handleAddKiosk = () => {
        if (!formData.id || !formData.location) return;

        const newKiosk: Kiosk = {
            id: formData.id,
            location: formData.location,
            status: formData.status as any || 'Online',
            battery: Number(formData.battery) || 100,
            network: formData.network as any || 'Good',
            userLoad: formData.userLoad as any || 'Low',
            lastActive: new Date().toISOString(),
            todayUsers: 0,
            complaintsToday: 0
        };

        addKiosk(newKiosk);
        setIsModalOpen(false);
        setFormData({ status: 'Online', network: 'Good', userLoad: 'Low', battery: 100 });
    };

    const getStatusColor = (status: string) => status === 'Online' ? 'border-green-500 bg-green-50/50' : 'border-red-500 bg-red-50/50';
    const getNetworkIcon = (net: string) => {
        if (net === 'Good') return <Wifi className="text-green-600" size={16} />;
        if (net === 'Weak') return <Wifi className="text-yellow-600" size={16} />;
        return <WifiOff className="text-red-600" size={16} />;
    };

    return (
        <div className="p-8 h-full overflow-y-auto pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><LayoutGrid className="text-blue-600" /> Kiosk Network</h1>
                    <p className="text-slate-500 font-medium mt-1">Monitor deployment status and health</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                    <Plus size={18} /> Provision New Kiosk
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {kiosks.map(kiosk => (
                    <div key={kiosk.id} className={`bg-white rounded-2xl border-l-[6px] shadow-sm hover:shadow-xl transition-all p-6 group ${getStatusColor(kiosk.status)}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-black text-lg text-slate-800">{kiosk.location}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Terminal size={14} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{kiosk.id}</span>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${kiosk.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {kiosk.status}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {/* Battery */}
                            <div>
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span className="flex items-center gap-1"><Battery size={12} /> Battery</span>
                                    <span>{kiosk.battery}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${kiosk.battery > 20 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${kiosk.battery}%` }}></div>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Network</span>
                                    <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                                        {getNetworkIcon(kiosk.network)} {kiosk.network}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Load</span>
                                    <div className="flex items-center gap-2 font-bold text-slate-700 text-sm">
                                        <Activity size={16} className="text-blue-500" /> {kiosk.userLoad}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                                <div className="text-center">
                                    <span className="block font-black text-lg text-slate-800">{kiosk.todayUsers}</span>
                                    <span className="text-slate-400 font-medium">Users</span>
                                </div>
                                <div className="h-8 w-px bg-slate-100"></div>
                                <div className="text-center">
                                    <span className="block font-black text-lg text-slate-800">{kiosk.complaintsToday}</span>
                                    <span className="text-slate-400 font-medium">Complaints</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => console.log('Reboot', kiosk.id)} className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-slate-200">
                                <Power size={14} /> Reboot
                            </button>
                            <button onClick={() => console.log('Diagnostics', kiosk.id)} className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-slate-200">
                                <Activity size={14} /> Diagnostics
                            </button>
                        </div>
                    </div>
                ))}

                {/* Provision New Card */}
                <button onClick={() => setIsModalOpen(true)} className="min-h-[300px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 transition flex flex-col items-center justify-center gap-4 group">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition">
                        <Plus size={32} />
                    </div>
                    <span className="font-bold text-slate-400 group-hover:text-blue-600">Provision New Kiosk</span>
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">Provision New Kiosk</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Kiosk ID</label>
                                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500"
                                    placeholder="K-XXX"
                                    value={formData.id || ''}
                                    onChange={e => setFormData({ ...formData, id: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Location</label>
                                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none focus:border-blue-500"
                                    placeholder="e.g. Main Market"
                                    value={formData.location || ''}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                        <option value="Online">Online</option>
                                        <option value="Offline">Offline</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Battery %</label>
                                    <input type="number" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold outline-none"
                                        value={formData.battery} onChange={e => setFormData({ ...formData, battery: Number(e.target.value) })} />
                                </div>
                            </div>
                            <button onClick={handleAddKiosk} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold mt-4 hover:bg-blue-700 shadow-lg shadow-blue-500/30">
                                Deploy Kiosk
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default KioskNetwork;
