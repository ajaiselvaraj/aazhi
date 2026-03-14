import React from 'react';
import QRCode from 'react-qr-code';
import { APP_CONFIG } from '../../constants';

interface Props {
    data: {
        serviceName: string;
        consumerId: string;
        consumerName?: string;
        amount: string;
        txnId: string;
        date: string;
        mode: string;
    } | null;
}

const PaymentReceipt: React.FC<Props> = ({ data }) => {
    if (!data) return null;

    // Helper to format date like "Sat, 27 June 2020 15:17"
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', '');
    };

    // Extract Month/Year from date or use current
    const dateObj = new Date(data.date);
    const billMonthYear = `${String(dateObj.getMonth() + 1).padStart(2, '0')} / ${dateObj.getFullYear()}`;

    return (
        <div className="hidden print:block print:w-full print:h-full bg-white text-black font-mono text-sm p-4">
            <style>
                {`
                    @media print {
                        @page { margin: 0; }
                        body { margin: 1cm; }
                    }
                `}
            </style>

            <div className="max-w-[80mm] mx-auto">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="border-b border-dashed border-black pb-1 mb-1">
                        ------------------------------------------------------------
                    </div>
                    <h1 className="font-bold text-sm">Tamil Nadu Generation and Distribution Corporation Limited</h1>
                    <div className="border-b border-dashed border-black pt-1 mb-1">
                        ------------------------------------------------------------
                    </div>
                    <h2 className="font-bold text-sm my-1">E-Receipt</h2>
                    <div className="border-b border-dashed border-black mb-4">
                        ------------------------------------------------------------
                    </div>
                </div>

                {/* Consumer Details */}
                <div className="space-y-4 mb-4">
                    <div className="flex justify-between">
                        <span>Service No        : {data.consumerId}</span>
                        <span>Name : {data.consumerName || 'K GANESAN'}</span>
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between">
                            <span>Bill Amount       :</span>
                            <span>{data.amount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Bill Month / Year :</span>
                            <span>{billMonthYear}</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between">
                            <span>Receipt No        :</span>
                            <span>{data.txnId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Receipt Date      :</span>
                            <span>{data.date}</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between">
                            <span>Amount Debited    :</span>
                            <span>{data.amount}</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex justify-between">
                            <span>Bank Transaction No :</span>
                            <span>{data.txnId.replace(/\D/g, '').slice(0, 10)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Bank Authorisation Id :</span>
                            <span>-</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Card Type            :</span>
                            <span>-</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <div className="border-t border-dashed border-black py-2">
                        ------------------------------------------------------------
                    </div>
                    <p className="text-xs">
                        Receipt issued subject to confirmation of online payment
                        credit in TANGEDCO’s bank account.
                    </p>
                    <div className="border-b border-dashed border-black py-2">
                        ------------------------------------------------------------
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentReceipt;
