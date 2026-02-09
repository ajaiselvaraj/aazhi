
export interface BBPSBillResponse {
    success: boolean;
    data?: {
        billerId: string;
        billerName: string;
        consumerId: string;
        consumerName: string;
        amount: number;
        dueDate: string;
        billDate: string;
        billNumber: string;
        status: 'Unpaid' | 'Paid';
    };
    error?: string;
}

export interface BBPSPaymentResponse {
    success: boolean;
    data?: {
        txnId: string;
        bbpsRefId: string; // The critical BBPS Reference
        timestamp: string;
        status: 'SUCCESS' | 'FAILURE' | 'PENDING';
    };
    error?: string;
}

const DEMO_BILLS: Record<string, any> = {
    '04-202-6789': {
        consumerName: 'ARUN KUMAR',
        amount: 2450.00,
        dueDate: '2026-02-15',
        billDate: '2026-02-01',
        billNumber: 'B-2026-02-001',
        status: 'Unpaid'
    },
    '04-100-5555': {
        consumerName: 'PRIYA R',
        amount: 1200.50,
        dueDate: '2026-02-20',
        billDate: '2026-02-05',
        billNumber: 'B-2026-02-099',
        status: 'Unpaid'
    }
};

export const BBPSService = {
    /**
     * Simulates fetching a bill from the BBPS Central Unit (COU) via an Aggregator (OU)
     */
    fetchBill: async (billerId: string, consumerId: string): Promise<BBPSBillResponse> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const normalizedId = consumerId.trim();

                // Demo Data Logic
                if (DEMO_BILLS[normalizedId]) {
                    resolve({
                        success: true,
                        data: {
                            billerId,
                            billerName: 'TANGEDCO (Electricity)',
                            consumerId: normalizedId,
                            ...DEMO_BILLS[normalizedId]
                        }
                    });
                    return;
                }

                // Generative Fallback for any other valid-looking ID
                if (normalizedId.length >= 8) {
                    resolve({
                        success: true,
                        data: {
                            billerId,
                            billerName: 'TANGEDCO (Electricity)',
                            consumerId: normalizedId,
                            consumerName: 'CONSUMER ' + normalizedId.slice(-4),
                            amount: Math.floor(Math.random() * 5000) + 500,
                            dueDate: '2026-02-28',
                            billDate: '2026-02-01',
                            billNumber: 'B-GEN-' + Date.now().toString().slice(-6),
                            status: 'Unpaid'
                        }
                    });
                    return;
                }

                resolve({
                    success: false,
                    error: 'Invalid Consumer Number. Please check and try again.'
                });
            }, 1500); // Simulate network latency
        });
    },

    /**
     * Simulates processing a payment through BBPS
     */
    processPayment: async (billDetails: any, mode: string): Promise<BBPSPaymentResponse> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        txnId: 'TXN' + Date.now(),
                        bbpsRefId: 'BBPS' + Math.floor(Math.random() * 1000000000), // Verification requirement
                        timestamp: new Date().toISOString(),
                        status: 'SUCCESS'
                    }
                });
            }, 2000); // Simulate payment gateway
        });
    }
};
