import React, { useState } from 'react';
import { 
  ArrowLeft, CheckCircle, Upload, AlertCircle, X, AlertTriangle, Send, Camera, Mic,
  Trash2, Waves, CloudRain, Archive, Users, Dog, Megaphone, Lightbulb, Footprints, 
  TreePine, Leaf, Factory, Bug, Package, Receipt, Droplets, Grid
} from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { useServiceComplaint } from '../../../contexts/ServiceComplaintContext';
import ComplaintQRModal from '../../ComplaintQRModal'; // ⭐ PLUG-IN: QR tracking
import { AccessibleButton } from '../../AccessibleButton';

interface Props {
  onBack: () => void;
  language: Language;
}

const CIVIC_ISSUES = [
  { id: 'garbage', label: 'Garbage not collected', icon: Trash2, circleColor: 'bg-[#3b82f6]', iconColor: 'text-white' },
  { id: 'potholes', label: 'Road potholes', icon: AlertTriangle, circleColor: 'bg-[#d97706]', iconColor: 'text-white' },
  { id: 'drainage', label: 'Drainage blockage', icon: Waves, circleColor: 'bg-[#059669]', iconColor: 'text-white' },
  { id: 'stagnation', label: 'Water stagnation', icon: CloudRain, circleColor: 'bg-[#2563eb]', iconColor: 'text-white' },
  { id: 'dumping', label: 'Illegal dumping', icon: Archive, circleColor: 'bg-[#7c3aed]', iconColor: 'text-white' },
  { id: 'toilets', label: 'Public toilet issues', icon: Users, circleColor: 'bg-[#be123c]', iconColor: 'text-white' },
  { id: 'animals', label: 'Stray animal complaints', icon: Dog, circleColor: 'bg-[#d97706]', iconColor: 'text-white' },
  { id: 'noise', label: 'Noise pollution', icon: Megaphone, circleColor: 'bg-[#0d9488]', iconColor: 'text-white' },
  { id: 'lights', label: 'Street light complaint', icon: Lightbulb, circleColor: 'bg-[#d97706]', iconColor: 'text-white' },
  { id: 'footpath', label: 'Broken footpath', icon: Footprints, circleColor: 'bg-[#64748b]', iconColor: 'text-white' },
  { id: 'manhole', label: 'Open manhole reporting', icon: AlertCircle, circleColor: 'bg-[#b91c1c]', iconColor: 'text-white' },
  { id: 'signal', label: 'Damaged traffic signal', icon: Grid, circleColor: 'bg-[#059669]', iconColor: 'text-white' },
  { id: 'tree', label: 'Fallen tree', icon: TreePine, circleColor: 'bg-[#15803d]', iconColor: 'text-white' },
  { id: 'park', label: 'Park maintenance', icon: Leaf, circleColor: 'bg-[#15803d]', iconColor: 'text-white' },
  { id: 'pollution', label: 'Pollution reporting', icon: Factory, circleColor: 'bg-[#64748b]', iconColor: 'text-white' },
  { id: 'mosquito', label: 'Mosquito complaint', icon: Bug, circleColor: 'bg-[#9f1239]', iconColor: 'text-white' },
  { id: 'commercial_waste', label: 'Commercial waste request', icon: Package, circleColor: 'bg-[#2563eb]', iconColor: 'text-white' },
  { id: 'tax', label: 'Property tax issue', icon: Receipt, circleColor: 'bg-[#0d9488]', iconColor: 'text-white' },
  { id: 'water_quality', label: 'Water quality report', icon: Droplets, circleColor: 'bg-[#0284c7]', iconColor: 'text-white' },
];

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', desc: 'No immediate impact on safety' },
  { id: 'medium', label: 'Medium', desc: 'Standard service issues' },
  { id: 'high', label: 'High', desc: 'Prolonged impact' },
  { id: 'critical', label: 'Critical', desc: 'Immediate danger' }
];

