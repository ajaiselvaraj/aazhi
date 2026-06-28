import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, MapPin, Download, CheckCircle, Clock, Droplet, Building2, DollarSign, History, AlertCircle, FileText , Printer} from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useOrientation } from '../../../contexts/OrientationContext';
import RazorpayCheckout from '../../RazorpayCheckout';
import PaymentReceipt from '../PaymentReceipt';

interface Props {
  onBack: () => void;
  language: Language;
}

const MOCK_MUNICIPAL_ACCOUNTS = [
  {
    id: "WC-04-234-5678",
    type: "Water",
    address: "12, Kamaraj Road, Chennai",
    tariff: "Domestic Water",
    currentDue: { amount: 450.00, dueDate: "25 Jun 2026", status: "UNPAID" },
    lastPayment: { amount: 400.00, date: "22 May 2026", receipt: "MWT-987654321" },
    history: [
      { month: "May 2026", amount: 450, dueDate: "25 Jun 2026", status: "UNPAID" },
      { month: "Apr 2026", amount: 400, dueDate: "25 May 2026", status: "PAID", receipt: "MWT-987654321" },
      { month: "Mar 2026", amount: 420, dueDate: "25 Apr 2026", status: "PAID", receipt: "MWT-123456789" },
    ]
  },
  {
    id: "PT-04-987-6543",
    type: "Property Tax",
    address: "12, Kamaraj Road, Chennai",
    tariff: "Residential Property",
    currentDue: { amount: 0, dueDate: "-", status: "NO_DUES" },
    lastPayment: { amount: 2500.00, date: "10 Apr 2026", receipt: "MPT-11223344" },
    history: [
      { month: "Half-Year 1 (2026)", amount: 2500, dueDate: "15 Apr 2026", status: "PAID", receipt: "MPT-11223344" },
      { month: "Half-Year 2 (2025)", amount: 2500, dueDate: "15 Oct 2025", status: "PAID", receipt: "MPT-99887766" },
    ]
  }
];

