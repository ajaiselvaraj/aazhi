import React, { useState } from 'react';
import { ArrowLeft, Search, RefreshCw, AlertCircle, Flame } from 'lucide-react';
import { Language } from '../../../types';
import { BillingService } from '../../../services/civicService';

interface Props {
    onBack: () => void;
    onNavigate: (view: any) => void;
    language: Language;
}

const GasTransactions: React.FC<Props> = ({ onBack, onNavigate, language }) => {
    const [consumerNo, setConsumerNo] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!consumerNo) return;
        setIsLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const pastTransactions = await BillingService.getTransactionHistory('gas', consumerNo);
            setTransactions(pastTransactions);
        } catch (e: any) {
            console.error("Failed to fetch gas transactions:", e);
            setError("Could not retrieve transaction history. Please try again later.");
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full bg-white flex flex-col">
            {/* Top Navigation Bar - Tab Style */}
            <div className="flex items-center gap-6 px-10 py-4 border-b border-orange-100 bg-white">
                <button
                    className="text-orange-600 font-bold text-base hover:text-orange-800 transition"
                >
                    Gas Transactions
                </button>
                <button
                    onClick={() => onNavigate('QUICK_PAY')}
                    className="text-orange-400 font-medium text-base hover:text-orange-600 transition"
                >
                    Quick Pay
                </button>
                <button
                    onClick={onBack}
                    className="text-orange-400 font-medium text-base hover:text-orange-600 transition"
                >
                    Home
                </button>
            </div>

            <div className="p-8 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4">

                {/* Search Section */}
                <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 mb-8 flex items-end gap-4 max-w-2xl">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Enter Customer ID</label>
                        <input
                            type="text"
                            value={consumerNo}
                            onChange={(e) => setConsumerNo(e.target.value.toUpperCase())}
                            className="w-full p-3 border border-orange-300 rounded-lg outline-none focus:border-orange-500 font-bold text-slate-700"
                            placeholder="e.g. GAS-778899"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !consumerNo}
                        className="px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                        Search
                    </button>
                </div>

                {/* Header Bar */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-3 rounded-t-lg shadow-sm">
                    <h2 className="text-white font-bold text-lg px-2 flex items-center gap-2">
                        <Flame size={20} /> Gas Payment History
                    </h2>
                </div>

                {/* Data Table Container */}
                <div className="border border-orange-200 border-t-0 bg-white rounded-b-lg shadow-sm min-h-[200px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-orange-100">
                                <th className="p-4 text-xs font-bold text-orange-600 uppercase tracking-wider border-r border-orange-100">Customer ID</th>
                                <th className="p-4 text-xs font-bold text-orange-600 uppercase tracking-wider border-r border-orange-100">Date</th>
                                <th className="p-4 text-xs font-bold text-orange-600 uppercase tracking-wider border-r border-orange-100">Amount</th>
                                <th className="p-4 text-xs font-bold text-orange-600 uppercase tracking-wider border-r border-orange-100">Txn Ref No</th>
                                <th className="p-4 text-xs font-bold text-orange-600 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading records...</td>
                                </tr>
                            ) : hasSearched && transactions.length > 0 ? (
                                transactions.map((txn, idx) => (
                                    <tr key={idx} className="border-b border-slate-50 bg-white hover:bg-orange-50/30 transition">
                                        <td className="p-4 text-sm font-bold text-slate-700 border-r border-slate-50">{txn.account_number || txn.consumerId || txn.serviceNo}</td>
                                        <td className="p-4 text-sm text-slate-600 border-r border-slate-50">{txn.created_at ? new Date(txn.created_at).toLocaleDateString() : txn.date}</td>
                                        <td className="p-4 text-sm font-bold text-slate-900 border-r border-slate-50">₹{txn.amount}</td>
                                        <td className="p-4 text-sm font-mono text-slate-500 border-r border-slate-50">{txn.transaction_id || txn.transactionId || txn.txnId}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {txn.status || 'Success'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                                        {error ? (
                                            <div className="text-red-500 flex items-center justify-center gap-2">
                                                <AlertCircle size={16} /> {error}
                                            </div>
                                        ) : hasSearched ? "No records found for this Customer ID." : "Enter Customer ID to view history."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-right">
                    <p className="text-[10px] text-orange-600 font-bold">Copyright @ 2026 Bharat Gas / Indane</p>
                </div>
            </div>
        </div>
    );
};

export default GasTransactions;
