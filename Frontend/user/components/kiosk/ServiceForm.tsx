import React, { useState } from 'react';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';
import { Language } from '../../types';
import { useTranslation } from 'react-i18next';
import { Persistence, debounceSaveForm } from '../../utils/persistence';

interface FormField {
    name: string;
    label: string;
    type: 'text' | 'tel' | 'textarea' | 'file' | 'select' | 'date';
    required?: boolean;
    options?: string[];
    placeholder?: string;
    maxLength?: number;
}

interface ServiceFormProps {
    serviceName: string;
    departmentId: string;
    onBack: () => void;
    onSubmit: (data: any) => void;
    language: Language;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ serviceName, departmentId, onBack, onSubmit, language }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

    const formKey = `${departmentId}_${serviceName.replace(/[\s\/]/g, '_')}`;

    // ─── PERSISTENCE: Restore form data ───
    React.useEffect(() => {
        const savedData = Persistence.loadFormData(formKey);
        if (savedData) {
            console.log(`♻️ Restoring form data for ${formKey}`);
            setFormData(savedData);
        }
    }, [formKey]);

    // Define form fields for each service
    const getFormFields = (): FormField[] => {
        const serviceKey = formKey;

        const formConfigs: Record<string, FormField[]> = {
            // ELECTRICITY BOARD (6 services)
            'eb_New_Connection': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true, placeholder: 'sf_enterFullName' },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, placeholder: 'sf_mobileHint', maxLength: 10 },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true, placeholder: 'sf_enterAddress' },
                { name: 'connectionType', label: 'sf_connectionType', type: 'select', required: true, options: ['Residential', 'Commercial'] },
                { name: 'idProof', label: 'sf_idProofOptional', type: 'file', required: false }
            ],
            'eb_Billing_Issue': [
                { name: 'consumerNumber', label: 'sf_consumerNumber', type: 'text', required: true, placeholder: 'sf_consumerNumberHint' },
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 },
                { name: 'complaintType', label: 'sf_complaintType', type: 'select', required: true, options: ['Incorrect Bill Amount', 'Payment Not Updated', 'Duplicate Bill', 'Other'] },
                { name: 'description', label: 'sf_description', type: 'textarea', required: false, placeholder: 'sf_descriptionHint' }
            ],
            'eb_Meter_Fault': [
                { name: 'consumerNumber', label: 'sf_consumerNumber', type: 'text', required: true },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'complaintType', label: 'sf_complaintType', type: 'select', required: true, options: ['Meter Not Working', 'Reading Error', 'Physical Damage', 'Other'] },
                { name: 'photo', label: 'sf_photoOptional', type: 'file', required: false },
                { name: 'description', label: 'sf_description', type: 'textarea', required: false }
            ],
            'eb_Load_Change': [
                { name: 'consumerNumber', label: 'sf_consumerNumber', type: 'text', required: true },
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'currentLoad', label: 'sf_currentLoad', type: 'text', required: true, placeholder: 'sf_currentLoadHint' },
                { name: 'requestedLoad', label: 'sf_requestedLoad', type: 'text', required: true, placeholder: 'sf_requestedLoadHint' }
            ],
            'eb_Address_Change': [
                { name: 'consumerNumber', label: 'sf_consumerNumber', type: 'text', required: true },
                { name: 'oldAddress', label: 'sf_oldAddress', type: 'textarea', required: true },
                { name: 'newAddress', label: 'sf_newAddress', type: 'textarea', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 }
            ],
            'eb_Other': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'contact', label: 'sf_contactNumber', type: 'tel', required: true, maxLength: 10 },
                { name: 'description', label: 'sf_description', type: 'textarea', required: true, placeholder: 'sf_describeRequest' }
            ],

            // WATER SUPPLY & SEWAGE (5 services)
            'water_Water_Connection': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'idProof', label: 'sf_idProofOptional', type: 'file', required: false }
            ],
            'water_Sewage_Block': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'landmark', label: 'sf_landmark', type: 'text', required: true, placeholder: 'sf_landmarkHint' },
                { name: 'complaintType', label: 'sf_complaintType', type: 'select', required: true, options: ['Drain Blockage', 'Overflow', 'Bad Odor', 'Other'] },
                { name: 'description', label: 'sf_description', type: 'textarea', required: false }
            ],
            'water_Pipeline_Leak': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'location', label: 'sf_location', type: 'textarea', required: true },
                { name: 'complaintType', label: 'sf_complaintType', type: 'select', required: true, options: ['Minor Leak', 'Major Leak', 'No Water Supply', 'Other'] },
                { name: 'description', label: 'sf_description', type: 'textarea', required: false }
            ],
            'water_Address_Change': [
                { name: 'consumerId', label: 'sf_consumerId', type: 'text', required: true },
                { name: 'oldAddress', label: 'sf_oldAddress', type: 'textarea', required: true },
                { name: 'newAddress', label: 'sf_newAddress', type: 'textarea', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 }
            ],
            'water_Other': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'contact', label: 'sf_contactNumber', type: 'tel', required: true, maxLength: 10 },
                { name: 'description', label: 'sf_description', type: 'textarea', required: true }
            ],

            // GAS DISTRIBUTION (5 services)
            'gas_New_Connection': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'idProof', label: 'sf_idProofOptional', type: 'file', required: false }
            ],
            'gas_Refill_Booking': [
                { name: 'consumerId', label: 'sf_consumerId', type: 'text', required: true },
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 }
            ],
            'gas_Leakage_Complaint': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'emergencyContact', label: 'sf_emergencyContact', type: 'tel', required: true, maxLength: 10 },
                { name: 'complaintType', label: 'sf_complaintType', type: 'select', required: true, options: ['Cylinder Leak', 'Pipe Leak', 'Regulator Issue', 'Other'] },
                { name: 'description', label: 'sf_description', type: 'textarea', required: false }
            ],
            'gas_Address_Change': [
                { name: 'consumerId', label: 'sf_consumerId', type: 'text', required: true },
                { name: 'oldAddress', label: 'sf_oldAddress', type: 'textarea', required: true },
                { name: 'newAddress', label: 'sf_newAddress', type: 'textarea', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 }
            ],
            'gas_Other': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'description', label: 'sf_description', type: 'textarea', required: true }
            ],

            // WASTE MANAGEMENT (4 services)
            'waste_Garbage_Collection___Pickup_Request': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'areaWard', label: 'sf_areaWard', type: 'text', required: true, placeholder: 'sf_areaWardHint' },
                { name: 'wasteType', label: 'sf_wasteType', type: 'select', required: true, options: ['Regular Waste', 'Bulk Waste', 'Construction Debris', 'E-Waste', 'Hazardous Waste', 'Other'] },
                { name: 'preferredDate', label: 'sf_preferredDateOptional', type: 'date', required: false }
            ],
            'waste_Complaint_Registration': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'complaintType', label: 'sf_complaintType', type: 'select', required: true, options: ['Garbage Not Collected', 'Overflowing Bin', 'Missed Pickup', 'Illegal Dumping', 'Other'] },
                { name: 'description', label: 'sf_description', type: 'textarea', required: false }
            ],
            'waste_Recycling_Information': [
                { name: 'area', label: 'sf_area', type: 'text', required: true },
                { name: 'wasteType', label: 'sf_wasteType', type: 'select', required: true, options: ['Plastic', 'Paper', 'Glass', 'Metal', 'E-Waste', 'Organic'] }
            ],
            'waste_Address_Change': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'oldAddress', label: 'sf_oldAddress', type: 'textarea', required: true },
                { name: 'newAddress', label: 'sf_newAddress', type: 'textarea', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 }
            ],

            // MUNICIPAL CORPORATION (5 services)
            'municipal_Birth_Death_Cert': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'dateOfEvent', label: 'sf_dateOfBirthDeath', type: 'date', required: true },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true },
                { name: 'idProof', label: 'sf_idProofOptional', type: 'file', required: false }
            ],
            'municipal_Property_Tax': [
                { name: 'propertyId', label: 'sf_propertyId', type: 'text', required: true, placeholder: 'sf_propertyIdHint' },
                { name: 'ownerName', label: 'sf_ownerName', type: 'text', required: true },
                { name: 'address', label: 'sf_address', type: 'textarea', required: true }
            ],
            'municipal_Street_Light': [
                { name: 'location', label: 'sf_location', type: 'textarea', required: true },
                { name: 'landmark', label: 'sf_landmark', type: 'text', required: true },
                { name: 'complaintType', label: 'sf_complaintType', type: 'select', required: true, options: ['Light Not Working', 'Blinking Light', 'Pole Damage', 'Other'] },
                { name: 'description', label: 'sf_description', type: 'textarea', required: false }
            ],
            'municipal_Address_Change': [
                { name: 'serviceIdOrPropertyId', label: 'sf_servicePropertyId', type: 'text', required: true },
                { name: 'oldAddress', label: 'sf_oldAddress', type: 'textarea', required: true },
                { name: 'newAddress', label: 'sf_newAddress', type: 'textarea', required: true },
                { name: 'mobile', label: 'sf_mobileNumber', type: 'tel', required: true, maxLength: 10 }
            ],
            'municipal_Other': [
                { name: 'name', label: 'sf_fullName', type: 'text', required: true },
                { name: 'contact', label: 'sf_contactNumber', type: 'tel', required: true, maxLength: 10 },
                { name: 'description', label: 'sf_description', type: 'textarea', required: true }
            ]
        };

        return formConfigs[serviceKey] || [];
    };

    const fields = getFormFields();

    const handleInputChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
        
        // ─── PERSISTENCE: Auto-save ───
        debounceSaveForm(formKey, { ...formData, [name]: value });
    };

    const handleFileUpload = (name: string, file: File | null) => {
        if (file) {
            // Simulate file upload
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedFiles(prev => ({ ...prev, [name]: file.name }));
                handleInputChange(name, file.name);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = (): boolean => {
        console.log("🕵️ [Form] Starting validation for:", formData);
        const newErrors: Record<string, string> = {};

        fields.forEach(field => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = `${t(field.label)} ${t('fieldRequired')}`;
            }

            // Validate mobile number
            if (field.type === 'tel' && formData[field.name]) {
                if (!/^\d{10}$/.test(formData[field.name])) {
                    newErrors[field.name] = t('validMobile');
                }
            }

            // Show description field if "Other" is selected in complaint type
            if (field.name === 'complaintType' && formData[field.name] === 'Other') {
                const descField = fields.find(f => f.name === 'description');
                if (descField && !formData['description']) {
                    newErrors['description'] = t('descRequiredOther');
                }
            }
        });

        if (Object.keys(newErrors).length > 0) {
            console.warn("⚠️ [Form] Validation failed:", newErrors);
        } else {
            console.log("✅ [Form] Validation passed.");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        console.log("🖱️ [Form] Submit button clicked");
        e.preventDefault();
        console.log("✨ [Form] event.preventDefault() called successfully");

        try {
            if (validateForm()) {
                console.log("🚀 [Form] Triggering onSubmit parent handler...");
                Persistence.clearFormData(formKey);
                onSubmit(formData);
            }
        } catch (err) {
            console.error("❌ [Form] Critical error during submission execution:", err);
        }
    };

    const handleReset = () => {
        setFormData({});
        setErrors({});
        setUploadedFiles({});
        Persistence.clearFormData(formKey);
    };

    // Check if description should be shown (when "Other" is selected)
    const shouldShowDescription = formData['complaintType'] === 'Other';



    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-3 text-slate-600 hover:text-blue-600 font-bold mb-6 transition group"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-lg">{t('backToServices')}</span>
                </button>

                <div className="bg-white rounded-[2.5rem] border-2 border-blue-200 p-8 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border-2 border-blue-200">
                            <FileText size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-tight">{serviceName}</h2>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                                {t('fillDetailsBelow')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-10 shadow-xl">
                <div className="space-y-8">
                    {fields.map((field) => {
                        // Skip description field if "Other" is not selected
                        if (field.name === 'description' && !shouldShowDescription && field.required === false) {
                            return null;
                        }

                        return (
                            <div key={field.name} className="space-y-3">
                                <label className="block text-sm font-black text-slate-700 uppercase tracking-wider">
                                    {t(field.label)}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                {field.type === 'text' || field.type === 'tel' ? (
                                    <input
                                        type={field.type}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={field.placeholder ? t(field.placeholder) : undefined}
                                        maxLength={field.maxLength}
                                        className={`w-full bg-slate-50 border-2 ${errors[field.name] ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400`}
                                    />
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        inputMode="text"
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={field.placeholder ? t(field.placeholder) : undefined}
                                        rows={3}
                                        className={`w-full bg-slate-50 border-2 ${errors[field.name] ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        className={`w-full bg-slate-50 border-2 ${errors[field.name] ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition`}
                                    >
                                        <option value="">{t('selectOption')}</option>
                                        {field.options?.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                ) : field.type === 'date' ? (
                                    <input
                                        type="date"
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        className={`w-full bg-slate-50 border-2 ${errors[field.name] ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition`}
                                    />
                                ) : field.type === 'file' ? (
                                    <div>
                                        <label className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-500 p-8 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition group">
                                            <Upload size={40} className="text-slate-400 group-hover:text-blue-600 mb-3 transition" />
                                            <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition">
                                                {uploadedFiles[field.name] || t('clickToUpload')}
                                            </span>
                                            <input
                                                type="file"
                                                onChange={(e) => handleFileUpload(field.name, e.target.files?.[0] || null)}
                                                className="hidden"
                                                accept="image/*,.pdf"
                                            />
                                        </label>
                                        {uploadedFiles[field.name] && (
                                            <div className="mt-3 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                                                <CheckCircle size={20} />
                                                <span className="text-sm font-bold">{uploadedFiles[field.name]}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {errors[field.name] && (
                                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl">
                                        <AlertCircle size={18} />
                                        <span className="text-sm font-bold">{errors[field.name]}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-6 mt-12 pt-8 border-t-2 border-slate-100">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 bg-slate-100 text-slate-700 px-8 py-6 rounded-2xl font-black text-xl hover:bg-slate-200 transition border-2 border-slate-200 flex items-center justify-center gap-3"
                    >
                        <X size={24} />
                        {t('resetForm')}
                    </button>
                    <button
                        type="submit"
                        className="flex-[2] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 rounded-2xl font-black text-xl hover:from-blue-700 hover:to-blue-800 transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
                    >
                        <CheckCircle size={24} />
                        {t('submitReq')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ServiceForm;