const MunicipalProfile: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const { isVertical } = useOrientation();

  // Load real user profile from localStorage session safely
  const getInitialProfile = () => {
    try {
      const stored = localStorage.getItem('aazhi_user');
      if (!stored || stored === 'null' || stored === 'undefined') {
        return { name: 'Vetrivel M', mobile: '+91 98765 43210', email: 'vetri@example.com' };
      }
      const user = JSON.parse(stored);
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
  const [accounts, setAccounts] = useState(MOCK_MUNICIPAL_ACCOUNTS);
  const [activeAccountId, setActiveAccountId] = useState(MOCK_MUNICIPAL_ACCOUNTS[0].id);
  const [paymentSuccessRef, setPaymentSuccessRef] = useState<string | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  
  const activeAccount = accounts.find(c => c.id === activeAccountId) || accounts[0] || MOCK_MUNICIPAL_ACCOUNTS[0];

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentSuccessRef(paymentId);
    setAccounts(prev => prev.map(conn => {
      if(conn.id === activeAccountId) {
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
      {paymentSuccessRef && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200 text-center relative">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={48} />
              </div>

              <h2 className="text-4xl font-black text-slate-900 mb-2">{t('paymentSuccess') || 'Payment Successful'}</h2>
              <p className="text-slate-500 font-medium mb-8">Payment Ref: {paymentSuccessRef}</p>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-3 mb-8">
                  <div className="flex justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">Consumer No</span>
                      <span className="text-sm font-black text-slate-900">{(activeAccount as any).id || (activeAccount as any).propertyId}</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">Amount Paid</span>
                      <span className="text-sm font-black text-cyan-600">₹{Number(activeAccount.lastPayment?.amount || 0).toFixed(2)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowReceiptPreview(true)} className="flex items-center justify-center gap-2 bg-cyan-600 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-cyan-200">
                      <Printer size={18} /> Print Receipt
                  </button>
                  <button onClick={() => setPaymentSuccessRef(null)} className="bg-slate-900 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 transition">
                      Done
                  </button>
              </div>
          </div>
          {showReceiptPreview && (
              <PaymentReceipt 
                  data={{
                      serviceName: 'Municipal Property Tax',
                      serviceId: 'municipal',
                      consumerId: (activeAccount as any).id || (activeAccount as any).propertyId,
                      consumerName: profileData?.name || 'Consumer',
                      amount: (activeAccount.lastPayment?.amount || 0).toString(),
                      txnId: paymentSuccessRef,
                      date: activeAccount.lastPayment?.date || new Date().toISOString(),
                      mode: 'Online'
                  }}
                  onClose={() => setShowReceiptPreview(false)}
              />
          )}
        </div>
      )}
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
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Citizen Dashboard</h2>
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center shrink-0">
                    <User size={28} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800">{profileData.name}</h3>
                    <p className="text-sm font-bold text-slate-500">{profileData.mobile}</p>
                </div>
            </div>
          </div>

          <div className={`p-6 space-y-4 custom-scrollbar ${isVertical ? 'order-3 bg-slate-50' : 'flex-1 overflow-y-auto'}`}>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">My Municipal Accounts</h2>
            {accounts.map(acc => (
                <button
                    key={acc.id}
                    onClick={() => setActiveAccountId(acc.id)}
                    className={`w-full text-left p-5 rounded-2xl transition-all border-2 ${activeAccountId === acc.id ? 'bg-cyan-600 text-white border-cyan-600 shadow-xl shadow-cyan-500/30' : 'bg-white border-slate-100 hover:border-cyan-300 shadow-sm'}`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="font-mono font-bold text-lg">{acc.id}</div>
                        {acc.currentDue.status === 'UNPAID' ? (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${activeAccountId === acc.id ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                                Due
                            </span>
                        ) : (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${activeAccountId === acc.id ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>
                                Paid
                            </span>
                        )}
                    </div>
                    <div className={`text-xs font-bold mb-1 line-clamp-1 flex items-center gap-1 ${activeAccountId === acc.id ? 'text-cyan-100' : 'text-slate-500'}`}>
                        {acc.type === 'Water' ? <Droplet size={12} /> : <Building2 size={12} />} {acc.type}
                    </div>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${activeAccountId === acc.id ? 'text-cyan-200' : 'text-slate-400'}`}>
                        {acc.tariff}
                    </div>
                </button>
            ))}
          </div>
        </div>

        {/* Right Content: Dashboard for Active Account */}
        <div className={`bg-white p-6 sm:p-10 custom-scrollbar ${isVertical ? 'order-2 border-b-2 border-slate-200 shadow-sm z-10' : 'flex-1 overflow-y-auto'}`}>
            
            <div className="mb-10 animate-in slide-in-from-right-8 duration-500">
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 mb-2">
                    {activeAccount.type === 'Water' ? <Droplet className="text-cyan-500 fill-cyan-100" size={32} /> : <Building2 className="text-indigo-500" size={32} />}
                    Account No: <span className="font-mono text-cyan-600">{activeAccount.id}</span>
                </h1>
                <p className="text-slate-500 font-bold flex items-center gap-2">
                    <MapPin size={16} /> {activeAccount.address}
                </p>
            </div>

            {/* At-a-Glance Panel */}
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8 mb-12">
                {/* Current Due */}
                <div className={`p-8 rounded-[2.5rem] shadow-xl border ${activeAccount.currentDue.status === 'UNPAID' ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-100' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${activeAccount.currentDue.status === 'UNPAID' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className={`text-xs font-black uppercase tracking-widest ${activeAccount.currentDue.status === 'UNPAID' ? 'text-red-500' : 'text-green-600'}`}>Current Status</p>
                            <h3 className={`text-xl font-bold ${activeAccount.currentDue.status === 'UNPAID' ? 'text-red-900' : 'text-green-900'}`}>
                                {activeAccount.currentDue.status === 'UNPAID' ? 'Action Required' : 'All Clear'}
                            </h3>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Due Amount</p>
                        <h2 className="text-5xl font-black text-slate-900 font-mono tracking-tighter">
                            ₹{Number(activeAccount.currentDue.amount || 0).toFixed(2)}
                        </h2>
                        {activeAccount.currentDue.status === 'UNPAID' && (
                            <p className="text-red-600 font-bold mt-2 flex items-center gap-1">
                                <Clock size={16} /> Due Date: {activeAccount.currentDue.dueDate}
                            </p>
                        )}
                    </div>

                    {activeAccount.currentDue.status === 'UNPAID' && (
                        <RazorpayCheckout 
                            amount={activeAccount.currentDue.amount} 
                            name={`${activeAccount.type} Bill`} 
                            description={`Payment for account: ${activeAccount.id}`}
                            billId={activeAccount.id}
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
                            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shadow-inner">
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
                                ₹{Number(activeAccount.lastPayment.amount || 0).toFixed(2)}
                            </h2>
                            <p className="text-slate-500 font-bold mt-2">
                                Paid on {activeAccount.lastPayment.date}
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Receipt Number</p>
                        <p className="font-mono text-slate-700 font-bold">{activeAccount.lastPayment.receipt}</p>
                    </div>
                </div>
            </div>

            {/* Full Bill History */}
            <div>
                <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <FileText className="text-cyan-600" size={24} /> Full Bill History
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeAccount.history.map((bill, idx) => (
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
                                        ₹{Number(bill.amount || 0).toFixed(2)}
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
                                            name={`${activeAccount.type} Bill`} 
                                            description={`Payment for connection: ${activeAccount.id}`}
                                            billId={activeAccount.id}
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

            <div className="h-24"></div>
        </div>

      </div>
    </div>
  );
};

export default MunicipalProfile;
