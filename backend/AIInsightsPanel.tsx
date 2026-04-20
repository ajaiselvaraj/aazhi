import React from 'react';
import { Sparkles, ShieldCheck, Tag, Smile, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

interface AIInsightsProps {
    metadata: {
        ai_analysis?: {
            validation?: {
                is_spam: boolean;
                confidence: number;
                reason: string;
                classification: string; // e.g., 'legitimate', 'angry_citizen', 'spam'
            };
            department?: {
                department: string;
                confidence?: number;
            };
            sentiment?: {
                sentiment: string;
                score?: number;
            };
        };
    };
}

const AIInsightsPanel: React.FC<AIInsightsProps> = ({ metadata }) => {
    const aiData = metadata?.ai_analysis;

    // If there are no AI insights available for this ticket, don't render the panel
    if (!aiData || Object.keys(aiData).length === 0) {
        return null;
    }

    const getClassificationPill = (classification: string) => {
        const formattedClass = classification.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        switch (classification) {
            case 'legitimate':
            case 'angry_citizen':
            case 'uncertain_legit':
                return (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={14} />
                        {formattedClass}
                    </span>
                );
            case 'spam':
            case 'suspicious_spam':
                return (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle size={14} />
                        {formattedClass}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {formattedClass}
                    </span>
                );
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5 shadow-sm mt-6">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2 mb-4">
                <Sparkles className="text-indigo-500" size={20} />
                AAZHI AI Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Department Classification */}
                {aiData.department && (
                    <div className="bg-white rounded-lg p-3 border border-indigo-50 flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-md">
                            <Tag className="text-blue-600" size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Predicted Department</p>
                            <p className="text-base font-bold text-gray-900 capitalize">
                                {aiData.department.department}
                            </p>
                        </div>
                    </div>
                )}

                {/* Sentiment Analysis */}
                {aiData.sentiment && (
                    <div className="bg-white rounded-lg p-3 border border-indigo-50 flex items-start gap-3">
                        <div className="bg-emerald-100 p-2 rounded-md">
                            <Smile className="text-emerald-600" size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Citizen Sentiment</p>
                            <p className="text-base font-bold text-gray-900 capitalize">
                                {aiData.sentiment.sentiment}
                            </p>
                        </div>
                    </div>
                )}

            </div>

            {/* Spam Analysis Summary */}
            {aiData.validation && (
                <div className="bg-white rounded-lg p-4 border border-indigo-50">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheck className="text-indigo-500" size={18} />
                            Spam & Content Analysis
                        </h4>
                        {getClassificationPill(aiData.validation.classification)}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600 flex items-start gap-2">
                        <MessageSquare size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
                        <p>
                            <strong>AI Reason:</strong> {aiData.validation.reason}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIInsightsPanel;