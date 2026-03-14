// ═══════════════════════════════════════════════════════════════
// Notification Service — Ready for WebSocket/Queue integration
// Provides an abstraction layer for future real-time notifications
// ═══════════════════════════════════════════════════════════════

import logger from "../utils/logger.js";

// Notification types
export const NOTIFICATION_TYPES = {
    COMPLAINT_STATUS: "complaint_status_update",
    SERVICE_REQUEST_STATUS: "service_request_status_update",
    BILL_GENERATED: "bill_generated",
    PAYMENT_SUCCESS: "payment_success",
    PAYMENT_FAILED: "payment_failed",
    SYSTEM_ALERT: "system_alert",
};

/**
 * Notification dispatcher — currently logs events.
 * When WebSocket/message queue is integrated, this is the single
 * point to wire it up without changing any controller code.
 */
export const sendNotification = async ({ citizenId, type, title, message, data = {} }) => {
    const notification = {
        citizen_id: citizenId,
        type,
        title,
        message,
        data,
        timestamp: new Date().toISOString(),
        read: false,
    };

    // Log the notification event
    logger.info("Notification dispatched", notification);

    // ─────────────────────────────────────────────
    // TODO: WebSocket integration point
    // Replace the section below when integrating
    // Socket.io or a message queue (e.g., Redis pub/sub,
    // RabbitMQ, AWS SQS)
    //
    // Example Socket.io:
    //   io.to(citizenId).emit('notification', notification);
    //
    // Example Redis pub/sub:
    //   redisClient.publish(`user:${citizenId}`, JSON.stringify(notification));
    // ─────────────────────────────────────────────

    return notification;
};

// Convenience helpers
export const notifyComplaintUpdate = (citizenId, ticketNumber, status) => {
    return sendNotification({
        citizenId,
        type: NOTIFICATION_TYPES.COMPLAINT_STATUS,
        title: "Complaint Status Updated",
        message: `Your complaint ${ticketNumber} status has been updated to: ${status}`,
        data: { ticket_number: ticketNumber, status },
    });
};

export const notifyServiceRequestUpdate = (citizenId, ticketNumber, status) => {
    return sendNotification({
        citizenId,
        type: NOTIFICATION_TYPES.SERVICE_REQUEST_STATUS,
        title: "Service Request Updated",
        message: `Your service request ${ticketNumber} has been updated to: ${status}`,
        data: { ticket_number: ticketNumber, status },
    });
};

export const notifyPaymentSuccess = (citizenId, receiptNumber, amount) => {
    return sendNotification({
        citizenId,
        type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
        title: "Payment Successful",
        message: `Payment of ₹${amount} successful. Receipt: ${receiptNumber}`,
        data: { receipt_number: receiptNumber, amount },
    });
};

export const notifyPaymentFailed = (citizenId, amount) => {
    return sendNotification({
        citizenId,
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        title: "Payment Failed",
        message: `Payment of ₹${amount} failed. Please try again.`,
        data: { amount },
    });
};
