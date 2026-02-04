import React, { useState } from 'react';
import {
  LayoutGrid, Search, User, FileCheck, HelpCircle, MessageSquare, Send, Bell,
  ArrowRight, Settings, Upload, FileText, Download, CheckCircle, AlertTriangle,
  Brain, Image as ImageIcon, Sparkles, Maximize2, CreditCard, Zap, Droplets,
  Flame, Receipt, ArrowLeft, Smartphone, Info, History, AlertCircle, ShieldCheck,
  RefreshCw, Users, QrCode, ClipboardCheck, Home, Volume2, VolumeX, Type, Printer
} from 'lucide-react';
import { ViewState, Language, ServiceRequest } from '../types';
import { DEPARTMENTS, APP_CONFIG, MOCK_REQUESTS, TRANSLATIONS, MOCK_ALERTS } from '../constants';
import { getSmartHelp, generateCitizenImage } from '../services/geminiService';

// New Components
import DashboardHome from './kiosk/DashboardHome';
import ServiceModeSelector from './kiosk/ServiceModeSelector';
import ServiceFormWizard from './kiosk/ServiceFormWizard';
import ServiceSuccess from './kiosk/ServiceSuccess';
import PaymentReceipt from './kiosk/PaymentReceipt';

interface Props {
  language: Language;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  isPrivacyShield: boolean;
}

