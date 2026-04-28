import React, { useState } from 'react';
import { User, Smartphone, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Language } from '../../types';
import { authService } from '../../services/authService';
import KioskInput from './KioskInput';

interface SecureAuthProps {
  onSuccess: () => void;
  onBack?: () => void;
  language: Language;
}

const SecureAuth: React.FC<SecureAuthProps> = ({ onSuccess, onBack, language }) => {
  const { t } = useTranslation();
  const [authMethod, setAuthMethod] = useState<'AADHAAR' | 'MOBILE'>('AADHAAR');
  const [inputValue, setInputValue] = useState('');
  const [authStage, setAuthStage] = useState<'INPUT' | 'OTP'>('INPUT');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    setIsLoading(true);

    if (authMethod === 'AADHAAR') {
      if (inputValue.replace(/\s/g, '').length !== 12) {
        setError(t('err_aadhaar') || "Invalid Aadhaar");
        setIsLoading(false);
        return;
      }
      setTimeout(() => {
        setIsLoading(false);
        setAuthStage('OTP');
      }, 500);
      return;
    }

    if (authMethod === 'MOBILE') {
      if (inputValue.length !== 10) {
        setError(t('err_mobile') || "Invalid Mobile Number");
        setIsLoading(false);
        return;
      }

      try {
        await authService.sendOtp(inputValue);
        setAuthStage('OTP');
      } catch (e: any) {
        setError(e.message || "Failed to send OTP. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoginSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      // 🛡️ [DEV BYPASS] Allow ANY OTP and use "Offline" flow (No Token)
      // This ensures complaints use the /debug endpoint.
      localStorage.removeItem('aazhi_token');
      localStorage.setItem('aazhi_user', JSON.stringify({
        id: authMethod === 'MOBILE' ? 'dev_mobile_user' : 'dev_aadhaar_user',
        name: 'Developer Citizen',
        mobile: authMethod === 'MOBILE' ? inputValue : '9999999999',
        role: 'citizen'
      }));
      
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Authentication failed. Invalid OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-12 relative overflow-hidden flex flex-col items-center animate-in slide-in-from-bottom-8">
        
        {/* Back Button */}
        {onBack && (
          <button 
            onClick={onBack} 
            className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition z-10"
          >
            <ArrowLeft size={16} /> {t('goBack') || "Back"}
          </button>
        )}

        {/* Header Icon */}
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner mt-4">
          <ShieldCheck size={40} strokeWidth={2} />
        </div>
        
        {/* Title */}
        <h2 className="text-4xl font-black text-slate-900 mb-2 text-center tracking-tight">
          {t('secureAuth') || "Secure Authentication"}
        </h2>
        <p className="text-slate-500 font-medium text-base mb-10 text-center">
          {t('useDigitalID') || "Use your digital ID to access services"}
        </p>

        {/* Auth Method Tabs */}
        {authStage === 'INPUT' && (
          <div className="flex bg-slate-50 p-2 rounded-2xl w-full max-w-md mb-8 border border-slate-100 shadow-sm">
            <button
              onClick={() => { setAuthMethod('AADHAAR'); setInputValue(''); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all ${
                authMethod === 'AADHAAR' 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User size={18} />
              {t('aadhaar') || "Aadhaar"}
            </button>
            <button
              onClick={() => { setAuthMethod('MOBILE'); setInputValue(''); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-bold transition-all ${
                authMethod === 'MOBILE' 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'  
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Smartphone size={18} />
              {t('mobileOTP') || "Mobile OTP"}
            </button>
          </div>
        )}

        {/* Form Area */}
        <div className="w-full max-w-md space-y-6">
          {authStage === 'INPUT' ? (
            <>
              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest ml-1">
                  {authMethod === 'AADHAAR' ? (t('aadhaarNumber') || "AADHAAR NUMBER") : (t('mobileNumber') || "MOBILE NUMBER")}
                </label>
                <div className="relative">
                  <KioskInput
                    formatType={authMethod === 'AADHAAR' ? 'consumer' : 'text'}
                    inputMode="numeric"
                    type="text"
                    value={inputValue}
                    onChangeValue={(val) => {
                      setInputValue(val);
                      setError('');
                    }}
                    placeholder={authMethod === 'AADHAAR' ? "XXXX XXXX XXXX" : "98765 43210"}
                    className={`w-full bg-slate-50 border p-5 rounded-2xl text-xl font-bold outline-none focus:bg-white focus:ring-4 transition text-slate-700 tracking-wider placeholder-slate-300 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-50' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'}`}
                    icon={authMethod === 'AADHAAR' ? <ShieldCheck size={24} strokeWidth={1.5} /> : <Smartphone size={24} strokeWidth={1.5} />}
                  />
                </div>
                {error && <p className="text-red-500 text-xs font-bold px-2">{error}</p>}
              </div>

              <button
                onClick={handleVerify}
                disabled={isLoading || (authMethod === 'AADHAAR' ? inputValue.length !== 12 : inputValue.length !== 10)}
                className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:shadow-none"
              >
                {isLoading ? (
                  <RefreshCw className="animate-spin mb-1 mt-1" size={24} />
                ) : (
                  <>
                    {authMethod === 'MOBILE' ? (t('sendOTP') || 'Send OTP') : (t('verifyIdentity') || "Verify Identity")}
                    <ArrowRight size={20} className="ml-1" />
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="text-center space-y-6 animate-in slide-in-from-right-8 fade-in">
              <p className="text-slate-500 font-medium">{t('enterCodeLinked') || 'Enter the 6-digit code sent to linked mobile'}</p>
              <KioskInput
                formatType="pin"
                inputMode="numeric"
                type="password"
                value={otp}
                onChangeValue={(val) => {
                  setOtp(val);
                  setError('');
                }}
                className={`w-full bg-white border-2 p-4 rounded-2xl text-3xl font-black text-center outline-none tracking-[1em] ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-green-500'}`}
                placeholder="••••••"
              />
              {error && <p className="text-red-500 text-xs font-bold text-left px-2">{error}</p>}
              <button
                onClick={handleLoginSubmit}
                disabled={isLoading || (otp.length !== 6 && otp !== '123')}
                className="w-full bg-green-600 text-white p-5 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="animate-spin" size={24} />
                ) : (
                  <>
                    {t('confirmLogin') || "Confirm & Login"} <ShieldCheck size={20} />
                  </>
                )}
              </button>
              <button 
                onClick={() => { setAuthStage('INPUT'); setError(''); setOtp(''); }} 
                className="text-sm font-bold text-slate-400 hover:text-blue-600 transition"
              >
                {authMethod === 'AADHAAR' ? (t('changeAadhaar') || 'Change Aadhaar Number') : (t('changeNumber') || 'Change Number')}
              </button>
            </div>
          )}
        </div>
        
        {/* Subtle Decorative Line (blue accent on top) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1.5 bg-blue-500 rounded-b-full"></div>
      </div>
    </div>
  );
};

export default SecureAuth;
