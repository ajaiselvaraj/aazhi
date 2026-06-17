import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import otpGenerator from "otp-generator";
import twilio from "twilio";

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Helper to format WhatsApp/SMS phone numbers
const formatPhoneNumber = (phone, isWhatsApp = false) => {
    let cleanPhone = phone.trim();
    if (!cleanPhone.startsWith("+")) {
        // Assume Indian country code if prefix missing
        cleanPhone = `+91${cleanPhone}`;
    }
    return isWhatsApp ? `whatsapp:${cleanPhone}` : cleanPhone;
};

/**
 * Validates formatting of citizen contacts
 */
const validateContact = (contact, channel) => {
    if (channel === 'email') {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    }
    // Mobile formatting check
    const clean = contact.replace(/[\s+-]/g, "");
    return clean.length >= 10 && /^\d+$/.test(clean);
};

/**
 * Generate a random 6-digit OTP
 */
const generateSubscriptionOtp = () => {
    return otpGenerator.generate(6, { 
        upperCaseAlphabets: false, 
        specialChars: false, 
        lowerCaseAlphabets: false, 
        digits: true 
    });
};

/**
 * 1. Request Subscription OTP
 */
export const requestSubscriptionOtp = async (complaintId, contact, channel) => {
    if (!validateContact(contact, channel)) {
        throw new Error("Invalid contact format for the selected channel.");
    }

    const otpCode = generateSubscriptionOtp();
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    // Store in otp_table
    await pool.query(
        `INSERT INTO otp_table (mobile, otp, expiry)
         VALUES ($1, $2, $3)`,
        [contact, otpCode, expiryTime]
    );

    // Send the OTP
    const isDev = process.env.NODE_ENV === "development";
    if (channel === "sms" || channel === "whatsapp") {
        if (!accountSid || accountSid.includes("YOUR") || !fromNumber || fromNumber.includes("YOUR")) {
            logger.warn(`[Subscription Service] Twilio not configured. Dummy logging OTP ${otpCode} to ${contact}`);
        } else {
            try {
                const client = twilio(accountSid, authToken);
                const to = formatPhoneNumber(contact, channel === "whatsapp");
                const from = channel === "whatsapp" ? `whatsapp:${fromNumber}` : fromNumber;

                await client.messages.create({
                    body: `Your OTP for SUVIDHA status subscription is ${otpCode}. Valid for 5 minutes.`,
                    from,
                    to
                });
                logger.info(`[Subscription Service] Verification OTP sent successfully to ${to}`);
            } catch (err) {
                logger.error(`[Subscription Service] Failed to send Twilio OTP: ${err.message}`);
            }
        }
    } else {
        // Email channel
        logger.info(`[Subscription Service] Verification OTP email logged to ${contact}: Code = ${otpCode}`);
    }

    return { success: true, message: "OTP verification code sent." };
};

/**
 * 2. Verify Subscription OTP and Create Subscription
 */
export const verifySubscriptionOtp = async (complaintId, contact, channel, otpCode) => {
    // Check if the latest OTP matches
    const { rows: otpRows } = await pool.query(
        `SELECT * FROM otp_table WHERE mobile = $1 ORDER BY created_at DESC LIMIT 1`,
        [contact]
    );

    const isDev = process.env.NODE_ENV === "development";
    if (otpRows.length === 0 && !isDev) {
        throw new Error("Verification code not found or expired.");
    }

    if (otpRows.length > 0) {
        const { otp, expiry } = otpRows[0];
        if (new Date() > new Date(expiry) && !isDev) {
            throw new Error("Verification code has expired.");
        }
        if (otp !== otpCode && !isDev) {
            throw new Error("Invalid verification code.");
        }
    }

    // OTP matches, delete from DB
    await pool.query("DELETE FROM otp_table WHERE mobile = $1", [contact]);

    // Upsert subscription
    const { rows: subs } = await pool.query(
        `INSERT INTO notification_subscriptions (complaint_id, citizen_contact, channel, verified)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (complaint_id, citizen_contact, channel) 
         DO UPDATE SET verified = TRUE
         RETURNING *`,
        [complaintId, contact, channel]
    );

    logger.info(`✅ [Subscription Service] Verified subscription for ticket/complaint: ${complaintId} on ${channel}`);

    // Send immediate "Registered" notification confirm
    const { rows: complaints } = await pool.query("SELECT * FROM complaints WHERE id = $1", [complaintId]);
    if (complaints.length > 0) {
        const ticket = complaints[0];
        const msg = `Complaint received.\n\nTicket:\n${ticket.ticket_number}\n\nDepartment:\n${ticket.department || 'General'}`;
        await dispatchMessage(complaintId, contact, channel, "complaint_registered", msg);
    }

    return subs[0];
};

/**
 * 3. Citizen Satisfaction Check response processing
 */
