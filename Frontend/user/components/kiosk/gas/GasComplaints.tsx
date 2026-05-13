import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Upload, X, Flame, Send, Mic, MicOff } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { GasService } from '../../../services/gasService';
import { useServiceComplaint } from '../../../contexts/ServiceComplaintContext';
import ComplaintQRModal from '../../ComplaintQRModal'; // ⭐ PLUG-IN: QR tracking

interface Props {
  onBack: () => void;
  language: Language;
}

const COMPLAINT_CATEGORIES = [
  { value: 'gas_leak', i18nKey: 'gas_compLeak', label: 'Gas Leak / Safety Issue' },
  { value: 'meter_issue', i18nKey: 'gas_compMeter', label: 'Meter Malfunction / Damage' },
  { value: 'billing_error', i18nKey: 'gas_compBilling', label: 'Incorrect Gas Bill' },
  { value: 'supply_disruption', i18nKey: 'gas_compSupply', label: 'Gas Supply Disruption' },
  { value: 'connection_delay', i18nKey: 'gas_compDelay', label: 'Delay in Connection / Service' },
  { value: 'staff_behavior', i18nKey: 'gas_compStaff', label: 'Staff Behavior / Service Quality' },
  { value: 'other', i18nKey: 'gas_compOther', label: 'Other' },
];

