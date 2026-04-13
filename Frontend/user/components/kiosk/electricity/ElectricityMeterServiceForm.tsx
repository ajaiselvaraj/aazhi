import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Upload, AlertCircle, X, Gauge, ArrowRight, Wrench, Clock, AlertTriangle, ScanLine } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { ElectricityService } from '../../../services/electricityService';
import DocumentScannerOverlay from '../DocumentScannerOverlay';

interface Props {
  onBack: () => void;
  language: Language;
}

type MeterServiceType = 'Meter Replacement' | 'Meter Shifting' | 'Meter Testing' | 'Smart Meter Upgrade';

const SERVICE_TYPES: { value: MeterServiceType; label: string; desc: string; icon: React.ReactNode; tatDays: number }[] = [
  { value: 'Meter Replacement', label: 'Meter Replacement', desc: 'Replace faulty, damaged, or non-functional meter', icon: <Wrench size={24} />, tatDays: 7 },
  { value: 'Meter Shifting', label: 'Meter Shifting', desc: 'Relocate meter to a different position on premises', icon: <ArrowRight size={24} />, tatDays: 15 },
  { value: 'Meter Testing', label: 'Meter Testing / Accuracy Check', desc: 'Request official testing if meter readings seem incorrect', icon: <Gauge size={24} />, tatDays: 10 },
  { value: 'Smart Meter Upgrade', label: 'Smart Meter Upgrade', desc: 'Upgrade to AMI / smart prepaid meter', icon: <Gauge size={24} />, tatDays: 30 },
];

const REASON_OPTIONS: Record<MeterServiceType, string[]> = {
  'Meter Replacement': ['Meter not working', 'Display blank / broken', 'Physical damage', 'Meter burnt', 'Reading fluctuation', 'Seal broken', 'Other'],
  'Meter Shifting': ['Renovation / construction', 'Safety concern', 'Accessibility issue', 'Building modification', 'Other'],
  'Meter Testing': ['Unusually high bill', 'Reading not matching usage', 'Suspected meter fault', 'Meter running fast', 'Other'],
  'Smart Meter Upgrade': ['Voluntary upgrade', 'Prepaid meter request', 'Remote monitoring needed', 'Other'],
};

