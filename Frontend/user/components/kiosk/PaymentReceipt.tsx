import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Landmark, Smartphone, Mail } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import html2pdf from 'html2pdf.js';

interface Props {
    data: {
        serviceName: string;
        serviceId?: string; // 'elec', 'water', 'gas'
        consumerId: string;
        consumerName?: string;
        amount: string;
        txnId: string;
        date: string;
        mode: string;
    } | null;
    onClose: () => void;
    isBackground?: boolean;
}

const PaymentReceipt: React.FC<Props> = ({ data, onClose, isBackground = false }) => {
    if (!data) return null;
    const { t } = useTranslation();

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const element = document.getElementById("receipt-container");
        if (element) {
            html2pdf().from(element).save(`receipt_${data.txnId}.pdf`);
        }
    };

    const [shareStatus, setShareStatus] = useState<string | null>(null);

    const handleShare = (type: 'sms' | 'email') => {
        setShareStatus(`Sending via ${type.toUpperCase()}...`);
        setTimeout(() => {
            setShareStatus(t('receiptSentSuccess', { type: type.toUpperCase() }) || `Receipt sent via ${type.toUpperCase()} successfully!`);
            setTimeout(() => setShareStatus(null), 3500);
        }, 1500);
    };

    // Determine header based on service type
    const getHeader = () => {
        switch (data.serviceId) {
            case 'elec':
                return {
                    title: t('receiptHeader') || "TAMIL NADU GENERATION AND DISTRIBUTION CORPORATION LIMITED",
                    color: "text-amber-600",
                    icon: <Landmark className="text-amber-600" size={24} />
                };
            case 'water':
                return {
                    title: "METRO WATER SUPPLY AND SEWERAGE BOARD",
                    color: "text-blue-600",
                    icon: <Landmark className="text-blue-600" size={24} />
                };
            case 'gas':
                return {
                    title: "MUNICIPAL GAS DISTRIBUTION UTILITY",
                    color: "text-orange-600",
                    icon: <Landmark className="text-orange-600" size={24} />
                };
            default:
                return {
                    title: t('receiptHeader') || "UTILITY PAYMENT RECEIPT",
                    color: "text-slate-600",
                    icon: <Landmark className="text-slate-600" size={24} />
                };
        }
    };

    const header = getHeader();

    const ReceiptContent = (
        <div id="receipt-container" className="bg-white shadow-xl w-full max-w-[400px] p-8 font-mono text-sm text-slate-800 relative receipt-paper min-h-[600px]">
            {/* Decorative Top Edge */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_50%_100%,transparent_4px,#f1f5f9_4px)] bg-[length:12px_12px] bg-repeat-x rotate-180"></div>

            {/* Official Header */}
                            <div className="text-center mb-8">
                                <p className="text-[10px] font-bold border-b border-dashed border-slate-300 pb-2 mb-4 uppercase tracking-tighter">----------------------------------------------------</p>
                                <h4 className="font-black uppercase text-center leading-snug mb-2">{header.title}</h4>
                                <p className="text-[10px] font-bold border-t border-dashed border-slate-300 pt-2 mb-2 uppercase tracking-tighter">----------------------------------------------------</p>
                                <h5 className="font-bold border border-slate-900 inline-block px-4 py-1 my-2">E-RECEIPT</h5>
                                <p className="text-[10px] font-bold border-b border-dashed border-slate-300 pb-2 mb-4 uppercase tracking-tighter">----------------------------------------------------</p>
                            </div>

                            {/* Details */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold">Service No:</span>
                                    <span className="text-right font-black">{data.consumerId}</span>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold">Name:</span>
                                    <span className="text-right font-black uppercase">{data.consumerName || 'Resident'}</span>
                                </div>

                                <div className="py-4 border-y border-dashed border-slate-200 mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="uppercase font-bold">Bill Amount:</span>
                                        <span className="font-black text-lg">₹{data.amount.replace(/[^0-9.]/g, '')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="uppercase font-bold text-xs">Period:</span>
                                        <span className="font-bold">
                                            {(() => {
                                                try {
                                                    const d = new Date(data.date);
                                                    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                                } catch (e) {
                                                    return 'CURRENT';
                                                }
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="shrink-0 uppercase text-xs">Receipt No:</span>
                                        <span className="text-right font-bold text-xs">{data.txnId}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="shrink-0 uppercase text-xs">Date:</span>
                                        <span className="text-right font-bold text-xs">{data.date}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="shrink-0 uppercase text-xs">Mode:</span>
                                        <span className="text-right font-bold text-xs">{data.mode}</span>
                                    </div>
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="shrink-0 uppercase text-xs">Payment Status:</span>
                                        <span className="text-right font-bold text-xs text-green-600">SUCCESS</span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t-2 border-slate-900 border-double">
                                    <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200">
                                        <span className="uppercase font-black text-xs">Amount Paid:</span>
                                        <span className="font-black text-xl">₹{data.amount.replace(/[^0-9.]/g, '')}</span>
                                    </div>
                                </div>

                                <div className="flex justify-center py-6">
                                    <div className="p-2 border border-slate-100 rounded-lg">
                                        <QRCode value={data.txnId} size={80} />
                                    </div>
                                </div>

                                <div className="text-center text-[9px] leading-tight text-slate-500 italic px-4">
                                    <p className="mb-2">----------------------------------------------------</p>
                                    <p>{t('receiptDisclaimer') || "Receipt issued subject to confirmation of online payment credit in department's bank account."}</p>
                                    <p className="mt-1">Computer Generated Receipt - No signature required.</p>
                                    <p className="mt-4 font-bold border-t border-dashed border-slate-300 pt-2 tracking-widest uppercase">Thank You for using Suvidha Kiosk</p>
                                </div>
                            </div>

                            {/* Decorative Bottom Edge */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_50%_0%,transparent_4px,#f1f5f9_4px)] bg-[length:12px_12px] bg-repeat-x"></div>
        </div>
    );

    if (isBackground) {
        return (
            <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none" aria-hidden="true" style={{ width: '400px' }}>
                {ReceiptContent}
            </div>
        );
    }

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
                                <h3 className="font-black text-slate-900 leading-tight">Receipt Preview</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.serviceName}</p>
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
                        {ReceiptContent}
                    </div>

                    {/* Modal Footer / Actions */}
                    <div className="p-6 border-t bg-white flex flex-col gap-4">
                        {shareStatus && (
                            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-center font-bold text-sm flex items-center justify-center gap-2 animate-in slide-in-from-top-2 fade-in">
                                <CheckCircle2 size={16} /> {shareStatus}
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button 
                                onClick={handlePrint}
                                className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition flex flex-col items-center justify-center gap-2 shadow-xl shadow-blue-100"
                            >
                                <Printer size={24} /> Print
                            </button>
                            <button 
                                onClick={handleDownload}
                                className="flex-1 bg-green-600 text-white p-4 rounded-2xl font-black uppercase text-sm hover:bg-green-700 transition flex flex-col items-center justify-center gap-2 shadow-xl shadow-green-100"
                            >
                                <Download size={24} /> Download
                            </button>
                            <div className="flex-1 flex flex-col gap-2">
                                <button 
                                    onClick={() => handleShare('sms')}
                                    className="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold uppercase text-xs hover:bg-indigo-600 hover:text-white transition flex items-center justify-center gap-2"
                                >
                                    <Smartphone size={16} /> SMS
                                </button>
                                <button 
                                    onClick={() => handleShare('email')}
                                    className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold uppercase text-xs hover:bg-purple-600 hover:text-white transition flex items-center justify-center gap-2"
                                >
                                    <Mail size={16} /> Email
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-black uppercase text-sm hover:bg-slate-200 transition"
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
                            
                            /* Hide EVERYTHING except the portal */
                            body > *:not(.payment-receipt-portal) {
                                display: none !important;
                            }
                            
                            /* Ensure the body is prepared for printing */
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
                    <p className="font-bold my-2">E-RECEIPT</p>
                    <p>-----------------------------------</p>
                </div>
                <div className="space-y-1 my-4">
                    <div className="flex justify-between items-start gap-2"><span>SERVICE NO:</span><span className="font-bold text-right">{data.consumerId}</span></div>
                    <div className="flex justify-between items-start gap-2"><span>NAME:</span><span className="font-bold uppercase text-right">{data.consumerName || 'RESIDENT'}</span></div>
                    <div className="flex justify-between font-bold pt-2 border-t border-dashed"><span>AMOUNT:</span><span>₹{data.amount.replace(/[^0-9.]/g, '')}</span></div>
                    <div className="flex justify-between"><span>DATE:</span><span>{data.date.split(',')[0]}</span></div>
                    <div className="flex justify-between"><span>TXN ID:</span><span className="text-[8px] font-bold">{data.txnId}</span></div>
                    <div className="flex justify-between"><span>MODE:</span><span>{data.mode}</span></div>
                </div>
                <div className="flex justify-center my-4">
                    <QRCode value={data.txnId} size={100} />
                </div>
                <div className="text-center text-[8px] leading-tight mt-6">
                    <p>-----------------------------------</p>
                    <p>{t('receiptDisclaimer') || "Receipt issued subject to confirmation of online payment credit in department's bank account."}</p>
                    <p className="mt-2 font-bold uppercase">Suvidha Digital Kiosk</p>
                    <p>-----------------------------------</p>
                </div>
            </div>
        </div>
    );

    return createPortal(ReceiptUI, document.body);
};

export default PaymentReceipt;
