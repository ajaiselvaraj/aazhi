import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Upload, AlertCircle, X, Zap, ArrowRight, FileText, Building2, Bolt } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { ElectricityService } from '../../../services/electricityService';

interface Props {
  onBack: () => void;
  language: Language;
}

type ConnectionType = 'New Connection' | 'Load Extension' | 'Load Reduction' | 'Temporary Connection' | 'Name Transfer' | 'Category Change';

const CONNECTION_TYPES: { value: ConnectionType; label: string; desc: string; icon: string }[] = [
  { value: 'New Connection', label: 'New Electricity Connection', desc: 'Apply for a new domestic, commercial, or industrial connection', icon: '⚡' },
  { value: 'Load Extension', label: 'Load Extension', desc: 'Increase sanctioned load for your existing connection', icon: '📈' },
  { value: 'Load Reduction', label: 'Load Reduction', desc: 'Reduce the sanctioned load to lower fixed charges', icon: '📉' },
  { value: 'Temporary Connection', label: 'Temporary Connection', desc: 'Short-term connection for events, construction, etc.', icon: '⏱️' },
  { value: 'Name Transfer', label: 'Ownership / Name Transfer', desc: 'Transfer connection ownership to a new person', icon: '🔄' },
  { value: 'Category Change', label: 'Category Change', desc: 'Change from domestic to commercial or vice versa', icon: '🏷️' },
];

const PHASE_OPTIONS = ['Single Phase', 'Three Phase'] as const;
const PREMISES_OPTIONS = ['Residential', 'Commercial', 'Industrial', 'Agricultural'] as const;

