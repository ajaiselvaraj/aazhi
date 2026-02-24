import React from 'react';
import { Language } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface Props {
    data: {
        serviceNo: string;
        consumerName: string;
        billAmount: string;
        billMonth: string;
        receiptNo: string;
        dateTime: string;
        debitAmount: string;
        bankRef: string;
        authId: string;
        paymentMode: string;
    } | null;
    language?: Language;
}

const OfficialReceipt: React.FC<Props> = ({ data, language = Language.ENGLISH }) => {
    if (!data) return null;
    const { t } = useLanguage();

    return (
        <div className="hidden print:block w-[100%] max-w-[210mm] mx-auto bg-white text-black p-8 font-mono text-sm leading-relaxed">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="font-bold text-lg mb-1 tracking-wide">{t('receiptHeader') || "Tamil Nadu Generation and Distribution Corporation Limited"}</h1>
                <p className="font-bold uppercase tracking-wider text-base border-b border-black inline-block pb-1">{t('eReceipt') || "E-Receipt"}</p>
            </div>

            {/* Main Table */}
            <div className="border-t border-b border-black py-6 my-6">
                <table className="w-full text-left">
                    <tbody>
                        {/* Row 1 */}
                        <tr>
                            <td className="py-2 w-[25%] font-medium">{t('consumerNo') || "Service No"}</td>
                            <td className="py-2 w-[5%]">:</td>
                            <td className="py-2 w-[20%] font-bold">{data.serviceNo}</td>

                            <td className="py-2 w-[20%] font-medium pl-8">{t('consumerName') || "Name"}</td>
                            <td className="py-2 w-[5%]">:</td>
                            <td className="py-2 w-[25%] font-bold">{data.consumerName}</td>
                        </tr>

                        {/* Row 2 */}
                        <tr>
                            <td className="py-2 font-medium">{t('billAmount') || "Bill Amount"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold">{data.billAmount}</td>

                            <td className="py-2 font-medium pl-8">{t('billMonthYear') || "Bill Month / Year"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold">{data.billMonth}</td>
                        </tr>

                        {/* Row 3 - Single Col for Receipt Details to ensure spacing */}
                        <tr>
                            <td colSpan={6} className="h-4"></td>
                        </tr>

                        <tr>
                            <td className="py-2 font-medium">{t('receiptNo') || "Receipt No"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold" colSpan={4}>{data.receiptNo}</td>
                        </tr>
                        <tr>
                            <td className="py-2 font-medium">{t('receiptDate') || "Receipt Date"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold" colSpan={4}>{data.dateTime}</td>
                        </tr>
                        <tr>
                            <td className="py-2 font-medium">{t('amountDebited') || "Amount Debited"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold" colSpan={4}>{data.debitAmount}</td>
                        </tr>
                        <tr>
                            <td className="py-2 font-medium">{t('bankTxnNo') || "Bank Transaction No"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold" colSpan={4}>{data.bankRef}</td>
                        </tr>
                        <tr>
                            <td className="py-2 font-medium">{t('bankAuthId') || "BBPS / Bank Ref No"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold" colSpan={4}>{data.authId || "-"}</td>
                        </tr>
                        <tr>
                            <td className="py-2 font-medium">{t('paymentMode') || "Card Type"}</td>
                            <td className="py-2">:</td>
                            <td className="py-2 font-bold" colSpan={4}>{data.paymentMode || "-"}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer / Disclaimer */}
            <div className="text-sm mt-8">
                <p className="font-medium">
                    {t('receiptDisclaimer') || "Receipt issued subject to confirmation of online payment credit in TANGEDCO’s bank account."}
                </p>
            </div>

            <div className="mt-12 text-center text-xs opacity-50">
                <p>{t('compGenReceipt') || "This is a computer generated receipt."}</p>
            </div>
        </div>
    );
};

export default OfficialReceipt;
