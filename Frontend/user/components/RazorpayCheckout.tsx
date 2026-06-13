import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CreditCard, Loader2, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import apiClient from '../services/api/apiClient';

interface RazorpayCheckoutProps {
    amount: number;
    name?: string;
    description?: string;
    onSuccess: (paymentId: string) => void;
    onFailure?: (error: any) => void;
    onCancel?: () => void;
    isGuest?: boolean; // If true, uses the /api/payment/guest-order endpoint
    billId?: string; // Associated bill ID
    buttonClassName?: string;
    customButtonText?: string;
}

// Ensure Razorpay interface is available
declare global {
    interface Window {
        Razorpay: any;
    }
}

const loadScript = (src: string) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return ReactDOM.createPortal(
        <>
            <style>{`
                @keyframes toast-slide-in {
                    0% { transform: translate(-50%, 100%); opacity: 0; }
                    100% { transform: translate(-50%, 0); opacity: 1; }
                }
                .custom-toast {
                    animation: toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl custom-toast max-w-md w-[90vw] bg-slate-950/95 border border-slate-800/90 backdrop-blur-md">
                <div className="flex items-center gap-3 w-full">
                    {type === 'success' && <CheckCircle2 className="shrink-0 text-emerald-400 animate-bounce" size={24} />}
                    {type === 'error' && <AlertTriangle className="shrink-0 text-red-400 animate-pulse" size={24} />}
                    {type === 'info' && <Info className="shrink-0 text-blue-400" size={24} />}
                    <p className="font-bold text-sm text-slate-100 flex-1 leading-snug">{message}</p>
                    <button 
                        onClick={onClose} 
                        className="p-1 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
    amount,
    name = 'Smart Urban Helpdesk',
    description = 'Bill Payment',
    onSuccess,
    onFailure,
    onCancel,
    isGuest,
    billId,
    buttonClassName,
    customButtonText,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'error') => {
        setToast({ message, type });
    };

    const handlePayment = async () => {
        setIsLoading(true);
        setToast(null);

        try {
            // 1. Load Razorpay Checkout.js
            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                showToast('Razorpay SDK failed to load. Are you online?', 'error');
                setIsLoading(false);
                if (onFailure) onFailure('Razorpay SDK failed to load');
                return;
            }

            // Detect guest mode dynamically if not explicitly passed
            const token = localStorage.getItem('aazhi_token');
            const actualIsGuest = isGuest ?? (!token || token === 'null' || token === 'undefined');

            // 2. Create Order on Backend
            const endpoint = actualIsGuest ? '/payment/guest-order' : '/payment/create-order';

            // Get logged-in user details if available for prefill
            const userStr = localStorage.getItem('aazhi_user');
            let userObj: any = null;
            try {
                if (userStr) {
                    userObj = JSON.parse(userStr);
                }
            } catch (e) {
                console.error('Error parsing user object from localStorage:', e);
            }

            const userDetails = {
                name: userObj?.name || 'Guest User',
                email: userObj?.email || 'guest@example.com',
                mobile: userObj?.mobile || '9999999999'
            };

            const orderResponse: any = await apiClient.post(endpoint, {
                amount: amount,
                bill_id: billId,
            });

            // Since apiClient resolves the inner data directly
            const { order_id, currency, key_id } = orderResponse;

            // 3. Configure Razorpay Options
            const options = {
                key: key_id || 'rzp_test_YourTestKeyH3rE',
                amount: Math.round(amount * 100),
                currency: currency || 'INR',
                name: name,
                description: description,
                order_id: order_id,
                handler: async function (response: any) {
                    try {
                        // 4. Verify Payment Signature
                        const verifyEndpoint = actualIsGuest ? '/payment/guest-verify' : '/payment/verify';
                        await apiClient.post(verifyEndpoint, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            user_details: userDetails
                        });

                        setIsLoading(false);
                        onSuccess(response.razorpay_payment_id);
                    } catch (err: any) {
                        console.error('Verification error:', err);
                        setIsLoading(false);
                        if (onFailure) onFailure(err.message || 'Payment verification failed');
                        showToast(err.message || 'Payment verification failed', 'error');
                    }
                },
                prefill: {
                    name: userDetails.name,
                    email: userDetails.email,
                    contact: userDetails.mobile
                },
                theme: {
                    color: '#2563eb' // Tailwind blue-600
                },
                modal: {
                    ondismiss: async function () {
                        console.log('Payment modal dismissed by user');
                        try {
                            await apiClient.post('/payment/record-failure', {
                                razorpay_order_id: order_id,
                                failure_reason: 'User dismissed payment modal',
                                gateway_response: { status: 'dismissed' },
                                user_details: userDetails,
                                bill_id: billId,
                                amount: amount
                            });
                        } catch (err) {
                            console.error('Error logging modal dismissal failure:', err);
                        }
                        setIsLoading(false);
                        if (onCancel) onCancel();
                    }
                }
            };

            // 5. Open Razorpay Checkout Modal
            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', async function (response: any) {
                console.error('Payment checkout failed event:', response.error);
                try {
                    await apiClient.post('/payment/record-failure', {
                        razorpay_order_id: order_id,
                        failure_reason: response.error.description || 'Payment failed',
                        gateway_response: response.error,
                        user_details: userDetails,
                        bill_id: billId,
                        amount: amount
                    });
                } catch (err) {
                    console.error('Error logging checkout failure:', err);
                }
                setIsLoading(false);
                if (onFailure) onFailure(response.error.description);
                showToast(response.error.description || 'Payment failed', 'error');
            });
            paymentObject.open();

        } catch (error: any) {
            console.error('Payment Error:', error);
            setIsLoading(false);
            if (onFailure) onFailure(error.message || 'Payment processing failed');
            showToast(error.message || 'Payment processing failed', 'error');
        }
    };

    return (
        <>
            <button
                onClick={handlePayment}
                disabled={isLoading}
                className={buttonClassName || "w-full bg-blue-600 text-white p-6 rounded-2xl font-black text-xl hover:bg-blue-700 transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={buttonClassName ? 18 : 24} /> {buttonClassName ? "..." : "Processing..."}
                    </>
                ) : (
                    <>
                        {!buttonClassName && <CreditCard />} {customButtonText || "Pay Securely Now"}
                    </>
                )}
            </button>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
};

export default RazorpayCheckout;
