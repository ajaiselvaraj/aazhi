// ═══════════════════════════════════════════════════════════════
// Payment Service — Business Logic Layer
// Handles Razorpay order creation and verification logic
// ═══════════════════════════════════════════════════════════════

import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import { generateReceiptNumber } from "../utils/helpers.js";

export const createRazorpayOrder = async (amount, notes = {}) => {
    const receipt = generateReceiptNumber();
    const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt,
        notes,
    });
    return { order, receipt };
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

    return expectedSignature === signature;
};

export const verifyWebhookSignature = (body, signature) => {
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest("hex");

    return expectedSignature === signature;
};