const ElectricityNewConnectionForm: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'type' | 'form' | 'submitting' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<ConnectionType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleTypeSelect = (type: ConnectionType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (file) {
      setUploadedFiles(prev => [...prev, file.name]);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = t('fieldRequired') || 'Required';
    if (!formData.mobile?.trim() || !/^\d{10}$/.test(formData.mobile)) errs.mobile = t('validMobile') || 'Enter valid 10-digit mobile';
    if (!formData.address?.trim()) errs.address = t('fieldRequired') || 'Required';
    if (!formData.pincode?.trim() || !/^\d{6}$/.test(formData.pincode)) errs.pincode = 'Enter valid 6-digit pincode';
    if (!formData.phase_type) errs.phase_type = t('fieldRequired') || 'Required';
    if (!formData.premises_type) errs.premises_type = t('fieldRequired') || 'Required';
    if (!formData.load_required?.trim()) errs.load_required = t('fieldRequired') || 'Required';
    if (!formData.description?.trim()) errs.description = t('fieldRequired') || 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedType) return;
    setStep('submitting');
    setSubmitError('');

    try {
      const result = await ElectricityService.submitConnectionRequest({
        connection_type: selectedType,
        phase_type: formData.phase_type as any,
        premises_type: formData.premises_type as any,
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address,
        pincode: formData.pincode,
        load_required: formData.load_required,
        description: formData.description,
        ward: formData.ward,
        documents: uploadedFiles
      });
      setTicketNumber(result.ticket_number || result.id || 'EB-' + Date.now());
      setStep('success');
    } catch (err: any) {
      console.error('Electricity connection request failed:', err);
      setSubmitError(err.message || 'Failed to submit request. Please try again.');
      setStep('form');
    }
  };

  // ── SUCCESS VIEW ──
  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-10 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
          <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
            {t('elec_requestSubmitted') || 'Application Submitted!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6">
            {t('elec_requestDesc') || 'Your electricity connection request has been registered successfully.'}
          </p>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">
              {t('ticketNumber') || 'Application Reference'}
            </p>
            <p className="text-3xl font-black text-blue-700">{ticketNumber}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-8 text-left">
            <p className="text-xs font-bold text-amber-800">
              📋 {t('elec_nextSteps') || 'Your application will be reviewed within 7 working days. A site inspection will be scheduled before approval.'}
            </p>
          </div>
          <button
            onClick={onBack}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition"
          >
            {t('returnHomeBtn') || 'Back to Electricity'}
          </button>
        </div>
      </div>
    );
  }

  // ── TYPE SELECTION VIEW ──
  if (step === 'type') {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
          <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <Bolt size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">{t('elec_selectConnectionType') || 'Select Connection Type'}</h1>
          <p className="text-slate-500 font-medium">{t('elec_selectConnectionDesc') || 'Choose the type of electricity connection service you need.'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONNECTION_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeSelect(type.value)}
              className="group bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all text-left flex items-center gap-4"
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition text-2xl">
                {type.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg">{type.label}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">{type.desc}</p>
              </div>
              <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-600 transition" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── FORM VIEW ── (step === 'form' || step === 'submitting')
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8">
      <button onClick={() => setStep('type')} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('elec_changeType') || 'Change Connection Type'}
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-[2.5rem] border-2 border-blue-200 p-8 shadow-lg mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border-2 border-blue-200">
            <Zap size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedType}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
              {t('fillDetailsBelow') || 'Fill in the details below'}
            </p>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 flex items-center gap-3 text-red-700 font-bold">
          <AlertCircle size={20} /> {submitError}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-10 shadow-xl space-y-8"
      >
        {/* Full Name */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_fullName') || 'Applicant Name'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={t('sf_enterFullName') || 'Enter full name as per Aadhaar'}
            className={`w-full bg-slate-50 border-2 ${errors.name ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400`}
          />
          {errors.name && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.name}</div>}
        </div>

        {/* Mobile */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_mobileNumber') || 'Mobile Number'} <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={formData.mobile || ''}
            onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
            placeholder="98765 43210"
            className={`w-full bg-slate-50 border-2 ${errors.mobile ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400`}
          />
          {errors.mobile && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.mobile}</div>}
        </div>

        {/* Phase Type & Premises Type side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              {t('elec_phaseType') || 'Phase Type'} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              {PHASE_OPTIONS.map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => handleInputChange('phase_type', phase)}
                  className={`flex-1 p-4 rounded-xl text-sm font-bold border-2 transition-all text-center
                    ${formData.phase_type === phase
                      ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300 bg-slate-50'
                    }`}
                >
                  {phase}
                </button>
              ))}
            </div>
            {errors.phase_type && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.phase_type}</div>}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              {t('elec_premisesType') || 'Premises Type'} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.premises_type || ''}
              onChange={(e) => handleInputChange('premises_type', e.target.value)}
              className={`w-full bg-slate-50 border-2 ${errors.premises_type ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition`}
            >
              <option value="">-- {t('select') || 'Select'} --</option>
              {PREMISES_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.premises_type && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.premises_type}</div>}
          </div>
        </div>

        {/* Load Required */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('elec_loadRequired') || 'Sanctioned Load Required (kW)'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.load_required || ''}
            onChange={(e) => handleInputChange('load_required', e.target.value)}
            placeholder="e.g. 5 kW"
            className={`w-full bg-slate-50 border-2 ${errors.load_required ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400`}
          />
          {errors.load_required && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.load_required}</div>}
        </div>

        {/* Address & Pincode */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_address') || 'Premises Address'} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder={t('sf_enterAddress') || 'Full address where the connection is needed'}
            rows={3}
            className={`w-full bg-slate-50 border-2 ${errors.address ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
          />
          {errors.address && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.address}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              {t('elec_pincode') || 'Pincode'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={formData.pincode || ''}
              onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
              placeholder="641001"
              className={`w-full bg-slate-50 border-2 ${errors.pincode ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400`}
            />
            {errors.pincode && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.pincode}</div>}
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              {t('sf_areaWard') || 'Ward / Area'} ({t('optional') || 'Optional'})
            </label>
            <input
              type="text"
              value={formData.ward || ''}
              onChange={(e) => handleInputChange('ward', e.target.value)}
              placeholder={t('sf_areaWardHint') || 'e.g. Ward 12'}
              className="w-full bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_description') || 'Additional Details'} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder={t('elec_descPlaceholder') || 'Any additional information about your requirement'}
            rows={3}
            className={`w-full bg-slate-50 border-2 ${errors.description ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
          />
          {errors.description && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.description}</div>}
        </div>

        {/* Document Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('elec_supportingDocs') || 'Supporting Documents'} ({t('optional') || 'Optional'})
          </label>
          <p className="text-xs text-slate-400 font-medium -mt-1">Aadhaar, ownership proof, NOC, building permit, etc.</p>
          <label className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-500 p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition group">
            <Upload size={40} className="text-slate-400 group-hover:text-blue-600 mb-3 transition" />
            <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition">
              {t('clickToUpload') || 'Click to upload'}
            </span>
            <input
              type="file"
              onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
              className="hidden"
              accept="image/*,.pdf"
            />
          </label>
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mt-3">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                  <CheckCircle size={20} />
                  <span className="text-sm font-bold">{file}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-6 pt-8 border-t-2 border-slate-100">
          <button
            type="button"
            onClick={() => { setFormData({}); setErrors({}); setUploadedFiles([]); }}
            className="flex-1 bg-slate-100 text-slate-700 px-8 py-6 rounded-2xl font-black text-xl hover:bg-slate-200 transition border-2 border-slate-200 flex items-center justify-center gap-3"
          >
            <X size={24} /> {t('resetForm') || 'Reset'}
          </button>
          <button
            type="submit"
            disabled={step === 'submitting'}
            className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 rounded-2xl font-black text-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {step === 'submitting' ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><CheckCircle size={24} /> {t('submitReq') || 'Submit Application'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ElectricityNewConnectionForm;
