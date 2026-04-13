import React, { useState } from 'react';
import { ArrowLeft, User, Phone, MapPin, Edit3, Save, Key, CheckCircle, Shield, FileText } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { MunicipalAPI } from '../../../services/municipalApi';

interface Props {
  onBack: () => void;
  language: Language;
}

const MunicipalProfile: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  
  const [profileData, setProfileData] = useState({
    name: 'Suresh Kumar',
    citizen_id: 'CI-987-6543',
    mobile: '9876543210',
    email: 'suresh.k@example.com',
    address: '45, Second Street, Ward 15, Coimbatore',
    aadhaar: 'XXXX-XXXX-9876',
    property_tax_id: 'PT-12345-67890'
  });

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
        await MunicipalAPI.updateProfile(editData);
        setProfileData({ ...editData });
        setSuccessMsg(t('profileUpdated') || 'Profile updated successfully!');
      } catch (err: any) {
        console.error('Failed to update profile:', err);
        // Fallback to local state if backend is still being mocked/absent
        setProfileData({ ...editData });
        setSuccessMsg(t('profileUpdated') || 'Profile updated successfully! (Local Mock)');
      } finally {
        setIsSaving(false);
        setIsEditing(false);
        setOtp('');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
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
            <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg overflow-hidden">
              <User size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">
              {profileData.name}
            </h2>
            <p className="text-slate-500 font-bold mb-4">{profileData.citizen_id}</p>
            
            <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl text-sm font-bold w-full mb-6 flex flex-col items-start gap-1 text-left">
              <span className="text-[10px] uppercase opacity-70">Primary PTIN</span>
              <span className="font-mono">{profileData.property_tax_id}</span>
            </div>

            <div className="w-full space-y-3">
              <button className="w-full bg-slate-50 text-slate-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition border border-slate-200">
                <FileText size={18} /> {t('viewHistory') || 'Payment History'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Edit */}
        <div className="w-full md:w-2/3">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <User size={20} className="text-indigo-600" />
                {t('citizenDetails') || 'Citizen Details'}
              </h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition flex items-center gap-2 border border-indigo-100"
                >
                  <Edit3 size={16} /> {t('edit') || 'Edit'}
                </button>
              )}
            </div>

            <div className="p-8 space-y-6">
              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl font-bold flex items-center gap-2 mb-6 animate-in fade-in">
                  <CheckCircle size={20} /> {successMsg}
                </div>
              )}

              {showOtp ? (
                <div className="bg-orange-50 border border-orange-200 p-6 rounded-2xl animate-in zoom-in-95">
                  <h4 className="font-black text-orange-800 text-lg mb-2 flex items-center gap-2">
                    <Key size={20} /> Verify Identity
                  </h4>
                  <p className="text-sm font-medium text-orange-700 max-w-sm mb-4">
                    Enter OTP sent to {profileData.mobile} to authorize these changes. Use '123' for testing.
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter OTP"
                    className="w-full p-4 rounded-xl text-center text-2xl tracking-[0.5em] font-black border-2 border-orange-200 outline-none focus:border-orange-500 mb-4 bg-white"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setShowOtp(false)} className="flex-1 bg-white text-slate-600 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
                    <button onClick={handleVerifyOtp} className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-lg">{t('verifyBtn') || 'Verify & Save'}</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('sf_fullName') || 'Name'}</label>
                    <input 
                      type="text" 
                      value={editData.name}
                      readOnly
                      className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-xl font-bold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Aadhaar */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Shield size={12} className="text-green-600"/> Aadhaar
                    </label>
                    <input 
                      type="text" 
                      value={editData.aadhaar}
                      readOnly
                      className="w-full bg-green-50 border-2 border-green-100 text-green-700 p-4 rounded-xl font-bold cursor-not-allowed"
                    />
                  </div>

                  {/* Mobile */}
                  <div className={`col-span-2 md:col-span-1 ${isEditing ? 'bg-indigo-50/30 p-2 rounded-2xl -m-2' : ''}`}>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Phone size={12}/> {t('sf_mobileNumber') || 'Mobile'}</label>
                    <input 
                      type="tel" 
                      value={isEditing ? editData.mobile : profileData.mobile}
                      onChange={e => handleEditChange('mobile', e.target.value.replace(/\D/g, ''))}
                      readOnly={!isEditing}
                      maxLength={10}
                      className={`w-full p-4 rounded-xl font-bold transition-all outline-none ${
                        isEditing ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-800' : 'bg-slate-50 border-2 border-transparent text-slate-700'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div className={`col-span-2 md:col-span-1 ${isEditing ? 'bg-indigo-50/30 p-2 rounded-2xl -m-2' : ''}`}>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('sf_email') || 'Email ID'}</label>
                    <input 
                      type="email" 
                      value={isEditing ? editData.email : profileData.email}
                      onChange={e => handleEditChange('email', e.target.value)}
                      readOnly={!isEditing}
                      className={`w-full p-4 rounded-xl font-bold transition-all outline-none ${
                        isEditing ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-800' : 'bg-slate-50 border-2 border-transparent text-slate-700'
                      }`}
                    />
                  </div>

                  {/* Address */}
                  <div className={`col-span-2 ${isEditing ? 'bg-indigo-50/30 p-2 rounded-2xl -m-2' : ''}`}>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={12}/> {t('sf_address') || 'Communication Address'}</label>
                    <textarea 
                      value={isEditing ? editData.address : profileData.address}
                      onChange={e => handleEditChange('address', e.target.value)}
                      readOnly={!isEditing}
                      rows={2}
                      className={`w-full p-4 rounded-xl font-bold resize-none transition-all outline-none ${
                        isEditing ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-800' : 'bg-slate-50 border-2 border-transparent text-slate-700'
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
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
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

export default MunicipalProfile;
