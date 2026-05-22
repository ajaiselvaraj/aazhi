import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, FileText, CheckCircle, Clock, LogIn, XCircle } from 'lucide-react';
import { Language } from '../../../types';
import { BillingService } from '../../../services/civicService';

interface Props {
    onBack: () => void;
    onNavigate: (view: any) => void;
    language: Language;
}

interface Transaction {
    id?: string;
    created_at?: string;
    date?: string;
    consumer_name?: string;
    account_number?: string;
    consumerId?: string;
    serviceNo?: string;
    bill_number?: string;
    service_type?: string;
    transaction_id?: string;
    transactionId?: string;
    txnId?: string;
    receipt_number?: string;
    razorpay_payment_id?: string;
    payment_method?: string;
    bill_amount?: string | number;
    amount?: string | number;
    status?: string;
    payment_status?: string;
    bill_status?: string;
}

/** Read the stored user object from localStorage */
const getStoredUser = (): { id?: string; name?: string } | null => {
    try {
        const raw = localStorage.getItem('aazhi_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

/** Check whether a proper JWT is present in localStorage */
const hasValidAuth = (): boolean => {
    const token = localStorage.getItem('aazhi_token');
    return !!(token && token.split('.').length === 3 && token.length > 50);
};

const MyTransactions: React.FC<Props> = ({ onBack, onNavigate, language }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Prevent duplicate in-flight requests
    const fetchingRef = useRef(false);
    // Prevent fetch after unmount
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchTransactions = useCallback(async () => {
        // ── Auth guard ─────────────────────────────────────────────
        const authed = hasValidAuth();
        const user = getStoredUser();

        console.log('[MyTransactions] Auth check — hasValidAuth:', authed);
        console.log('[MyTransactions] User:', user);

        if (!authed) {
            // No valid JWT → do NOT make any API call
            setIsAuthenticated(false);
            setIsLoading(false);
            setTransactions([]);
            return;
        }

        setIsAuthenticated(true);

        // ── Single-flight guard ────────────────────────────────────
        if (fetchingRef.current) {
            console.log('[MyTransactions] Skipping duplicate fetch — already in-flight.');
            return;
        }

        fetchingRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            // Do NOT pass consumerId — backend reads user from the JWT token
            const result = await BillingService.getTransactionHistory('electricity');

            if (!mountedRef.current) return;

            setTransactions(Array.isArray(result) ? result : []);
        } catch (e: any) {
            if (!mountedRef.current) return;

            console.error('[MyTransactions] Failed to fetch transactions:', e);

            if (e?.status === 401 || e?.status === 403) {
                setError('Your session has expired. Please log in again.');
                setIsAuthenticated(false);
            } else if (e?.status === 400) {
                setError('Authentication required to view transaction history. Please log in.');
                setIsAuthenticated(false);
            } else {
                setError('Could not retrieve transaction history. Please try again later.');
            }

            setTransactions([]);
        } finally {
            fetchingRef.current = false;
            if (mountedRef.current) setIsLoading(false);
        }
    }, []);

    // Fetch once on mount — only runs if auth is valid
    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // ── Unauthenticated state ──────────────────────────────────────
    if (!isAuthenticated && !isLoading) {
        return (
            <div className="max-w-7xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-6 pb-10">
                <div className="flex justify-between items-center mb-6 px-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition">
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center min-h-[300px] gap-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                        <LogIn size={36} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Login Required</h2>
                        <p className="text-slate-500 font-medium max-w-sm">
                            Please log in to view your electricity transaction history. Your personal transaction data is secured behind authentication.
                        </p>
                    </div>
                    <button
                        onClick={() => onNavigate('LOGIN')}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <LogIn size={18} /> Login to Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-6 pb-10">
            <div className="flex justify-between items-center mb-6 px-4">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition">
                    <ArrowLeft size={16} /> Back
                </button>
                <button
                    onClick={fetchTransactions}
                    disabled={isLoading}
                    className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:text-blue-800 transition disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">Transaction History</h2>
                        <p className="text-slate-500 font-bold mt-1">Your electricity bill payment records.</p>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 font-bold rounded-2xl mb-8 border border-red-100 flex items-center gap-3">
                        <XCircle size={20} className="shrink-0" />
                        <div>
                            <p>{error}</p>
                            {(error.includes('log in') || error.includes('session')) && (
                                <button
                                    onClick={() => onNavigate('LOGIN')}
                                    className="mt-2 text-sm underline text-red-700 hover:text-red-900"
                                >
                                    Go to Login →
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="border border-slate-200 rounded-3xl overflow-x-auto bg-slate-50">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-200">
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Date &amp; Time</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Consumer Details</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Bill Info</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Transaction ID &amp; Ref</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Amounts</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <RefreshCw className="animate-spin mb-4 text-blue-500" size={32} />
                                            <span className="font-bold">Loading transactions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length > 0 ? (
                                transactions.map((txn, idx) => {
                                    const isPaid =
                                        txn.status === 'SUCCESS' ||
                                        txn.status === 'PAID' ||
                                        txn.status === 'Success' ||
                                        txn.payment_status === 'captured';
                                    const billAmount = parseFloat(String(txn.bill_amount || txn.amount || '0'));
                                    const amountPaid = parseFloat(String(txn.amount || '0'));
                                    const pendingAmount = Math.max(0, billAmount - amountPaid);

                                    return (
                                        <tr key={txn.id ?? idx} className="border-b border-slate-100 bg-white hover:bg-slate-50 transition">
                                            <td className="p-4">
                                                <div className="text-sm font-bold text-slate-800">
                                                    {txn.created_at ? new Date(txn.created_at).toLocaleDateString() : (txn.date ?? '—')}
                                                </div>
                                                <div className="text-xs font-bold text-slate-400">
                                                    {txn.created_at ? new Date(txn.created_at).toLocaleTimeString() : '--:--'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-black text-slate-900">{txn.consumer_name || 'Consumer'}</div>
                                                <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                    <span className="uppercase tracking-widest">NO:</span>{' '}
                                                    {txn.account_number || txn.consumerId || txn.serviceNo || '—'}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-bold text-slate-700">{txn.bill_number || 'N/A'}</div>
                                                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">
                                                    {txn.service_type || 'ELECTRICITY'} BILL
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-mono font-bold text-slate-700">
                                                    {txn.transaction_id || txn.transactionId || txn.txnId || '—'}
                                                </div>
                                                <div className="text-xs font-mono text-slate-400 mt-0.5">
                                                    REF: {txn.receipt_number || txn.razorpay_payment_id || 'N/A'}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                    Via: {txn.payment_method || 'Online'}
                                                </div>
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
                                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                                            {txn.status || txn.payment_status || 'PENDING'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : !error ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <FileText size={32} className="mb-4 opacity-50" />
                                            <span className="font-bold">No transaction records found.</span>
                                            <span className="text-sm mt-1 text-slate-400">Payments you make will appear here.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MyTransactions;
