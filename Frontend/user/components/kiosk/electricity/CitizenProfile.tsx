import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, MapPin, Shield, Mail, Edit3, Save, LogOut, CheckCircle, X } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { authService } from '../../../services/authService';

interface Props {
  onBack: () => void;
  language: Language;
}

const CitizenProfile: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setProfile(user);
      setEditData(user);
    } else {
      const defaultUser = {
        name: 'Guest Citizen',
        mobile: '9999999999',
        email: 'guest@example.com',
        role: 'citizen',
        address: '12/B, Gandhi Nagar, Peelamedu, Coimbatore'
      };
      setProfile(defaultUser);
      setEditData(defaultUser);
    }
  }, []);

  const handleEditChange = (field: string, value: string) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      // Save locally
      const stored = localStorage.getItem('aazhi_user');
      const user = stored ? JSON.parse(stored) : {};
      const freshUser = { 
        ...user, 
        name: editData.name, 
        mobile: editData.mobile,
        email: editData.email, 
        address: editData.address 
      };
      localStorage.setItem('aazhi_user', JSON.stringify(freshUser));
      
      setProfile({ ...editData });
      setIsSaving(false);
      setIsEditing(false);
      setSuccessMsg(t('profileUpdated') || 'Profile updated successfully!');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 800);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...profile });
  };

  if (!profile) return null;

  return (
    <div className="w-full max-w-4xl mx-auto pt-10 pb-32 px-6 animate-in fade-in slide-in-from-bottom-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-900 transition-colors">
        <ArrowLeft size={20} /> {t('backToUtils') || 'Back'}
      </button>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl font-bold flex items-center gap-2 mb-6 animate-in fade-in">
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        {/* Top Header Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
            <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <div className="px-10 pb-10 relative">
            {/* Avatar Profile */}
            <div className="absolute -top-16 left-10">
                <div className="w-32 h-32 bg-white rounded-[2rem] p-2 shadow-xl border border-slate-100">
                    <div className="w-full h-full bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center">
                        <User size={64} />
                    </div>
                </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex justify-end pt-6 gap-4">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition border border-blue-100">
                      <Edit3 size={18} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={handleCancel} className="flex items-center gap-2 px-5 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition border border-slate-200">
                        <X size={18} /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
                        {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                        Save Changes
                    </button>
                  </>
                )}
            </div>

            <div className="mt-8 space-y-2">
                {isEditing ? (
                  <div className="mb-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editData.name}
                      onChange={e => handleEditChange('name', e.target.value)}
                      className="w-full max-w-sm p-3 rounded-xl font-bold bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-800 outline-none transition-all"
                    />
                  </div>
                ) : (
                  <h1 className="text-4xl font-black text-slate-900">{profile.name || 'Citizen User'}</h1>
                )}
                
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-black uppercase tracking-widest border border-green-200">
                        <Shield size={14} /> Verified Citizen
                    </span>
                    <span className="text-slate-400 font-bold text-sm capitalize">Role: {profile.role}</span>
                </div>
            </div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                <div className={`p-6 rounded-2xl transition-all ${isEditing ? 'bg-indigo-50/30 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <Phone size={20} />
                        <h3 className="text-xs font-black uppercase tracking-widest">Mobile Number</h3>
                    </div>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        value={editData.mobile}
                        onChange={e => handleEditChange('mobile', e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        className="w-full mt-2 p-3 rounded-xl font-bold bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-800 outline-none transition-all"
                      />
                    ) : (
                      <p className="text-xl font-bold text-slate-900 pl-8">{profile.mobile}</p>
                    )}
                </div>

                <div className={`p-6 rounded-2xl transition-all ${isEditing ? 'bg-indigo-50/30 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <Mail size={20} />
                        <h3 className="text-xs font-black uppercase tracking-widest">Email Address</h3>
                    </div>
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={editData.email || ''}
                        onChange={e => handleEditChange('email', e.target.value)}
                        className="w-full mt-2 p-3 rounded-xl font-bold bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-800 outline-none transition-all"
                      />
                    ) : (
                      <p className="text-xl font-bold text-slate-900 pl-8">{profile.email || 'Not Provided'}</p>
                    )}
                </div>

                <div className={`p-6 rounded-2xl md:col-span-2 transition-all ${isEditing ? 'bg-indigo-50/30 border border-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <MapPin size={20} />
                        <h3 className="text-xs font-black uppercase tracking-widest">Registered Address</h3>
                    </div>
                    {isEditing ? (
                      <textarea 
                        value={editData.address || ''}
                        onChange={e => handleEditChange('address', e.target.value)}
                        rows={2}
                        className="w-full mt-2 p-3 rounded-xl font-bold bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-800 outline-none transition-all resize-none"
                      />
                    ) : (
                      <p className="text-xl font-bold text-slate-900 pl-8">{profile.address || 'Address not registered yet'}</p>
                    )}
                </div>
            </div>

            {/* Logout Section */}
            {!isEditing && (
              <div className="mt-12 pt-10 border-t border-slate-100">
                  <button 
                      onClick={() => authService.logout()}
                      className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-2xl font-black text-sm uppercase tracking-widest transition"
                  >
                      <LogOut size={18} /> Logout Session
                  </button>
              </div>
            )}
        </div>
      </div>
      
      {/* Safe zone for bottom padding in Kiosk mode */}
      <div className="h-24"></div>
    </div>
  );
};

export default CitizenProfile;
