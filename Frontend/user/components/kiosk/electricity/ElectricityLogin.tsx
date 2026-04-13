import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, KeySquare, ShieldCheck, ChevronRight } from 'lucide-react';
import { authService } from '../../../services/authService';

interface Props {
  onBack: () => void;
  onLoginSuccess: () => void;
  language: string;
}

const ElectricityLogin: React.FC<Props> = ({ onBack, onLoginSuccess, language }) => {
  const { t } = useTranslation();
  const [consumerId, setConsumerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumerId) return;
    
    setLoading(true);
    setError('');
    
    try {
      await authService.kioskLogin(consumerId);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid Consumer Number or Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-900 transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="bg-white rounded-[3rem] shadow-xl p-12 border border-slate-100 text-center relative overflow-hidden">
        {/* Top Decorative Graphic */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-blue-50/50 -z-10 rounded-t-[3rem]"></div>
        
        <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-8 border-[6px] border-white relative z-10">
            <KeySquare size={36} />
        </div>

        <h2 className="text-3xl font-black mb-2 text-slate-900">Citizen Secure Login</h2>
        <p className="text-slate-500 font-bold mb-10">Access your full billing history, complaints, and service requests.</p>

        {error && (
            <div className="p-4 bg-red-50 text-red-600 font-bold rounded-2xl mb-8 border border-red-100 text-sm">
                {error}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-left">
                <label className="block text-sm font-black text-slate-700 uppercase tracking-widest mb-2 ml-1">Electricity Consumer No.</label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="e.g. 123456789"
                        value={consumerId}
                        onChange={(e) => setConsumerId(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-50 border-2 border-slate-100 px-6 py-5 rounded-2xl text-xl font-bold text-center outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                    />
                    <ShieldCheck size={24} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || consumerId.length < 5}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
            >
                {loading ? 'Authenticating...' : 'Access My Profile'} {!loading && <ChevronRight size={24} />}
            </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm font-bold">
            <ShieldCheck size={16} /> 256-bit encrypted secure terminal session
        </div>
      </div>
    </div>
  );
};

export default ElectricityLogin;
