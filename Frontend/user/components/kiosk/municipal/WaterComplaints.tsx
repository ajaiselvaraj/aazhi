import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, Send, Camera, Mic } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import DocumentScannerOverlay from '../DocumentScannerOverlay';
import { useServiceComplaint } from '../../../contexts/ServiceComplaintContext';
import ComplaintQRModal from '../../ComplaintQRModal';

interface Props {
  onBack: () => void;
  language: Language;
}

const COMPLAINT_CATEGORIES = [
  { id: 'water_leakage', label: 'Water Leakage' },
  { id: 'water_noSupply', label: 'No Water Supply' },
  { id: 'water_lowPressure', label: 'Low Water Pressure' },
  { id: 'water_drainage', label: 'Drainage Issue' },
  { id: 'water_quality', label: 'Poor Water Quality' },
  { id: 'water_pipeDamage', label: 'Pipe Damage' },
  { id: 'water_other', label: 'Other' }
];

const PRIORITY_LEVELS = [
  { id: 'low', label: 'Low', desc: 'No immediate impact on safety or essential services' },
  { id: 'medium', label: 'Medium', desc: 'Standard service issues' },
  { id: 'high', label: 'High', desc: 'Prolonged outage, business impact' },
  { id: 'critical', label: 'Critical', desc: 'Immediate danger, major flooding' }
];

