import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, CheckCircle, Zap } from 'lucide-react';
import { ElectricityService, ElectricityBill } from '../../../services/electricityService';
import RazorpayCheckout from '../../RazorpayCheckout';

interface Props {
  onBack: () => void;
  language: string;
}

const ElectricityQuickPay: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [consumerId, setConsumerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bill, setBill] = useState<ElectricityBill | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleFetchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumerId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const fetchedBill = await ElectricityService.getQuickPayBill(consumerId);
      setBill(fetchedBill);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch bill. Please check the Application / Consumer ID.');
      setBill(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePaySuccess = (paymentId: string) => {
      setPaymentSuccess(true);
  };
  const handlePayFailure = (error: any) => {
      setError(typeof error === 'string' ? error : 'Payment failed');
  };

  if (paymentSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100 text-center relative top-10">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h2 className="text-4xl font-black mb-4">Payment Successful!</h2>
        <p className="text-slate-500 text-lg mb-8">Your electricity bill of ₹{bill?.amount} has been securely paid.</p>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-bold text-lg transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-900 transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="bg-white rounded-[2rem] shadow-xl p-10 border border-slate-100">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <Zap size={32} />
            </div>
            <div>
                <h2 className="text-3xl font-black">Anonymous Quick Pay</h2>
                <p className="text-slate-500 font-bold mt-1">Instant bill settlement. No login required.</p>
            </div>
        </div>

        <form onSubmit={handleFetchBill} className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="Enter Electricity Consumer No."
            value={consumerId}
            onChange={(e) => setConsumerId(e.target.value.replace(/\D/g, ''))}
            className="flex-1 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl text-lg font-bold outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button 
            type="submit" 
            disabled={loading || !consumerId}
            className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-lg disabled:opacity-50 transition-all"
          >
            {loading && !bill ? 'Searching...' : 'Find Bill'} <Search size={20} />
          </button>
        </form>

        {error && (
            <div className="p-4 bg-red-50 text-red-600 font-bold rounded-2xl mb-8 border border-red-100">
                {error}
            </div>
        )}

        {bill && (
          <div className="border border-slate-200 rounded-3xl p-8 bg-slate-50">
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Consumer Name</p>
                <p className="text-xl font-black">{bill.metadata?.consumer_name_masked || bill.consumer_name_masked || 'A*** K****'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                <p className="text-xl font-black text-red-500">{new Date(bill.due_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Outstanding</p>
                <p className="text-5xl font-black tracking-tight">₹{bill.amount}</p>
                <p className="text-sm font-bold text-slate-500 mt-2">Bill No. {bill.bill_number}</p>
              </div>
            </div>

            <div className="mt-6">
                <RazorpayCheckout 
                    amount={bill.amount} 
                    name="Electricity Bill" 
                    description={`Payment for consumer: ${consumerId}`}
                    onSuccess={handlePaySuccess}
                    onFailure={handlePayFailure}
                />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectricityQuickPay;
