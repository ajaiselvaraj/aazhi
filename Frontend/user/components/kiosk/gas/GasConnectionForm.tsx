import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Upload, AlertCircle, X, FileText, Flame, ArrowRight } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { GasService } from '../../../services/gasService';

interface Props {
  onBack: () => void;
  language: Language;
}

type RequestType = 'New Connection' | 'Meter Installation' | 'Reconnection' | 'Disconnection' | 'Postpaid to Prepaid' | 'Pipeline Inspection' | 'Maintenance';

const REQUEST_TYPES: { value: RequestType; label: string; i18nKey: string }[] = [
  { value: 'New Connection', label: 'New Gas Connection', i18nKey: 'gas_reqNewConnection' },
  { value: 'Meter Installation', label: 'Meter Installation / Replacement', i18nKey: 'gas_reqMeterInstall' },
  { value: 'Reconnection', label: 'Reconnect Service', i18nKey: 'gas_reqReconnect' },
  { value: 'Disconnection', label: 'Disconnect Service', i18nKey: 'gas_reqDisconnect' },
  { value: 'Postpaid to Prepaid', label: 'Postpaid to Prepaid Conversion', i18nKey: 'gas_reqConversion' },
  { value: 'Pipeline Inspection', label: 'Pipeline Inspection Request', i18nKey: 'gas_reqPipeline' },
  { value: 'Maintenance', label: 'Maintenance Scheduling', i18nKey: 'gas_reqMaintenance' },
];

const GasConnectionForm: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'type' | 'form' | 'submitting' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleTypeSelect = (type: RequestType) => {
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
    if (!formData.description?.trim()) errs.description = t('fieldRequired') || 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedType) return;
    setStep('submitting');
    setSubmitError('');

    try {
      const result = await GasService.submitConnectionRequest({
        request_type: selectedType,
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address,
        description: formData.description,
        ward: formData.ward,
        documents: uploadedFiles
      });
      setTicketNumber(result.ticket_number || result.id || 'GAS-' + Date.now());
      setStep('success');
    } catch (err: any) {
      console.error('Gas connection request failed:', err);
      setSubmitError(err.message || 'Failed to submit request. Please try again.');
      setStep('form');
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-10 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
          <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
            {t('gas_requestSubmitted') || 'Request Submitted!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6">
            {t('gas_requestDesc') || 'Your gas service request has been registered successfully.'}
          </p>
          <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 mb-8">
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">
              {t('ticketNumber') || 'Ticket Number'}
            </p>
            <p className="text-3xl font-black text-orange-700">{ticketNumber}</p>
          </div>
          <p className="text-sm text-slate-400 font-medium mb-8">
            {t('gas_trackMsg') || 'You can track this request using the Application Tracker.'}
          </p>
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition"
            >
              {t('returnHomeBtn') || 'Back to Gas'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'type') {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
          <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <Flame size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">{t('gas_selectRequestType') || 'Select Request Type'}</h1>
          <p className="text-slate-500 font-medium">{t('gas_selectRequestDesc') || 'Choose the type of gas service you need.'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REQUEST_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeSelect(type.value)}
              className="group bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-orange-400 hover:shadow-lg transition-all text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-orange-600 group-hover:text-white transition">
                <FileText size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg">{t(type.i18nKey) || type.label}</h3>
              </div>
              <ArrowRight size={20} className="text-slate-300 group-hover:text-orange-600 transition" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // step === 'form' || step === 'submitting'
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8">
      <button onClick={() => setStep('type')} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('gas_changeType') || 'Change Request Type'}
      </button>

      <div className="bg-white rounded-[2.5rem] border-2 border-orange-200 p-8 shadow-lg mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border-2 border-orange-200">
            <Flame size={32} />
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
            {t('sf_fullName') || 'Full Name'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={t('sf_enterFullName') || 'Enter your full name'}
            className={`w-full bg-slate-50 border-2 ${errors.name ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-orange-500 focus:bg-white transition placeholder:text-slate-400`}
          />
          {errors.name && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.name}</div>}
        </div>

        {/* Mobile Number */}
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
            className={`w-full bg-slate-50 border-2 ${errors.mobile ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-orange-500 focus:bg-white transition placeholder:text-slate-400`}
          />
          {errors.mobile && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.mobile}</div>}
        </div>

        {/* Address */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_address') || 'Service Address'} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder={t('sf_enterAddress') || 'Enter full address'}
            rows={3}
            className={`w-full bg-slate-50 border-2 ${errors.address ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-orange-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
          />
          {errors.address && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.address}</div>}
        </div>

        {/* Ward */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_areaWard') || 'Ward / Area'} ({t('optional') || 'Optional'})
          </label>
          <input
            type="text"
            value={formData.ward || ''}
            onChange={(e) => handleInputChange('ward', e.target.value)}
            placeholder={t('sf_areaWardHint') || 'e.g. Ward 12'}
            className="w-full bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl text-lg font-semibold outline-none focus:border-orange-500 focus:bg-white transition placeholder:text-slate-400"
          />
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_description') || 'Description'} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder={t('sf_describeRequest') || 'Describe your request in detail'}
            rows={4}
            className={`w-full bg-slate-50 border-2 ${errors.description ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-orange-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
          />
          {errors.description && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.description}</div>}
        </div>

        {/* Document Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_idProofOptional') || 'Supporting Documents'} ({t('optional') || 'Optional'})
          </label>
          <label className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-orange-500 p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition group">
            <Upload size={40} className="text-slate-400 group-hover:text-orange-600 mb-3 transition" />
            <span className="text-sm font-bold text-slate-600 group-hover:text-orange-600 transition">
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
            className="flex-[2] bg-gradient-to-r from-orange-600 to-amber-600 text-white px-8 py-6 rounded-2xl font-black text-xl hover:from-orange-700 hover:to-amber-700 transition shadow-xl shadow-orange-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {step === 'submitting' ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><CheckCircle size={24} /> {t('submitReq') || 'Submit Request'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GasConnectionForm;
