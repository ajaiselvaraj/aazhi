import React, { useState } from 'react';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';
import { Language } from '../../types';
import { TRANSLATIONS } from '../../constants';

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
    const t = TRANSLATIONS[language];
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
    const [tokenNumber, setTokenNumber] = useState<string>('');

    // Define form fields for each service
    const getFormFields = (): FormField[] => {
        const serviceKey = `${departmentId}_${serviceName.replace(/[\s\/]/g, '_')}`;

        const formConfigs: Record<string, FormField[]> = {
            // ELECTRICITY BOARD (6 services)
            'eb_New_Connection': [
                { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter your full name' },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, placeholder: '10-digit mobile number', maxLength: 10 },
                { name: 'address', label: 'Address', type: 'textarea', required: true, placeholder: 'Enter complete address' },
                { name: 'connectionType', label: 'Connection Type', type: 'select', required: true, options: ['Residential', 'Commercial'] },
                { name: 'idProof', label: 'ID Proof Upload (Optional)', type: 'file', required: false }
            ],
            'eb_Billing_Issue': [
                { name: 'consumerNumber', label: 'Consumer Number', type: 'text', required: true, placeholder: 'e.g., EB-10098745' },
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 },
                { name: 'complaintType', label: 'Complaint Type', type: 'select', required: true, options: ['Incorrect Bill Amount', 'Payment Not Updated', 'Duplicate Bill', 'Other'] },
                { name: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Provide details if "Other" selected' }
            ],
            'eb_Meter_Fault': [
                { name: 'consumerNumber', label: 'Consumer Number', type: 'text', required: true },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'complaintType', label: 'Complaint Type', type: 'select', required: true, options: ['Meter Not Working', 'Reading Error', 'Physical Damage', 'Other'] },
                { name: 'photo', label: 'Photo Upload (Optional)', type: 'file', required: false },
                { name: 'description', label: 'Description', type: 'textarea', required: false }
            ],
            'eb_Load_Change': [
                { name: 'consumerNumber', label: 'Consumer Number', type: 'text', required: true },
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'currentLoad', label: 'Current Load (kW)', type: 'text', required: true, placeholder: 'e.g., 2' },
                { name: 'requestedLoad', label: 'Requested Load (kW)', type: 'text', required: true, placeholder: 'e.g., 5' }
            ],
            'eb_Address_Change': [
                { name: 'consumerNumber', label: 'Consumer Number', type: 'text', required: true },
                { name: 'oldAddress', label: 'Old Address', type: 'textarea', required: true },
                { name: 'newAddress', label: 'New Address', type: 'textarea', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 }
            ],
            'eb_Other': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'contact', label: 'Contact Number', type: 'tel', required: true, maxLength: 10 },
                { name: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe your request or issue' }
            ],

            // WATER SUPPLY & SEWAGE (5 services)
            'water_Water_Connection': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'idProof', label: 'ID Proof Upload (Optional)', type: 'file', required: false }
            ],
            'water_Sewage_Block': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'landmark', label: 'Landmark', type: 'text', required: true, placeholder: 'Nearby landmark for easy location' },
                { name: 'complaintType', label: 'Complaint Type', type: 'select', required: true, options: ['Drain Blockage', 'Overflow', 'Bad Odor', 'Other'] },
                { name: 'description', label: 'Description', type: 'textarea', required: false }
            ],
            'water_Pipeline_Leak': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'location', label: 'Location', type: 'textarea', required: true },
                { name: 'complaintType', label: 'Complaint Type', type: 'select', required: true, options: ['Minor Leak', 'Major Leak', 'No Water Supply', 'Other'] },
                { name: 'description', label: 'Description', type: 'textarea', required: false }
            ],
            'water_Address_Change': [
                { name: 'consumerId', label: 'Consumer ID', type: 'text', required: true },
                { name: 'oldAddress', label: 'Old Address', type: 'textarea', required: true },
                { name: 'newAddress', label: 'New Address', type: 'textarea', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 }
            ],
            'water_Other': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'contact', label: 'Contact Number', type: 'tel', required: true, maxLength: 10 },
                { name: 'description', label: 'Description', type: 'textarea', required: true }
            ],

            // GAS DISTRIBUTION (5 services)
            'gas_New_Connection': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'idProof', label: 'ID Proof Upload (Optional)', type: 'file', required: false }
            ],
            'gas_Refill_Booking': [
                { name: 'consumerId', label: 'Consumer ID', type: 'text', required: true },
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 }
            ],
            'gas_Leakage_Complaint': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'emergencyContact', label: 'Emergency Contact Number', type: 'tel', required: true, maxLength: 10 },
                { name: 'complaintType', label: 'Complaint Type', type: 'select', required: true, options: ['Cylinder Leak', 'Pipe Leak', 'Regulator Issue', 'Other'] },
                { name: 'description', label: 'Description', type: 'textarea', required: false }
            ],
            'gas_Address_Change': [
                { name: 'consumerId', label: 'Consumer ID', type: 'text', required: true },
                { name: 'oldAddress', label: 'Old Address', type: 'textarea', required: true },
                { name: 'newAddress', label: 'New Address', type: 'textarea', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 }
            ],
            'gas_Other': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'description', label: 'Description', type: 'textarea', required: true }
            ],

            // WASTE MANAGEMENT (4 services)
            'waste_Garbage_Collection___Pickup_Request': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'areaWard', label: 'Area / Ward', type: 'text', required: true, placeholder: 'Enter your area or ward number' },
                { name: 'wasteType', label: 'Waste Type', type: 'select', required: true, options: ['Regular Waste', 'Bulk Waste', 'Construction Debris', 'E-Waste', 'Hazardous Waste', 'Other'] },
                { name: 'preferredDate', label: 'Preferred Date (Optional)', type: 'date', required: false }
            ],
            'waste_Complaint_Registration': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'complaintType', label: 'Complaint Type', type: 'select', required: true, options: ['Garbage Not Collected', 'Overflowing Bin', 'Missed Pickup', 'Illegal Dumping', 'Other'] },
                { name: 'description', label: 'Description', type: 'textarea', required: false }
            ],
            'waste_Recycling_Information': [
                { name: 'area', label: 'Area', type: 'text', required: true },
                { name: 'wasteType', label: 'Waste Type', type: 'select', required: true, options: ['Plastic', 'Paper', 'Glass', 'Metal', 'E-Waste', 'Organic'] }
            ],
            'waste_Address_Change': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'oldAddress', label: 'Old Address', type: 'textarea', required: true },
                { name: 'newAddress', label: 'New Address', type: 'textarea', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 }
            ],

            // MUNICIPAL CORPORATION (5 services)
            'municipal_Birth_Death_Cert': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'dateOfEvent', label: 'Date of Birth/Death', type: 'date', required: true },
                { name: 'address', label: 'Address', type: 'textarea', required: true },
                { name: 'idProof', label: 'ID Proof Upload (Optional)', type: 'file', required: false }
            ],
            'municipal_Property_Tax': [
                { name: 'propertyId', label: 'Property ID', type: 'text', required: true, placeholder: 'Enter property identification number' },
                { name: 'ownerName', label: 'Owner Name', type: 'text', required: true },
                { name: 'address', label: 'Address', type: 'textarea', required: true }
            ],
            'municipal_Street_Light': [
                { name: 'location', label: 'Location', type: 'textarea', required: true },
                { name: 'landmark', label: 'Landmark', type: 'text', required: true },
                { name: 'complaintType', label: 'Complaint Type', type: 'select', required: true, options: ['Light Not Working', 'Blinking Light', 'Pole Damage', 'Other'] },
                { name: 'description', label: 'Description', type: 'textarea', required: false }
            ],
            'municipal_Address_Change': [
                { name: 'serviceIdOrPropertyId', label: 'Service ID / Property ID', type: 'text', required: true },
                { name: 'oldAddress', label: 'Old Address', type: 'textarea', required: true },
                { name: 'newAddress', label: 'New Address', type: 'textarea', required: true },
                { name: 'mobile', label: 'Mobile Number', type: 'tel', required: true, maxLength: 10 }
            ],
            'municipal_Other': [
                { name: 'name', label: 'Full Name', type: 'text', required: true },
                { name: 'contact', label: 'Contact Number', type: 'tel', required: true, maxLength: 10 },
                { name: 'description', label: 'Description', type: 'textarea', required: true }
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
        const newErrors: Record<string, string> = {};

        fields.forEach(field => {
            if (field.required && !formData[field.name]) {
                newErrors[field.name] = `${field.label} is required`;
            }

            // Validate mobile number
            if (field.type === 'tel' && formData[field.name]) {
                if (!/^\d{10}$/.test(formData[field.name])) {
                    newErrors[field.name] = 'Enter valid 10-digit mobile number';
                }
            }

            // Show description field if "Other" is selected in complaint type
            if (field.name === 'complaintType' && formData[field.name] === 'Other') {
                const descField = fields.find(f => f.name === 'description');
                if (descField && !formData['description']) {
                    newErrors['description'] = 'Description is required when "Other" is selected';
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            // Generate token number
            const currentYear = new Date().getFullYear();
            const randomNumber = Math.floor(Math.random() * 900000) + 100000; // 6-digit number
            const newToken = `MSP-${currentYear}-${randomNumber.toString().slice(0, 6)}`;
            setTokenNumber(newToken);

            // Show success message
            setShowSuccess(true);

            // Auto-hide success message and call onSubmit after 10 seconds (extended time for user to read token)
            setTimeout(() => {
                onSubmit({ ...formData, tokenNumber: newToken });
            }, 10000);
        }
    };

    const handleReset = () => {
        setFormData({});
        setErrors({});
        setUploadedFiles({});
        setShowSuccess(false);
        setTokenNumber('');
    };

    // Check if description should be shown (when "Other" is selected)
    const shouldShowDescription = formData['complaintType'] === 'Other';

    if (showSuccess) {
        return (
            <div className="max-w-2xl mx-auto animate-in zoom-in-95">
                <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-green-200 p-12 text-center">
                    <div className="w-32 h-32 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <CheckCircle size={64} strokeWidth={2.5} />
                    </div>

                    <h2 className="text-4xl font-black text-slate-900 mb-4">Request Submitted Successfully!</h2>

                    <p className="text-xl text-slate-600 mb-8">
                        Your request has been submitted successfully.<br />
                        Please save this token number for tracking.
                    </p>

                    {/* Token Number Display */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-4 border-blue-300 rounded-3xl p-8 mb-8 shadow-lg">
                        <p className="text-sm font-bold text-blue-700 uppercase tracking-widest mb-3">
                            Your Token Number
                        </p>
                        <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-inner">
                            <p className="text-5xl font-black text-blue-600 tracking-wider font-mono">
                                {tokenNumber}
                            </p>
                        </div>
                        <p className="text-xs font-bold text-blue-600 mt-4 uppercase tracking-wide">
                            Please save this number for tracking your request
                        </p>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8">
                        <p className="text-sm font-bold text-amber-900 flex items-center justify-center gap-2">
                            <span className="text-2xl">📱</span>
                            A confirmation SMS will be sent to your registered mobile number shortly.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setShowSuccess(false);
                            handleReset();
                            onBack();
                        }}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-12 py-6 rounded-2xl font-black text-xl hover:from-blue-700 hover:to-blue-800 transition shadow-xl shadow-blue-200"
                    >
                        Back to Services
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-3 text-slate-600 hover:text-blue-600 font-bold mb-6 transition group"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-lg">Back to Services</span>
                </button>

                <div className="bg-white rounded-[2.5rem] border-2 border-blue-200 p-8 shadow-lg">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border-2 border-blue-200">
                            <FileText size={32} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-tight">{serviceName}</h2>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                                Fill in the details below
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
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>

                                {field.type === 'text' || field.type === 'tel' ? (
                                    <input
                                        type={field.type}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        maxLength={field.maxLength}
                                        className={`w-full bg-slate-50 border-2 ${errors[field.name] ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400`}
                                    />
                                ) : field.type === 'textarea' ? (
                                    <textarea
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        rows={4}
                                        className={`w-full bg-slate-50 border-2 ${errors[field.name] ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 resize-none`}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        className={`w-full bg-slate-50 border-2 ${errors[field.name] ? 'border-red-400' : 'border-slate-200'} p-5 rounded-2xl text-lg font-semibold outline-none focus:border-blue-500 focus:bg-white transition`}
                                    >
                                        <option value="">-- Select {field.label} --</option>
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
                                                {uploadedFiles[field.name] || 'Click to upload file'}
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
                        Reset Form
                    </button>
                    <button
                        type="submit"
                        className="flex-[2] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 rounded-2xl font-black text-xl hover:from-blue-700 hover:to-blue-800 transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
                    >
                        <CheckCircle size={24} />
                        Submit Request
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ServiceForm;
