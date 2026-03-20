import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Landmark, FileText } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { ServiceRequest } from '../../types';

interface Props {
    data: ServiceRequest | null;
    onClose: () => void;
}

const HistoryReceipt: React.FC<Props> = ({ data, onClose }) => {
    if (!data) return null;
    const { t } = useTranslation();

    const handlePrint = () => {
        window.print();
    };

    // Determine header based on service type
    const getHeader = () => {
        const dept = (data.category || data.department || "").toLowerCase();
        if (dept.includes("electricity") || dept.includes("electric") || dept.includes("eb")) {
            return {
                title: t('receiptHeader') || "TAMIL NADU GENERATION AND DISTRIBUTION CORPORATION LIMITED",
                color: "text-amber-600",
                icon: <Landmark className="text-amber-600" size={24} />
            };
        } else if (dept.includes("water") || dept.includes("metro")) {
            return {
                title: "METRO WATER SUPPLY AND SEWERAGE BOARD",
                color: "text-blue-600",
                icon: <Landmark className="text-blue-600" size={24} />
            };
        } else if (dept.includes("gas") || dept.includes("png")) {
            return {
                title: "MUNICIPAL GAS DISTRIBUTION UTILITY",
                color: "text-orange-600",
                icon: <Landmark className="text-orange-600" size={24} />
            };
        } else {
            return {
                title: t('receiptHeader') || "COIMBATORE MUNICIPAL CORPORATION",
                color: "text-purple-600",
                icon: <Landmark className="text-purple-600" size={24} />
            };
        }
    };

    const header = getHeader();
    const serviceName = t(data.serviceType || data.type || "Service Request") || data.serviceType || data.type || "Service Request";
    const statusName = t(data.status || 'Pending') || data.status || 'Pending';
    const dateStr = data.createdAt || data.timestamp || new Date().toLocaleString();

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
                                <h3 className="font-black text-slate-900 leading-tight">Document Preview</h3>
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
                        <div className="bg-white shadow-xl w-full max-w-[400px] p-8 font-mono text-sm text-slate-800 relative receipt-paper min-h-[600px]">
                            {/* Decorative Top Edge */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_50%_100%,transparent_4px,#f1f5f9_4px)] bg-[length:12px_12px] bg-repeat-x rotate-180"></div>

                            {/* Official Header */}
                            <div className="text-center mb-6">
                                <p className="text-[10px] font-bold border-b border-dashed border-slate-300 pb-2 mb-4 uppercase tracking-tighter">----------------------------------------------------</p>
                                <h4 className="font-black uppercase text-center leading-snug mb-2">{header.title}</h4>
                                <p className="text-[10px] font-bold border-t border-dashed border-slate-300 pt-2 mb-2 uppercase tracking-tighter">----------------------------------------------------</p>
                                <h5 className="font-bold border border-slate-900 inline-block px-4 py-1 my-2">SERVICE / COMPLAINT TICKET</h5>
                                <p className="text-[10px] font-bold border-b border-dashed border-slate-300 pb-2 mb-4 uppercase tracking-tighter">----------------------------------------------------</p>
                            </div>

                            {/* Details */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold">Ticket No:</span>
                                    <span className="text-right font-black break-all text-xs">{data.id}</span>
                                </div>
                                <div className="flex justify-between items-start gap-4">
                                    <span className="shrink-0 uppercase font-bold">Name:</span>
                                    <span className="text-right font-black uppercase text-xs">{data.name || data.citizenName || 'Resident'}</span>
                                </div>
                                {data.phone && (
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="shrink-0 uppercase font-bold">Contact:</span>
                                        <span className="text-right font-bold text-xs">{data.phone}</span>
                                    </div>
                                )}

                                <div className="py-4 border-y border-dashed border-slate-200 mt-4">
                                    <div className="mb-2">
                                        <span className="uppercase font-bold text-xs block mb-1">Service Type:</span>
                                        <span className="font-black text-sm uppercase">{serviceName}</span>
                                    </div>
                                    <div className="mb-2 mt-4">
                                        <span className="uppercase font-bold text-xs block mb-1">Description:</span>
                                        <span className="font-semibold text-xs leading-relaxed">{data.description || data.details || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 border-t border-slate-100 pt-3">
                                        <span className="uppercase font-bold text-xs">Current Status:</span>
                                        <span className="font-black text-xs uppercase bg-slate-100 px-2 py-1">{statusName}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <span className="shrink-0 uppercase text-xs">Date:</span>
                                        <span className="text-right font-bold text-[10px]">{dateStr}</span>
                                    </div>
                                </div>

                                <div className="flex justify-center py-6">
                                    <div className="p-2 border border-slate-100 rounded-lg">
                                        <QRCode value={data.id as string} size={80} />
                                    </div>
                                </div>

                                <div className="text-center text-[9px] leading-tight text-slate-500 italic px-4">
                                    <p className="mb-2">----------------------------------------------------</p>
                                    <p>Scan the QR code to track your application status online or at any Suvidha Digital Kiosk.</p>
                                    <p className="mt-1">Computer Generated Document - No signature required.</p>
                                    <p className="mt-4 font-bold border-t border-dashed border-slate-300 pt-2 tracking-widest uppercase">Thank You for using Suvidha Kiosk</p>
                                </div>
                            </div>

                            {/* Decorative Bottom Edge */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_50%_0%,transparent_4px,#f1f5f9_4px)] bg-[length:12px_12px] bg-repeat-x"></div>
                        </div>
                    </div>

                    {/* Modal Footer / Actions */}
                    <div className="p-8 border-t bg-white flex gap-4">
                        <button 
                            onClick={handlePrint}
                            className="flex-1 bg-blue-600 text-white p-6 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition flex items-center justify-center gap-3 shadow-xl shadow-blue-100"
                        >
                            <Download size={20} /> Convert to PDF
                        </button>
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
                    <p className="font-bold my-2 py-1 border border-black inline-block px-4">TICKET ACKNOWLEDGEMENT</p>
                    <p>-----------------------------------</p>
                </div>
                <div className="space-y-1 my-4">
                    <div className="flex flex-col items-center gap-1 mb-3">
                        <span className="font-bold">TICKET NO:</span>
                        <span className="font-black uppercase text-[11px]">{data.id}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 border-t border-dashed pt-2">
                        <span>NAME:</span>
                        <span className="font-bold uppercase text-right">{data.name || data.citizenName || 'RESIDENT'}</span>
                    </div>
                    {data.phone && (
                        <div className="flex justify-between items-start gap-2">
                            <span>CONTACT:</span>
                            <span className="font-bold uppercase text-right">{data.phone}</span>
                        </div>
                    )}
                    <div className="flex flex-col gap-1 border-t border-dashed pt-2 mt-2">
                        <span className="font-bold">SERVICE TYPE:</span>
                        <span className="uppercase">{serviceName}</span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-dashed pt-2 mt-2 pb-2">
                        <span className="font-bold">DESCRIPTION:</span>
                        <span className="text-[9px] uppercase">{data.description || data.details || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-y border-dashed py-2 mb-2 font-bold">
                        <span>STATUS:</span>
                        <span className="uppercase border border-black px-1">{statusName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>DATE:</span>
                        <span className="text-[10px] font-bold">{dateStr.substring(0,25)}</span>
                    </div>
                </div>
                <div className="flex justify-center my-4">
                    <QRCode value={data.id as string} size={100} />
                </div>
                <div className="text-center text-[8px] leading-tight mt-6">
                    <p>-----------------------------------</p>
                    <p>Track your application status online or at any Suvidha Kiosk.</p>
                    <p className="mt-2 font-bold uppercase">Suvidha Digital Platform</p>
                    <p>-----------------------------------</p>
                </div>
            </div>
        </div>
    );

    return createPortal(ReceiptUI, document.body);
};

export default HistoryReceipt;