const GasComplaints: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const { addComplaint } = useServiceComplaint();
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showQR, setShowQR] = useState(false); // ⭐ PLUG-IN

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'Hindi' ? 'hi-IN' : language === 'Assamese' ? 'as-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleInputChange('description', (formData.description || '') + ' ' + transcript);
    };
    recognition.onerror = () => setIsListening(false);

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.category) errs.category = t('fieldRequired') || 'Required';
    if (!formData.subject?.trim()) errs.subject = t('fieldRequired') || 'Required';
    if (!formData.description?.trim()) errs.description = t('fieldRequired') || 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep('submitting');
    setSubmitError('');

    try {
      const result = await GasService.submitComplaint({
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        ward: formData.ward,
        phone: formData.phone,
        priority: formData.category === 'gas_leak' ? 'critical' : 'medium'
      });
      setTicketNumber(result.ticket_number || result.id || 'GAS-CMP-' + Date.now());
      setShowQR(true); // ⭐ PLUG-IN

      // ✅ Write to ServiceComplaintContext so this record appears in History
      const userStr = localStorage.getItem('aazhi_user');
      const user = userStr ? JSON.parse(userStr) : null;
      await addComplaint({
        name: user?.name || 'Guest',
        phone: formData.phone || user?.mobile || '',
        category: 'Gas',
        complaintType: formData.subject || formData.category || 'Gas Complaint',
        location: '',
        description: formData.description,
        citizenId: user?.id,
        area: formData.ward || user?.ward || 'Unknown',
      });

      setStep('success');
    } catch (err: any) {
      console.error('Gas complaint submission failed (offline fallback):', err);
      // ✅ Offline fallback: generate local ticket and still write to History
      const offlineTicket = 'GAS-CMP-' + Date.now();
      setTicketNumber(offlineTicket);
      const userStr = localStorage.getItem('aazhi_user');
      const user = userStr ? JSON.parse(userStr) : null;
      await addComplaint({
        name: user?.name || 'Guest',
        phone: formData.phone || user?.mobile || '',
        category: 'Gas',
        complaintType: formData.subject || formData.category || 'Gas Complaint',
        location: '',
        description: formData.description || 'Gas complaint submitted offline',
        citizenId: user?.id,
        area: formData.ward || user?.ward || 'Unknown',
      });
      setStep('success');
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
            {t('gas_complaintRegistered') || 'Complaint Registered!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6">
            {t('gas_complaintDesc') || 'Your complaint has been submitted and a ticket has been generated.'}
          </p>
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mb-8">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
              {t('ticketNumber') || 'Ticket ID'}
            </p>
            <p className="text-3xl font-black text-red-700">{ticketNumber}</p>
          </div>
          <p className="text-sm text-slate-400 font-medium mb-4">
            {t('gas_slaInfo') || 'Our team will respond within the SLA timeline.'}
          </p>
          {/* ⭐ PLUG-IN: QR scan button */}
          <button onClick={() => setShowQR(true)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-sm mb-3 hover:bg-blue-700 transition">
            📱 Scan QR to Track on Mobile
          </button>
          <button onClick={onBack} className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition">
            {t('returnHomeBtn') || 'Back to Gas Services'}
          </button>
        </div>
        {/* ⭐ PLUG-IN: QR Modal */}
        {showQR && <ComplaintQRModal ticketNumber={ticketNumber} complaintId={ticketNumber} onClose={() => setShowQR(false)} />}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
      </button>

      <div className="bg-white rounded-[2.5rem] border-2 border-red-200 p-8 shadow-lg mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border-2 border-red-200">
            <AlertCircle size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{t('gas_registerComplaint') || 'Register Gas Complaint'}</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
              {t('gas_complaintFormDesc') || 'Report an issue with text or voice input'}
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
        {/* Category */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('gas_complaintCategory') || 'Complaint Category'} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category || ''}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className={`w-full bg-slate-50 border-2 ${errors.category ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-red-500 focus:bg-white transition`}
          >
            <option value="">{t('selectOption') || '-- Select Category --'}</option>
            {COMPLAINT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{t(cat.i18nKey) || cat.label}</option>
            ))}
          </select>
          {errors.category && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.category}</div>}
        </div>

        {/* Subject */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('gas_complaintSubject') || 'Subject'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.subject || ''}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder={t('gas_subjectPlaceholder') || 'Brief subject of your complaint'}
            className={`w-full bg-slate-50 border-2 ${errors.subject ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-red-500 focus:bg-white transition placeholder:text-slate-400`}
          />
          {errors.subject && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.subject}</div>}
        </div>

        {/* Description with Voice Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
              {t('sf_description') || 'Description'} <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                isListening
                  ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              {isListening ? (t('gas_stopVoice') || 'Stop') : (t('gas_voiceInput') || 'Voice Input')}
            </button>
          </div>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder={t('gas_descPlaceholder') || 'Describe your complaint in detail. You can also use voice input.'}
            rows={5}
            className={`w-full bg-slate-50 border-2 ${errors.description ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-red-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
          />
          {errors.description && <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold"><AlertCircle size={18} /> {errors.description}</div>}
        </div>

        {/* Phone */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('sf_mobileNumber') || 'Contact Number'} ({t('optional') || 'Optional'})
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={formData.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
            placeholder="98765 43210"
            className="w-full bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl text-lg font-semibold outline-none focus:border-red-500 focus:bg-white transition placeholder:text-slate-400"
          />
        </div>

        {/* Document Upload */}
        <div className="space-y-3">
          <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
            {t('gas_uploadEvidence') || 'Upload Evidence'} ({t('optional') || 'Optional'})
          </label>
          <label className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-red-500 p-6 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition group">
            <Upload size={32} className="text-slate-400 group-hover:text-red-600 mb-2 transition" />
            <span className="text-sm font-bold text-slate-600 group-hover:text-red-600 transition">
              {t('clickToUpload') || 'Click to upload images or documents'}
            </span>
            <input
              type="file"
              onChange={(e) => { if (e.target.files?.[0]) setUploadedFiles(prev => [...prev, e.target.files![0].name]); }}
              className="hidden"
              accept="image/*,.pdf"
            />
          </label>
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                  <CheckCircle size={20} /> <span className="text-sm font-bold">{f}</span>
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
            className="flex-[2] bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-6 rounded-2xl font-black text-xl hover:from-red-700 hover:to-rose-700 transition shadow-xl shadow-red-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {step === 'submitting' ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Send size={24} /> {t('submitComplaint') || 'Submit Complaint'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GasComplaints;
