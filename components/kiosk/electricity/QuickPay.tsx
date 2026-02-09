import React, { useState } from 'react';
import { ArrowLeft, Search, RefreshCw, AlertCircle, CheckCircle, CreditCard, Printer, ShieldCheck, Zap } from 'lucide-react';
import { MOCK_USER_PROFILE, TRANSLATIONS } from '../../../constants';
import OfficialReceipt from './OfficialReceipt';
import { Language } from '../../../types';
import { BBPSService, BBPSBillResponse } from '../../../services/BBPSService';

interface Props {
    onBack: () => void;
    language: Language;
}

const QuickPay: React.FC<Props> = ({ onBack, language }) => {
    const t = TRANSLATIONS[language];

    const [step, setStep] = useState<'INPUT' | 'DETAILS' | 'PAYMENT' | 'SUCCESS'>('INPUT');
    const [consumerNo, setConsumerNo] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [billData, setBillData] = useState<BBPSBillResponse['data'] | null>(null);
    const [paymentMode, setPaymentMode] = useState<'UPI' | 'CARD' | 'NET_BANKING'>('UPI');
    const [paymentRef, setPaymentRef] = useState<{ txnId: string; bbpsRefId: string } | null>(null);
    const [error, setError] = useState<string>('');

    const handleFetch = async () => {
        if (!consumerNo) return;
        setIsLoading(true);
        setError('');

        try {
            const response = await BBPSService.fetchBill('TANGEDCO', consumerNo);
            if (response.success && response.data) {
                setBillData(response.data);
                setStep('DETAILS');
            } else {
                setError(response.error || 'Failed to fetch bill details.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePay = async () => {
        if (!billData) return;
        setIsLoading(true);
        try {
            const response = await BBPSService.processPayment(billData, paymentMode);
            if (response.success && response.data) {
                setPaymentRef({
                    txnId: response.data.txnId,
                    bbpsRefId: response.data.bbpsRefId
                });
                setStep('SUCCESS');
            } else {
                alert('Payment Failed: ' + response.error);
            }
        } catch (err) {
            alert('Payment processing error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto animate-in slide-in-from-right-8 pb-10">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
                <ArrowLeft size={16} /> {t.back}
            </button>

            {/* BBPS BRANDING HEADER */}
            <div className="flex justify-end mb-4 opacity-80">
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center text-white font-black text-[10px]">BBPS</div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bharat BillPay Enabled</span>
                </div>
            </div>

            {/* STEP 1: INPUT */}
            {step === 'INPUT' && (
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2">{t.details}</h2>
                        <p className="text-slate-500 font-medium">{t.enterServiceNo}</p>
                    </div>

                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2">{t.consumerNo}</label>
                    <div className="relative mb-8">
                        <input
                            inputMode="numeric"
                            type="text"
                            value={consumerNo}
                            onChange={(e) => {
                                setConsumerNo(e.target.value.toUpperCase());
                                setError('');
                            }}
                            className="w-full bg-slate-50 border-2 border-slate-100 p-6 pl-14 rounded-2xl text-2xl font-black uppercase tracking-widest outline-none focus:border-blue-600 focus:bg-white transition"
                            placeholder="04-123-456"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                        {error && (
                            <div className="absolute -bottom-6 left-2 flex items-center gap-1 text-red-500 text-xs font-bold animate-in slide-in-from-top-1">
                                <AlertCircle size={12} /> {error}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleFetch}
                        disabled={!consumerNo || isLoading}
                        className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black text-xl hover:bg-blue-700 transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" /> : t.fetchBill}
                    </button>
                </div>
            )}

            {/* STEP 2: DETAILS */}
            {step === 'DETAILS' && billData && (
                <div className="space-y-6">
                    {/* Bill Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">

                        {/* Header Section with Status */}
                        <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">{t.totalPending}</p>
                                <h2 className="text-5xl font-black tracking-tight flex items-baseline gap-1">
                                    <span className="text-2xl opacity-60">₹</span>
                                    {billData.amount.toFixed(2)}
                                </h2>
                            </div>
                            <div className="text-right">
                                <div className="inline-flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/20">
                                    BBPS VERIFIED
                                </div>
                                <p className="text-xs font-bold text-slate-400 mt-2">{t.dueDate}: {billData.dueDate}</p>
                            </div>
                        </div>

                        {/* Bill Content */}
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Bill Date</p>
                                    <p className="font-bold text-slate-900">{billData.billDate}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">Bill Number</p>
                                    <p className="font-bold text-slate-900">{billData.billNumber}</p>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-600">{t.consumerName}</span>
                                    <span className="text-sm font-black text-slate-900">{billData.consumerName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600">{t.consumerNo}</span>
                                    <span className="text-sm font-black text-slate-900">{billData.consumerId}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-8 pt-0 flex gap-4">
                            <button onClick={() => setStep('INPUT')} className="flex-1 py-4 rounded-xl font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition text-sm uppercase tracking-wider">Cancel</button>
                            <button onClick={() => setStep('PAYMENT')} className="flex-[2] py-4 rounded-xl font-black bg-blue-600 text-white hover:bg-blue-700 transition text-sm uppercase tracking-wider shadow-lg shadow-blue-200">{t.payNow}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: PAYMENT SELECTION */}
            {step === 'PAYMENT' && billData && (
                <div className="space-y-6 animate-in slide-in-from-right-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                        <h3 className="text-xl font-black text-slate-900 mb-6">{t.paymentMode}</h3>

                        <div className="space-y-3">
                            {[
                                { id: 'UPI', label: 'UPI / QR Code', icon: Zap, sub: 'GPay, PhonePe, Paytm' },
                                { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, sub: 'Visa, MasterCard, Rupay' },
                                { id: 'NET_BANKING', label: 'Net Banking', icon: ShieldCheck, sub: 'SBI, HDFC, ICICI, Axis' }
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setPaymentMode(mode.id as any)}
                                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${paymentMode === mode.id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${paymentMode === mode.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <mode.icon size={24} />
                                    </div>
                                    <div>
                                        <p className={`font-black text-lg ${paymentMode === mode.id ? 'text-blue-900' : 'text-slate-900'}`}>{mode.label}</p>
                                        <p className="text-xs font-medium text-slate-500">{mode.sub}</p>
                                    </div>
                                    {paymentMode === mode.id && <CheckCircle className="ml-auto text-blue-600" size={24} />}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Payable Amount</p>
                                <p className="text-3xl font-black text-slate-900">₹{billData.amount.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={handlePay}
                                className="bg-green-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-wider hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center gap-2"
                            >
                                {isLoading ? <RefreshCw className="animate-spin" /> : t.payNow}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 'SUCCESS' && billData && paymentRef && (
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} />
                    </div>

                    <h2 className="text-4xl font-black text-slate-900 mb-2">{t.paymentSuccess}</h2>
                    <p className="text-slate-500 font-medium mb-8">BBPS Ref: {paymentRef.bbpsRefId}</p>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-3 mb-8">
                        <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase">{t.elecServices}</span>
                            <span className="text-sm font-black text-slate-900">{t.elecBill || "Electricity Bill"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase">{t.consumerNo}</span>
                            <span className="text-sm font-black text-slate-900">{billData.consumerId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase">{t.billAmount}</span>
                            <span className="text-sm font-black text-blue-600">₹{billData.amount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-blue-200">
                            <Printer size={18} /> {t.printReceipt}
                        </button>
                        <button onClick={onBack} className="bg-slate-900 text-white p-4 rounded-2xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 transition">
                            {t.back || "Done"}
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden Receipt Component for Printing */}
            {step === 'SUCCESS' && billData && paymentRef && (
                <OfficialReceipt
                    data={{
                        serviceNo: billData.consumerId,
                        consumerName: billData.consumerName,
                        billAmount: `Rs. ${billData.amount.toFixed(2)}`,
                        billMonth: billData.billDate,
                        receiptNo: `ER-${Date.now().toString().slice(-8)}`,
                        dateTime: new Date().toLocaleString(),
                        debitAmount: `Rs. ${billData.amount.toFixed(2)}`,
                        bankRef: paymentRef.txnId,
                        authId: paymentRef.bbpsRefId, // Mapping BBPS Ref here
                        paymentMode: paymentMode
                    }}
                    language={language}
                />
            )}
        </div>
    );
};

export default QuickPay;
