import React, { useState, useEffect } from 'react';
import {
    Building2,
    MapPin,
    AlertTriangle,
    Camera,
    Send,
    ArrowLeft,
    CheckCircle,
    Clock,
    FileText,
    Mic,
    Trash2, Waves, CloudRain, Archive, Users, Dog, Megaphone, Lightbulb, Footprints, 
    TreePine, Leaf, Factory, Bug, Package, Receipt, Droplets, Grid, AlertCircle,
    Locate, ChevronDown, Minus, ChevronUp
} from 'lucide-react';
import { PREDEFINED_ISSUES, DEPARTMENTS } from '../../constants';
import { Language } from '../../types';
import { useServiceComplaint } from '../../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';
import { AccessibleButton } from '../AccessibleButton';

const CIVIC_ISSUES = [
  { id: 'garbage', label: 'Garbage not collected', icon: Trash2, circleColor: 'bg-[#0f766e]', iconColor: 'text-white' },
  { id: 'potholes', label: 'Road potholes', icon: AlertTriangle, circleColor: 'bg-[#b45309]', iconColor: 'text-white' },
  { id: 'drainage', label: 'Drainage blockage', icon: Waves, circleColor: 'bg-[#047857]', iconColor: 'text-white' },
  { id: 'stagnation', label: 'Water stagnation', icon: CloudRain, circleColor: 'bg-[#1d4ed8]', iconColor: 'text-white' },
  { id: 'dumping', label: 'Illegal dumping', icon: Archive, circleColor: 'bg-[#6d28d9]', iconColor: 'text-white' },
  { id: 'toilets', label: 'Public toilet issues', icon: Users, circleColor: 'bg-[#be123c]', iconColor: 'text-white' },
  { id: 'animals', label: 'Stray animal complaints', icon: Dog, circleColor: 'bg-[#b45309]', iconColor: 'text-white' },
  { id: 'noise', label: 'Noise pollution', icon: Megaphone, circleColor: 'bg-[#0f766e]', iconColor: 'text-white' },
  { id: 'lights', label: 'Street light complaint', icon: Lightbulb, circleColor: 'bg-[#b45309]', iconColor: 'text-white' },
  { id: 'footpath', label: 'Broken footpath', icon: Footprints, circleColor: 'bg-[#475569]', iconColor: 'text-white' },
  { id: 'manhole', label: 'Open manhole reporting', icon: AlertCircle, circleColor: 'bg-[#b91c1c]', iconColor: 'text-white' },
  { id: 'signal', label: 'Damaged traffic signal', icon: Grid, circleColor: 'bg-[#047857]', iconColor: 'text-white' },
  { id: 'tree', label: 'Fallen tree', icon: TreePine, circleColor: 'bg-[#15803d]', iconColor: 'text-white' },
  { id: 'park', label: 'Park maintenance', icon: Leaf, circleColor: 'bg-[#15803d]', iconColor: 'text-white' },
  { id: 'pollution', label: 'Pollution reporting', icon: Factory, circleColor: 'bg-[#475569]', iconColor: 'text-white' },
  { id: 'mosquito', label: 'Mosquito complaint', icon: Bug, circleColor: 'bg-[#be123c]', iconColor: 'text-white' },
  { id: 'commercial_waste', label: 'Commercial waste request', icon: Package, circleColor: 'bg-[#1d4ed8]', iconColor: 'text-white' },
  { id: 'tax', label: 'Property tax issue', icon: Receipt, circleColor: 'bg-[#0f766e]', iconColor: 'text-white' },
  { id: 'water_quality', label: 'Water quality report', icon: Droplets, circleColor: 'bg-[#0369a1]', iconColor: 'text-white' },
];

const getDeptForIssue = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('water') || lower.includes('drainage')) return 'water';
    if (lower.includes('light') || lower.includes('signal') || lower.includes('power') || lower.includes('electricity')) return 'eb';
    return 'municipal';
};

