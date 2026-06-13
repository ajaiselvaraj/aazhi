import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, MapPin, Edit3, Save, Shield, History, Plus, FileText, Download, CheckCircle, Clock, Zap, Home, DollarSign, X, Check, Building, AlertCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useOrientation } from '../../../contexts/OrientationContext';
import KioskInput from '../KioskInput';
import RazorpayCheckout from '../../RazorpayCheckout';

interface Props {
  onBack: () => void;
  language: Language;
}

// --- Mock Data simulating a comprehensive backend like Tangedco ---
const MOCK_CONNECTIONS = [
  {
    id: "04-234-5678",
    address: "12, Kamaraj Road, Chennai",
    tariff: "Domestic (LT-1A)",
    currentDue: { amount: 1450.00, dueDate: "25 Jun 2026", status: "UNPAID" },
    lastPayment: { amount: 1200.00, date: "22 Apr 2026", receipt: "TXN987654321" },
    history: [
      { month: "May 2026", units: 210, amount: 1450, dueDate: "25 Jun 2026", status: "UNPAID" },
      { month: "Mar 2026", units: 180, amount: 1200, dueDate: "25 Apr 2026", status: "PAID", receipt: "TXN987654321" },
      { month: "Jan 2026", units: 250, amount: 1750, dueDate: "25 Feb 2026", status: "PAID", receipt: "TXN123456789" },
      { month: "Nov 2025", units: 310, amount: 2400, dueDate: "25 Dec 2025", status: "PAID", receipt: "TXN555555555" },
    ]
  },
  {
    id: "04-987-6543",
    address: "45, Anna Salai, Chennai",
    tariff: "Commercial (LT-5)",
    currentDue: { amount: 0, dueDate: "-", status: "NO_DUES" },
    lastPayment: { amount: 4500.00, date: "10 May 2026", receipt: "TXN11223344" },
    history: [
      { month: "Apr 2026", units: 600, amount: 4500, dueDate: "25 May 2026", status: "PAID", receipt: "TXN11223344" },
      { month: "Feb 2026", units: 580, amount: 4200, dueDate: "25 Mar 2026", status: "PAID", receipt: "TXN99887766" },
      { month: "Dec 2025", units: 620, amount: 4800, dueDate: "25 Jan 2026", status: "PAID", receipt: "TXN44443333" },
    ]
  }
];