export const processFeedbackResponse = async (ticketNumber, score) => {
    if (![1, 2].includes(parseInt(score))) {
        throw new Error("Invalid score. Must be 1 (Yes) or 2 (No).");
    }

    const { rows: complaints } = await pool.query(
        `UPDATE complaints 
         SET satisfaction_response = $1, satisfaction_responded_at = NOW()
         WHERE ticket_number = $2
         RETURNING *`,
        [parseInt(score), ticketNumber]
    );

    if (complaints.length === 0) {
        throw new Error("Complaint ticket not found.");
    }

    logger.info(`👤 [Subscription Feedback] Registered satisfaction confirmation for ticket ${ticketNumber}: Responded = ${score === 1 ? 'Yes' : 'No'}`);
    return complaints[0];
};

/**
 * 4. Dispatch a Single Message (evaluates Quiet-Hours)
 */
export const dispatchMessage = async (complaintId, contact, channel, type, messageText) => {
    // Quiet-hours check
    const startHour = parseInt(process.env.NOTIFICATION_START_HOUR || "8");
    const endHour = parseInt(process.env.NOTIFICATION_END_HOUR || "21");
    
    // Get current hour in IST/Server local time
    const currentHour = new Date().getHours();
    const isQuietHour = currentHour < startHour || currentHour >= endHour;

    if (isQuietHour) {
        // Queue notification instead of sending
        await pool.query(
            `INSERT INTO notification_log (complaint_id, notification_type, channel, message, delivery_status)
             VALUES ($1, $2, $3, $4, 'queued')`,
            [complaintId, type, channel, messageText]
        );
        logger.info(`⏰ [Subscription Service] Notification queued due to quiet hours: ${contact} (${channel})`);
        return { status: "queued" };
    }

    // Active hours: Send immediately
    let deliveryStatus = "sent";
    
    if (channel === "sms" || channel === "whatsapp") {
        if (!accountSid || accountSid.includes("YOUR") || !fromNumber || fromNumber.includes("YOUR")) {
            logger.warn(`[Subscription Service] Twilio not configured. Simulated dispatch to ${contact} (${channel}): ${messageText.replace(/\n/g, ' ')}`);
        } else {
            try {
                const client = twilio(accountSid, authToken);
                const to = formatPhoneNumber(contact, channel === "whatsapp");
                const from = channel === "whatsapp" ? `whatsapp:${fromNumber}` : fromNumber;

                await client.messages.create({
                    body: messageText,
                    from,
                    to
                });
                deliveryStatus = "delivered";
                logger.info(`[Subscription Service] Sent message to ${to} successfully.`);
            } catch (err) {
                logger.error(`[Subscription Service] Message delivery failed to ${contact}: ${err.message}`);
                deliveryStatus = "failed";
            }
        }
    } else {
        // Email channel
        logger.info(`[Subscription Service] Sent email log to ${contact}: ${messageText.replace(/\n/g, ' ')}`);
        deliveryStatus = "delivered";
    }

    // Log in DB
    await pool.query(
        `INSERT INTO notification_log (complaint_id, notification_type, channel, message, delivery_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [complaintId, type, channel, messageText, deliveryStatus]
    );

    return { status: deliveryStatus };
};

/**
 * 5. Trigger Notifications for status changes (lifecycle hooks)
 */
export const triggerStatusNotifications = async (complaintId, previousStatus, newStatus) => {
    try {
        if (previousStatus === newStatus) return;

        // Fetch verified subscribers
        const { rows: subscriptions } = await pool.query(
            "SELECT * FROM notification_subscriptions WHERE complaint_id = $1 AND verified = TRUE",
            [complaintId]
        );
        if (subscriptions.length === 0) return;

        // Fetch complaint details
        const { rows: complaints } = await pool.query(
            "SELECT * FROM complaints WHERE id = $1",
            [complaintId]
        );
        if (complaints.length === 0) return;
        const complaint = complaints[0];

        // Fetch cluster if mapped to one
        const { rows: clusters } = await pool.query(
            `SELECT cc.cluster_id, ic.cluster_code, ic.root_cause_category, ic.status
             FROM cluster_complaints cc
             JOIN infrastructure_clusters ic ON cc.cluster_id = ic.id
             WHERE cc.complaint_id = $1`,
            [complaintId]
        );

        let isClustered = clusters.length > 0;
        let messageText = "";
        let type = `status_${newStatus}`;

        if (isClustered) {
            const cluster = clusters[0];
            const clusterId = cluster.cluster_id;

            // Fetch departments mapping in the cluster to calculate remaining and ETA
            const { rows: depts } = await pool.query(
                "SELECT * FROM cluster_departments WHERE cluster_id = $1",
                [clusterId]
            );

            const totalDepts = depts.length;
            const completedDepts = depts.filter(d => d.completion_status === 'completed').length;
            const progress = totalDepts > 0 ? Math.round((completedDepts / totalDepts) * 100) : 0;
            
            const remainingList = depts
                .filter(d => d.completion_status !== 'completed')
                .map(d => {
                    const name = d.department_name;
                    if (name.toLowerCase().includes("water")) return "Water Repair";
                    if (name.toLowerCase().includes("road")) return "Road Restoration";
                    if (name.toLowerCase().includes("elect")) return "Electrical Inspection";
                    if (name.toLowerCase().includes("gas")) return "Gas Supply Check";
                    return name;
                });
            const remaining = remainingList.length > 0 ? remainingList.join(", ") : "Finalizing Inspections";

            // Determine maximum/latest SLA deadline
            let eta = "N/A";
            if (depts.length > 0) {
                const deadlines = depts.map(d => new Date(d.sla_deadline).getTime());
                const latestDeadline = new Date(Math.max(...deadlines));
                
                // Format relative ETA
                const diffMs = latestDeadline.getTime() - Date.now();
                const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                
                if (diffHours < 0) {
                    eta = "Work in final stages";
                } else if (diffHours <= 24) {
                    eta = `Today ${latestDeadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
                } else if (diffHours <= 48) {
                    eta = `Tomorrow ${latestDeadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
                } else {
                    eta = latestDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + " " + latestDeadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                }
            }

            messageText = `Area Recovery Update\n\nCluster:\n${cluster.cluster_code}\n\nRoot Cause:\n${cluster.root_cause_category}\n\nProgress:\n${progress}%\n\nRemaining:\n${remaining}\n\nETA:\n${eta}`;
            type = "area_recovery_update";
        } else {
            // Un-clustered complaint messages
            if (newStatus === "assigned") {
                messageText = `Your complaint has been assigned to an officer.\n\nExpected action:\nWithin 24 hours.`;
            } else if (newStatus === "in_progress") {
                messageText = `Repair work has begun.\n\nDepartment:\n${complaint.department || 'General'}`;
            } else if (newStatus === "resolved") {
                messageText = `Your complaint has been marked as resolved.\n\nTicket:\n${complaint.ticket_number}\n\nPlease confirm if the issue has been fixed.`;
            } else {
                // Default fallback updates
                const readableStatus = newStatus.replace(/_/g, " ").toUpperCase();
                messageText = `Your complaint status has updated to: ${readableStatus}.\n\nTicket: ${complaint.ticket_number}`;
            }
        }

        // Dispatch to all subscribers
        for (const sub of subscriptions) {
            await dispatchMessage(complaintId, sub.citizen_contact, sub.channel, type, messageText);
        }

    } catch (err) {
        logger.error(`❌ [Subscription Trigger] Error triggering status alert updates: ${err.message}`);
    }
};

/**
 * 6. Sweeps all queued notifications (called periodically)
 */
export const sweepQueuedNotifications = async () => {
    try {
        const startHour = parseInt(process.env.NOTIFICATION_START_HOUR || "8");
        const endHour = parseInt(process.env.NOTIFICATION_END_HOUR || "21");
        const currentHour = new Date().getHours();

        // If currently in quiet hours, skip sweeping
        if (currentHour < startHour || currentHour >= endHour) return;

        const { rows: queuedLogs } = await pool.query(
            `SELECT nl.*, ns.citizen_contact 
             FROM notification_log nl
             JOIN notification_subscriptions ns ON nl.complaint_id = ns.complaint_id AND nl.channel = ns.channel
             WHERE nl.delivery_status = 'queued'
             ORDER BY nl.sent_at ASC`
        );

        if (queuedLogs.length === 0) return;

        logger.info(`⏰ [Subscription Sweep] Found ${queuedLogs.length} queued notifications. Dispatching now...`);

        for (const log of queuedLogs) {
            let deliveryStatus = "sent";
            const to = formatPhoneNumber(log.citizen_contact, log.channel === "whatsapp");
            const from = log.channel === "whatsapp" ? `whatsapp:${fromNumber}` : fromNumber;

            if (log.channel === "sms" || log.channel === "whatsapp") {
                if (!accountSid || accountSid.includes("YOUR") || !fromNumber || fromNumber.includes("YOUR")) {
                    // simulated
                    deliveryStatus = "delivered";
                } else {
                    try {
                        const client = twilio(accountSid, authToken);
                        await client.messages.create({
                            body: log.message,
                            from,
                            to
                        });
                        deliveryStatus = "delivered";
                    } catch (err) {
                        logger.error(`[Subscription Sweep] Delivery failed to ${to}: ${err.message}`);
                        deliveryStatus = "failed";
                    }
                }
            } else {
                deliveryStatus = "delivered";
            }

            // Update log entry status
            await pool.query(
                "UPDATE notification_log SET delivery_status = $1, sent_at = NOW() WHERE id = $2",
                [deliveryStatus, log.id]
            );
        }
        logger.info(`⏰ [Subscription Sweep] Dispatched completed.`);
    } catch (err) {
        logger.error(`❌ [Subscription Sweep] Error: ${err.message}`);
    }
};
