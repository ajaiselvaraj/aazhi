import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Shield, Edit3, CheckCircle, AlertCircle, Save, Phone, MapPin, Mail } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { GasService, GasAccount } from '../../../services/gasService';

interface Props {
  onBack: () => void;
  language: Language;
}

const GasProfile: React.FC<Props> = ({ onBack }) => {
  const { t } = useTranslation();
  const [account, setAccount] = useState<GasAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await GasService.getAccount();
      setAccount(data);
      setEditData({
        name: data.name || '',
        mobile: data.mobile || '',
        ward: data.ward || '',
      });
    } catch (err: any) {
      console.error('Failed to load gas account:', err);
      setError(err.message || 'Failed to load account details.');
      // Fallback mock data for demo
      const mock: GasAccount = {
        id: 'demo-id',
        citizen_id: 'demo-citizen',
        service_type: 'gas',
        account_number: 'GAS-2026-001234',
        meter_number: 'MTR-89012',
        connection_date: '2024-06-15',
        status: 'active',
        metadata: {},
        name: 'Demo User',
        mobile: '9876543210',
        aadhaar_masked: 'XXXX-XXXX-1234',
        ward: '12',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAccount(mock);
      setEditData({ name: mock.name, mobile: mock.mobile, ward: mock.ward });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await GasService.updateProfile({
        name: editData.name,
        mobile: editData.mobile,
      });
      setSaveStatus('saved');
      setIsEditing(false);
      // Refresh profile
      await loadProfile();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Profile update failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-slate-500 font-bold">{t('loading') || 'Loading profile...'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
      </button>

      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border-2 border-purple-200 p-8 shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center border-2 border-purple-200">
              <User size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900">{account?.name || 'Consumer'}</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                {t('gas_consumerProfile') || 'Gas Consumer Profile'}
              </p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-200"
            >
              <Edit3 size={18} /> {t('edit') || 'Edit'}
            </button>
          )}
        </div>
      </div>

      {/* Status Toast */}
      {saveStatus === 'saved' && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-2xl mb-6 flex items-center gap-3 text-green-700 font-bold animate-in slide-in-from-top-4">
          <CheckCircle size={20} /> {t('gas_profileUpdated') || 'Profile updated successfully!'}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 flex items-center gap-3 text-red-700 font-bold animate-in slide-in-from-top-4">
          <AlertCircle size={20} /> {t('gas_profileError') || 'Failed to update profile. Please try again.'}
        </div>
      )}

      {/* Profile Details Card */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-10 shadow-xl space-y-0">

        {/* Read-only Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b-2 border-slate-100">
          <div className="bg-slate-50 p-5 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('gas_accountNumber') || 'Account Number'}</p>
            <p className="font-black text-xl text-slate-900">{account?.account_number || '—'}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('gas_meterNumber') || 'Meter Number'}</p>
            <p className="font-black text-xl text-slate-900">{account?.meter_number || '—'}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('gas_connectionStatus') || 'Connection Status'}</p>
            <span className={`inline-block mt-1 px-4 py-1 rounded-full text-sm font-black uppercase ${account?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {account?.status || '—'}
            </span>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('gas_aadhaar') || 'Aadhaar (Masked)'}</p>
            </div>
            <p className="font-black text-xl text-slate-900">{account?.aadhaar_masked || '—'}</p>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="pt-8 space-y-6">
          <h3 className="text-lg font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Edit3 size={18} className="text-purple-500" />
            {t('gas_editableFields') || 'Editable Information'}
          </h3>

          {/* Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-wider">
              <User size={16} /> {t('sf_fullName') || 'Full Name'}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white border-2 border-purple-300 p-5 rounded-2xl text-lg font-semibold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition"
              />
            ) : (
              <p className="bg-slate-50 p-5 rounded-2xl text-lg font-bold text-slate-800">{editData.name || '—'}</p>
            )}
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-wider">
              <Phone size={16} /> {t('sf_mobileNumber') || 'Mobile Number'}
            </label>
            {isEditing ? (
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={editData.mobile || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                className="w-full bg-white border-2 border-purple-300 p-5 rounded-2xl text-lg font-semibold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition"
              />
            ) : (
              <p className="bg-slate-50 p-5 rounded-2xl text-lg font-bold text-slate-800">{editData.mobile || '—'}</p>
            )}
          </div>

          {/* Ward */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-slate-600 uppercase tracking-wider">
              <MapPin size={16} /> {t('sf_areaWard') || 'Ward / Area'}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editData.ward || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, ward: e.target.value }))}
                className="w-full bg-white border-2 border-purple-300 p-5 rounded-2xl text-lg font-semibold outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition"
              />
            ) : (
              <p className="bg-slate-50 p-5 rounded-2xl text-lg font-bold text-slate-800">{editData.ward || '—'}</p>
            )}
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-4 pt-8 border-t-2 border-slate-100 mt-8">
            <button
              onClick={() => { setIsEditing(false); if (account) setEditData({ name: account.name, mobile: account.mobile, ward: account.ward }); }}
              className="flex-1 bg-slate-100 text-slate-700 p-5 rounded-2xl font-black text-lg hover:bg-slate-200 transition"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="flex-[2] bg-purple-600 text-white p-5 rounded-2xl font-black text-lg hover:bg-purple-700 transition shadow-lg shadow-purple-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saveStatus === 'saving' ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Save size={20} /> {t('gas_saveChanges') || 'Save Changes'}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GasProfile;
