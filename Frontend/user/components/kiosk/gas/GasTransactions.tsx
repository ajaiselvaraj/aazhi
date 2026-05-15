import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, Flame, CheckCircle, Clock } from 'lucide-react';
import { Language } from '../../../types';
import { BillingService } from '../../../services/civicService';

interface Props {
    onBack: () => void;
    onNavigate: (view: any) => void;
    language: Language;
}

const GasTransactions: React.FC<Props> = ({ onBack, onNavigate, language }) => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTransactions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const pastTransactions = await BillingService.getTransactionHistory('gas', '');
            setTransactions(pastTransactions || []);
        } catch (e: any) {
            console.error("Failed to fetch transactions:", e);
            setError("Could not retrieve transaction history. Please try again later.");
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <div className="max-w-7xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-6 pb-10">
            <div className="flex justify-between items-center mb-6 px-4">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition">
                    <ArrowLeft size={16} /> Back
                </button>
                <button 
                    onClick={fetchTransactions} 
                    disabled={isLoading}
                    className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest hover:text-orange-800 transition disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                        <Flame size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">Live Transaction History</h2>
                        <p className="text-slate-500 font-bold mt-1">Real-time overview of all gas bill payments.</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 font-bold rounded-2xl mb-8 border border-red-100 flex items-center gap-2">
                        <AlertCircle size={20} /> {error}
                    </div>
                )}

                <div className="border border-slate-200 rounded-3xl overflow-x-auto bg-slate-50">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Date & Time</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Consumer Details</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Bill Info</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Transaction ID & Ref</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Amounts</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <RefreshCw className="animate-spin mb-4 text-orange-500" size={32} />
                                            <span className="font-bold">Loading live transactions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length > 0 ? (
                                transactions.map((txn, idx) => {
                                    const isPaid = txn.status === 'SUCCESS' || txn.status === 'PAID' || txn.payment_status === 'captured';
                                    const billAmount = parseFloat(txn.bill_amount || txn.amount || '0');
                                    const amountPaid = parseFloat(txn.amount || '0');
                                    const pendingAmount = Math.max(0, billAmount - amountPaid);
                                    
                                    return (
                                        <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition">
                                            <td className="p-4">
                                                <div className="text-sm font-bold text-slate-800">
                                                    {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : txn.date}
                                                </div>
                                                <div className="text-xs font-bold text-slate-400">
                                                    {txn.created_at ? new Date(txn.created_at).toLocaleTimeString() : '--:--'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-black text-slate-900">{txn.consumer_name || 'Consumer'}</div>
                                                <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <span className="uppercase tracking-widest">ID:</span> {txn.account_number || txn.consumerId || txn.serviceNo}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-bold text-slate-700">{txn.bill_number || 'N/A'}</div>
                                                <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 inline-block px-2 py-0.5 rounded mt-1">
                                                    {txn.service_type || 'GAS'} BILL
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-mono font-bold text-slate-700">{txn.transaction_id || txn.transactionId || txn.txnId}</div>
                                                <div className="text-xs font-mono text-slate-400 mt-0.5">REF: {txn.receipt_number || txn.razorpay_payment_id || 'N/A'}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">Via: {txn.payment_method || 'Online'}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="text-sm font-black text-slate-900">Paid: ₹{amountPaid.toFixed(2)}</div>
                                                {pendingAmount > 0 ? (
                                                    <div className="text-xs font-bold text-red-500">Pending: ₹{pendingAmount.toFixed(2)}</div>
                                                ) : (
                                                    <div className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">No Dues</div>
                                                )}
                                                {txn.bill_status === 'overdue' && (
                                                    <div className="text-[10px] font-bold text-amber-500 mt-0.5">Was Overdue</div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {isPaid ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 text-green-700 border border-green-200">
                                                        <CheckCircle size={14} className="text-green-600" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">SUCCESS</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                                                        <Clock size={14} className="text-amber-600" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{txn.status || txn.payment_status || 'PENDING'}</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Flame size={32} className="mb-4 opacity-50 text-orange-500" />
                                            <span className="font-bold">No transaction records found.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GasTransactions;
