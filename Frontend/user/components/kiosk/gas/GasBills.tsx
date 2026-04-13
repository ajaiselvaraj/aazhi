import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, CheckCircle, Clock, AlertCircle, Download, Flame, RefreshCw } from 'lucide-react';
import { Language } from '../../../types';
import { useTranslation } from 'react-i18next';
import { GasService, GasBill, GasPaymentRecord } from '../../../services/gasService';

interface Props {
  onBack: () => void;
  language: Language;
}

const GasBills: React.FC<Props> = ({ onBack }) => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<'bills' | 'payments'>('bills');
  const [bills, setBills] = useState<GasBill[]>([]);
  const [payments, setPayments] = useState<GasPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [billsResult, paymentsResult] = await Promise.allSettled([
        GasService.getBills(),
        GasService.getPaymentStatus()
      ]);

      if (billsResult.status === 'fulfilled') {
        const data = billsResult.value;
        setBills(Array.isArray(data) ? data : (data?.data || []));
      }
      if (paymentsResult.status === 'fulfilled') {
        setPayments(Array.isArray(paymentsResult.value) ? paymentsResult.value : []);
      }

      // If both failed, show error
      if (billsResult.status === 'rejected' && paymentsResult.status === 'rejected') {
        setError('Unable to load billing data. Please try again.');
        // Demo fallback
        setBills([
          {
            id: '1', account_id: 'a1', citizen_id: 'c1', service_type: 'gas',
            bill_number: 'GAS-BILL-2026-001', amount: 850, tax_amount: 42.50,
            total_amount: 892.50, units_consumed: 12, reading_current: 1245,
            reading_previous: 1233, billing_month: 'March', billing_year: '2026',
            billing_cycle: 'Monthly', due_date: '2026-04-15', status: 'pending',
            paid_at: null, account_number: 'GAS-ACC-001', created_at: '2026-03-01T00:00:00Z'
          },
          {
            id: '2', account_id: 'a1', citizen_id: 'c1', service_type: 'gas',
            bill_number: 'GAS-BILL-2026-002', amount: 720, tax_amount: 36,
            total_amount: 756, units_consumed: 10, reading_current: 1233,
            reading_previous: 1223, billing_month: 'February', billing_year: '2026',
            billing_cycle: 'Monthly', due_date: '2026-03-15', status: 'paid',
            paid_at: '2026-03-12T10:30:00Z', account_number: 'GAS-ACC-001', created_at: '2026-02-01T00:00:00Z'
          }
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bills.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBills = statusFilter === 'all'
    ? bills
    : bills.filter(b => b.status === statusFilter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-slate-500 font-bold">{t('loading') || 'Loading bills...'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest mb-6 hover:text-slate-900 transition">
        <ArrowLeft size={16} /> {t('backToUtils') || 'Back'}
      </button>

      {/* Header */}
      <div className="bg-white rounded-[2.5rem] border-2 border-blue-200 p-8 shadow-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border-2 border-blue-200">
              <CreditCard size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900">{t('gas_viewBills') || 'Gas Bills & Payments'}</h2>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
                {t('gas_billsDesc') || 'View your billing history and payment status'}
              </p>
            </div>
          </div>
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition">
            <RefreshCw size={18} /> {t('refresh') || 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex items-center gap-3 text-amber-700 font-bold">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-6 mx-auto max-w-md shadow-inner">
        <button
          onClick={() => setActiveView('bills')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'bills' ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CreditCard size={16} /> {t('gas_billsTab') || 'Bills'}
        </button>
        <button
          onClick={() => setActiveView('payments')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeView === 'payments' ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CheckCircle size={16} /> {t('gas_paymentsTab') || 'Payment History'}
        </button>
      </div>

      {/* Bills View */}
      {activeView === 'bills' && (
        <>
          {/* Filter */}
          <div className="flex gap-2 mb-6">
            {['all', 'pending', 'paid', 'overdue'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition ${statusFilter === f ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {t(`gas_filter_${f}`) || f}
              </button>
            ))}
          </div>

          {/* Bill Cards */}
          <div className="space-y-4">
            {filteredBills.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
                <CreditCard size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold">{t('gas_noBills') || 'No bills found'}</p>
              </div>
            ) : (
              filteredBills.map(bill => (
                <div key={bill.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 tracking-widest">{bill.bill_number}</p>
                      <h3 className="text-xl font-black text-slate-900">{bill.billing_month} {bill.billing_year}</h3>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${getStatusBadge(bill.status)}`}>
                      {t(`gas_status_${bill.status}`) || bill.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Amount</p>
                      <p className="font-black text-lg text-slate-800">{formatCurrency(bill.amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Tax</p>
                      <p className="font-black text-lg text-slate-800">{formatCurrency(bill.tax_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                      <p className="font-black text-lg text-blue-600">{formatCurrency(bill.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Due Date</p>
                      <p className="font-black text-lg text-slate-800">{new Date(bill.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {bill.units_consumed !== null && (
                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-600">
                      <Flame size={16} className="text-orange-500" />
                      <span>{t('gas_unitsConsumed') || 'Units consumed'}: <strong>{bill.units_consumed}</strong></span>
                      <span className="text-slate-400">|</span>
                      <span>Meter: {bill.reading_previous} → {bill.reading_current}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Payment History View */}
      {activeView === 'payments' && (
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-slate-100">
              <Clock size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">{t('gas_noPayments') || 'No payment records found'}</p>
            </div>
          ) : (
            payments.map(payment => (
              <div key={payment.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${payment.payment_status === 'captured' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {payment.payment_status === 'captured' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest">{payment.receipt_number || payment.bill_number}</p>
                    <p className="font-black text-lg text-slate-900">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-slate-500 font-medium">
                      {payment.billing_month} {payment.billing_year} • {payment.payment_method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-500">
                    {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : '—'}
                  </p>
                  <button className="mt-2 flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition">
                    <Download size={14} /> Receipt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GasBills;
