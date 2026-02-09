import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid, Search, User, FileCheck, HelpCircle, MessageSquare, Send, Bell,
  ArrowRight, Settings, Upload, FileText, Download, CheckCircle, AlertTriangle,
  Brain, Image as ImageIcon, Sparkles, Maximize2, CreditCard, Zap, Droplets,
  Flame, Receipt, ArrowLeft, Smartphone, Info, History, AlertCircle, ShieldCheck,
  RefreshCw, Users, QrCode, ClipboardCheck, Home, Volume2, VolumeX, Type, Printer, Mic, MicOff, PlayCircle, RotateCcw, Trash2
} from 'lucide-react';
import { ViewState, Language, ServiceRequest } from '../types';
import { DEPARTMENTS, APP_CONFIG, MOCK_REQUESTS, TRANSLATIONS, MOCK_ALERTS, MOCK_USER_PROFILE, MOCK_BILLS, PREDEFINED_ISSUES, AREA_SUPPORT_CONTACTS } from '../constants';
import { getAssistantResponse, generateCitizenImage, AIResponse, AIMenu } from '../services/geminiService';
import { BillingService, GrievanceService } from '../services/civicService';

// New Components
import DashboardHome from './kiosk/DashboardHome';
import ServiceForm from './kiosk/ServiceForm';
import ServiceSuccess from './kiosk/ServiceSuccess';
import PaymentReceipt from './kiosk/PaymentReceipt';
import KioskShell from './KioskShell';
import ElectricityModule from './kiosk/electricity/ElectricityModule';
import ComplaintsModule from './kiosk/ComplaintsModule';

interface Props {
  language: Language;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  isPrivacyShield: boolean;
  timer: number;
  onTogglePrivacy: () => void;
  initialTab?: 'home' | 'services' | 'complaints' | 'billing' | 'status' | 'ai';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  voiceText?: string;
  action?: any;
  menu?: AIMenu; // New: Structure Menu Data
}

