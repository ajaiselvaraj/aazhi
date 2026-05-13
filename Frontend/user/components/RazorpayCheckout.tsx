import React, { useState } from 'react';
import axios from 'axios';
import { CreditCard, Loader2 } from 'lucide-react';

interface RazorpayCheckoutProps {
    amount: number;
    name?: string;
    description?: string;
    onSuccess: (paymentId: string) => void;
    onFailure?: (error: any) => void;
    onCancel?: () => void;
    isGuest?: boolean; // If true, uses the /api/payment/guest-order endpoint
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

const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
    amount,
    name = 'Smart Urban Helpdesk',
    description = 'Bill Payment',
    onSuccess,
    onFailure,
    onCancel,
    isGuest = true,
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handlePayment = async () => {
        setIsLoading(true);

        try {
            // 1. Load Razorpay Checkout.js
            const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
            if (!res) {
                alert('Razorpay SDK failed to load. Are you online?');
                setIsLoading(false);
                return;
            }

            // 2. Create Order on Backend
            const endpoint = isGuest ? '/payment/guest-order' : '/payment/create-order';
            
            // Adjust this base URL to point to backend. 
            let backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            
            // ensure no trailing slash
            if (backendUrl.endsWith('/')) backendUrl = backendUrl.slice(0, -1);
            
            // Note: If using auth (isGuest=false), you need to pass token in headers. 
            // For this project, we'll focus on guest payment for QuickPay kiosks.
            const orderResponse = await axios.post(`${backendUrl}${endpoint}`, {
                amount: amount,
            });

            if (orderResponse.data.success !== true) {
                throw new Error(orderResponse.data.message || 'Failed to create order');
            }

            const { order_id, currency, key_id } = orderResponse.data.data;

            // 3. Configure Razorpay Options
            const options = {
                key: key_id || 'rzp_test_YourTestKeyH3rE', // Use test key from env/backend
                amount: Math.round(amount * 100),
                currency: currency || 'INR',
                name: name,
                description: description,
                order_id: order_id,
                handler: async function (response: any) {
                    try {
                        // 4. Verify Payment Signature
                        const verifyEndpoint = isGuest ? '/payment/guest-verify' : '/payment/verify';
                        const verifyRes = await axios.post(`${backendUrl}${verifyEndpoint}`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.success === true) {
                            onSuccess(response.razorpay_payment_id);
                        } else {
                            if (onFailure) onFailure('Payment verification failed');
                        }
                    } catch (err) {
                        console.error('Verification error:', err);
                        if (onFailure) onFailure('Payment verification failed');
                    }
                },
                prefill: {
                    name: 'Guest User',
                    email: 'guest@example.com',
                    contact: '9999999999'
                },
                theme: {
                    color: '#2563eb' // Tailwind blue-600
                },
                modal: {
                    ondismiss: function () {
                        if (onCancel) onCancel();
                    }
                }
            };

            // 5. Open Razorpay Checkout Modal
            const paymentObject = new window.Razorpay(options);
            paymentObject.on('payment.failed', function (response: any) {
                if (onFailure) onFailure(response.error.description);
            });
            paymentObject.open();

        } catch (error: any) {
            console.error('Payment Error:', error);
            if (onFailure) onFailure(error.message || 'Payment processing failed');
            alert(error.message || 'Payment processing failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black text-xl hover:bg-blue-700 transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <>
                    <Loader2 className="animate-spin" /> Processing...
                </>
            ) : (
                <>
                    <CreditCard /> Pay Securely Now
                </>
            )}
        </button>
    );
};

export default RazorpayCheckout;
