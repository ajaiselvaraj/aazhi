import React, { useState, useEffect } from 'react';
import {
    Building2,
    MapPin,
    AlertTriangle,
    Camera,
    Send,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    Clock,
    FileText,
    Upload,
    ShieldCheck
} from 'lucide-react';
import { PREDEFINED_ISSUES, DEPARTMENTS } from '../../constants';
import { Language } from '../../types';
import { useServiceComplaint } from '../../contexts/ServiceComplaintContext';
import { useTranslation } from 'react-i18next';
import { AccessibleButton } from '../AccessibleButton';

interface ServiceModuleProps {
    onBack: () => void;
    language: Language;
    departmentId?: string; // Optional prop for pre-selecting department
}

const ServiceModule: React.FC<ServiceModuleProps> = ({ onBack, language, departmentId }) => {
    const { t } = useTranslation();
    const { addServiceRequest } = useServiceComplaint();

    // Steps: category -> details -> scan -> success
    const [step, setStep] = useState<'category' | 'details' | 'success'>(departmentId ? 'details' : 'category');
    
    // Form State
    const [selectedDept, setSelectedDept] = useState<string>(departmentId || '');
    const [serviceType, setServiceType] = useState<string>('');
    const [description, setDescription] = useState('');
    const [applicantName, setApplicantName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ticketId, setTicketId] = useState('');

    useEffect(() => {
        if (departmentId) {
            setSelectedDept(departmentId);
            setStep('details');
        }
        
        // Load default user info safely
        try {
            const sessionStr = localStorage.getItem('aazhi_user');
            if (sessionStr && sessionStr !== 'null' && sessionStr !== 'undefined') {
                const sessionUser = JSON.parse(sessionStr);
                if (sessionUser?.name) setApplicantName(sessionUser.name);
                if (sessionUser?.mobile) setContactNumber(sessionUser.mobile);
            }
        } catch {
            // Ignore corrupted storage
        }
    }, [departmentId]);

    const getDeptName = (id: string) => {
        return DEPARTMENTS.find(d => d.id === id)?.name || 'General';
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);

        let sessionUser: any = null;
        try {
            const sessionStr = localStorage.getItem('aazhi_user');
            if (sessionStr && sessionStr !== 'null' && sessionStr !== 'undefined') {
                sessionUser = JSON.parse(sessionStr);
            }
        } catch {
            sessionUser = null;
        }

        try {
            const deptObj = DEPARTMENTS.find(d => d.id === selectedDept);
            const newId = await addServiceRequest({
                name: applicantName || sessionUser?.name,
                phone: contactNumber || sessionUser?.mobile,
                category: deptObj?.name || 'General',
                serviceType: t(serviceType) || serviceType,
                description: description || t(serviceType),
                address: sessionUser?.ward || 'Unknown'
            });

            setTicketId(newId);
            setStep('success');
        } catch (error) {
            console.error("Service request generation failed", error);
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
                    <h2 className="text-3xl font-black text-slate-900">{t('nav_services') || "Service Requests"}</h2>
                    <p className="text-slate-500 font-medium">
                        {departmentId
                            ? `${t('comp_reportForDept')} ${getDeptName(departmentId)}`
                            : t('apply_for_services') || "Apply for utility services and certificates"}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col relative">

                {/* STEP 1: CATEGORY SELECTION */}
                {step === 'category' && (
                    <div className="p-8 h-full flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">1</span>
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
                                                ? 'border-indigo-600 bg-indigo-50'
                                                : 'border-slate-100 hover:border-indigo-300 hover:bg-slate-50'}
                                `}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors
                                ${selectedDept === dept.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 group-hover:text-indigo-600'}
                            `}>
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h4 className={`font-black text-lg ${selectedDept === dept.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                {deptName}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 font-medium">{dept.services.length} {t('services_avail') || "Services Available"}</p>
                                        </div>
                                        {selectedDept === dept.id && <CheckCircle className="ml-auto text-indigo-600 animate-in zoom-in" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 border-t pt-6 flex justify-end">
                            <AccessibleButton
                                disabled={!selectedDept}
                                onClick={() => setStep('details')}
                                label={t('nextStep') || "Next"}
                                language={language}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 2: DETAILS */}
                {step === 'details' && (
                    <div className="p-8 h-full flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">2</span>
                            {t('service_details') || "Service Details"} - {getDeptName(selectedDept)}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full overflow-y-auto pr-2">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t('select_service') || "Select Service"}</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(DEPARTMENTS.find(d => d.id === selectedDept)?.services || []).map(issueKey => {
                                            const issueName = t(`serv_${issueKey.replace(/[\s\/]/g, '')}`) || issueKey;
                                            return (
                                                <button
                                                    key={issueKey}
                                                    onClick={() => setServiceType(issueKey)}
                                                    className={`p-4 rounded-xl text-left font-bold text-sm border-2 transition-all
                                            ${serviceType === issueKey
                                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                            : 'border-slate-100 text-slate-600 hover:border-indigo-200'}
                                        `}
                                                >
                                                    {issueName}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 flex flex-col">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('applicantName') || "Applicant Name"}</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-600 outline-none font-bold text-slate-900 privacy-sensitive placeholder:text-slate-300"
                                            value={applicantName}
                                            placeholder={t('sf_enterFullName') || 'Your Full Name'}
                                            onChange={e => setApplicantName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('contactNumber') || "Contact Number"}</label>
                                        <input
                                            inputMode="numeric"
                                            type="text"
                                            className="w-full bg-slate-50 p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-600 outline-none font-bold text-slate-900 privacy-sensitive placeholder:text-slate-300"
                                            value={contactNumber}
                                            placeholder={t('mobileNumberPlaceholder') || 'Mobile Number'}
                                            onChange={e => setContactNumber(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col flex-1 mt-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{t('comp_additionalDetails') || "Additional Context"}</label>
                                    <textarea
                                        className="flex-1 w-full bg-white border-2 border-slate-200 rounded-xl p-4 text-slate-800 font-bold focus:border-indigo-500 outline-none resize-none placeholder:text-slate-300 placeholder:font-normal"
                                        placeholder={t('service_desc_placeholder') || "Provide any extra details required for this service application..."}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />

                                    <div className="mt-4 flex gap-3">
                                        <button className="flex-1 bg-slate-200 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-300 transition">
                                            <Camera size={18} /> {t('comp_addPhoto') || "Photo"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 border-t pt-6 flex justify-between items-center">
                            <button
                                onClick={() => departmentId ? onBack() : setStep('category')}
                                className="text-slate-400 font-bold hover:text-slate-600 px-4"
                            >
                                {t('backBtn') || "Back"}
                            </button>
                            <AccessibleButton
                                disabled={!serviceType || !applicantName || !contactNumber}
                                onClick={handleFinalSubmit}
                                label={t('submitBtn') || "Submit Application"}
                                language={language}
                                className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 4: SUCCESS */}
                {step === 'success' && (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mb-2">{t('request_submitted') || "Application Submitted"}</h2>
                        <p className="text-slate-500 text-lg font-medium max-w-md mx-auto mb-8">
                            {t('service_forwarded') || "Your service request has been verified and forwarded to the concerned department."}
                        </p>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 w-full max-w-sm mb-8">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{t('comp_ticketId') || "Tracking ID"}</p>
                            <p className="text-3xl font-black text-slate-800 tracking-tight">{ticketId}</p>
                        </div>

                        <div className="flex gap-4">
                            <AccessibleButton
                                onClick={onBack}
                                label={t('returnHome') || "Return to Home"}
                                language={language}
                                className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black hover:bg-slate-800 transition"
                            />
                        </div>
                    </div>
                )}
            </div>
            
            {/* Loading Overlay */}
            {isSubmitting && (
                 <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2.5rem]">
                      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                      <h3 className="text-xl font-black text-slate-800">{t('comp_registering') || "Submitting Request..."}</h3>
                 </div>
            )}
        </div>
    );
};

export default ServiceModule;