const ElectricityMeterServiceForm: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'type' | 'form' | 'submitting' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<MeterServiceType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const selectedInfo = SERVICE_TYPES.find(s => s.value === selectedType);

  const handleTypeSelect = (type: MeterServiceType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (file) setUploadedFiles(prev => [...prev, file.name]);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = t('fieldRequired') || 'Required';
    if (!formData.mobile?.trim() || !/^\d{10}$/.test(formData.mobile)) errs.mobile = t('validMobile') || 'Enter valid 10-digit mobile';
    if (!formData.consumer_number?.trim()) errs.consumer_number = t('fieldRequired') || 'Required';
    if (!formData.address?.trim()) errs.address = t('fieldRequired') || 'Required';
    if (!formData.reason) errs.reason = t('fieldRequired') || 'Select a reason';
    if (!formData.description?.trim()) errs.description = t('fieldRequired') || 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedType) return;
    setStep('submitting');
    setSubmitError('');

    try {
      const result = await ElectricityService.submitMeterRequest({
        service_type: selectedType,
        reason: formData.reason,
        priority: formData.priority as 'normal' | 'urgent' || 'normal',
        name: formData.name,
        mobile: formData.mobile,
        consumer_number: formData.consumer_number,
        address: formData.address,
        description: formData.description,
        ward: formData.ward,
        documents: uploadedFiles
      });
      setTicketNumber(result.ticket_number || result.id || 'MTR-' + Date.now());
      setStep('success');
    } catch (err: any) {
      console.error('Meter service request failed:', err);
      setSubmitError(err.message || 'Failed to submit request. Please try again.');
      setStep('form');
    }
  };

  // ── SUCCESS ──
  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-10 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
          <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
            {t('elec_meterRequestSubmitted') || 'Request Submitted!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6">
            {t('elec_meterRequestDesc') || 'Your meter service request has been registered.'}
          </p>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-4">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{t('ticketNumber') || 'Reference Number'}</p>
            <p className="text-3xl font-black text-blue-700">{ticketNumber}</p>
          </div>
          {selectedInfo && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-8 flex items-center gap-3 justify-center">
              <Clock size={18} className="text-slate-500" />
              <span className="text-sm font-bold text-slate-600">
                {t('elec_estimatedTAT') || 'Estimated TAT'}: {selectedInfo.tatDays} {t('workingDays') || 'working days'}
              </span>
            </div>
          )}
          <button onClick={onBack} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition">
            {t('returnHomeBtn') || 'Back to Electricity'}
          </button>
        </div>
      </div>
    );
  }

  // ── TYPE SELECTION ──
  if (step === 'type') {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
          <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <Gauge size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">{t('elec_meterServices') || 'Meter Services'}</h1>
          <p className="text-slate-500 font-medium">{t('elec_meterServicesDesc') || 'Request meter replacement, shifting, testing, or upgrade.'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SERVICE_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => handleTypeSelect(type.value)}
              className="group bg-white p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                  {type.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg">{type.label}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">{type.desc}</p>
                </div>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition" />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-2 px-3 rounded-lg w-fit">
                <Clock size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">TAT: {type.tatDays} Days</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── FORM ──
  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8">
      <button onClick={() => setStep('type')} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('elec_changeServiceType') || 'Change Service Type'}
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-[2.5rem] border-2 border-indigo-200 p-8 shadow-lg mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border-2 border-indigo-200">
            <Gauge size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedType}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">{t('fillDetailsBelow') || 'Fill in the details below'}</p>
          </div>
          {selectedInfo && (
            <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 text-center">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">TAT</p>
              <p className="text-lg font-black text-indigo-700">{selectedInfo.tatDays}d</p>
            </div>
          )}
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
        {/* Consumer Number */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('elec_consumerNumber') || 'Consumer / Service Number'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.consumer_number || ''}
            onChange={(e) => handleInputChange('consumer_number', e.target.value)}
            placeholder="e.g. 069-123-4567"
            className={`w-full bg-slate-50 border-2 ${errors.consumer_number ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-indigo-500 focus:bg-white transition placeholder:text-slate-400`}
          />
          {errors.consumer_number && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.consumer_number}</div>}
        </div>

        {/* Name + Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              {t('sf_fullName') || 'Consumer Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('sf_enterFullName') || 'Enter name'}
              className={`w-full bg-slate-50 border-2 ${errors.name ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-indigo-500 focus:bg-white transition placeholder:text-slate-400`}
            />
            {errors.name && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.name}</div>}
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              {t('sf_mobileNumber') || 'Mobile'} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel" inputMode="numeric" maxLength={10}
              value={formData.mobile || ''}
              onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
              placeholder="98765 43210"
              className={`w-full bg-slate-50 border-2 ${errors.mobile ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-indigo-500 focus:bg-white transition placeholder:text-slate-400`}
            />
            {errors.mobile && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.mobile}</div>}
          </div>
        </div>

        {/* Reason for Request */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('elec_reasonForRequest') || 'Reason for Request'} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(selectedType ? REASON_OPTIONS[selectedType] : []).map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => handleInputChange('reason', reason)}
                className={`p-4 rounded-xl text-sm font-bold border-2 text-left transition-all
                  ${formData.reason === reason
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-300 bg-slate-50'
                  }`}
              >
                {reason}
              </button>
            ))}
          </div>
          {errors.reason && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.reason}</div>}
        </div>

        {/* Priority */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('elec_priority') || 'Priority Level'}
          </label>
          <div className="flex gap-4">
            {(['normal', 'urgent'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleInputChange('priority', p)}
                className={`flex-1 p-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2
                  ${formData.priority === p || (!formData.priority && p === 'normal')
                    ? p === 'urgent' ? 'border-red-500 bg-red-500 text-white' : 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 text-slate-600 bg-slate-50 hover:border-slate-400'
                  }`}
              >
                {p === 'urgent' && <AlertTriangle size={16} />}
                {p === 'normal' ? 'Normal' : 'Urgent'}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_address') || 'Premises Address'} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder={t('sf_enterAddress') || 'Full address'}
            rows={2}
            className={`w-full bg-slate-50 border-2 ${errors.address ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-indigo-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
          />
          {errors.address && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.address}</div>}
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_description') || 'Additional Details'} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the issue or requirement in detail"
            rows={3}
            className={`w-full bg-slate-50 border-2 ${errors.description ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-indigo-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
          />
          {errors.description && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.description}</div>}
        </div>

        {/* Document Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('elec_supportingDocs') || 'Evidence / Photos'} ({t('optional') || 'Optional'})
          </label>
          <div onClick={() => setShowScanner(true)} className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-indigo-500 p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition group">
            <ScanLine size={32} className="text-slate-400 group-hover:text-indigo-600 mb-2 transition" />
            <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition">{t('tapToScan') || 'Hardware Document Scan'}</span>
            <span className="text-xs text-slate-400 mt-1">Place evidence on the scanner bed</span>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 mt-3">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                  <CheckCircle size={20} /><span className="text-sm font-bold">{file}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-6 pt-8 border-t-2 border-slate-100">
          <button type="button" onClick={() => { setFormData({}); setErrors({}); setUploadedFiles([]); }}
            className="flex-1 bg-slate-100 text-slate-700 px-8 py-6 rounded-2xl font-black text-xl hover:bg-slate-200 transition border-2 border-slate-200 flex items-center justify-center gap-3">
            <X size={24} /> {t('resetForm') || 'Reset'}
          </button>
          <button type="submit" disabled={step === 'submitting'}
            className="flex-[2] bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-6 rounded-2xl font-black text-xl hover:from-indigo-700 hover:to-violet-700 transition shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50">
            {step === 'submitting' ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><CheckCircle size={24} /> {t('submitReq') || 'Submit Request'}</>
            )}
          </button>
        </div>
      </form>

      {showScanner && (
          <DocumentScannerOverlay 
            documentName="Meter Evidence"
            onClose={() => setShowScanner(false)}
            onScanComplete={(fileName) => {
                setUploadedFiles(prev => [...prev, fileName]);
                setShowScanner(false);
            }}
          />
      )}
    </div>
  );
};

export default ElectricityMeterServiceForm;
