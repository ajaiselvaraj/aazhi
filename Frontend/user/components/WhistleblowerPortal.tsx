import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, FileText, CheckCircle, Info, Upload, Key, RefreshCw, ArrowLeft, Calendar, MapPin, Eye } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack: () => void;
  language: string;
}

const CATEGORY_KEYS = [
  'wb_staffMisconduct',
  'wb_corruptionBribe',
  'wb_fakeMeterReading',
  'wb_serviceFraud',
  'wb_abuseOfAuthority',
  'wb_financialIrregularities',
  'wb_contractorMisconduct',
  'wb_other',
];

const TRACKING_STAGE_KEYS = [
  'wb_trackingSubmitted',
  'wb_trackingUnderReview',
  'wb_trackingEvidenceVerify',
  'wb_trackingInvestigation',
  'wb_trackingActionInitiated',
  'wb_trackingClosed',
];

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api") + "/integrity";

export default function WhistleblowerPortal({ onBack, language }: Props) {
  const { t } = useTranslation();
  const CATEGORIES = CATEGORY_KEYS.map(k => t(k));
  const TRACKING_STAGES = TRACKING_STAGE_KEYS.map(k => t(k));
  const [activeTab, setActiveTab] = useState<'report' | 'track' | 'transparency'>('report');
  
  // Transparency Portal State
  const [transparencyData, setTransparencyData] = useState<any | null>(null);
  const [transparencyLoading, setTransparencyLoading] = useState(false);
  const [transparencyError, setTransparencyError] = useState('');

  const fetchTransparencyData = async () => {
    setTransparencyLoading(true);
    setTransparencyError('');
    try {
      const res = await axios.get(`${API_URL}/public/transparency`);
      if (res.data && res.data.success) {
        setTransparencyData(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to load public transparency metrics", err);
      setTransparencyError("Failed to fetch public transparency statistics.");
    } finally {
      setTransparencyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transparency') {
      fetchTransparencyData();
    }
  }, [activeTab]);

  // Reporting Form State
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [retaliationRisk, setRetaliationRisk] = useState(false);
  
  // Attachments state
  const [imageFile, setImageFile] = useState<{ filename: string, mimetype: string, data: string } | null>(null);
  const [voiceFile, setVoiceFile] = useState<{ filename: string, mimetype: string, data: string } | null>(null);
  const [docFile, setDocFile] = useState<{ filename: string, mimetype: string, data: string } | null>(null);
  
  // CAPTCHA State
  const [captcha, setCaptcha] = useState<{ captchaId: string, question: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);

  // Status/Response states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successCode, setSuccessCode] = useState('');

  // Tracking State
  const [trackCode, setTrackCode] = useState('');
  const [trackingData, setTrackingData] = useState<{ category: string, status: string, created_at: string } | null>(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Secure Messaging State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!trackCode) return;
    setMessagesLoading(true);
    setMessagesError('');
    try {
      const res = await axios.get(`${API_URL}/track/${trackCode.trim()}/messages`);
      if (res.data && res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch messages", err);
      setMessagesError("Failed to fetch communication logs.");
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (trackingData) {
      fetchMessages();
    }
  }, [trackingData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !trackCode) return;

    try {
      const payload = { message: newMessage.trim() };
      const res = await axios.post(`${API_URL}/track/${trackCode.trim()}/messages`, payload);
      if (res.data && res.data.success) {
        setMessages(prev => [...prev, res.data.data]);
        setNewMessage('');
      }
    } catch (err: any) {
      console.error("Failed to send message", err);
      setMessagesError("Failed to send message. Please try again.");
    }
  };

  // Fetch CAPTCHA on mount
  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    setLoadingCaptcha(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/captcha`);
      if (res.data && res.data.success) {
        setCaptcha(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to load CAPTCHA", err);
      setError("Failed to initialize security verification CAPTCHA.");
    } finally {
      setLoadingCaptcha(false);
    }
  };

  // Helper to convert files to base64
  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:prefix
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Client-Side Metadata Stripper: Redraw Image on Canvas
  const sanitizeImage = (file: File): Promise<{ filename: string, mimetype: string, data: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          URL.revokeObjectURL(img.src);
          reject(new Error("Failed to get 2D context for canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        
        // Output new clean image blob (completely strips EXIF and GPS headers)
        canvas.toBlob((blob) => {
          if (!blob) {
            URL.revokeObjectURL(img.src);
            reject(new Error("Canvas export failed"));
            return;
          }

          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            
            URL.revokeObjectURL(img.src);
            resolve({
              filename: file.name,
              mimetype: file.type || "image/jpeg",
              data: base64Data
            });
          };
        }, file.type || "image/jpeg", 0.9);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to load image into canvas"));
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Files must be under 5MB.");
      return;
    }

    try {
      // Strips EXIF metadata using Canvas
      const sanitized = await sanitizeImage(file);
      setImageFile(sanitized);
    } catch (err) {
      console.error(err);
      setError("Failed to sanitize image upload. Please try a different image.");
    }
  };

  const handleVoiceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Files must be under 5MB.");
      return;
    }

    try {
      const base64Data = await getBase64(file);
      setVoiceFile({
        filename: file.name,
        mimetype: file.type || "audio/mp3",
        data: base64Data
      });
    } catch (err) {
      setError("Failed to process voice recording.");
    }
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Files must be under 5MB.");
      return;
    }

    try {
      const base64Data = await getBase64(file);
      setDocFile({
        filename: file.name,
        mimetype: file.type || "application/pdf",
        data: base64Data
      });
    } catch (err) {
      setError("Failed to process document upload.");
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      setError("Please select an incident category.");
      return;
    }
    if (!description.trim()) {
      setError("Incident description is required.");
      return;
    }
    if (!captchaAnswer) {
      setError("Security CAPTCHA verification is required.");
      return;
    }

    setSubmitting(true);
    setError('');

    const mediaFiles = [];
    if (imageFile) mediaFiles.push(imageFile);
    if (voiceFile) mediaFiles.push(voiceFile);
    if (docFile) mediaFiles.push(docFile);

    try {
      const payload = {
        category,
        description,
        location,
        incidentDate,
        captchaId: captcha?.captchaId,
        captchaAnswer,
        mediaFiles,
        retaliationRisk
      };

      const res = await axios.post(`${API_URL}/report`, payload);
      if (res.data && res.data.success) {
        setSuccessCode(res.data.data.caseCode);
        // Reset form
        setCategory('');
        setDescription('');
        setLocation('');
        setIncidentDate('');
        setImageFile(null);
        setVoiceFile(null);
        setDocFile(null);
        setCaptchaAnswer('');
        setRetaliationRisk(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit anonymous report. Check CAPTCHA and details.");
      // Refresh CAPTCHA on failure
      fetchCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) {
      setTrackingError("Please enter a case code.");
      return;
    }

    setTrackingLoading(true);
    setTrackingError('');
    setTrackingData(null);

    try {
      const res = await axios.get(`${API_URL}/track/${trackCode.trim()}`);
      if (res.data && res.data.success) {
        setTrackingData(res.data.data);
      }
    } catch (err: any) {
      setTrackingError(err.response?.data?.message || "Invalid case code or report not found.");
    } finally {
      setTrackingLoading(false);
    }
  };

  const getActiveStageIndex = (status: string) => {
    return TRACKING_STAGES.findIndex(s => s.toLowerCase() === status.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-hidden">
      
      {/* Top Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="px-8 py-6 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-805 rounded-2xl transition border border-slate-200 shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 border border-blue-200/60 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-slate-900">{t('wb_civicIntegrity')}</h1>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">{t('wb_sovereignPortal')}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider text-blue-600">
            🔒 {t('wb_govtSecurity')}
          </div>
        </div>
      </header>

      {/* Main Content scrollable container */}
      <div className="flex-1 overflow-y-auto px-6 py-8 z-10 max-w-4xl w-full mx-auto">
        
        {/* Tabs navigation */}
        <div className="flex bg-white border border-slate-200/60 p-1.5 rounded-3xl mb-8 max-w-xl mx-auto shadow-lg">
          <button
            onClick={() => { setActiveTab('report'); setError(''); }}
            className={`flex-1 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldAlert size={16} /> {t('wb_fileReport')}
          </button>
          <button
            onClick={() => { setActiveTab('track'); setTrackingError(''); }}
            className={`flex-1 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'track' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Key size={16} /> {t('wb_trackCase')}
          </button>
          <button
            onClick={() => { setActiveTab('transparency'); }}
            className={`flex-1 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'transparency' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Eye size={16} /> {t('wb_transparency')}
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'report' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Warning Disclaimer Cards */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-50/50 border border-blue-100/70 rounded-3xl p-6 shadow-sm flex items-start gap-4">
              <Info className="text-blue-600 shrink-0 mt-0.5" size={24} />
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base">{t('wb_whistleblowerNotice')}</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t('wb_anonymityDesc')}
                </p>
              </div>
            </div>

            {successCode ? (
              /* Success Panel */
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-350 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
                <div className="w-20 h-20 bg-green-50 border border-green-200 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{t('wb_reportSecureLodged')}</h2>
                <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                  {t('wb_reportSuccessDesc')}
                </p>
                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl inline-block max-w-md w-full relative group">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">{t('wb_anonymousCaseCode')}</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-wider font-mono select-all select-text">{successCode}</span>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => { setSuccessCode(''); fetchCaptcha(); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold py-3.5 px-8 rounded-2xl transition shadow-sm active:scale-95 text-xs uppercase tracking-widest"
                  >
                    {t('wb_fileAnotherReport')}
                  </button>
                </div>
              </div>
            ) : (
              /* Submission Form */
              <form onSubmit={handleSubmitReport} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 sm:p-10 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Category Selection */}
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest pl-1">{t('wb_incidentCategory')} <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-800 font-bold focus:border-blue-500 focus:bg-white outline-none transition"
                    >
                      <option value="" disabled>{t('wb_selectCategory')}</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} className="bg-white text-slate-800">{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest pl-1">{t('wb_detailedDescription')} <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('wb_descriptionPlaceholder')}
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-800 font-medium focus:border-blue-500 focus:bg-white outline-none transition resize-none placeholder:text-slate-400"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest pl-1 flex items-center gap-1"><MapPin size={12}/> {t('wb_location')} <span className="text-slate-400">{t('wb_optional')}</span></label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t('wb_locationPlaceholder')}
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-800 font-bold focus:border-blue-500 focus:bg-white outline-none transition placeholder:text-slate-400"
                    />
                  </div>

                  {/* Incident Date */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest pl-1 flex items-center gap-1"><Calendar size={12}/> {t('wb_dateOfIncident')} <span className="text-slate-400">{t('wb_optional')}</span></label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-800 font-bold focus:border-blue-500 focus:bg-white outline-none transition text-left"
                    />
                  </div>
                </div>

                {/* Retaliation Risk Checkbox (Feature 6) */}
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 col-span-1 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="retaliationRisk"
                    checked={retaliationRisk}
                    onChange={(e) => setRetaliationRisk(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-slate-50 shrink-0 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="retaliationRisk" className="text-xs text-slate-700 font-bold select-none cursor-pointer leading-tight">
                    <span className="text-red-600 font-black">⚠ {t('wb_witnessProtection')}</span> {t('wb_retaliationDesc')}
                  </label>
                </div>

                {/* Upload Fields Container */}
                <div className="border-t border-slate-200/60 pt-6">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4">{t('wb_attachmentsEvidence')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Image Upload */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] relative hover:border-slate-305 hover:bg-slate-50 transition">
                      <Upload size={20} className="text-blue-550" />
                      <div className="mt-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">{t('wb_imageUpload')}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 truncate max-w-[150px]">
                          {imageFile ? imageFile.filename : t('wb_strippedMetadata')}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {imageFile && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full"></span>}
                    </div>

                    {/* Voice Upload */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] relative hover:border-slate-305 hover:bg-slate-50 transition">
                      <Upload size={20} className="text-purple-500" />
                      <div className="mt-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">{t('wb_voiceRecording')}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 truncate max-w-[150px]">
                          {voiceFile ? voiceFile.filename : t('wb_uploadAudio')}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleVoiceChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {voiceFile && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full"></span>}
                    </div>

                    {/* PDF Document */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] relative hover:border-slate-305 hover:bg-slate-50 transition">
                      <Upload size={20} className="text-orange-500" />
                      <div className="mt-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">{t('wb_supportingDocs')}</p>
                        <p className="text-[9px] text-slate-400 font-medium mt-1 truncate max-w-[150px]">
                          {docFile ? docFile.filename : t('wb_pdfDocs')}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleDocChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {docFile && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full"></span>}
                    </div>
                  </div>
                </div>

                {/* CAPTCHA Protection */}
                <div className="border-t border-slate-200/60 pt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 w-full sm:w-auto">
                    {loadingCaptcha ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="font-mono font-bold text-slate-800 text-base tracking-wider">{captcha?.question || t('wb_captchaChallenge')}</span>
                    )}
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    placeholder={t('wb_answerPlaceholder')}
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\D/g, ''))}
                    className="w-full sm:w-40 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center font-bold focus:border-blue-500 focus:bg-white outline-none transition"
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                    ⚠️ {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition shadow-lg active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><RefreshCw className="animate-spin" size={16} /> {t('wb_submittingReport')}</>
                  ) : (
                    t('wb_submitReportAnon')
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'track' && (
          /* Track status page */
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleTrackReport} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest pl-1">{t('wb_enterCaseCode')}</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  required
                  placeholder={t('wb_caseCodePlaceholder')}
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-slate-800 font-bold focus:border-blue-500 focus:bg-white outline-none transition font-mono tracking-wider"
                />
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  {trackingLoading ? <RefreshCw className="animate-spin" size={16} /> : t('wb_queryStatus')}
                </button>
              </div>
              
              {trackingError && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-xs font-bold">
                  ⚠️ {trackingError}
                </div>
              )}
            </form>

            {trackingData && (
              /* Visual Timeline Output */
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 sm:p-10 shadow-xl space-y-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t('wb_reportCategory')}</span>
                    <span className="text-base font-bold text-slate-900">{trackingData.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-right">{t('wb_dateSubmitted')}</span>
                    <span className="text-sm font-bold text-slate-600">
                      {new Date(trackingData.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Vertical Timeline */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6">{t('wb_investigationTimeline')}</h3>
                  <div className="space-y-6">
                    {TRACKING_STAGES.map((stage, i) => {
                      const activeIndex = getActiveStageIndex(trackingData.status);
                      const isCompleted = i < activeIndex;
                      const isCurrent = i === activeIndex;
                      const isPending = i > activeIndex;

                      return (
                        <div key={stage} className="flex gap-4 relative pl-4">
                          {/* Dot line connector */}
                          {i < TRACKING_STAGES.length - 1 && (
                            <div className={`absolute left-8 top-8 bottom-[-24px] w-0.5 ${i < activeIndex ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                          )}

                          {/* Stage marker */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors
                            ${isCompleted ? 'bg-blue-600 border-blue-500 text-white' :
                              isCurrent ? 'bg-blue-550/20 border-blue-500 text-blue-600 animate-pulse' :
                                'bg-slate-50 border-slate-200 text-slate-400'}`}
                          >
                            {isCompleted ? <CheckCircle size={14} /> : <span className="text-xs font-black font-mono">{i + 1}</span>}
                          </div>

                          {/* Stage details */}
                          <div className="pt-1.5">
                            <h4 className={`text-sm font-black transition-colors ${isPending ? 'text-slate-400' : 'text-slate-800'}`}>
                              {stage}
                            </h4>
                            {isCurrent && (
                              <span className="inline-block bg-blue-50 border border-blue-100/80 text-blue-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-1 animate-pulse">
                                {t('wb_currentStatus')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Two-Way Anonymous Chat */}
                <div className="border-t border-slate-200/80 pt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest">{t('wb_twoWayComm')}</h3>
                      <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">{t('wb_communicateAnon')}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={fetchMessages} 
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl transition"
                    >
                      <RefreshCw size={14} className={messagesLoading ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {messagesError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-bold">
                      ⚠️ {messagesError}
                    </div>
                  )}

                  {/* Messages Feed */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 h-80 overflow-y-auto space-y-4 shadow-inner">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider gap-2">
                        <span>{t('wb_noMessages')}</span>
                        <span className="text-[10px] text-slate-500">{t('wb_investigatorsPost')}</span>
                      </div>
                    ) : (
                      messages.map((m) => {
                         const isOfficer = m.sender_type === 'officer';
                         return (
                           <div 
                             key={m.id} 
                             className={`flex flex-col ${isOfficer ? 'items-start' : 'items-end'}`}
                           >
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                               {isOfficer ? 'Integrity Officer' : 'You (Citizen)'}
                             </span>
                             <div 
                               className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs font-medium leading-relaxed
                                 ${isOfficer 
                                   ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80 shadow-sm' 
                                   : 'bg-blue-600 text-white rounded-tr-none'
                                 }`}
                             >
                               {m.message}
                             </div>
                             <span className="text-[8px] text-slate-400 font-semibold mt-1">
                               {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                           </div>
                         );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Send Input */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your response to the officer here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 font-bold focus:border-blue-500 focus:bg-white outline-none transition text-xs"
                    />
                    <button
                      type="submit"
                      disabled={messagesLoading || !newMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-bold transition flex items-center justify-center disabled:opacity-50 text-xs uppercase tracking-widest shrink-0"
                    >
                      {t('wb_send')}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transparency portal page */}
        {activeTab === 'transparency' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Disclaimer / Intro Card */}
            <div className="bg-gradient-to-r from-blue-50 to-slate-50/50 border border-blue-100/70 rounded-3xl p-6 shadow-sm flex items-start gap-4">
              <Eye className="text-blue-600 shrink-0 mt-0.5" size={24} />
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base">{t('wb_publicTransparency')}</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t('wb_transparencyDesc')}
                </p>
              </div>
            </div>

            {transparencyLoading ? (
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
                <RefreshCw className="animate-spin text-blue-500" size={32} />
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{t('wb_fetchingStats')}</p>
              </div>
            ) : transparencyError ? (
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 text-center space-y-4 shadow-xl">
                <div className="text-red-400 text-2xl">⚠️</div>
                <p className="text-sm text-red-400 font-bold">{transparencyError}</p>
                <button
                  type="button"
                  onClick={fetchTransparencyData}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition"
                >
                  {t('wb_retry')}
                </button>
              </div>
            ) : transparencyData ? (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-center space-y-1 hover:border-slate-300 transition shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">{t('wb_totalReports')}</span>
                    <p className="text-2xl font-black text-slate-900">{transparencyData.totalReports}</p>
                  </div>
                  <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-center space-y-1 hover:border-slate-300 transition shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">{t('wb_activeCases')}</span>
                    <p className="text-2xl font-black text-blue-600">{transparencyData.activeInvestigations}</p>
                  </div>
                  <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-center space-y-1 hover:border-slate-300 transition shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">{t('wb_resolvedCases')}</span>
                    <p className="text-2xl font-black text-green-600">{transparencyData.closedCases}</p>
                  </div>
                  <div className="bg-white border border-slate-200/60 p-5 rounded-2xl text-center space-y-1 hover:border-slate-300 transition shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">{t('wb_resolutionSLA')}</span>
                    <p className="text-2xl font-black text-purple-600">{transparencyData.averageResolutionDays} Days</p>
                  </div>
                </div>

                {/* Department Stats */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest">{t('wb_reportsByDept')}</h3>
                    <p className="text-[10px] text-slate-450 font-bold uppercase mt-1">{t('wb_aggregatedBreakdown')}</p>
                  </div>

                  <div className="space-y-4">
                    {transparencyData.departmentStats && transparencyData.departmentStats.length > 0 ? (
                      transparencyData.departmentStats.map((stat: any, idx: number) => {
                        const total = transparencyData.totalReports || 1;
                        const percentage = Math.round((stat.count / total) * 100);
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-700">{stat.department}</span>
                              <span className="text-slate-500">{stat.count} ({percentage}%)</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6 font-bold uppercase">{t('wb_noCategoryStats')}</p>
                    )}
                  </div>
                </div>

                {/* Certification stamp */}
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 text-center space-y-2 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">🛡️ {t('wb_cryptoLedger')}</p>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto font-medium">
                    {t('wb_cryptoDesc')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer className="py-4 text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-200/60 bg-white shrink-0">
        🛡️ {t('wb_footerTagline')}
      </footer>
    </div>
  );
}