const WaterComplaints: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const { addComplaint, getComplaintsByCategory } = useServiceComplaint();
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [formData, setFormData] = useState<Record<string, string>>({
    priority: 'medium'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Get Water Complaints History
  const waterComplaints = getComplaintsByCategory('Water').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
      const generatedTicket = 'WTR-' + Math.floor(1000 + Math.random() * 9000);
      setTicketNumber(generatedTicket);
      setShowQR(true);

      const userStr = localStorage.getItem('aazhi_user');
      const user = userStr ? JSON.parse(userStr) : null;
      await addComplaint({
        name: user?.name || 'Guest',
        phone: formData.mobile || user?.mobile || '',
        category: 'Water',
        complaintType: formData.subject || formData.category || 'Water Complaint',
        location: '',
        description: formData.description,
        citizenId: user?.id,
        area: formData.ward || user?.ward || 'Unknown',
      });

      setStep('success');
    } catch (err: any) {
      console.error('Water complaint submission failed:', err);
      // Fallback
      const fallbackTicket = 'WTR-' + Date.now().toString().slice(-6);
      setTicketNumber(fallbackTicket);
      
      const userStr = localStorage.getItem('aazhi_user');
      const user = userStr ? JSON.parse(userStr) : null;
      await addComplaint({
        name: user?.name || 'Guest',
        phone: formData.mobile || user?.mobile || '',
        category: 'Water',
        complaintType: formData.subject || formData.category || 'Water Complaint',
        location: '',
        description: formData.description,
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
          <div className="w-24 h-24 bg-cyan-50 text-cyan-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">
            {t('water_complaintRegistered') || 'Complaint Registered!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6">
            {t('water_complaintDesc') || 'Your water-related complaint has been successfully recorded and forwarded to the municipality department.'}
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              {t('water_ticketNumber') || 'Complaint Reference ID'}
            </p>
            <p className="text-3xl font-black text-slate-800">{ticketNumber}</p>
          </div>
          <button
            onClick={() => setShowQR(true)}
            className="w-full bg-cyan-600 text-white p-4 rounded-2xl font-black text-sm mb-3 hover:bg-cyan-700 transition flex items-center justify-center gap-2"
          >
            📱 Scan QR to Track on Mobile
          </button>
          <button
            onClick={() => { setStep('form'); setFormData({ priority: 'medium' }); }}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition"
          >
            {t('returnHomeBtn') || 'Back to Dashboard'}
          </button>
        </div>
        {showQR && <ComplaintQRModal ticketNumber={ticketNumber} complaintId={ticketNumber} onClose={() => setShowQR(false)} />}
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
          <h2 className="text-3xl font-black text-slate-900">{t('water_registerComplaint') || 'Register Water Complaint'}</h2>
          <p className="text-slate-500 font-medium tracking-wide">
            {t('water_complaintSubtitle') || 'Report water supply issues, leakage, drainage, or service problems'}
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
        className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden mb-12"
      >
        <div className="p-10 space-y-8">
          
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
              {t('water_complaintCategory') || 'Complaint Category'} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category || ''}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={`w-full bg-slate-50 border-2 ${errors.category ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-bold outline-none focus:border-cyan-500 focus:bg-white transition text-slate-700`}
            >
              <option value="">-- {t('water_selectCategory') || 'Select Category'} --</option>
              {COMPLAINT_CATEGORIES.map(c => <option key={c.id} value={c.label}>{t(c.id) || c.label}</option>)}
            </select>
            {errors.category && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.category}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                {t('water_consumerNumber') || 'Water Connection Number'} ({t('water_optional') || 'Optional'})
              </label>
              <input
                type="text"
                value={formData.consumer_number || ''}
                onChange={(e) => handleInputChange('consumer_number', e.target.value)}
                placeholder="123456789012"
                className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-bold outline-none focus:border-cyan-500 focus:bg-white transition"
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
                className={`w-full bg-slate-50 border-2 ${errors.mobile ? 'border-red-400' : 'border-slate-200'} p-4 rounded-2xl font-bold outline-none focus:border-cyan-500 focus:bg-white transition`}
              />
              {errors.mobile && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.mobile}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
              {t('water_priority') || 'Priority Level'} <span className="text-red-500">*</span>
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
                      : 'border-cyan-600 bg-cyan-600 text-white shadow-lg shadow-cyan-200'
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
              {t('water_subject') || 'Complaint Subject'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject || ''}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="e.g. Broken pipe in street"
              className={`w-full bg-slate-50 border-2 ${errors.subject ? 'border-red-400' : 'border-slate-200'} p-4 rounded-2xl font-bold outline-none focus:border-cyan-500 focus:bg-white transition`}
            />
            {errors.subject && <p className="text-red-500 text-sm font-bold mt-1 flex items-center gap-1"><AlertCircle size={14}/> {errors.subject}</p>}
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              {t('water_description') || 'Complaint Description'} <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`flex-1 w-full bg-white border-2 ${errors.description ? 'border-red-400' : 'border-slate-200'} rounded-2xl p-4 text-slate-800 font-bold focus:border-cyan-500 outline-none resize-none placeholder:text-slate-300 placeholder:font-normal`}
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
            className="bg-cyan-600 text-white px-10 py-4 rounded-xl font-black text-lg hover:bg-cyan-700 transition disabled:opacity-50 flex items-center gap-3 shadow-xl shadow-cyan-200"
          >
            {step === 'submitting' ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>{t('water_submitComplaint') || 'Submit Complaint'} <Send size={20} /></>
            )}
          </button>
        </div>
      </form>

      {/* Complaint History / List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden p-8">
        <h3 className="text-2xl font-black text-slate-900 mb-6">{t('water_complaintHistory') || 'Complaint History'}</h3>
        <p className="text-sm font-medium text-slate-500 mb-4">{t('water_latestComplaints') || 'Latest Water Complaints'}</p>
        
        {waterComplaints.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">No water complaints filed yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {waterComplaints.map(complaint => (
              <div key={complaint.id} className="p-5 border border-slate-100 rounded-2xl hover:border-cyan-200 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center">
                     <span className="bg-slate-100 text-slate-700 font-bold text-xs px-2 py-1 rounded-md">{complaint.id}</span>
                     <span className="font-bold text-slate-800">{complaint.complaintType}</span>
                  </div>
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    complaint.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    complaint.status === 'active' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {complaint.status === 'active' ? (t('water_inProgress') || 'In Progress') : (t('water_resolved') || 'Resolved')}
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium mb-3 line-clamp-2">{complaint.description}</p>
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>{new Date(complaint.createdAt).toLocaleDateString()} {new Date(complaint.createdAt).toLocaleTimeString()}</span>
                  <span className={`px-2 py-1 rounded-md border ${
                    complaint.priority === 'Critical' ? 'border-red-200 text-red-600' :
                    complaint.priority === 'High' ? 'border-orange-200 text-orange-600' :
                    'border-blue-200 text-blue-600'
                  }`}>
                    Priority: {complaint.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

export default WaterComplaints;
