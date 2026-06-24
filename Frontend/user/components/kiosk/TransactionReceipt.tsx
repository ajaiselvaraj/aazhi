import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Landmark, FileText, AlertTriangle, AlertOctagon } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import html2pdf from 'html2pdf.js';

interface TransactionDetails {
    id: string;
    bill_id?: string;
    amount: number;
    payment_status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'cancelled';
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    receipt_number?: string;
    failure_reason?: string;
    created_at?: string;
    paid_at?: string;
    payment_method?: string;
    bill_number?: string;
    service_type?: string;
    billing_month?: string;
    billing_year?: string;
    account_number?: string;
    consumer_name?: string;
    user_details?: {
        name?: string;
        mobile?: string;
        email?: string;
    };
}

interface Props {
    data: TransactionDetails | null;
    onClose: () => void;
}

const TransactionReceipt: React.FC<Props> = ({ data, onClose }) => {
    if (!data) return null;
    const { t } = useTranslation();

    const handleDownload = () => {
        const element = document.getElementById("transaction-receipt-container");
        if (element) {
            html2pdf().from(element).save(`receipt_${data.receipt_number || data.id}.pdf`);
        }
    };

    // Determine header based on service type
    const getHeader = () => {
        const type = (data.service_type || "").toLowerCase();
        if (type.includes("electricity") || type.includes("electric") || type.includes("eb")) {
            return {
                title: t('receiptHeader') || "TAMIL NADU GENERATION AND DISTRIBUTION CORPORATION LIMITED",
                color: "text-amber-600",
                bg: "bg-amber-50",
                icon: <Landmark className="text-amber-600" size={24} />
            };
        } else if (type.includes("water") || type.includes("metro")) {
            return {
                title: "METRO WATER SUPPLY AND SEWERAGE BOARD",
                color: "text-blue-600",
                bg: "bg-blue-50",
                icon: <Landmark className="text-blue-600" size={24} />
            };
        } else if (type.includes("gas") || type.includes("png")) {
            return {
                title: "MUNICIPAL GAS DISTRIBUTION UTILITY",
                color: "text-orange-600",
                bg: "bg-orange-50",
                icon: <Landmark className="text-orange-600" size={24} />
            };
        } else {
            return {
                title: t('receiptHeader') || "COIMBATORE MUNICIPAL CORPORATION",
                color: "text-purple-600",
                bg: "bg-purple-50",
                icon: <Landmark className="text-purple-600" size={24} />
            };
        }
    };

    const header = getHeader();
    const serviceName = data.service_type ? (data.service_type.charAt(0).toUpperCase() + data.service_type.slice(1) + " Bill") : "Utility Payment";
    
    // Status color configurations
    const getStatusConfig = () => {
        const status = data.payment_status;
        if (status === 'captured') {
            return { label: 'SUCCESS', color: 'text-emerald-600 border-emerald-200 bg-emerald-50', icon: <CheckCircle2 className="text-emerald-600" size={16} /> };
        } else if (status === 'failed') {
            return { label: 'FAILED', color: 'text-red-600 border-red-200 bg-red-50', icon: <AlertOctagon className="text-red-600" size={16} /> };
        } else if (status === 'cancelled') {
            return { label: 'CANCELLED', color: 'text-slate-600 border-slate-200 bg-slate-50', icon: <X className="text-slate-600" size={16} /> };
        } else {
            return { label: 'PENDING', color: 'text-amber-600 border-amber-200 bg-amber-50', icon: <ClockIcon className="text-amber-600" size={16} /> };
        }
    };

    const ClockIcon = ({ className, size }: { className?: string, size?: number }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    );

    const statusConfig = getStatusConfig();
    
    const formatTimestamp = (val: any) => {
        if (!val) return 'N/A';
        const raw = String(val);
        const normalised = raw.includes('T') ? raw : raw.replace(' ', 'T');
        const utcStr = /[+\-Z]/.test(normalised.slice(10)) ? normalised : normalised + 'Z';
        const d = new Date(utcStr);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const dateStr = formatTimestamp(data.paid_at || data.created_at);

    // Get display name/user details
    const userName = data.consumer_name || data.user_details?.name || 'Guest User';
    const userMobile = data.user_details?.mobile || 'N/A';

    const ReceiptUI = (
        <div className="payment-receipt-portal">
            {/* Modal Backdrop & Preview UI */}
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 print:hidden">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                    
                    {/* Modal Header */}
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-white shadow-sm ${header.color}`}>
                                {header.icon}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 leading-tight">{t('receipt') || 'Payment Receipt'}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{serviceName}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 bg-white hover:bg-red-50 hover:text-red-500 rounded-2xl transition-colors border shadow-sm"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Receipt Body - Thermal Paper Style */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-100/50 flex justify-center">
                        <div id="transaction-receipt-container" className="bg-white shadow-xl w-full max-w-[400px] p-8 font-mono text-sm text-slate-800 relative receipt-paper min-h-[600px] select-text">
                            {/* Decorative Top Edge */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_50%_100%,transparent_4px,#f1f5f9_4px)] bg-[length:12px_12px] bg-repeat-x rotate-180"></div>

                            {/* Official Header */}
                            <div className="text-center mb-6">
                                <p className="text-[10px] font-bold border-b border-dashed border-slate-300 pb-2 mb-4 uppercase tracking-tighter">----------------------------------------------------</p>
                                <h4 className="font-black uppercase text-center leading-snug mb-2">{header.title}</h4>
                                <p className="text-[10px] font-bold border-t border-dashed border-slate-300 pt-2 mb-2 uppercase tracking-tighter">----------------------------------------------------</p>
                                <h5 className="font-bold border border-slate-900 inline-block px-4 py-1 my-2">{t('receipt')?.toUpperCase() || 'PAYMENT RECEIPT'}</h5>
                                <p className="text-[10px] font-bold border-b border-dashed border-slate-300 pb-2 mb-4 uppercase tracking-tighter">----------------------------------------------------</p>
                            </div>

                            {/* Details */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold text-xs">Receipt No:</span>
                                    <span className="text-right font-black break-all text-xs">{data.receipt_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold text-xs">Txn ID:</span>
                                    <span className="text-right font-bold break-all text-[11px]">{data.id}</span>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold text-xs">Payee Name:</span>
                                    <span className="text-right font-black uppercase text-xs">{userName}</span>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold text-xs">Contact:</span>
                                    <span className="text-right font-bold text-xs">{userMobile}</span>
                                </div>

                                <div className="py-4 border-y border-dashed border-slate-200 mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="uppercase font-bold text-xs">Service Type:</span>
                                        <span className="font-black text-xs uppercase">{serviceName}</span>
                                    </div>
                                    {data.account_number && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="uppercase font-bold text-xs">Consumer ID:</span>
                                            <span className="font-black text-xs font-mono">{data.account_number}</span>
                                        </div>
                                    )}
                                    {data.bill_number && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="uppercase font-bold text-xs">Bill No:</span>
                                            <span className="font-black text-xs font-mono">{data.bill_number}</span>
                                        </div>
                                    )}
                                    {data.billing_month && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="uppercase font-bold text-xs">Billing Period:</span>
                                            <span className="font-bold text-xs uppercase">{data.billing_month} {data.billing_year}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mt-4 border-t border-slate-100 pt-3">
                                        <span className="uppercase font-bold text-xs">Status:</span>
                                        <span className={`font-black text-xs uppercase border px-2 py-0.5 rounded ${statusConfig.color}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>
                                    {data.failure_reason && (
                                        <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-xs leading-relaxed">
                                            <span className="font-bold uppercase block mb-1">Reason:</span>
                                            {data.failure_reason}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="uppercase font-bold text-sm">Amount Paid:</span>
                                        <span className="text-right font-black text-lg">₹{Number(data.amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span>Payment Mode:</span>
                                        <span className="font-bold uppercase">{data.payment_method || 'Razorpay'}</span>
                                    </div>
                                    {data.razorpay_payment_id && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span>Gateway ID:</span>
                                            <span className="font-bold text-[10px] break-all">{data.razorpay_payment_id}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start gap-4 text-xs pt-1">
                                        <span className="shrink-0">Date & Time:</span>
                                        <span className="text-right font-semibold text-[10px]">{dateStr}</span>
                                    </div>
                                </div>

                                <div className="flex justify-center py-6">
                                    <div className="p-2 border border-slate-100 rounded-lg">
                                        <QRCode value={data.id} size={80} />
                                    </div>
                                </div>

                                <div className="text-center text-[9px] leading-tight text-slate-500 italic px-4">
                                    <p className="mb-2">----------------------------------------------------</p>
                                    <p>Scan this QR code to verify the authenticity of this digital transaction receipt.</p>
                                    <p className="mt-1">Computer Generated Receipt - No signature required.</p>
                                    <p className="mt-4 font-bold border-t border-dashed border-slate-300 pt-2 tracking-widest uppercase text-slate-800">Thank You for using Suvidha Kiosk</p>
                                </div>
                            </div>

                            {/* Decorative Bottom Edge */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_50%_0%,transparent_4px,#f1f5f9_4px)] bg-[length:12px_12px] bg-repeat-x"></div>
                        </div>
                    </div>

                    {/* Modal Footer / Actions */}
                    <div className="p-8 border-t bg-white flex gap-4 print:hidden">
                        {data.payment_status === 'captured' && (
                            <button 
                                onClick={handleDownload}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-6 rounded-2xl font-black uppercase text-sm transition flex items-center justify-center gap-3 shadow-xl shadow-emerald-100"
                            >
                                <Download size={20} /> Download PDF
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className="flex-1 bg-slate-100 text-slate-600 p-6 rounded-2xl font-black uppercase text-sm hover:bg-slate-200 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden Print-only Version (Optimized for Printer) */}
            <div className="print-actual-receipt hidden print:block bg-white text-black font-mono text-[10px] w-[80mm] p-4 mx-auto leading-tight">
                <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                            @page { 
                                margin: 0; 
                                size: 80mm auto; 
                            }
                            body > *:not(.payment-receipt-portal) {
                                display: none !important;
                            }
                            body {
                                background: white !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                overflow: visible !important;
                                height: auto !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                            .payment-receipt-portal {
                                display: block !important;
                                position: static !important;
                            }
                        }
                `}} />
                <div className="text-center">
                    <p>-----------------------------------</p>
                    <h1 className="font-bold text-[12px] uppercase text-center leading-tight">{header.title}</h1>
                    <p>-----------------------------------</p>
                    <p className="font-bold my-2 py-1 border border-black inline-block px-4">PAYMENT RECEIPT</p>
                    <p>-----------------------------------</p>
                </div>
                <div className="space-y-1 my-4">
                    <div className="flex justify-between">
                        <span>RECEIPT NO:</span>
                        <span className="font-black uppercase text-[10px]">{data.receipt_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>TXN ID:</span>
                        <span className="font-bold text-[9px]">{data.id}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed pt-2">
                        <span>PAYEE NAME:</span>
                        <span className="font-bold uppercase text-right">{userName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SERVICE:</span>
                        <span className="uppercase text-right">{serviceName}</span>
                    </div>
                    {data.account_number && (
                        <div className="flex justify-between">
                            <span>CONSUMER ID:</span>
                            <span className="font-bold font-mono text-right">{data.account_number}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-y border-dashed py-2 mb-2 font-bold">
                        <span>STATUS:</span>
                        <span className="uppercase border border-black px-1">{statusConfig.label}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[11px]">
                        <span>AMOUNT:</span>
                        <span>₹{Number(data.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>MODE:</span>
                        <span className="uppercase">{data.payment_method || 'Razorpay'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>DATE:</span>
                        <span className="text-[9px] font-bold">{dateStr.substring(0,25)}</span>
                    </div>
                </div>
                <div className="flex justify-center my-4">
                    <QRCode value={data.id} size={100} />
                </div>
                <div className="text-center text-[8px] leading-tight mt-6">
                    <p>-----------------------------------</p>
                    <p>Track or verify this receipt online or at any Suvidha Kiosk.</p>
                    <p className="mt-2 font-bold uppercase">Suvidha Digital Platform</p>
                    <p>-----------------------------------</p>
                </div>
            </div>
        </div>
    );

    return createPortal(ReceiptUI, document.body);
};

export default TransactionReceipt;
