import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { sendSMS, sendWhatsApp } from "./twilio.provider.js";

// Helper to format messages
export const getMessageBody = (status, ticketNumber) => {
    const cleanStatus = (status || '').toLowerCase().trim();
    switch (cleanStatus) {
        case 'registered':
        case 'pending':
        case 'submitted':
            return `AAZHI: Your complaint ${ticketNumber} has been successfully registered. You will receive automatic updates.`;
        case 'under_review':
            return `AAZHI Update: Complaint ${ticketNumber} is currently under review by the responsible department.`;
        case 'field_team_assigned':
            return `AAZHI Update: A field team has been assigned to complaint ${ticketNumber}.`;
        case 'in_progress':
            return `AAZHI Update: Work has started on complaint ${ticketNumber}. Status: IN PROGRESS.`;
        case 'resolved':
            return `AAZHI Update: Complaint ${ticketNumber} has been marked RESOLVED.`;
        case 'closed':
            return `AAZHI Update: Complaint ${ticketNumber} has been CLOSED. Thank you for helping improve public services.`;
        default:
            return `AAZHI Update: Complaint ${ticketNumber} status updated to ${status.toUpperCase().replace(/_/g, ' ')}.`;
    }
};

/**
 * Log notification attempt to database
 */
export const logNotification = async (complaintId, phone, channel, statusSent, messageBody, deliveryStatus, errorMessage = null, retryCount = 0) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO notification_logs 
             (complaint_id, phone_number, channel, status_sent, message_body, delivery_status, error_message, retry_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [complaintId, phone, channel, statusSent, messageBody, deliveryStatus, errorMessage, retryCount]
        );
        return rows[0];
    } catch (err) {
        logger.error(`[Notification Service] Failed to write to notification_logs table: ${err.message}`);
    }
};

/**
 * Process a single notification dispatch
 */
const processDispatch = async (complaintId, phone, channel, statusSent, messageBody) => {
    // 1. Prevent duplicate notifications
    const { rows: dupCheck } = await pool.query(
        `SELECT id FROM notification_logs 
         WHERE complaint_id = $1 AND status_sent = $2 AND channel = $3 AND delivery_status = 'sent'`,
        [complaintId, statusSent, channel]
    );
    if (dupCheck.length > 0) {
        logger.info(`[Notification Service] Duplicate prevented for complaint ${complaintId}, status ${statusSent}, channel ${channel}`);
        return;
    }

    // 2. Dispatch message
    try {
        if (channel === 'SMS') {
            await sendSMS(phone, messageBody);
        } else if (channel === 'WHATSAPP') {
            await sendWhatsApp(phone, messageBody);
        } else {
            throw new Error(`Unsupported channel: ${channel}`);
        }

        // Log success
        await logNotification(complaintId, phone, channel, statusSent, messageBody, 'sent');
        
        // Update complaints table last_notification_sent_at
        await pool.query(
            `UPDATE complaints SET last_notification_sent_at = NOW() WHERE id = $1`,
            [complaintId]
        );
        logger.info(`[Notification Service] Successfully sent ${channel} to ${phone} for status ${statusSent}`);
    } catch (err) {
        logger.error(`[Notification Service] Delivery failed to ${phone} via ${channel}: ${err.message}`);
        // Log failure for retry
        await logNotification(complaintId, phone, channel, statusSent, messageBody, 'failed', err.message, 0);
    }
};

/**
 * Main entry point: Send status notifications based on complaint preferences
 */
export const sendStatusUpdate = async (complaintId, status) => {
    try {
        // Fetch complaint details & preferences
        const { rows: complaints } = await pool.query(
            `SELECT id, ticket_number, notification_enabled, notification_channel, notification_phone 
             FROM complaints WHERE id = $1`,
            [complaintId]
        );

        if (complaints.length === 0) {
            logger.warn(`[Notification Service] Complaint not found: ${complaintId}`);
            return;
        }

        const complaint = complaints[0];

        // Guard: check if opted-in
        if (!complaint.notification_enabled || !complaint.notification_phone) {
            logger.info(`[Notification Service] Notifications disabled or missing phone for complaint ${complaint.ticket_number}`);
            return;
        }

        const channel = (complaint.notification_channel || 'BOTH').toUpperCase();
        const phone = complaint.notification_phone;
        const messageBody = getMessageBody(status, complaint.ticket_number);

        logger.info(`[Notification Service] Dispatching status alert [${status}] to ${phone} via ${channel}`);

        if (channel === 'BOTH') {
            await processDispatch(complaint.id, phone, 'SMS', status, messageBody);
            await processDispatch(complaint.id, phone, 'WHATSAPP', status, messageBody);
        } else if (channel === 'SMS') {
            await processDispatch(complaint.id, phone, 'SMS', status, messageBody);
        } else if (channel === 'WHATSAPP') {
            await processDispatch(complaint.id, phone, 'WHATSAPP', status, messageBody);
        }
    } catch (err) {
        logger.error(`[Notification Service] Error sending status update for ${complaintId}: ${err.message}`);
    }
};

/**
 * Sweep failed logs and retry them up to 3 times
 */
export const retryFailedNotification = async () => {
    try {
        // Find failed logs with retry_count < 3
        const { rows: failedLogs } = await pool.query(
            `SELECT * FROM notification_logs 
             WHERE delivery_status = 'failed' AND retry_count < 3
             ORDER BY created_at ASC`
        );

        if (failedLogs.length === 0) {
            return;
        }

        logger.info(`[Notification Service] Found ${failedLogs.length} failed notifications to retry.`);

        for (const log of failedLogs) {
            const nextAttempt = log.retry_count + 1;
            try {
                // Update retry counter first
                await pool.query(
                    `UPDATE notification_logs SET retry_count = $1 WHERE id = $2`,
                    [nextAttempt, log.id]
                );

                if (log.channel === 'SMS') {
                    await sendSMS(log.phone_number, log.message_body);
                } else if (log.channel === 'WHATSAPP') {
                    await sendWhatsApp(log.phone_number, log.message_body);
                }

                // Success
                await pool.query(
                    `UPDATE notification_logs 
                     SET delivery_status = 'sent', error_message = NULL 
                     WHERE id = $1`,
                    [log.id]
                );

                await pool.query(
                    `UPDATE complaints SET last_notification_sent_at = NOW() WHERE id = $1`,
                    [log.complaint_id]
                );
                logger.info(`[Notification Service] Retry success for log ${log.id} (Attempt ${nextAttempt}/3)`);
            } catch (err) {
                logger.error(`[Notification Service] Retry attempt ${nextAttempt} failed for log ${log.id}: ${err.message}`);
                await pool.query(
                    `UPDATE notification_logs 
                     SET error_message = $1 
                     WHERE id = $2`,
                    [err.message, log.id]
                );
            }
        }
    } catch (err) {
        logger.error(`[Notification Service] Error running retry sweep: ${err.message}`);
    }
};