const ElectricityProfile: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const { isVertical } = useOrientation();

  // Load real user profile from localStorage session
  const getInitialProfile = () => {
    try {
      const stored = localStorage.getItem('aazhi_user');
      const user = stored ? JSON.parse(stored) : null;
      return {
        name: user?.name || 'Vetrivel M',
        mobile: user?.mobile || '+91 98765 43210',
        email: user?.email || 'vetri@example.com',
      };
    } catch {
      return { name: 'Vetrivel M', mobile: '+91 98765 43210', email: 'vetri@example.com' };
    }
  };

  const [profileData] = useState(getInitialProfile);
  const [connections, setConnections] = useState(MOCK_CONNECTIONS);
  const [activeConnectionId, setActiveConnectionId] = useState(MOCK_CONNECTIONS[0].id);
  
  // Add Connection Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newConsumerNo, setNewConsumerNo] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const activeConnection = connections.find(c => c.id === activeConnectionId) || connections[0];

  const handleAddConnection = () => {
    setIsAdding(true);
    // Simulate API Call
    setTimeout(() => {
      setConnections([...connections, {
        id: newConsumerNo || "04-555-1234",
        address: "New Added Connection Address",
        tariff: "Domestic (LT-1A)",
        currentDue: { amount: 500, dueDate: "25 Jul 2026", status: "UNPAID" },
        lastPayment: { amount: 600, date: "20 May 2026", receipt: "TXNNEW123" },
        history: [
          { month: "Jun 2026", units: 100, amount: 500, dueDate: "25 Jul 2026", status: "UNPAID" },
          { month: "Apr 2026", units: 120, amount: 600, dueDate: "25 May 2026", status: "PAID", receipt: "TXNNEW123" }
        ]
      }]);
      setActiveConnectionId(newConsumerNo || "04-555-1234");
      setShowAddModal(false);
      setNewConsumerNo('');
      setNewPin('');
      setIsAdding(false);
    }, 1500);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    // Optimistically update the UI to show the bill is paid
    setConnections(prev => prev.map(conn => {
      if(conn.id === activeConnectionId) {
        return {
          ...conn,
          currentDue: { amount: 0, dueDate: "-", status: "NO_DUES" as any },
          lastPayment: { amount: conn.currentDue.amount, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), receipt: paymentId }
        };
      }
      return conn;
    }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in max-w-[1400px] mx-auto w-full">
      <div className="px-4 py-6 border-b border-slate-200 flex justify-between items-center bg-white z-10 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-black text-sm uppercase tracking-widest hover:text-slate-900 transition">
          <ArrowLeft size={20} /> {t('backToUtils') || 'Back'}
        </button>
      </div>

      <div className={`flex flex-1 min-h-0 ${isVertical ? 'flex-col overflow-y-auto bg-slate-50' : 'flex-row'}`}>
        
        {/* Left Sidebar -> unpacks to siblings in vertical mode */}
        <div className={isVertical ? 'contents' : 'w-[380px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0'}>
          {/* Customer Profile */}
          <div className={`p-6 shrink-0 border-slate-200 ${isVertical ? 'order-1 border-b bg-slate-50' : 'border-b'}`}>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Customer Profile</h2>
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <User size={28} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800">{profileData.name}</h3>
                    <p className="text-sm font-bold text-slate-500">{profileData.mobile}</p>
                </div>
            </div>
          </div>

          <div className={`p-6 space-y-4 custom-scrollbar ${isVertical ? 'order-3 bg-slate-50' : 'flex-1 overflow-y-auto'}`}>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">My Connections</h2>
            {connections.map(conn => (
                <button
                    key={conn.id}
                    onClick={() => setActiveConnectionId(conn.id)}
                    className={`w-full text-left p-5 rounded-2xl transition-all border-2 ${activeConnectionId === conn.id ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/30' : 'bg-white border-slate-100 hover:border-blue-300 shadow-sm'}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="font-mono font-bold text-lg">{conn.id}</div>
                        {conn.currentDue.status === 'UNPAID' ? (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${activeConnectionId === conn.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                Due
                            </span>
                        ) : (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${activeConnectionId === conn.id ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                                Paid
                            </span>
                        )}
                    </div>
                    <div className={`text-xs font-bold mb-1 line-clamp-1 ${activeConnectionId === conn.id ? 'text-blue-100' : 'text-slate-500'}`}>
                        {conn.address}
                    </div>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${activeConnectionId === conn.id ? 'text-blue-200' : 'text-slate-400'}`}>
                        {conn.tariff}
                    </div>
                </button>
            ))}
          </div>

          {/* Add Connection Bottom */}
          <div className={`p-6 shrink-0 border-slate-200 ${isVertical ? 'order-4 bg-slate-100/50 pb-12' : 'border-t bg-slate-100/50 mt-auto'}`}>
            <button 
                onClick={() => setShowAddModal(true)}
                className="w-full bg-white border-2 border-dashed border-blue-300 text-blue-600 font-bold p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-50 transition hover:border-blue-500 hover:shadow-md"
            >
                <Plus size={20} /> Add Existing Connection
            </button>
          </div>
        </div>

        {/* Right Content: Dashboard for Active Connection */}
        <div className={`bg-white p-6 sm:p-10 custom-scrollbar ${isVertical ? 'order-2 border-b-2 border-slate-200 shadow-sm z-10' : 'flex-1 overflow-y-auto'}`}>
            
            <div className="mb-10 animate-in slide-in-from-right-8 duration-500">
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2">
                    <Zap className="text-yellow-500 fill-yellow-500" size={32} />
                    Consumer No: <span className="font-mono text-blue-600">{activeConnection.id}</span>
                </h1>
                <p className="text-slate-500 font-bold flex items-center gap-2">
                    <MapPin size={16} /> {activeConnection.address}
                </p>
            </div>

            {/* At-a-Glance Panel */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8 mb-12">
                {/* Current Due */}
                <div className={`p-8 rounded-[2.5rem] shadow-xl border ${activeConnection.currentDue.status === 'UNPAID' ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${activeConnection.currentDue.status === 'UNPAID' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className={`text-xs font-black uppercase tracking-widest ${activeConnection.currentDue.status === 'UNPAID' ? 'text-red-500' : 'text-green-600'}`}>Current Status</p>
                            <h3 className={`text-xl font-bold ${activeConnection.currentDue.status === 'UNPAID' ? 'text-red-900' : 'text-green-900'}`}>
                                {activeConnection.currentDue.status === 'UNPAID' ? 'Action Required' : 'All Clear'}
                            </h3>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Due Amount</p>
                        <h2 className="text-5xl font-black text-slate-900 font-mono tracking-tighter">
                            ₹{activeConnection.currentDue.amount.toFixed(2)}
                        </h2>
                        {activeConnection.currentDue.status === 'UNPAID' && (
                            <p className="text-red-600 font-bold mt-2 flex items-center gap-1">
                                <Clock size={16} /> Due Date: {activeConnection.currentDue.dueDate}
                            </p>
                        )}
                    </div>

                    {activeConnection.currentDue.status === 'UNPAID' && (
                        <RazorpayCheckout 
                            amount={activeConnection.currentDue.amount} 
                            name="Electricity Bill" 
                            description={`Payment for connection: ${activeConnection.id}`}
                            billId={activeConnection.id.length === 36 ? activeConnection.id : undefined}
                            isGuest={true}
                            onSuccess={handlePaymentSuccess}
                            onFailure={(err) => console.error(err)}
                            buttonClassName="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-500/30 transition text-lg active:scale-95"
                            customButtonText="Pay Now"
                        />
                    )}
                </div>

                {/* Last Payment */}
                <div className="p-8 rounded-[2.5rem] bg-white shadow-xl border border-slate-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                                <History size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Previous Record</p>
                                <h3 className="text-xl font-bold text-slate-900">Last Payment</h3>
                            </div>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Amount Paid</p>
                            <h2 className="text-4xl font-black text-slate-800 font-mono tracking-tighter">
                                ₹{activeConnection.lastPayment.amount.toFixed(2)}
                            </h2>
                            <p className="text-slate-500 font-bold mt-2">
                                Paid on {activeConnection.lastPayment.date}
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Receipt Number</p>
                        <p className="font-mono text-slate-700 font-bold">{activeConnection.lastPayment.receipt}</p>
                    </div>
                </div>
            </div>

            {/* Full Bill History */}
            <div>
                <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <FileText className="text-blue-600" size={24} /> Full Bill History
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeConnection.history.map((bill, idx) => (
                        <div key={idx} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="font-black text-slate-900 text-xl">{bill.month}</div>
                                    <div className="text-sm font-bold text-slate-400 flex items-center gap-1 mt-1">
                                        <Clock size={14} /> Due: {bill.dueDate}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-black text-slate-900 text-2xl">
                                        ₹{bill.amount.toFixed(2)}
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        {bill.units} Units
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-2">
                                <div>
                                    {bill.status === 'PAID' ? (
                                        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-green-200">
                                            <CheckCircle size={14} /> Paid
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-red-200">
                                            <AlertCircle size={14} /> Unpaid
                                        </span>
                                    )}
                                </div>
                                <div>
                                    {bill.status === 'PAID' ? (
                                        <button className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-black transition text-sm">
                                            <Download size={18} /> Receipt
                                        </button>
                                    ) : (
                                        <RazorpayCheckout 
                                            amount={bill.amount} 
                                            name="Electricity Bill" 
                                            description={`Payment for connection: ${activeConnection.id}`}
                                            billId={activeConnection.id.length === 36 ? activeConnection.id : undefined}
                                            isGuest={true}
                                            onSuccess={handlePaymentSuccess}
                                            onFailure={(err) => console.error(err)}
                                            buttonClassName="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black transition text-sm shadow-lg shadow-red-500/30"
                                            customButtonText="Pay Now"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Safe zone for bottom padding in Kiosk mode */}
            <div className="h-24"></div>
        </div>

      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-xl animate-in zoom-in-95 border border-slate-100 relative">
                <button 
                    onClick={() => setShowAddModal(false)}
                    className="absolute top-8 right-8 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
                >
                    <X size={24} />
                </button>
                
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6">
                    <Plus size={40} />
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-2">Add Connection</h2>
                <p className="text-slate-500 font-bold mb-10">Link an existing electricity connection to your citizen profile.</p>

                <div className="space-y-6 mb-10">
                    <div>
                        <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Consumer Number</label>
                        <KioskInput 
                            formatType="consumer"
                            placeholder="e.g. 04 2345 6789"
                            value={newConsumerNo}
                            onChangeValue={setNewConsumerNo}
                            className="w-full bg-slate-50 border-2 border-slate-200 px-6 py-5 rounded-2xl text-xl font-mono font-bold outline-none focus:border-blue-500 transition placeholder:text-slate-300"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2">Security PIN / Aadhaar Linked Mobile OTP</label>
                        <KioskInput 
                            formatType="pin"
                            type="password" 
                            placeholder="••••••"
                            value={newPin}
                            onChangeValue={setNewPin}
                            className="w-full bg-slate-50 border-2 border-slate-200 px-6 py-5 rounded-2xl text-xl tracking-[0.5em] font-black outline-none focus:border-blue-500 transition placeholder:text-slate-300 placeholder:tracking-normal"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleAddConnection}
                    disabled={isAdding || !newConsumerNo || !newPin}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-500/30 transition flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isAdding ? (
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <><Check size={24} /> Link Connection</>
                    )}
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default ElectricityProfile;
