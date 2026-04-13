import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Upload, AlertCircle, X, AlertTriangle, Send, Camera, Mic } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { ElectricityService } from '../../../services/electricityService';
import DocumentScannerOverlay from '../DocumentScannerOverlay';

interface Props {
  onBack: () => void;
  language: Language;
}

const COMPLAINT_CATEGORIES = [
  'Incorrect Electricity Bill',
  'Delay in New Connection Approval',
  'Delay in Meter Replacement / Shifting',
  'Disconnection Without Prior Notice',
  'Voltage Fluctuation / Power Outage',
  'Transformer Issue',
  'Other'
];

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', desc: 'No immediate impact on safety or essential services' },
  { id: 'medium', label: 'Medium', desc: 'Standard service issues, billing complaints' },
  { id: 'high', label: 'High', desc: 'Prolonged power outage, business impact' },
  { id: 'critical', label: 'Critical', desc: 'Sparking, broken live wires, immediate danger' }
];

const ElectricityComplaints: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [formData, setFormData] = useState<Record<string, string>>({
    priority: 'medium'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

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
    if (!formData.category) errs.category = t('fieldRequired') || 'Required';
    if (!formData.subject?.trim()) errs.subject = t('fieldRequired') || 'Required';
    if (!formData.description?.trim()) errs.description = t('fieldRequired') || 'Required';
    if (!formData.mobile?.trim() || !/^\d{10}$/.test(formData.mobile)) errs.mobile = t('validMobile') || 'Enter valid 10-digit mobile';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep('submitting');
    setSubmitError('');

    try {
      const result = await ElectricityService.submitComplaint({
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        consumer_number: formData.consumer_number,
        ward: formData.ward,
        phone: formData.mobile,
        priority: formData.priority as any
      });
      setTicketNumber(result.ticket_number || result.id || 'EB-CMP-' + Date.now());
      setStep('success');
    } catch (err: any) {
      console.error('Electricity complaint submission failed:', err);
      setSubmitError(err.message || 'Failed to submit complaint. Please try again.');
      setStep('form');
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-10 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
          <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
            {t('elec_complaintRegistered') || 'Complaint Registered!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6">
            {t('elec_complaintDesc') || 'Your electricity grievance has been recorded and assigned to the concerned engineer.'}
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              {t('ticketNumber') || 'Complient Reference ID'}
            </p>
            <p className="text-3xl font-black text-slate-800">{ticketNumber}</p>
          </div>
          <button
            onClick={onBack}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition"
          >
            {t('returnHomeBtn') || 'Back to Electricity Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900">{t('elec_registerComplaint') || 'Register Electricity Grievance'}</h2>
          <p className="text-slate-500 font-medium tracking-wide">
            {t('elec_complaintSubtitle') || 'Report billing errors, outages, or service delays'}
          </p>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 flex items-center gap-3 text-red-700 font-bold">
          <AlertCircle size={20} /> {submitError}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden"
      >
        <div className="p-10 space-y-8">
          
          {/* Category */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
              {t('elec_complaintCategory') || 'Category'} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category || ''}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full bg-slate-50 border-2 ${errors.category ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-bold outline-none focus:border-blue-500 focus:bg-white transition text-slate-700`}
            >
              <option value="">-- {t('selectCategory') || 'Select Category'} --</option>
              {COMPLAINT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.category}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                {t('elec_consumerNumber') || 'Consumer Number'} ({t('optional') || 'Optional'})
              </label>
              <input
                type="text"
                value={formData.consumer_number || ''}
                onChange={(e) => handleInputChange('consumer_number', e.target.value)}
                placeholder="069-123-4567"
                className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-bold outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                {t('sf_mobileNumber') || 'Mobile Number'} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                value={formData.mobile || ''}
                onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                className={`w-full bg-slate-50 border-2 ${errors.mobile ? 'border-red-400' : 'border-slate-200'} p-4 rounded-2xl font-bold outline-none focus:border-blue-500 focus:bg-white transition`}
              />
              {errors.mobile && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.mobile}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
              {t('elec_priority') || 'Priority Level'} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIORITY_LEVELS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleInputChange('priority', p.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    formData.priority === p.id 
                    ? p.id === 'critical' || p.id === 'high' 
                      ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-200' 
                      : 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm tracking-wide">{p.label}</p>
                  <p className={`text-[10px] mt-1 ${formData.priority === p.id ? 'opacity-90' : 'text-slate-400 font-medium'}`}>{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
              {t('elec_subject') || 'Complaint Subject'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject || ''}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="e.g. Meter burnt due to short circuit"
              className={`w-full bg-slate-50 border-2 ${errors.subject ? 'border-red-400' : 'border-slate-200'} p-4 rounded-2xl font-bold outline-none focus:border-blue-500 focus:bg-white transition`}
            />
            {errors.subject && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.subject}</p>}
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              {t('comp_additionalDetails') || 'Detailed Description'} <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`flex-1 w-full bg-white border-2 ${errors.description ? 'border-red-400' : 'border-slate-200'} rounded-2xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none resize-none placeholder:text-slate-300 placeholder:font-normal`}
              placeholder={t('comp_describeProblem') || 'Explain the issue...'}
              rows={4}
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
            {errors.description && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.description}</p>}

            <div className="mt-4 flex gap-3">
              <button 
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex-1 bg-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-300 transition cursor-pointer"
              >
                <Camera size={18} /> {t('comp_addPhoto') || 'Add Photo'}
              </button>
              <button type="button" className="flex-1 bg-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-300 transition">
                <Mic size={18} /> {t('comp_voiceNote') || 'Voice Note'}
              </button>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {uploadedFiles.map((file, i) => (
                  <span key={i} className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-600" /> {file}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-4">
          <button
            type="button"
            onClick={onBack}
            className="px-8 py-4 text-slate-500 font-bold hover:text-slate-800 transition"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={step === 'submitting'}
            className="bg-red-600 text-white px-10 py-4 rounded-xl font-black text-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-3 shadow-xl shadow-red-200"
          >
            {step === 'submitting' ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>{t('comp_submitComplaint') || 'Submit Grievance'} <Send size={20} /></>
            )}
          </button>
        </div>
      </form>

      {showScanner && (
          <DocumentScannerOverlay 
            documentName="Complaint Evidence"
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

export default ElectricityComplaints;