const KioskUI: React.FC<Props> = ({ language, onNavigate, onLogout, isPrivacyShield, timer, onTogglePrivacy, initialTab = 'home' }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'complaints' | 'billing' | 'status' | 'ai'>(initialTab);
  const [aiSubTab, setAiSubTab] = useState<'chat' | 'imagine'>('chat');
  const t = TRANSLATIONS[language];

  // Accessibility State
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);

  // AI & Chat States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // States for Image Gen (Legacy)
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
  const [submissionStep, setSubmissionStep] = useState<'select' | 'form' | 'success'>('select');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [fetchedBill, setFetchedBill] = useState<any>(null);

  const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

  // Initialize Chat with Welcome Message on Load
  useEffect(() => {
    if (chatHistory.length === 0) {
      handleAiSearch("start"); // Trigger initial welcome flow
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeTab]);

  // Handle Voice Speak
  const speakText = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === Language.HINDI ? 'hi-IN' : 'en-IN'; // Basic lang support
    utterance.rate = 0.9; // Accessibility: Speak slowly
    window.speechSynthesis.speak(utterance);
  };

  const handleAiSearch = async (queryOverride?: string) => {
    const query = queryOverride || aiQuery;
    if (!query.trim()) return;

    // Only show user message if it's NOT a system trigger like 'start'
    if (query !== 'start') {
      const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: query };
      setChatHistory(prev => [...prev, userMsg]);
    }

    setAiQuery('');
    setIsAiLoading(true);

    try {
      const response: AIResponse = await getAssistantResponse(query, language, isVoiceEnabled);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response.text,
        voiceText: response.voice,
        action: response.actions ? response.actions[0] : undefined,
        menu: response.menu // Capture menu options
      };

      setChatHistory(prev => [...prev, botMsg]);

      // Auto-speak if voice is enabled
      if (isVoiceEnabled && response.voice) {
        speakText(response.voice);
      }

      // Handle Actions
      if (response.actions) {
        response.actions.forEach(action => {
          if (action.type === 'NAVIGATE') {
            setTimeout(() => {
              setActiveTab(action.payload as any);
              if (action.payload === 'billing') setBillingStep('select');
              if (action.payload === 'services') setSubmissionStep('select');
            }, 1500);
          }
        });
      }

    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: "Service temporarily unavailable." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleMenuOptionClick = (optionId: string, label: string) => {
    // Simulate user typing the number or label
    handleAiSearch(optionId);
  };

  const handleResetChat = () => {
    setChatHistory([]);
    setAiQuery('');
    setTimeout(() => handleAiSearch("start"), 100);
  };

  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  // Handle Voice Input
  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      if (isListening) {
        setIsListening(false);
        return;
      }

      setIsListening(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = language === Language.HINDI ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAiQuery(transcript);
        setIsListening(false);
        setTimeout(() => handleAiSearch(transcript), 500); // Auto-submit after voice
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert("Voice input is not supported in this browser.");
    }
  };

  /* ... (further down in the file) ... */



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

  const handleServiceSelect = (svc: string, deptId: string) => {
    setSelectedService(svc);
    setSelectedDepartment(deptId);
    setSubmissionStep('form');
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

    // Simulate network delay then fetch real data
    setTimeout(() => {
      const unpaidBills = BillingService.getUnpaidBills(MOCK_USER_PROFILE);
      /* In real app, filter by service type and consumer number entered */
      const bill = unpaidBills.find(b => b.consumerId === consumerNumber) || unpaidBills[0];

      setFetchedBill(bill);
      setBillingStep('details');
      setIsFetchingBill(false);
    }, 1500);
  };

  const handlePayBill = () => {
    if (!fetchedBill) return;
    setIsFetchingBill(true);

    BillingService.payBill(fetchedBill.id);

    const txnId = 'TXN' + Date.now();
    setReceiptDetails({
      serviceName: selectedBillService.name,
      consumerId: consumerNumber,
      consumerName: "Arun Kumar",
      amount: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(fetchedBill.amount),
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
    <KioskShell
      activeTab={activeTab}
      onNavigate={(id) => {
        setActiveTab(id as any);
        if (id === 'services') setSubmissionStep('select');
        if (id === 'billing') setBillingStep('select');
      }}
      onLogout={onLogout}
      userName={MOCK_USER_PROFILE.name}
      alerts={MOCK_ALERTS}
      language={language}
      timer={timer}
      isPrivacyShield={isPrivacyShield}
      onTogglePrivacy={onTogglePrivacy}
    >
      <div className={`h-full ${isLargeText ? 'text-lg' : ''} print:hidden`}>

        {/* VIEW 1: DASHBOARD HOME (Feature 1) */}
        {activeTab === 'home' && (
          <DashboardHome
            alerts={MOCK_ALERTS}
            onNavigate={(tab) => {
              setActiveTab(tab as any);
              if (tab === 'services') setSubmissionStep('select');
              if (tab === 'billing') setBillingStep('select');
            }}
            language={language}
          />
        )}

        {/* VIEW 2: SERVICES (Feature 2, 3, 4, 7) */}
        {activeTab === 'services' && (
          <div className="max-w-7xl mx-auto h-full px-4 py-6">
            {submissionStep === 'select' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-10">
                {/* Page Header */}
                <div className="text-center mb-8">
                  <h2 className="text-5xl font-black text-slate-900 mb-3 tracking-tight">
                    {t.navServices || "Services"}
                  </h2>
                  <p className="text-xl text-slate-600 font-medium">
                    Select a service category to get started
                  </p>
                </div>

                {/* Service Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {DEPARTMENTS.map((dept) => {
                    const deptKey = `dept_${dept.id}` as keyof typeof t;
                    const deptName = t[deptKey] || dept.name;

                    // Define color schemes for each department
                    const colorSchemes: Record<string, { bg: string; border: string; icon: string; hover: string; text: string }> = {
                      eb: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', hover: 'hover:border-amber-500 hover:shadow-amber-200', text: 'text-amber-900' },
                      water: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', hover: 'hover:border-blue-500 hover:shadow-blue-200', text: 'text-blue-900' },
                      gas: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', hover: 'hover:border-orange-500 hover:shadow-orange-200', text: 'text-orange-900' },
                      waste: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', hover: 'hover:border-green-500 hover:shadow-green-200', text: 'text-green-900' },
                      municipal: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', hover: 'hover:border-purple-500 hover:shadow-purple-200', text: 'text-purple-900' }
                    };

                    const colors = colorSchemes[dept.id] || colorSchemes.municipal;

                    // Map icons
                    const IconComponent = dept.icon === 'Zap' ? Zap :
                      dept.icon === 'Droplets' ? Droplets :
                        dept.icon === 'Flame' ? Flame :
                          dept.icon === 'Trash2' ? Trash2 :
                            LayoutGrid;

                    return (
                      <div
                        key={dept.id}
                        className={`bg-white rounded-[2.5rem] border-2 ${colors.border} ${colors.hover} transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl group`}
                      >
                        {/* Department Header */}
                        <div className={`${colors.bg} p-8 border-b-2 ${colors.border}`}>
                          <div className="flex items-center gap-5">
                            <div className={`w-20 h-20 rounded-[1.5rem] ${colors.bg} border-2 ${colors.border} flex items-center justify-center ${colors.icon} group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
                              <IconComponent size={40} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1">
                              <h3 className={`text-2xl font-black ${colors.text} leading-tight tracking-tight`}>
                                {deptName}
                              </h3>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                {dept.services.length} Services Available
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Services List */}
                        <div className="p-6 space-y-3">
                          {dept.services.map((svc) => {
                            const svcKey = `serv_${svc.replace(/[\s\/]/g, '')}` as keyof typeof t;
                            const svcName = t[svcKey] || svc;
                            return (
                              <button
                                key={svc}
                                onClick={() => handleServiceSelect(svc, dept.id)}
                                className={`w-full text-left px-6 py-5 rounded-2xl bg-slate-50 hover:bg-gradient-to-r ${colors.hover.includes('amber') ? 'hover:from-amber-500 hover:to-amber-600' : colors.hover.includes('blue') ? 'hover:from-blue-500 hover:to-blue-600' : colors.hover.includes('orange') ? 'hover:from-orange-500 hover:to-orange-600' : colors.hover.includes('green') ? 'hover:from-green-500 hover:to-green-600' : 'hover:from-purple-500 hover:to-purple-600'} hover:text-white text-slate-700 font-bold text-base flex justify-between items-center transition-all duration-200 border-2 border-transparent hover:border-white hover:shadow-lg group/btn`}
                              >
                                <span className="leading-snug">{svcName}</span>
                                <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Help Text */}
                <div className="text-center mt-12 p-6 bg-blue-50 rounded-3xl border-2 border-blue-100">
                  <div className="flex items-center justify-center gap-3 text-blue-900">
                    <Info size={24} className="text-blue-600" />
                    <p className="text-lg font-bold">
                      Need help? Our staff is available at the counter for assistance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Service Form */}
            {submissionStep === 'form' && selectedService && selectedDepartment && (
              <ServiceForm
                serviceName={selectedService}
                departmentId={selectedDepartment}
                onBack={() => setSubmissionStep('select')}
                onSubmit={handleServiceSubmit}
                language={language}
              />
            )}

            {/* Success Screen - No longer needed as ServiceForm handles it internally */}
            {submissionStep === 'success' && selectedService && (
              <ServiceSuccess
                serviceName={selectedService}
                token={`TKT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`}
                mobile="98765 43210" // In a real app, this comes from state
                onFinish={finishSubmission}
                language={language}
              />
            )}
          </div>
        )}

        {/* VIEW 3: BILLING */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl mx-auto">
            {billingStep === 'select' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center">
                  <h2 className="text-4xl font-black text-slate-900 mb-3">{t.navPayBills || "Pay Bills"}</h2>
                  <p className="text-slate-500 text-lg">{t.oneTap || "One-tap utility payments for a smarter life."}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { id: 'elec', name: t.power || 'Electricity', icon: Zap, color: 'amber', consumerLabel: t.consumerLabel || 'Consumer Number', providerLabel: t.deptEB || 'Electricity Board / DISCOM' },
                    { id: 'water', name: t.water || 'Water', icon: Droplets, color: 'blue', consumerLabel: t.connectionId || 'Connection ID', providerLabel: t.deptMunicipal || 'Municipality / Corp' },
                    { id: 'gas', name: t.gas || 'Gas', icon: Flame, color: 'orange', consumerLabel: t.customerId || 'Customer ID', providerLabel: t.deptGas || 'Gas Provider / PNG' }
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
                      <p className="text-[10px] text-slate-400 mt-3 font-black uppercase tracking-[0.2em]">{t.selectService || "Select Service"}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {billingStep === 'form' && selectedBillService && (
              // If Electricity, use Module, else generic form
              selectedBillService.id === 'elec' ? (
                <ElectricityModule onBack={resetBilling} language={language} />
              ) : (
                <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-12 max-w-xl mx-auto animate-in zoom-in-95 relative overflow-hidden">
                  <button onClick={resetBilling} className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest mb-10 hover:text-blue-600 transition">
                    <ArrowLeft size={16} /> {t.changeUtility || "Change Utility"}
                  </button>
                  <div className="flex items-center gap-5 mb-10">
                    <div className={`w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center`}>
                      <selectedBillService.icon size={28} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900">{selectedBillService.name} {t.billSuffix || "Bill"}</h2>
                      <p className="text-sm text-slate-500 font-medium">{t.secureDbMsg || "Securely linked to Coimbatore-Central Database"}</p>
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
                        {t.regMobileNo || "Registered Mobile Number"}
                      </label>
                      <div className="relative group">
                        <input
                          inputMode="numeric"
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
                      {isFetchingBill ? <RefreshCw className="animate-spin" /> : (t.fetchBillDetails || 'Fetch Bill Details')}
                    </button>
                  </div>
                </div>
              )
            )}

            {billingStep === 'details' && selectedBillService && (
              <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden max-w-2xl mx-auto animate-in slide-in-from-bottom-12">
                <div className="bg-slate-900 p-10 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">{t.billPreview || "Official Bill Preview"}</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <h2 className={`text-6xl font-black mb-2 ${isPrivacyShield ? 'privacy-sensitive' : ''}`}>
                        {fetchedBill ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(fetchedBill.amount) : '--'}
                      </h2>
                      <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-widest text-[10px]">
                        <AlertCircle size={14} className="text-orange-400" /> {t.dueDateLabel || "Due Date:"} {fetchedBill ? fetchedBill.dueDate : '--'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.consumerNameLabel || "Consumer Name"}</p>
                      <p className={`font-black text-xl text-slate-900 ${isPrivacyShield ? 'privacy-sensitive' : ''}`}>Arun Kumar</p>
                      <p className="text-xs text-slate-500 font-bold mt-1">{t.idLabel || "ID:"} {consumerNumber}</p>
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
                      <span>{t.totalPayable || "TOTAL PAYABLE"}</span>
                      <span className={isPrivacyShield ? 'privacy-sensitive' : ''}>
                        {fetchedBill ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(fetchedBill.amount) : '--'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-4">
                    <button onClick={() => setBillingStep('form')} className="flex-1 bg-slate-100 text-slate-500 p-6 rounded-2xl font-black transition">{t.edit || "Edit"}</button>
                    <button
                      onClick={handlePayBill}
                      className="flex-[2] bg-blue-600 text-white p-6 rounded-2xl font-black text-xl hover:bg-blue-700 transition shadow-2xl shadow-blue-100"
                    >
                      {t.confirmPay || "Confirm & Pay"}
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
                  <h2 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tighter">{t.paymentSuccessTitle || "Payment Success!"}</h2>
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] text-left space-y-5 mb-10 mt-10">
                    <div className="flex justify-between items-center border-b pb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{t.utilityLabel || "Utility"}</span>
                      <span className="text-slate-900 font-black">{selectedBillService?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{t.amountLabel || "Amount"}</span>
                      <span className="text-blue-600 font-black text-xl">₹1,452.00</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handlePrintReceipt}
                      className="flex-1 bg-blue-600 text-white p-6 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                      <Printer size={20} /> {t.printReceiptBtn || "Print Receipt"}
                    </button>
                    <button onClick={resetBilling} className="flex-1 bg-slate-900 text-white p-6 rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition">{t.returnHomeBtn || "Return Home"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: AI & ASSISTANT (Updated) */}
        {activeTab === 'ai' && (
          <div className="max-w-4xl mx-auto h-full flex flex-col bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-10">
            <div className="bg-indigo-900 p-6 flex items-center justify-between gap-4 text-white relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Brain size={150} />
              </div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border-4 border-indigo-200 shadow-lg">
                  <MessageSquare size={32} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-black text-2xl tracking-tight">SUVIDHA AI</h3>
                  <div className="flex items-center gap-2 opacity-80">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em]">{t.ai_online} • {t.ai_voiceEnabled}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                {/* Reset Chat */}
                <button
                  onClick={handleResetChat}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border bg-indigo-800 text-indigo-300 border-indigo-700 hover:bg-white hover:text-indigo-900 hover:border-white"
                >
                  <RotateCcw size={18} />
                  <span className="text-xs uppercase tracking-wider">{t.ai_newChat}</span>
                </button>

                {/* Voice Toggle */}
                <button
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border ${isVoiceEnabled ? 'bg-white text-indigo-900 border-white' : 'bg-indigo-800 text-indigo-300 border-indigo-700'}`}
                >
                  {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span className="text-xs uppercase tracking-wider">{isVoiceEnabled ? t.ai_voiceOn : t.ai_voiceOff}</span>
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden bg-slate-50">
              <div className="flex-1 overflow-y-auto space-y-6 pr-4">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[80%] p-6 rounded-3xl relative
                      ${msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-200'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'}
                    `}>
                      <p className={`font-bold text-lg leading-relaxed whitespace-pre-line`}>{msg.text}</p>

                      {/* NEW: Render Dynamic Numeric Menu if available */}
                      {msg.menu && (
                        <div className="mt-6 space-y-3">
                          <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-2">{msg.menu.heading}</p>
                          {msg.menu.options.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => handleMenuOptionClick(opt.id, opt.label)}
                              className={`w-full text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 p-4 rounded-xl flex items-center justify-between transition group ${msg.sender === 'user' ? 'bg-blue-700 border-blue-500 text-white' : ''}`}
                            >
                              <span className="font-bold">{opt.label}</span>
                              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200 text-slate-600 text-sm font-black group-hover:bg-indigo-600 group-hover:text-white transition">{opt.id}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Bot Actions - Replay Voice */}
                      {msg.sender === 'bot' && msg.voiceText && isVoiceEnabled && (
                        <button onClick={() => speakText(msg.voiceText!)} className="mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit hover:bg-indigo-100 transition">
                          <PlayCircle size={14} /> {t.ai_replay}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isAiLoading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white p-6 rounded-3xl rounded-tl-none border border-slate-200 shadow-sm flex gap-2 items-center">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="mt-4 flex gap-3 bg-white p-3 rounded-[2rem] shadow-xl border border-slate-100">
                <button
                  onClick={handleVoiceInput}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition border ${isListening ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100'}`}
                >
                  {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <input
                  type="text"
                  placeholder={t.ai_inputPlaceholder}
                  className="flex-1 bg-transparent border-none outline-none text-xl font-bold text-slate-800 placeholder:text-slate-300 px-2"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                />
                <button
                  onClick={() => handleAiSearch()}
                  disabled={!aiQuery.trim() || isAiLoading}
                  className="w-16 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                >
                  <Send size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: STATUS/HISTORY (Unchanged) */}
        {activeTab === 'status' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3"><History className="text-blue-600" /> Interaction History</h2>
            <div className="grid gap-4">
              {GrievanceService.getUserRequests(MOCK_USER_PROFILE.id).map((req) => (
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
          <div className="h-full">
            <ComplaintsModule
              onBack={() => setActiveTab('home')}
              language={language}
            />
          </div>
        )}

      </div>
      <PaymentReceipt data={receiptDetails} />
    </KioskShell >
  );
};

export default KioskUI;