const MunicipalComplaints: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const { addComplaint } = useServiceComplaint();
  const [step, setStep] = useState<'category' | 'form' | 'submitting' | 'success'>('category');
  const [formData, setFormData] = useState<Record<string, string>>({
    priority: 'medium'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showQR, setShowQR] = useState(false); // ⭐ PLUG-IN: QR modal state

  const handleCategorySelect = (categoryLabel: string) => {
    handleInputChange('category', categoryLabel);
    // Autofill subject with category for convenience
    handleInputChange('subject', categoryLabel);
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

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = t('fieldRequired') || 'Required';
    if (!formData.category) errs.category = t('fieldRequired') || 'Required';
    if (!formData.subject?.trim()) errs.subject = t('fieldRequired') || 'Required';
    if (!formData.mobile?.trim() || !/^\d{10}$/.test(formData.mobile)) errs.mobile = t('validMobile') || 'Enter valid 10-digit mobile';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep('submitting');
    setSubmitError('');

    try {
      const userStr = localStorage.getItem('aazhi_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const ticketId = await addComplaint({
        name: formData.name || user?.name || 'Guest',
        phone: formData.mobile || user?.mobile || '',
        category: 'Municipal',
        complaintType: formData.subject || formData.category || 'Municipal Complaint',
        location: '',
        description: formData.description,
        citizenId: user?.id,
        area: formData.ward || user?.ward || 'Unknown',
        request_category: 'municipal',
      });
      
      setTicketNumber(ticketId);
      setShowQR(true);
      setStep('success');
    } catch (err: any) {
      console.error('Municipal complaint submission failed:', err);
      setSubmitError(err.message || 'Failed to submit complaint');
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
            {t('muni_complaintRegistered') || 'Complaint Registered!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6">
            {t('muni_complaintDesc') || 'Your municipal grievance has been recorded and assigned to the concerned engineer.'}
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              {t('ticketNumber') || 'Complient Reference ID'}
            </p>
            <p className="text-3xl font-black text-slate-800">{ticketNumber}</p>
          </div>
          <button
            onClick={() => setShowQR(true)}
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-sm mb-3 hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            📱 Scan QR to Track on Mobile
          </button>
          <button
            onClick={onBack}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition"
          >
            {t('returnHomeBtn') || 'Back to Municipal Dashboard'}
          </button>
        </div>
        {showQR && <ComplaintQRModal ticketNumber={ticketNumber} complaintId={ticketNumber} onClose={() => setShowQR(false)} />}
      </div>
    );
  }

  if (step === 'category') {
    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full bg-[#f4f6fa] p-4 sm:p-8 animate-in fade-in">
        <div className="flex items-center gap-4 mb-4">
            <button
            onClick={onBack}
            className="w-12 h-12 rounded-full !bg-white border-2 !border-slate-200 flex items-center justify-center !text-slate-600 hover:!bg-slate-100 transition shadow-sm"
            >
            <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black !text-[#1e293b] uppercase tracking-tighter">
                REPORT CIVIC ISSUE
              </h2>
            </div>
        </div>
        <p className="text-center font-bold !text-slate-600 mb-8 uppercase tracking-widest text-sm">
            1. What is the issue?
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pb-12 overflow-y-auto">
          {CIVIC_ISSUES.map(issue => (
            <AccessibleButton
              key={issue.id}
              label={issue.label}
              language="English"
              onClick={() => handleCategorySelect(issue.label)}
              className="!bg-[#222836] hover:!bg-[#2c3344] !border-none !rounded-[1.5rem] p-6 flex flex-col items-center justify-center gap-4 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] w-full min-h-[160px] group"
            >
              <div className={`w-16 h-16 rounded-full ${issue.circleColor} flex items-center justify-center group-hover:scale-110 transition-transform shadow-md`}>
                <issue.icon size={32} className={issue.iconColor} strokeWidth={2.5} />
              </div>
              <span className="!text-white text-lg sm:text-xl font-bold text-center leading-tight">
                {issue.label}
              </span>
            </AccessibleButton>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-8 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setStep('category')}
          className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition shadow-sm"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900">{t('muni_registerComplaint') || 'Register Municipal Grievance'}</h2>
          <p className="text-slate-500 font-medium tracking-wide">
            {formData.category}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                {t('comp_name') || 'Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. John Doe"
                className={`w-full bg-slate-50 border-2 ${errors.name ? 'border-red-400' : 'border-slate-200'} p-4 rounded-2xl font-bold outline-none focus:border-blue-500 focus:bg-white transition`}
              />
              {errors.name && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.name}</p>}
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
              {t('muni_consumerNumber') || 'Property or Municipality ID'} ({t('optional') || 'Optional'})
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
              {t('muni_priority') || 'Priority Level'} <span className="text-red-500">*</span>
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
              {t('muni_subject') || 'Complaint Subject'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject || ''}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="e.g. Garbage not collected for 3 days"
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

          </div>

        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => setStep('category')}
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
    </div>
  );
};

export default MunicipalComplaints;
