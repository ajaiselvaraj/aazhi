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
    Mic,
    FileText
} from 'lucide-react';
import { PREDEFINED_ISSUES, DEPARTMENTS } from '../../constants';
import { Language } from '../../types';
import { useServiceComplaint } from '../../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';

interface ComplaintsModuleProps {
    onBack: () => void;
    language: Language;
    departmentId?: string; // Optional prop for pre-selecting department
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
        <div className="max-w-4xl mx-auto h-full flex flex-col animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
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

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">

                {/* STEP 1: CATEGORY SELECTION (Skipped if departmentId is provided) */}
                {step === 'category' && (
                    <div className="p-8 h-full flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black">1</span>
                            {t('comp_selectDept')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                            {DEPARTMENTS.map(dept => {
                                const deptName = t(`dept_${dept.id}`) || dept.name;
                                return (
                                    <button
                                        key={dept.id}
                                        onClick={() => setSelectedDept(dept.id)}
                                        className={`p-6 rounded-2xl text-left border-2 transition-all flex items-start gap-4 group
                                ${selectedDept === dept.id
                                                ? 'border-blue-600 bg-blue-50'
                                                : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'}
                            `}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors
                                ${selectedDept === dept.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 group-hover:text-blue-600'}
                            `}>
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h4 className={`font-black text-lg ${selectedDept === dept.id ? 'text-blue-900' : 'text-slate-800'}`}>
                                                {deptName}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">{dept.services.length} {t('comp_issueTypes')}</p>
                                        </div>
                                        {selectedDept === dept.id && <CheckCircle className="ml-auto text-blue-600 animate-in zoom-in" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 border-t pt-6 flex justify-end">
                            <button
                                disabled={!selectedDept}
                                onClick={() => setStep('details')}
                                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {t('nextStep') || t('nextBtn')} <ArrowLeft className="rotate-180" size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: DETAILS */}
                {step === 'details' && (
                    <div className="p-8 h-full flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black">2</span>
                            {t('comp_issueDetails')} - {getDeptName(selectedDept)}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t('comp_commonIssues')}</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(PREDEFINED_ISSUES[selectedDept as keyof typeof PREDEFINED_ISSUES] || PREDEFINED_ISSUES['municipal']).map(issueKey => {
                                            const issueName = t(issueKey);
                                            return (
                                                <button
                                                    key={issueKey}
                                                    onClick={() => setIssueType(issueKey)}
                                                    className={`p-4 rounded-xl text-left font-bold text-sm border-2 transition-all
                                            ${issueType === issueKey
                                                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                            : 'border-slate-100 text-slate-600 hover:border-blue-200'}
                                        `}
                                                >
                                                    {issueName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
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
                                    <button className="flex-1 bg-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-300 transition">
                                        <Mic size={18} /> {t('comp_voiceNote')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 border-t pt-6 flex justify-between items-center">
                            <button
                                onClick={() => departmentId ? onBack() : setStep('category')}
                                className="text-slate-400 font-bold hover:text-slate-600 px-4"
                            >
                                {t('backBtn')}
                            </button>
                            <button
                                disabled={!issueType || isSubmitting}
                                onClick={handleSubmit}
                                className="bg-red-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-red-100"
                            >
                                {isSubmitting ? t('comp_registering') : t('comp_submitComplaint')} <Send size={18} />
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
