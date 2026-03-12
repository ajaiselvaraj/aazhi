import React, { useState } from 'react';
import { ArrowLeft, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Language } from '../../../types';

interface Props {
    onBack: () => void;
    onNavigate: (view: any) => void;
    language: Language;
}

const MyTransactions: React.FC<Props> = ({ onBack, onNavigate, language }) => {
    const [consumerNo, setConsumerNo] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = () => {
        if (!consumerNo) return;
        setIsLoading(true);

        // Mock API call
        setTimeout(() => {
            // Mock Data Generation
            const mockData = [
                { serviceNo: consumerNo, date: '05-Feb-2026', amount: '2450.00', txnId: 'TXN889977', status: 'Success' },
                { serviceNo: consumerNo, date: '05-Jan-2026', amount: '1200.00', txnId: 'TXN776655', status: 'Success' },
                { serviceNo: consumerNo, date: '05-Dec-2025', amount: '3100.00', txnId: 'TXN665544', status: 'Success' }
            ];

            setTransactions(mockData);
            setHasSearched(true);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="w-full h-full bg-white flex flex-col">
            {/* Top Navigation Bar - Tab Style */}
            <div className="flex items-center gap-6 px-10 py-4 border-b border-indigo-100 bg-white">
                <button
                    className="text-blue-600 font-bold text-base hover:text-blue-800 transition"
                >
                    My Transactions
                </button>
                <button
                    onClick={() => onNavigate('QUICK_PAY')}
                    className="text-blue-400 font-medium text-base hover:text-blue-600 transition"
                >
                    Quick Pay
                </button>
                <button
                    onClick={onBack}
                    className="text-blue-400 font-medium text-base hover:text-blue-600 transition"
                >
                    Home
                </button>
            </div>

            <div className="p-8 max-w-6xl mx-auto w-full animate-in slide-in-from-bottom-4">

                {/* Search Section */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 flex items-end gap-4 max-w-2xl">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Enter Service No</label>
                        <input
                            inputMode="numeric"
                            type="text"
                            value={consumerNo}
                            onChange={(e) => setConsumerNo(e.target.value.toUpperCase())}
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-bold text-slate-700"
                            placeholder="e.g. 04-202-6789"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !consumerNo}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                        Search
                    </button>
                </div>

                {/* Legacy Style Header Bar */}
                <div className="bg-gradient-to-r from-orange-400 to-amber-500 p-3 rounded-t-lg shadow-sm">
                    <h2 className="text-white font-bold text-lg px-2">My Transactions</h2>
                </div>

                {/* Data Table Container */}
                <div className="border border-slate-200 border-t-0 bg-slate-50/50 rounded-b-lg shadow-sm min-h-[200px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="p-4 text-xs font-bold text-blue-600 uppercase tracking-wider border-r border-slate-200">Service No</th>
                                <th className="p-4 text-xs font-bold text-blue-600 uppercase tracking-wider border-r border-slate-200">Transaction Date</th>
                                <th className="p-4 text-xs font-bold text-blue-600 uppercase tracking-wider border-r border-slate-200">Bill Amount</th>
                                <th className="p-4 text-xs font-bold text-blue-600 uppercase tracking-wider border-r border-slate-200">Bank Transaction No</th>
                                <th className="p-4 text-xs font-bold text-blue-600 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading records...</td>
                                </tr>
                            ) : hasSearched && transactions.length > 0 ? (
                                transactions.map((txn, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition">
                                        <td className="p-4 text-sm font-bold text-slate-700 border-r border-slate-100">{txn.serviceNo}</td>
                                        <td className="p-4 text-sm text-slate-600 border-r border-slate-100">{txn.date}</td>
                                        <td className="p-4 text-sm font-bold text-slate-900 border-r border-slate-100">₹{txn.amount}</td>
                                        <td className="p-4 text-sm font-mono text-slate-500 border-r border-slate-100">{txn.txnId}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {txn.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                                        {hasSearched ? "No records found." : "Enter Service No to view transactions."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-right">
                    <p className="text-[10px] text-blue-600 font-bold">Copyright @ 2026 TNPDCL</p>
                </div>
            </div>
        </div>
    );
};

export default MyTransactions;
