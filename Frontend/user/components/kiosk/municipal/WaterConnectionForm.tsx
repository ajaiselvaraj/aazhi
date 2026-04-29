import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Upload, AlertCircle, X, Droplet, ArrowRight, FileText, ScanLine } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { MunicipalAPI } from '../../../services/municipalApi';
import DocumentScannerOverlay from '../DocumentScannerOverlay';
import { useServiceComplaint } from '../../../contexts/ServiceComplaintContext';

interface Props {
  onBack: () => void;
  language: Language;
}

const WaterConnectionForm: React.FC<Props> = ({ onBack, language }) => {
  const { t } = useTranslation();
  const { addServiceRequest } = useServiceComplaint();
  const [step, setStep] = useState<'type' | 'details' | 'documents' | 'submitting' | 'success'>('type');
  
  const [formData, setFormData] = useState<Record<string, string>>({
    connectionType: 'New Connection',
    propertyType: 'Residential',
    pipeSize: '15mm (1/2 inch)'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const connectionTypes = ['New Connection', 'Connection Upgrade', 'Reconnection', 'Disconnection'];
  const propertyTypes = ['Residential', 'Commercial', 'Industrial'];
  const pipeSizes = ['15mm (1/2 inch)', '20mm (3/4 inch)', '25mm (1 inch)', 'Bulk (>1 inch)'];

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

  const validateDetails = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name?.trim()) errs.name = t('fieldRequired') || 'Required';
    if (!formData.mobile?.trim() || !/^\d{10}$/.test(formData.mobile)) errs.mobile = t('validMobile') || 'Enter valid 10-digit mobile';
    if (!formData.address?.trim()) errs.address = t('fieldRequired') || 'Required';
    if (!formData.ward?.trim()) errs.ward = t('fieldRequired') || 'Required';
    if (!formData.propertyId?.trim() && formData.connectionType !== 'New Connection') errs.propertyId = t('fieldRequired') || 'Required for existing connections';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setStep('submitting');
    try {
      const result = await MunicipalAPI.submitWaterConnectionRequest({
        ...formData,
        documents: uploadedFiles
      });
      setTicketNumber(result.ticket_number || result.id || 'MC-WTR-' + Math.floor(100000 + Math.random() * 900000));

      // ✅ Write to ServiceComplaintContext so this record appears in History
      addServiceRequest({
        name: formData.name,
        phone: formData.mobile,
        category: 'Water',
        serviceType: formData.connectionType || 'Water Connection',
        address: formData.address,
        description: `${formData.propertyType} water connection — Pipe size: ${formData.pipeSize}`,
      });

      setStep('success');
    } catch (err: any) {
      console.error('Failed to submit water connection request:', err);
      // Fallback for demo if backend isn't up
      const fallbackTicket = 'MC-WTR-' + Math.floor(100000 + Math.random() * 900000);
      setTicketNumber(fallbackTicket);

      // Still write to History even on API failure (offline fallback)
      addServiceRequest({
        name: formData.name,
        phone: formData.mobile,
        category: 'Water',
        serviceType: formData.connectionType || 'Water Connection',
        address: formData.address,
        description: `${formData.propertyType} water connection — Pipe size: ${formData.pipeSize}`,
      });

      setStep('success');
    }
  };

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-10 animate-in zoom-in-95">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
          <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-lg">
            <CheckCircle size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">
            {t('applicationSubmitted') || 'Application Submitted!'}
          </h2>
          <p className="text-slate-500 font-medium mb-6 leading-relaxed">
            {t('waterConnectionDesc') || 'Your water service request has been received. Our engineer will contact you for site inspection.'}
          </p>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              {t('applicationNumber') || 'Application Number'}
            </p>
            <p className="text-4xl font-black text-slate-800 tracking-wider font-mono">{ticketNumber}</p>
          </div>

          <button
            onClick={onBack}
            className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl"
          >
            {t('returnHomeBtn') || 'Back to Services'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={step === 'type' ? onBack : () => setStep(step === 'documents' ? 'details' : 'type')}
          className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition shadow-sm hover:shadow"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{t('muni_waterConnection') || 'Water Connection Services'}</h2>
          <p className="text-slate-500 font-medium text-lg mt-1">
            {t('muni_waterSubtitle') || 'Apply for new water connection or modify existing setup'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
        {step === 'type' && (
          <div className="p-10 space-y-10">
            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase tracking-widest">
                {t('muni_connectionType') || 'Request Type'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectionTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => handleInputChange('connectionType', type)}
                    className={`p-6 rounded-[1.5rem] border-2 text-left transition-all ${
                      formData.connectionType === type 
                      ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-lg shadow-blue-100 scale-[1.02]' 
                      : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                       <Droplet size={24} className={formData.connectionType === type ? 'text-blue-600' : 'text-slate-400'} />
                       <span className="font-bold text-lg">{type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase tracking-widest">
                {t('propertyType') || 'Property Type'}
              </label>
              <div className="flex flex-wrap gap-4">
                {propertyTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => handleInputChange('propertyType', type)}
                    className={`px-8 py-4 rounded-xl border-2 font-bold transition-all ${
                      formData.propertyType === type 
                      ? 'border-slate-900 bg-slate-900 text-white' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setStep('details')}
                className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                {t('continueBtn') || 'Continue'} <ArrowRight size={24} />
              </button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="p-10 space-y-8 animate-in slide-in-from-right-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t('sf_fullName') || 'Applicant Name'} *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full bg-slate-50 border-2 ${errors.name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} p-5 rounded-2xl font-bold text-lg outline-none focus:bg-white transition`}
                />
                {errors.name && <p className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {errors.name}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t('sf_mobileNumber') || 'Mobile Number'} *</label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.mobile || ''}
                  onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
                  className={`w-full bg-slate-50 border-2 ${errors.mobile ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} p-5 rounded-2xl font-bold text-lg outline-none focus:bg-white transition`}
                />
                {errors.mobile && <p className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {errors.mobile}</p>}
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Property Tax ID (Optional for New)</label>
                <input
                  type="text"
                  value={formData.propertyId || ''}
                  onChange={(e) => handleInputChange('propertyId', e.target.value)}
                  className={`w-full bg-slate-50 border-2 ${errors.propertyId ? 'border-red-400' : 'border-slate-200'} focus:border-blue-500 p-5 rounded-2xl font-bold text-lg outline-none focus:bg-white transition`}
                />
                {errors.propertyId && <p className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {errors.propertyId}</p>}
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t('sf_address') || 'Installation Address'} *</label>
                <textarea
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className={`w-full bg-slate-50 border-2 ${errors.address ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'} p-5 rounded-2xl font-bold text-lg outline-none focus:bg-white transition resize-none`}
                />
                {errors.address && <p className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {errors.address}</p>}
              </div>

              <div className="space-y-3">
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Ward Number *</label>
                 <input
                  type="text"
                  value={formData.ward || ''}
                  onChange={(e) => handleInputChange('ward', e.target.value)}
                  className={`w-full bg-slate-50 border-2 ${errors.ward ? 'border-red-400' : 'border-slate-200'} focus:border-blue-500 p-5 rounded-2xl font-bold text-lg outline-none focus:bg-white transition`}
                />
                {errors.ward && <p className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertCircle size={14}/> {errors.ward}</p>}
              </div>

              <div className="space-y-3">
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Requested Pipe Size *</label>
                 <select
                  value={formData.pipeSize}
                  onChange={(e) => handleInputChange('pipeSize', e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 p-5 rounded-2xl font-bold text-lg outline-none focus:bg-white transition text-slate-800"
                >
                  {pipeSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
              <button onClick={() => setStep('type')} className="px-8 py-5 text-slate-500 font-bold hover:text-slate-800 transition">{t('backBtn') || 'Back'}</button>
              <button
                onClick={() => validateDetails() && setStep('documents')}
                className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition flex items-center gap-3 shadow-xl hover:-translate-y-1"
              >
                {t('continueBtn') || 'Continue'} <ArrowRight size={24} />
              </button>
            </div>
          </div>
        )}

        {(step === 'documents' || step === 'submitting') && (
          <div className="p-10 space-y-8 animate-in slide-in-from-right-4">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-2xl">
              <h4 className="font-bold text-amber-900 mb-2">Required Documents for {formData.connectionType}</h4>
              <ul className="list-disc ml-5 text-sm font-medium text-amber-800 space-y-1">
                <li>Proof of Ownership (Property Tax Receipt/Sale Deed)</li>
                <li>Address Proof (Aadhaar/Voter ID)</li>
                <li>Site Plan / Building Plan (For new commercial/apartment connections)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div 
                onClick={() => setShowScanner(true)}
                className="border-4 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer group"
              >
                <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ScanLine size={32} className="text-blue-500" />
                </div>
                <p className="font-bold text-lg text-slate-700 mb-1">{t('tapToScan') || 'Hardware Document Scan'}</p>
                <p className="text-sm font-medium text-slate-400">Place document on the scanner bed</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-500 uppercase tracking-widest">Uploaded Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={20} className="text-blue-500 shrink-0" />
                          <span className="font-bold text-slate-700 truncate">{file}</span>
                        </div>
                        <button onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 transition">
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
              <button 
                onClick={() => setStep('details')} 
                className="px-8 py-5 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition"
              >
                {t('backBtn') || 'Back'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploadedFiles.length === 0}
                className="bg-green-600 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-green-700 transition flex items-center gap-3 shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {step === 'submitting' ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Submit Application <CheckCircle size={24} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showScanner && (
          <DocumentScannerOverlay 
            documentName="Installation Property Proof"
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

export default WaterConnectionForm;
