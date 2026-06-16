import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, FileText, CheckCircle, Info, Upload, Key, RefreshCw, ArrowLeft, Calendar, MapPin, Eye } from 'lucide-react';
import axios from 'axios';

interface Props {
  onBack: () => void;
  language: string;
}

const CATEGORIES = [
  "Staff Misconduct",
  "Corruption / Bribe Demand",
  "Fake Meter Reading",
  "Service Fraud",
  "Abuse of Authority",
  "Financial Irregularities",
  "Contractor Misconduct",
  "Other"
];

const TRACKING_STAGES = [
  "Submitted",
  "Under Review",
  "Evidence Verification",
  "Investigation Started",
  "Action Initiated",
  "Closed"
];

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api") + "/integrity";

export default function WhistleblowerPortal({ onBack, language }: Props) {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Top Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="px-8 py-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition border border-slate-700/50">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-inner">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none text-white">CIVIC INTEGRITY CHANNEL</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Sovereign Anonymous Whistleblower Portal</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider text-blue-400">
            🔒 Government-Grade Security Encrypted
          </div>
        </div>
      </header>

      {/* Main Content scrollable container */}
      <div className="flex-1 overflow-y-auto px-6 py-8 z-10 max-w-4xl w-full mx-auto">
        
        {/* Tabs navigation */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-3xl mb-8 max-w-xl mx-auto shadow-xl">
          <button
            onClick={() => { setActiveTab('report'); setError(''); }}
            className={`flex-1 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShieldAlert size={16} /> File Report
          </button>
          <button
            onClick={() => { setActiveTab('track'); setTrackingError(''); }}
            className={`flex-1 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'track' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Key size={16} /> Track Case
          </button>
          <button
            onClick={() => { setActiveTab('transparency'); }}
            className={`flex-1 py-3 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'transparency' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Eye size={16} /> Transparency
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'report' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Warning Disclaimer Cards */}
            <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-900/30 rounded-3xl p-6 shadow-md flex items-start gap-4">
              <Info className="text-blue-400 shrink-0 mt-0.5" size={24} />
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base">Whistleblower Protection Notice</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  This channel is fully anonymous by design. No logins, Aadhaar identity, mobile phone numbers, or IP logs are collected. In accordance with the Civic Integrity Act, all submitted evidence files undergo metadata scrubbing (removal of GPS coordinates, camera models, and device IDs) before database encryption to safeguard your identity.
                </p>
              </div>
            </div>

            {successCode ? (
              /* Success Panel */
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-350 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
                <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white">Report Securely Lodged</h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Your anonymous report has been securely submitted to the Integrity Board. Write down or save the case code below. It is the only way to track progress, as no notification will be sent.
                </p>
                <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl inline-block max-w-md w-full relative group">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">ANONYMOUS CASE CODE</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-400 tracking-wider font-mono select-all select-text">{successCode}</span>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => { setSuccessCode(''); fetchCaptcha(); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-8 rounded-2xl transition shadow-lg active:scale-95 text-xs uppercase tracking-widest"
                  >
                    File Another Report
                  </button>
                </div>
              </div>
            ) : (
              /* Submission Form */
              <form onSubmit={handleSubmitReport} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 sm:p-10 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Category Selection */}
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest pl-1">Incident Category <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-slate-200 font-bold focus:border-blue-500 outline-none transition"
                    >
                      <option value="" disabled>Select Category</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} className="bg-slate-950">{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest pl-1">Detailed Description <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide all relevant details: specific names, dates, times, locations, and facts. Do not mention your own name or contact details."
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-slate-200 font-medium focus:border-blue-500 outline-none transition resize-none placeholder:text-slate-600"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest pl-1 flex items-center gap-1"><MapPin size={12}/> Location <span className="text-slate-500">(Optional)</span></label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Department office, ward or street name"
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-slate-200 font-bold focus:border-blue-500 outline-none transition placeholder:text-slate-600"
                    />
                  </div>

                  {/* Incident Date */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest pl-1 flex items-center gap-1"><Calendar size={12}/> Date of Incident <span className="text-slate-500">(Optional)</span></label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-slate-200 font-bold focus:border-blue-500 outline-none transition text-left"
                    />
                  </div>
                </div>

                {/* Retaliation Risk Checkbox (Feature 6) */}
                <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 col-span-1 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="retaliationRisk"
                    checked={retaliationRisk}
                    onChange={(e) => setRetaliationRisk(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-800 text-blue-600 focus:ring-blue-500 bg-slate-950 shrink-0 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="retaliationRisk" className="text-xs text-slate-300 font-bold select-none cursor-pointer leading-tight">
                    <span className="text-red-400 font-black">⚠ Witness Protection:</span> This report involves potential retaliation risk. Enabling this increases confidentiality protocols, redacts location details from general lists, and flags witness protection guidelines.
                  </label>
                </div>

                {/* Upload Fields Container */}
                <div className="border-t border-slate-800/80 pt-6">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">Attachments & Evidence (Max 5MB per file)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Image Upload */}
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] relative hover:border-slate-700 transition">
                      <Upload size={20} className="text-blue-400" />
                      <div className="mt-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Image Upload</p>
                        <p className="text-[9px] text-slate-500 font-medium mt-1 truncate max-w-[150px]">
                          {imageFile ? imageFile.filename : "Stripped of EXIF metadata"}
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
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] relative hover:border-slate-700 transition">
                      <Upload size={20} className="text-purple-400" />
                      <div className="mt-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Voice Recording</p>
                        <p className="text-[9px] text-slate-500 font-medium mt-1 truncate max-w-[150px]">
                          {voiceFile ? voiceFile.filename : "Upload audio evidence"}
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
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[140px] relative hover:border-slate-700 transition">
                      <Upload size={20} className="text-orange-400" />
                      <div className="mt-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Supporting Docs</p>
                        <p className="text-[9px] text-slate-500 font-medium mt-1 truncate max-w-[150px]">
                          {docFile ? docFile.filename : "PDF and documents"}
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
                <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 w-full sm:w-auto">
                    {loadingCaptcha ? (
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="font-mono font-bold text-white text-base tracking-wider">{captcha?.question || "CAPTCHA Challenge"}</span>
                    )}
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    placeholder="Enter answer"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\D/g, ''))}
                    className="w-full sm:w-40 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center font-bold focus:border-blue-500 outline-none transition"
                  />
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
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
                    <><RefreshCw className="animate-spin" size={16} /> Submitting secure report...</>
                  ) : (
                    "Submit Report Anonymously"
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'track' && (
          /* Track status page */
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleTrackReport} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest pl-1">Enter Anonymous Case Code</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  required
                  placeholder="e.g. CIV-X7A9-KQ2M"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-slate-200 font-bold focus:border-blue-500 outline-none transition font-mono tracking-wider"
                />
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  {trackingLoading ? <RefreshCw className="animate-spin" size={16} /> : "Query Status"}
                </button>
              </div>
              
              {trackingError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold">
                  ⚠️ {trackingError}
                </div>
              )}
            </form>

            {trackingData && (
              /* Visual Timeline Output */
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 sm:p-10 shadow-xl space-y-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">REPORT CATEGORY</span>
                    <span className="text-base font-bold text-white">{trackingData.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-right">DATE SUBMITTED</span>
                    <span className="text-sm font-bold text-slate-300">
                      {new Date(trackingData.created_at).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Vertical Timeline */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6">Investigation Timeline</h3>
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
                            <div className={`absolute left-8 top-8 bottom-[-24px] w-0.5 ${i < activeIndex ? 'bg-blue-600' : 'bg-slate-800'}`}></div>
                          )}

                          {/* Stage marker */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors
                            ${isCompleted ? 'bg-blue-600 border-blue-500 text-white' :
                              isCurrent ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse' :
                                'bg-slate-950 border-slate-800 text-slate-600'}`}
                          >
                            {isCompleted ? <CheckCircle size={14} /> : <span className="text-xs font-black font-mono">{i + 1}</span>}
                          </div>

                          {/* Stage details */}
                          <div className="pt-1.5">
                            <h4 className={`text-sm font-black transition-colors ${isPending ? 'text-slate-600' : 'text-slate-200'}`}>
                              {stage}
                            </h4>
                            {isCurrent && (
                              <span className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-1 animate-pulse">
                                Current Status
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Two-Way Anonymous Chat */}
                <div className="border-t border-slate-800/80 pt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Two-Way Secure Communication</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Communicate with your assigned investigator anonymously</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={fetchMessages} 
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
                    >
                      <RefreshCw size={14} className={messagesLoading ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {messagesError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold">
                      ⚠️ {messagesError}
                    </div>
                  )}

                  {/* Messages Feed */}
                  <div className="bg-slate-950/85 border border-slate-850 rounded-3xl p-6 h-80 overflow-y-auto space-y-4 shadow-inner">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-wider gap-2">
                        <span>No messages exchanged yet.</span>
                        <span className="text-[10px] text-slate-700">Investigators will post clarification requests here if needed.</span>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isOfficer = m.sender_type === 'officer';
                        return (
                          <div 
                            key={m.id} 
                            className={`flex flex-col ${isOfficer ? 'items-start' : 'items-end'}`}
                          >
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              {isOfficer ? 'Integrity Officer' : 'You (Citizen)'}
                            </span>
                            <div 
                              className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs font-medium leading-relaxed
                                ${isOfficer 
                                  ? 'bg-slate-800/70 text-slate-200 rounded-tl-none border border-slate-700/50' 
                                  : 'bg-blue-600 text-white rounded-tr-none'
                                }`}
                            >
                              {m.message}
                            </div>
                            <span className="text-[8px] text-slate-600 font-semibold mt-1">
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
                      className="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-slate-200 font-bold focus:border-blue-500 outline-none transition text-xs"
                    />
                    <button
                      type="submit"
                      disabled={messagesLoading || !newMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-bold transition flex items-center justify-center disabled:opacity-50 text-xs uppercase tracking-widest shrink-0"
                    >
                      Send
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
            <div className="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-900/30 rounded-3xl p-6 shadow-md flex items-start gap-4">
              <Eye className="text-blue-400 shrink-0 mt-0.5" size={24} />
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base">Public Transparency Dashboard</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  This dashboard shows anonymised, aggregated metrics to ensure transparency while strictly preserving citizen anonymity. No individual report descriptions, witness locations, chat logs, or uploaded evidence are exposed here.
                </p>
              </div>
            </div>

            {transparencyLoading ? (
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-16 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
                <RefreshCw className="animate-spin text-blue-500" size={32} />
                <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Fetching transparency statistics...</p>
              </div>
            ) : transparencyError ? (
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center space-y-4 shadow-xl">
                <div className="text-red-400 text-2xl">⚠️</div>
                <p className="text-sm text-red-400 font-bold">{transparencyError}</p>
                <button
                  type="button"
                  onClick={fetchTransparencyData}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition"
                >
                  Retry
                </button>
              </div>
            ) : transparencyData ? (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl text-center space-y-1 hover:border-slate-700 transition">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Total Reports</span>
                    <p className="text-2xl font-black text-white">{transparencyData.totalReports}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl text-center space-y-1 hover:border-slate-700 transition">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Active Cases</span>
                    <p className="text-2xl font-black text-blue-400">{transparencyData.activeInvestigations}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl text-center space-y-1 hover:border-slate-700 transition">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Resolved Cases</span>
                    <p className="text-2xl font-black text-green-400">{transparencyData.closedCases}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl text-center space-y-1 hover:border-slate-700 transition">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Resolution SLA</span>
                    <p className="text-2xl font-black text-purple-400">{transparencyData.averageResolutionDays} Days</p>
                  </div>
                </div>

                {/* Department Stats */}
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Reports by Department Sector</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Aggregated category breakdown of submitted integrity reports</p>
                  </div>

                  <div className="space-y-4">
                    {transparencyData.departmentStats && transparencyData.departmentStats.length > 0 ? (
                      transparencyData.departmentStats.map((stat: any, idx: number) => {
                        const total = transparencyData.totalReports || 1;
                        const percentage = Math.round((stat.count / total) * 100);
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-300">{stat.department}</span>
                              <span className="text-slate-400">{stat.count} ({percentage}%)</span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-6 font-bold uppercase">No category statistics available.</p>
                    )}
                  </div>
                </div>

                {/* Certification stamp */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-center space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">🛡️ Cryptographic Ledger Certification</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto font-medium">
                    All compliance verification events are written into a tamper-evident cryptographic audit ledger. Citizen credentials are never stored.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer className="py-4 text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest border-t border-slate-900/50 bg-slate-950 shrink-0">
        🛡️ Civic Integrity Channel · End-to-End Encrypted Data Ledger
      </footer>
    </div>
  );
}