const KioskUI: React.FC<Props> = ({ language, onNavigate, onLogout, isPrivacyShield }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'complaints' | 'billing' | 'status' | 'ai'>('home');
  const [aiSubTab, setAiSubTab] = useState<'chat' | 'imagine'>('chat');
  const t = TRANSLATIONS[language];

  // Accessibility State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);

  // States
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('1:1');

  // Billing & Service flow
  const [billingStep, setBillingStep] = useState<'select' | 'form' | 'details' | 'success'>('select');
  const [selectedBillService, setSelectedBillService] = useState<any | null>(null);
  const [consumerNumber, setConsumerNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isFetchingBill, setIsFetchingBill] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState<any>(null);

  // New Service Flow State
  const [submissionStep, setSubmissionStep] = useState<'select' | 'flow_choice' | 'form' | 'success'>('select');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [serviceMode, setServiceMode] = useState<'SELF' | 'COUNTER'>('SELF');

  const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

  const handleAiSearch = async () => {
    if (!aiQuery) return;
    setIsAiLoading(true);
    const result = await getSmartHelp(aiQuery, language, isThinkingMode ? 'thinking' : 'fast');
    setAiResponse(result || "No response received.");
    setIsAiLoading(false);
    if (isVoiceEnabled) {
      // Mock TTS
      console.log("Speaking: " + result);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) return;
    setIsImageLoading(true);
    try {
      const url = await generateCitizenImage(imagePrompt, selectedRatio);
      setGeneratedImage(url);
    } catch (e) {
      alert("Failed to generate image.");
    } finally { setIsImageLoading(false); }
  };

  const handleServiceSelect = (svc: string) => {
    setSelectedService(svc);
    setSubmissionStep('flow_choice');
  };

  const handleServiceSubmit = (data: any) => {
    console.log("Submitting", data);
    setSubmissionStep('success');
  };

  const finishSubmission = () => {
    setSubmissionStep('select');
    setSelectedService(null);
    setActiveTab('status');
  };

  const handleFetchBill = () => {
    if (!consumerNumber || mobileNumber.length !== 10) return;
    setIsFetchingBill(true);
    setTimeout(() => {
      setBillingStep('details');
      setIsFetchingBill(false);
    }, 1500);
  };

  const handlePayBill = () => {
    setIsFetchingBill(true);
    const txnId = 'TXN' + Date.now();
    setReceiptDetails({
      serviceName: selectedBillService.name,
      consumerId: consumerNumber,
      amount: '₹1,452.00',
      txnId: txnId,
      date: new Date().toLocaleString(),
      mode: 'UPI'
    });
    setTimeout(() => {
      setBillingStep('success');
      setIsFetchingBill(false);
    }, 2500);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const resetBilling = () => {
    setBillingStep('select');
    setSelectedBillService(null);
    setConsumerNumber('');
    setMobileNumber('');
    setReceiptDetails(null);
  };

  return (
    <>
      <div className={`print:hidden flex flex-col h-screen bg-slate-50 relative ${isLargeText ? 'text-lg' : ''}`}>
        {/* City Alerts Marquee/Panel */}
        <div className="bg-slate-900 overflow-hidden shrink-0 flex items-center h-10 px-4 border-b border-white/5 relative">
          <div className="flex items-center gap-2 mr-4 shrink-0 z-20 bg-slate-900 h-full pr-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE CITY ALERTS:</span>
          </div>
          <div className="flex-1 h-full overflow-hidden relative flex items-center">
            <div className="flex gap-4 animate-marquee whitespace-nowrap absolute left-0 w-max">
              {MOCK_ALERTS.map(alert => (
                <div key={alert.id} className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <AlertCircle size={12} className={alert.severity === 'Critical' ? 'text-red-500' : 'text-blue-500'} />
                  <span>[{alert.ward === 'Global' ? 'Global' : `Ward ${alert.ward}`}] {alert.message} &nbsp;<span className="text-slate-700">|</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Header with Accessibility Controls */}
        <header className="bg-blue-900 text-white p-6 shadow-lg flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-xl shadow-inner">A</div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{APP_CONFIG.TITLE}</h1>
              <p className="text-xs text-blue-200 uppercase tracking-widest font-bold">{APP_CONFIG.SUBTITLE}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 pr-24">
            {/* Accessibility Toggles */}
            <div className="hidden sm:flex items-center gap-2 bg-blue-800/50 p-1 rounded-xl border border-blue-700">
              <button
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`p-2 rounded-lg transition ${isVoiceEnabled ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-300 hover:text-white'}`}
                title="Toggle Voice Assistant"
              >
                {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                onClick={() => setIsLargeText(!isLargeText)}
                className={`p-2 rounded-lg transition ${isLargeText ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-300 hover:text-white'}`}
                title="Toggle Large Text"
              >
                <Type size={18} />
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-black uppercase text-blue-300 tracking-widest">Kiosk: Coimbatore-Central-02</p>
              <p className="text-[10px] opacity-75 font-bold">Secure Public Session Active</p>
            </div>
            <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-xl font-black text-xs uppercase transition shadow-lg active:scale-95">
              {t.logout}
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="bg-white border-b px-8 py-2 flex gap-4 overflow-x-auto shrink-0 no-scrollbar">
          {[
            { id: 'home', label: 'Home', icon: Home },
            { id: 'services', label: t.adminRequests, icon: LayoutGrid },
            { id: 'billing', label: 'Billing Hub', icon: CreditCard },
            { id: 'complaints', label: t.adminComplaints, icon: AlertTriangle },
            { id: 'status', label: 'History', icon: FileCheck },
            { id: 'ai', label: 'Sahayika AI', icon: HelpCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSubmissionStep('select');
                resetBilling();
              }}
              className={`flex items-center gap-2 px-6 py-4 border-b-4 transition-all whitespace-nowrap font-black text-sm uppercase tracking-wider ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-800'}`}
            >
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* VIEW 1: DASHBOARD HOME (Feature 1) */}
          {activeTab === 'home' && (
            <DashboardHome
              alerts={MOCK_ALERTS}
              onNavigate={(tab) => {
                setActiveTab(tab as any);
                if (tab === 'services') setSubmissionStep('select');
                if (tab === 'billing') setBillingStep('select');
              }}
            />
          )}

          {/* VIEW 2: SERVICES (Feature 2, 3, 4, 7) */}
          {activeTab === 'services' && (
            <div className="max-w-6xl mx-auto h-full">
              {submissionStep === 'select' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-10">
                  {DEPARTMENTS.map((dept) => (
                    <div key={dept.id} className="bg-white p-6 rounded-3xl shadow-sm border hover:border-blue-500 transition-all group">
                      <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                          <FileText size={20} />
                        </div>
                        {dept.name}
                      </h3>
                      <div className="space-y-3">
                        {dept.services.map((svc) => (
                          <button
                            key={svc}
                            onClick={() => handleServiceSelect(svc)}
                            className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-black uppercase tracking-widest flex justify-between items-center transition"
                          >
                            {svc} <ArrowRight size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feature 2: Hybrid Flow Selection */}
              {submissionStep === 'flow_choice' && selectedService && (
                <ServiceModeSelector
                  serviceName={selectedService}
                  onSelect={(mode) => {
                    setServiceMode(mode);
                    setSubmissionStep('form');
                  }}
                  onBack={() => setSubmissionStep('select')}
                />
              )}

              {/* Feature 4 & 7: Smart Wizard & Document Assistance */}
              {submissionStep === 'form' && selectedService && (
                <ServiceFormWizard
                  serviceName={selectedService}
                  mode={serviceMode}
                  onCancel={() => setSubmissionStep('flow_choice')}
                  onSubmit={handleServiceSubmit}
                />
              )}

              {/* Feature 3: QR Handoff */}
              {submissionStep === 'success' && selectedService && (
                <ServiceSuccess
                  serviceName={selectedService}
                  token={`TKT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`}
                  mobile="98765 43210" // In a real app, this comes from state
                  onFinish={finishSubmission}
                />
              )}
            </div>
          )}

          {/* VIEW 3: BILLING (Unchanged mostly, just accessible classes check) */}
          {activeTab === 'billing' && (
            <div className="max-w-4xl mx-auto">
              {billingStep === 'select' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-center">
                    <h2 className="text-4xl font-black text-slate-900 mb-3">Pay Bills</h2>
                    <p className="text-slate-500 text-lg">One-tap utility payments for a smarter life.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { id: 'elec', name: 'Electricity', icon: Zap, color: 'amber', consumerLabel: 'Consumer Number', providerLabel: 'Electricity Board / DISCOM' },
                      { id: 'water', name: 'Water', icon: Droplets, color: 'blue', consumerLabel: 'Connection ID', providerLabel: 'Municipality / Corp' },
                      { id: 'gas', name: 'Gas', icon: Flame, color: 'orange', consumerLabel: 'Customer ID', providerLabel: 'Gas Provider / PNG' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedBillService(item as any);
                          setBillingStep('form');
                        }}
                        className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:border-blue-400 transition-all flex flex-col items-center group relative overflow-hidden"
                      >
                        <div className={`w-24 h-24 bg-${item.color}-50 text-${item.color}-600 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition duration-500`}>
                          <item.icon size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800">{item.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-3 font-black uppercase tracking-[0.2em]">Select Service</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {billingStep === 'form' && selectedBillService && (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 max-w-xl mx-auto animate-in zoom-in-95 relative overflow-hidden">
                  <button onClick={resetBilling} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest mb-10 hover:text-blue-600 transition">
                    <ArrowLeft size={16} /> Change Utility
                  </button>
                  <div className="flex items-center gap-5 mb-10">
                    <div className={`w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center`}>
                      <selectedBillService.icon size={28} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900">{selectedBillService.name} Bill</h2>
                      <p className="text-sm text-slate-500 font-medium">Securely linked to Coimbatore-Central Database</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        {selectedBillService.consumerLabel}
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          value={consumerNumber}
                          onChange={(e) => setConsumerNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. EB-10098745"
                          className="w-full bg-slate-50 border-2 border-slate-100 p-5 pl-14 rounded-2xl text-xl font-bold outline-none focus:border-blue-600 focus:bg-white transition"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                        Registered Mobile Number
                      </label>
                      <div className="relative group">
                        <input
                          type="text"
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="98765 43210"
                          className="w-full bg-slate-50 border-2 border-slate-100 p-5 pl-14 rounded-2xl text-xl font-bold outline-none focus:border-blue-600 focus:bg-white transition"
                        />
                        <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                      </div>
                    </div>

                    <button
                      onClick={handleFetchBill}
                      disabled={isFetchingBill || !consumerNumber || mobileNumber.length !== 10}
                      className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black text-xl hover:bg-blue-700 transition shadow-2xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isFetchingBill ? <RefreshCw className="animate-spin" /> : 'Fetch Bill Details'}
                    </button>
                  </div>
                </div>
              )}

              {billingStep === 'details' && selectedBillService && (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden max-w-2xl mx-auto animate-in slide-in-from-bottom-12">
                  <div className="bg-slate-900 p-10 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">Official Bill Preview</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <h2 className={`text-6xl font-black mb-2 ${isPrivacyShield ? 'privacy-sensitive' : ''}`}>₹1,452.00</h2>
                        <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                          <AlertCircle size={14} className="text-orange-400" /> Due Date: 25 May, 2024
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Consumer Name</p>
                        <p className={`font-black text-xl text-slate-900 ${isPrivacyShield ? 'privacy-sensitive' : ''}`}>Arun Kumar</p>
                        <p className="text-xs text-slate-500 font-bold mt-1">ID: {consumerNumber}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{selectedBillService.providerLabel}</p>
                        <p className="font-black text-xl text-slate-900">
                          {selectedBillService.id === 'elec' ? 'TANGEDCO (DISCOM)' : 'Coimbatore Corp'}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-8">
                      <div className="flex justify-between items-center text-2xl font-black text-slate-900">
                        <span>TOTAL PAYABLE</span>
                        <span className={isPrivacyShield ? 'privacy-sensitive' : ''}>₹1,452.00</span>
                      </div>
                    </div>

                    <div className="flex gap-6 pt-4">
                      <button onClick={() => setBillingStep('form')} className="flex-1 bg-slate-100 text-slate-500 p-6 rounded-2xl font-black transition">Edit</button>
                      <button
                        onClick={handlePayBill}
                        className="flex-[2] bg-blue-600 text-white p-6 rounded-2xl font-black text-xl hover:bg-blue-700 transition shadow-2xl shadow-blue-100"
                      >
                        Confirm & Pay
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {billingStep === 'success' && (
                <div className="max-w-xl mx-auto text-center py-10">
                  <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
                    <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                      <CheckCircle size={56} />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Payment Success!</h2>
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] text-left space-y-5 mb-10 mt-10">
                      <div className="flex justify-between items-center border-b pb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Utility</span>
                        <span className="text-slate-900 font-black">{selectedBillService?.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Amount</span>
                        <span className="text-blue-600 font-black text-xl">₹1,452.00</span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handlePrintReceipt}
                        className="flex-1 bg-blue-600 text-white p-6 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                      >
                        <Printer size={20} /> Print Receipt
                      </button>
                      <button onClick={resetBilling} className="flex-1 bg-slate-900 text-white p-6 rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition">Return Home</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: AI (Unchanged) */}
          {activeTab === 'ai' && (
            <div className="max-w-4xl mx-auto h-full flex flex-col bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-10">
              <div className="bg-indigo-600 p-6 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30"><MessageSquare size={28} /></div>
                  <div>
                    <h3 className="font-black text-2xl tracking-tight">Smart Sahayika AI</h3>
                    <p className="text-[10px] text-indigo-100 uppercase font-black tracking-[0.2em]">Guided Kiosk Assistant</p>
                  </div>
                </div>
                <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/10">
                  <button onClick={() => setAiSubTab('chat')} className={`px-6 py-3 rounded-xl text-xs font-black transition ${aiSubTab === 'chat' ? 'bg-white text-indigo-600' : 'text-white'}`}>GUIDE</button>
                  <button onClick={() => setAiSubTab('imagine')} className={`px-6 py-3 rounded-xl text-xs font-black transition ${aiSubTab === 'imagine' ? 'bg-white text-indigo-600' : 'text-white'}`}>IMAGINE</button>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-10 overflow-hidden">
                <div className="flex-1 overflow-y-auto mb-6">
                  <div className="bg-indigo-50 p-8 rounded-[2rem] rounded-tl-none border border-indigo-100 text-indigo-900 max-w-[85%] self-start">
                    <p className="font-black text-lg mb-2">Hello Arun, I'm your Smart Urban Assistant.</p>
                    <p className="text-xs text-indigo-600 font-bold leading-relaxed">I can help you navigate {selectedService || 'City Services'}, explain bill charges, or find the right office ward for your query.</p>
                  </div>
                  {aiResponse && <div className="mt-8 bg-slate-50 p-8 rounded-[2rem] text-slate-800 self-start max-w-[95%] border border-slate-100 font-bold animate-in fade-in">{aiResponse}</div>}
                </div>
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Ask me anything about Coimbatore Smart City..."
                    className="flex-1 bg-slate-50 border-2 border-slate-100 p-6 rounded-2xl focus:border-indigo-500 outline-none text-lg font-bold"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                  />
                  <button onClick={handleAiSearch} className="bg-indigo-600 text-white p-6 rounded-2xl hover:bg-indigo-700 transition"><Send size={24} /></button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: STATUS/HISTORY (Unchanged) */}
          {activeTab === 'status' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
              <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3"><History className="text-blue-600" /> Interaction History</h2>
              <div className="grid gap-4">
                {MOCK_REQUESTS.map((req) => (
                  <div key={req.id} className="bg-white p-8 rounded-[2rem] border shadow-sm flex justify-between items-center group hover:border-blue-500 transition">
                    <div className="flex gap-6 items-start">
                      <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition"><FileText size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-blue-600 tracking-widest mb-1">{req.id}</p>
                        <h4 className="font-black text-slate-900 text-xl">{req.type}</h4>
                        <p className="text-sm text-slate-500 font-medium">{req.department} • {req.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase ${req.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span>
                      <button className="p-4 bg-slate-100 rounded-2xl text-slate-400 hover:bg-slate-900 hover:text-white transition"><Download size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 6: COMPLAINTS (Placeholder for now) */}
          {activeTab === 'complaints' && (
            <div className="flex items-center justify-center h-full text-slate-400 font-black text-xl uppercase tracking-widest">
              Complaints Module Loading...
            </div>
          )}

        </main>

        {/* Footer Branding */}
        <footer className="bg-white border-t p-5 flex justify-between items-center text-[10px] text-slate-400 shrink-0 uppercase tracking-[0.3em] font-black">
          <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500" /> Data Purge Policy: Every 10 mins</div>
          <p>Managed by Coimbatore Smart City Infrastructure Dept</p>
        </footer>

        <style>{`
        @keyframes marquee { 0% { transform: translateX(-100%); } 100% { transform: translateX(100vw); } }
        .animate-marquee { display: flex; animation: marquee 30s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
      `}</style>
      </div>
      <PaymentReceipt data={receiptDetails} />
    </>
  );
};

export default KioskUI;