interface ComplaintsModuleProps {
    onBack: () => void;
    language: Language;
    departmentId?: string; //Optional prop for pre-selecting department
}

const ComplaintsModule: React.FC<ComplaintsModuleProps> = ({ onBack, language, departmentId }) => {
    const { t } = useTranslation();
    const { addComplaint } = useServiceComplaint();

    // If departmentId is provided, start at details step, otherwise category
    const [step, setStep] = useState<'category' | 'details' | 'success'>(departmentId ? 'details' : 'category');
    const [selectedDept, setSelectedDept] = useState<string>(departmentId || '');
    const [issueType, setIssueType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticketId, setTicketId] = useState('');
    const [priority, setPriority] = useState<'Low' | 'Medium' | 'Critical'>('Medium');
    const [locationDetected, setLocationDetected] = useState(false);

    // Update selectedDept if prop changes
    useEffect(() => {
        if (departmentId) {
            setSelectedDept(departmentId);
            setStep('details');
        }
    }, [departmentId]);

    const getDeptName = (id: string) => {
        return DEPARTMENTS.find(d => d.id === id)?.name || 'General';
    };

    const getDeptCategory = (id: string): "Electricity" | "Water" | "Gas" | "Municipal" => {
        switch (id) {
            case 'eb': return "Electricity";
            case 'water': return "Water";
            case 'gas': return "Gas";
            default: return "Municipal";
        }
    };

    const handleSubmit = async () => {
        if (!selectedDept || !issueType) return;

        setIsSubmitting(true);

        // Read real logged-in user from session
        const sessionStr = localStorage.getItem('aazhi_user');
        const sessionUser = sessionStr ? JSON.parse(sessionStr) : null;
        const userName = sessionUser?.name || null;
        const userPhone = sessionUser?.mobile || null;

        try {
            const newId = await addComplaint({
                name: userName,
                phone: userPhone,
                category: getDeptCategory(selectedDept),
                complaintType: t(issueType),
                description: description || t(issueType),
                location: sessionUser?.ward || 'Unknown',
                area: sessionUser?.ward || 'Unknown'
            });

            setTicketId(newId);
            setStep('success');
        } catch (error) {
            console.error("Complaint generation failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`${step === 'category' ? 'max-w-7xl w-full' : 'max-w-4xl'} mx-auto h-full flex flex-col animate-in fade-in slide-in-from-bottom-4`}>
            {/* Header */}
            {step !== 'category' && (
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={step === 'details' && !departmentId ? () => setStep('category') : onBack}
                        className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">{t('comp_registerComplaint')}</h2>
                        <p className="text-slate-500 font-medium">
                            {departmentId
                                ? `${t('comp_reportForDept')} ${getDeptName(departmentId)}`
                                : t('comp_reportToWard')}
                        </p>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className={`flex-1 ${step === 'category' ? 'bg-[#f4f6fa]' : 'bg-white shadow-xl border border-slate-100'} rounded-[2.5rem] overflow-hidden flex flex-col`}>

                {/* STEP 1: CATEGORY SELECTION (Skipped if departmentId is provided) */}
                {step === 'category' && (
                    <div className="p-4 sm:p-8 h-full flex flex-col">
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
                                    onClick={() => {
                                        setSelectedDept(getDeptForIssue(issue.label));
                                        setIssueType(issue.label);
                                        setStep('details');
                                    }}
                                    className="!bg-[#222836] hover:!bg-[#2c3344] !border-none !rounded-[1.5rem] p-6 flex flex-col items-center justify-center gap-4 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] w-full min-h-[160px] group"
                                >
                                    <div className={`w-16 h-16 rounded-full ${issue.circleColor} flex items-center justify-center group-hover:scale-110 transition-transform shadow-md`}>
                                        <issue.icon size={32} className={issue.iconColor} strokeWidth={2.5} />
                                    </div>
                                    <span className="!text-white text-[1.1rem] sm:text-lg font-bold text-center leading-tight">
                                        {issue.label}
                                    </span>
                                </AccessibleButton>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: DETAILS */}
                {/* STEP 2: DETAILS */}
                {step === 'details' && (
                    <div className="p-8 h-full flex flex-col max-w-2xl mx-auto w-full items-center justify-center">
                        <h3 className="text-xl font-bold text-[#1e293b] mb-6">
                            2. Geo-Tag & Priority
                        </h3>

                        <div className="bg-[#f8fafc] rounded-xl p-8 border border-slate-200 w-full mb-8 flex flex-col items-center text-center shadow-sm">
                            <MapPin size={32} className="text-red-600 mb-4" />
                            <p className="text-slate-500 font-medium mb-6 max-w-xs">
                                Location required to route directly to local ward officer.
                            </p>
                            <button 
                                onClick={() => {
                                    // Simulate detecting location
                                    setTimeout(() => setLocationDetected(true), 1500);
                                }}
                                className="w-full sm:w-3/4 bg-[#1e293b] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition"
                            >
                                <Locate size={18} /> {locationDetected ? 'Location Detected!' : 'Auto-Detect My Location'}
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col mb-8 w-full">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t('comp_additionalDetails')}</label>
                            <textarea
                                className="flex-1 w-full bg-white border-2 border-slate-200 rounded-xl p-4 text-slate-800 font-bold focus:border-blue-500 outline-none resize-none placeholder:text-slate-300 placeholder:font-normal"
                                placeholder={t('comp_describeProblem')}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />

                            <div className="mt-4 flex gap-3">
                                <button className="flex-1 bg-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-300 transition">
                                    <Camera size={18} /> {t('comp_addPhoto')}
                                </button>
                            </div>
                        </div>
                            
                        <div className="w-full flex flex-col items-center mb-8">
                            <label className="block text-sm font-bold text-slate-700 mb-4">Select Issue Priority</label>
                            <div className="grid grid-cols-3 gap-4 w-full">
                                <button
                                    onClick={() => setPriority('Low')}
                                    className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border ${priority === 'Low' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-[#f0f4f8] text-[#1e293b] border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <ChevronDown size={20} /> Low
                                </button>
                                <button
                                    onClick={() => setPriority('Medium')}
                                    className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border ${priority === 'Medium' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-[#f0f4f8] text-[#1e293b] border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <Minus size={20} /> Medium
                                </button>
                                <button
                                    onClick={() => setPriority('Critical')}
                                    className={`py-4 rounded-xl flex flex-col items-center justify-center gap-2 font-bold transition-all border ${priority === 'Critical' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-[#f0f4f8] text-[#1e293b] border-slate-200 hover:bg-slate-100'}`}
                                >
                                    <ChevronUp size={20} /> Critical
                                </button>
                            </div>
                        </div>

                        <div className="w-full border-t border-slate-200 pt-6 flex justify-between gap-4">
                            <button
                                onClick={() => departmentId ? onBack() : setStep('category')}
                                className="flex-1 bg-[#1e293b] text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-sm"
                            >
                                Back
                            </button>
                            <button
                                disabled={!locationDetected || isSubmitting}
                                onClick={handleSubmit}
                                className={`flex-1 py-4 rounded-xl font-bold transition shadow-sm ${locationDetected && !isSubmitting ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-[#e2e8f0] text-slate-400'}`}
                            >
                                {isSubmitting ? 'Registering...' : 'Next'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: SUCCESS */}
                {step === 'success' && (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mb-2">{t('comp_complaintRegistered')}</h2>
                        <p className="text-slate-500 text-lg font-medium max-w-md mx-auto mb-8">
                            {t('comp_grievanceForwarded')}
                        </p>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 w-full max-w-sm mb-8">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('comp_ticketId')}</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tight">{ticketId}</p>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={onBack} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition">
                                {t('returnHome')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplaintsModule;
