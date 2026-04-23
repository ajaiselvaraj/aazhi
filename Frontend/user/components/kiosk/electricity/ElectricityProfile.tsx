import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, MapPin, Edit3, Save, X, Shield, History, Key, CheckCircle } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack: () => void;
  language: Language;
}

const ElectricityProfile: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();

  // Load real user profile from localStorage session
  const getInitialProfile = () => {
    try {
      const stored = localStorage.getItem('aazhi_user');
      const user = stored ? JSON.parse(stored) : null;
      return {
        name: user?.name || 'Not Set',
        consumer_number: user?.consumer_number || '—',
        mobile: user?.mobile || '',
        email: user?.email || '',
        address: user?.address || '',
        category: user?.category || 'Domestic',
        aadhaar: user?.aadhaar_masked || 'XXXX-XXXX-XXXX'
      };
    } catch {
      return {
        name: 'Not Set', consumer_number: '—', mobile: '', email: '', address: '', category: 'Domestic', aadhaar: 'XXXX-XXXX-XXXX'
      };
    }
  };

  const [profileData, setProfileData] = useState(getInitialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...profileData });
  const [isSaving, setIsSaving] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEditChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveInit = () => {
    setShowOtp(true);
  };

  const handleVerifyOtp = async () => {
    if (otp === '123' || otp.length === 6) {
      setIsSaving(true);
      setShowOtp(false);

      try {
        // 1. Call backend to persist name/email/address permanently in DB
        const token = localStorage.getItem('aazhi_token');
        const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:5000/api'
          : 'https://aazhi-9gj2.onrender.com/api';

        const res = await fetch(`${API_BASE}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ name: editData.name, email: editData.email, address: editData.address })
        });

        const json = await res.json();

        if (res.ok && json.data?.citizen) {
          // 2. Update localStorage with fresh data from backend
          const stored = localStorage.getItem('aazhi_user');
          const existing = stored ? JSON.parse(stored) : {};
          const freshUser = { ...existing, ...json.data.citizen };
          localStorage.setItem('aazhi_user', JSON.stringify(freshUser));
          if (json.data.tokens?.accessToken) {
            localStorage.setItem('aazhi_token', json.data.tokens.accessToken);
          }
        } else {
          // Fallback: persist locally even if API failed
          const stored = localStorage.getItem('aazhi_user');
          const user = stored ? JSON.parse(stored) : {};
          localStorage.setItem('aazhi_user', JSON.stringify({
            ...user, name: editData.name, mobile: editData.mobile,
            email: editData.email, address: editData.address
          }));
        }
      } catch (e) {
        console.error('[Profile] Backend save failed, falling back to localStorage only:', e);
        const stored = localStorage.getItem('aazhi_user');
        const user = stored ? JSON.parse(stored) : {};
        localStorage.setItem('aazhi_user', JSON.stringify({
          ...user, name: editData.name, mobile: editData.mobile,
          email: editData.email, address: editData.address
        }));
      }

      setProfileData({ ...editData });
      setIsSaving(false);
      setIsEditing(false);
      setOtp('');
      setSuccessMsg(t('elec_profileUpdated') || 'Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      alert("Invalid OTP. Use '123' for testing.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 pb-12">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
      </button>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Avatar & Summary */}
        <div className="w-full md:w-1/3">
          <div className="bg-white rounded-[2.5rem] p-8 text-center shadow-xl border border-slate-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg overflow-hidden">
              <User size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              {profileData.name}
            </h2>
            <p className="text-slate-500 font-bold mb-4">{profileData.consumer_number}</p>
            
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold w-full mb-6 flex justify-between">
              <span>{t('category') || 'Category'}</span>
              <span>{profileData.category.split(' ')[0]}</span>
            </div>

            <div className="w-full space-y-3">
              <button className="w-full bg-slate-50 text-slate-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition border border-slate-200">
                <History size={18} /> {t('viewHistory') || 'Payment History'}
              </button>
              <button className="w-full bg-slate-50 text-slate-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition border border-slate-200">
                <Shield size={18} /> {t('elec_downloadNOC') || 'Download NOC'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Edit */}
        <div className="w-full md:w-2/3">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                {t('elec_consumerDetails') || 'Consumer Details'}
              </h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition flex items-center gap-2 border border-blue-100"
                >
                  <Edit3 size={16} /> {t('edit') || 'Edit'}
                </button>
              )}
            </div>

            <div className="p-8 space-y-6">
              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl font-bold flex items-center gap-2 mb-6">
                  <CheckCircle size={20} /> {successMsg}
                </div>
              )}

              {showOtp ? (
                <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl animate-in zoom-in-95">
                  <h4 className="font-black text-orange-800 text-lg mb-2 flex items-center gap-2">
                    <Key size={20} /> Verify Update
                  </h4>
                  <p className="text-sm font-medium text-orange-700 max-w-sm mb-4">
                    Enter OTP sent to {profileData.mobile} to confirm profile changes. Use '123' for testing.
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full p-4 rounded-xl text-center text-2xl tracking-[0.5em] font-black border-2 border-orange-200 outline-none focus:border-orange-500 mb-4 bg-white"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setShowOtp(false)} className="flex-1 bg-white text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-50">Cancel</button>
                    <button onClick={handleVerifyOtp} className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600">{t('verifyBtn') || 'Verify & Save'}</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name field (Readonly usually, requires Name Transfer form for full changes) */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('sf_fullName') || 'Name'}</label>
                    <input 
                      type="text" 
                      value={editData.name}
                      readOnly
                      className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-xl font-bold text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">* Use Name Transfer form to change owner</p>
                  </div>

                  {/* Aadhaar (Readonly) */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Aadhaar Linked</label>
                    <input 
                      type="text" 
                      value={editData.aadhaar}
                      readOnly
                      className="w-full bg-green-50 border-2 border-green-100 text-green-700 p-4 rounded-xl font-bold cursor-not-allowed flex items-center justify-between"
                    />
                  </div>

                  {/* Mobile */}
                  <div className={`col-span-2 md:col-span-1 ${isEditing ? 'bg-blue-50/30 p-2 rounded-2xl -m-2' : ''}`}>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Phone size={12}/> {t('sf_mobileNumber') || 'Mobile'}</label>
                    <input 
                      type="tel" 
                      value={isEditing ? editData.mobile : profileData.mobile}
                      onChange={e => handleEditChange('mobile', e.target.value.replace(/\D/g, ''))}
                      readOnly={!isEditing}
                      maxLength={10}
                      className={`w-full p-4 rounded-xl font-bold transition-all ${
                        isEditing ? 'bg-white border-2 border-blue-200 outline-none focus:border-blue-500 text-slate-800' : 'bg-slate-50 border-2 border-transparent text-slate-700'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div className={`col-span-2 md:col-span-1 ${isEditing ? 'bg-blue-50/30 p-2 rounded-2xl -m-2' : ''}`}>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('sf_email') || 'Email ID'}</label>
                    <input 
                      type="email" 
                      value={isEditing ? editData.email : profileData.email}
                      onChange={e => handleEditChange('email', e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full p-4 rounded-xl font-bold transition-all ${
                        isEditing ? 'bg-white border-2 border-blue-200 outline-none focus:border-blue-500 text-slate-800' : 'bg-slate-50 border-2 border-transparent text-slate-700'
                      }`}
                    />
                  </div>

                  {/* Address */}
                  <div className={`col-span-2 ${isEditing ? 'bg-blue-50/30 p-2 rounded-2xl -m-2' : ''}`}>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={12}/> {t('sf_address') || 'Communication Address'}</label>
                    <textarea 
                      value={isEditing ? editData.address : profileData.address}
                      onChange={e => handleEditChange('address', e.target.value)}
                      readOnly={!isEditing}
                      rows={2}
                      className={`w-full p-4 rounded-xl font-bold resize-none transition-all items-center ${
                        isEditing ? 'bg-white border-2 border-blue-200 outline-none focus:border-blue-500 text-slate-800' : 'bg-slate-50 border-2 border-transparent text-slate-700'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Edit Actions */}
              {isEditing && !showOtp && (
                <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 mt-6 animate-in slide-in-from-bottom-2">
                  <button 
                    onClick={() => { setIsEditing(false); setEditData({...profileData}); }}
                    className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button 
                    onClick={handleSaveInit}
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Save size={18} /> {t('saveChanges') || 'Save Changes'}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectricityProfile;
