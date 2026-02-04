import React from 'react';
import QRCode from 'react-qr-code';
import { APP_CONFIG } from '../../constants';

interface Props {
    data: {
        serviceName: string;
        consumerId: string;
        amount: string;
        txnId: string;
        date: string;
        mode: string;
    } | null;
}

const PaymentReceipt: React.FC<Props> = ({ data }) => {
    if (!data) return null;

    return (
        <div className="hidden print:flex flex-col items-center p-8 bg-white text-black w-full max-w-[80mm] mx-auto font-mono text-sm">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4 w-full">
                <h1 className="font-bold text-xl uppercase tracking-wider">{APP_CONFIG.TITLE}</h1>
                <p className="text-xs mt-1">Smart City Digital Services</p>
                <p className="text-xs">Coimbatore Municipal Corporation</p>
            </div>

            {/* Transaction Details */}
            <div className="w-full space-y-2 mb-6">
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="font-bold">{data.date}</span>
                </div>
                <div className="flex justify-between">
                    <span>Receipt No:</span>
                    <span className="font-bold">{data.txnId}</span>
                </div>
                <div className="flex justify-between">
                    <span>Service:</span>
                    <span className="font-bold">{data.serviceName}</span>
                </div>
                <div className="flex justify-between">
                    <span>Consumer ID:</span>
                    <span className="font-bold">{data.consumerId}</span>
                </div>
                <div className="flex justify-between">
                    <span>Payment Mode:</span>
                    <span>{data.mode}</span>
                </div>
            </div>

            {/* Amount */}
            <div className="w-full border-y-2 border-black py-4 mb-6 text-center">
                <p className="uppercase text-xs font-bold mb-1">Total Paid</p>
                <h2 className="text-3xl font-black">{data.amount}</h2>
                <p className="text-xs uppercase mt-1">(Success)</p>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center mb-6">
                <QRCode
                    value={`https://suvidha.gov.in/verify/${data.txnId}`}
                    size={100}
                />
                <p className="text-[10px] uppercase mt-2 text-center">Scan to Verify Receipt</p>
            </div>

            {/* Footer */}
            <div className="text-center border-t border-dashed border-black pt-4 w-full text-[10px]">
                <p>Thank you for using SUVIDHA Kiosk</p>
                <p>For support: 1800-123-4567</p>
                <p className="mt-2 text-[8px]">Computer Generated Receipt</p>
            </div>
        </div>
    );
};

export default PaymentReceipt;
